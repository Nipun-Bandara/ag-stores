import { createHash } from "node:crypto";

import { getDb } from "@/db";
import { normalizeMobile } from "@/lib/account-identity";

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_IDENTIFIER_LIMIT = 10;
const DEFAULT_IP_LIMIT = 50;
const MAX_MEMORY_BUCKETS = 10_000;
/** Roughly one in this many attempts also purges expired counters. */
const PURGE_EVERY_N_ATTEMPTS = 200;

export interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

interface Bucket {
  count: number;
  resetAt: Date;
}

/** Storage for fixed-window counters. Must increment atomically. */
export interface RateLimitStore {
  increment(key: string, now: Date, windowMs: number): Promise<Bucket>;
  delete(key: string): Promise<void>;
  purgeExpired(now: Date): Promise<void>;
}

/** Process-local store: correct only for a single instance. Used in tests. */
export class MemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, Bucket>();

  async increment(key: string, now: Date, windowMs: number): Promise<Bucket> {
    const existing = this.buckets.get(key);
    const bucket =
      !existing || existing.resetAt <= now
        ? { count: 0, resetAt: new Date(now.getTime() + windowMs) }
        : existing;
    bucket.count += 1;
    this.buckets.set(key, bucket);
    if (this.buckets.size > MAX_MEMORY_BUCKETS) await this.purgeExpired(now);
    return { ...bucket };
  }

  async delete(key: string): Promise<void> {
    this.buckets.delete(key);
  }

  async purgeExpired(now: Date): Promise<void> {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now || this.buckets.size > MAX_MEMORY_BUCKETS) {
        this.buckets.delete(key);
      }
    }
  }

  clear(): void {
    this.buckets.clear();
  }
}

/** PostgreSQL store: one atomic upsert per counter, shared across instances. */
export class PostgresRateLimitStore implements RateLimitStore {
  async increment(key: string, now: Date, windowMs: number): Promise<Bucket> {
    const resetAt = new Date(now.getTime() + windowMs);
    const rows = await getDb().$queryRaw<Bucket[]>`
      INSERT INTO "auth_rate_limits" ("key", "count", "resetAt")
      VALUES (${key}, 1, ${resetAt})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "auth_rate_limits"."resetAt" <= ${now}
          THEN 1 ELSE "auth_rate_limits"."count" + 1 END,
        "resetAt" = CASE WHEN "auth_rate_limits"."resetAt" <= ${now}
          THEN EXCLUDED."resetAt" ELSE "auth_rate_limits"."resetAt" END
      RETURNING "count", "resetAt"`;
    const row = rows[0];
    if (!row) throw new Error("Rate limit counter was not returned.");
    return { count: Number(row.count), resetAt: new Date(row.resetAt) };
  }

  async delete(key: string): Promise<void> {
    await getDb()
      .$executeRaw`DELETE FROM "auth_rate_limits" WHERE "key" = ${key}`;
  }

  async purgeExpired(now: Date): Promise<void> {
    await getDb()
      .$executeRaw`DELETE FROM "auth_rate_limits" WHERE "resetAt" <= ${now}`;
  }
}

const memoryStore = new MemoryRateLimitStore();
let configuredStore: RateLimitStore | null = null;

function store(): RateLimitStore {
  configuredStore ??=
    process.env.NODE_ENV === "test"
      ? memoryStore
      : new PostgresRateLimitStore();
  return configuredStore;
}

export function setRateLimitStoreForTesting(next: RateLimitStore | null): void {
  if (process.env.NODE_ENV !== "test") return;
  configuredStore = next;
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("base64url");
}

/** Phone numbers in any accepted format share one counter. */
export function normalizeRateLimitIdentifier(identifier: string): string {
  return normalizeMobile(identifier) ?? identifier.trim().toLowerCase();
}

/**
 * The client address as seen by the outermost trusted proxy. Each proxy appends
 * the address it received from, so the client-controlled entries are on the
 * left; take the entry added by the first trusted hop (TRUSTED_PROXY_COUNT,
 * default 1). With TRUSTED_PROXY_COUNT=0 forwarding headers are ignored.
 */
export function clientAddress(request: Pick<Request, "headers">): string {
  const trustedHops = Number(process.env.TRUSTED_PROXY_COUNT ?? "1");
  const hops =
    Number.isSafeInteger(trustedHops) && trustedHops >= 0 ? trustedHops : 1;
  if (hops === 0) return "unknown";

  const forwarded = (request.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const address =
    forwarded.length > 0
      ? forwarded[Math.max(0, forwarded.length - hops)]
      : request.headers.get("x-real-ip");
  return (address || "unknown").trim().toLowerCase();
}

function identifierKey(scope: string, identifier: string): string {
  return `${scope}:identifier:${digest(normalizeRateLimitIdentifier(identifier))}`;
}

function ipKey(scope: string, request: Pick<Request, "headers">): string {
  return `${scope}:ip:${digest(clientAddress(request))}`;
}

function decision(bucket: Bucket, limit: number, now: Date): RateLimitDecision {
  return {
    allowed: bucket.count <= limit,
    limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((bucket.resetAt.getTime() - now.getTime()) / 1000),
    ),
  };
}

export async function consumeAuthAttempt(
  request: Pick<Request, "headers">,
  scope: "login" | "register",
  identifier: string,
  now = Date.now(),
): Promise<RateLimitDecision> {
  const identifierLimit = positiveInteger(
    process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS,
    DEFAULT_IDENTIFIER_LIMIT,
  );
  const ipLimit = positiveInteger(
    process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS_PER_IP,
    DEFAULT_IP_LIMIT,
  );
  const at = new Date(now);
  const counters = store();
  let identifierBucket: Bucket;
  let ipBucket: Bucket;
  try {
    [identifierBucket, ipBucket] = await Promise.all([
      counters.increment(
        identifierKey(scope, identifier),
        at,
        DEFAULT_WINDOW_MS,
      ),
      counters.increment(ipKey(scope, request), at, DEFAULT_WINDOW_MS),
    ]);
  } catch (error) {
    // Fail open: a counter outage must not lock every user out. Login itself
    // still needs the database, so this does not widen an outage into abuse.
    console.error("Authentication rate limit unavailable.", error);
    return {
      allowed: true,
      limit: identifierLimit,
      remaining: identifierLimit,
      retryAfterSeconds: 1,
    };
  }

  if (Math.random() * PURGE_EVERY_N_ATTEMPTS < 1) {
    void counters.purgeExpired(at).catch(() => undefined);
  }

  const identifierDecision = decision(identifierBucket, identifierLimit, at);
  if (!identifierDecision.allowed) return identifierDecision;
  const ipDecision = decision(ipBucket, ipLimit, at);
  return ipDecision.allowed ? identifierDecision : ipDecision;
}

export function rateLimitHeaders(decision: RateLimitDecision): HeadersInit {
  return {
    "RateLimit-Limit": String(decision.limit),
    "RateLimit-Remaining": String(decision.remaining),
    "Retry-After": String(decision.retryAfterSeconds),
  };
}

export function applyRateLimitHeaders<T extends Response>(
  response: T,
  decision: RateLimitDecision,
): T {
  const headers = new Headers(rateLimitHeaders(decision));
  headers.forEach((value, key) => response.headers.set(key, value));
  return response;
}

/**
 * Clears only the identifier counter after a success. The per-IP counter is
 * deliberately kept: resetting it would let anyone with one valid account
 * refresh their IP allowance and keep guessing other accounts.
 */
export async function clearAuthAttempts(
  scope: "login" | "register",
  identifier: string,
): Promise<void> {
  await store().delete(identifierKey(scope, identifier));
}

export function resetAuthRateLimitsForTesting(): void {
  if (process.env.NODE_ENV !== "test") return;
  memoryStore.clear();
  configuredStore = null;
}
