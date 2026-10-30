import { createHash } from "node:crypto";

const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_IDENTIFIER_LIMIT = 10;
const DEFAULT_IP_LIMIT = 50;
const MAX_BUCKETS = 10_000;

interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}

const buckets = new Map<string, Bucket>();

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("base64url");
}

function clientAddress(request: Pick<Request, "headers">): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0];
  return (forwarded || request.headers.get("x-real-ip") || "unknown")
    .trim()
    .toLowerCase();
}

function consume(key: string, limit: number, now: number): RateLimitDecision {
  const existing = buckets.get(key);
  const bucket =
    !existing || existing.resetAt <= now
      ? { count: 0, resetAt: now + DEFAULT_WINDOW_MS }
      : existing;

  bucket.count += 1;
  buckets.set(key, bucket);

  if (buckets.size > MAX_BUCKETS) {
    for (const [candidate, value] of buckets) {
      if (value.resetAt <= now || buckets.size > MAX_BUCKETS) {
        buckets.delete(candidate);
      }
    }
  }

  return {
    allowed: bucket.count <= limit,
    limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

export function consumeAuthAttempt(
  request: Pick<Request, "headers">,
  scope: "login" | "register",
  identifier: string,
  now = Date.now(),
): RateLimitDecision {
  const identifierLimit = positiveInteger(
    process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS,
    DEFAULT_IDENTIFIER_LIMIT,
  );
  const ipLimit = positiveInteger(
    process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS_PER_IP,
    DEFAULT_IP_LIMIT,
  );
  const normalizedIdentifier = identifier.trim().toLowerCase();
  const address = clientAddress(request);
  const identifierDecision = consume(
    `${scope}:identifier:${digest(normalizedIdentifier)}`,
    identifierLimit,
    now,
  );
  const ipDecision = consume(`${scope}:ip:${digest(address)}`, ipLimit, now);

  if (!identifierDecision.allowed) return identifierDecision;
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

export function clearAuthAttempts(
  request: Pick<Request, "headers">,
  scope: "login" | "register",
  identifier: string,
): void {
  buckets.delete(
    `${scope}:identifier:${digest(identifier.trim().toLowerCase())}`,
  );
  buckets.delete(`${scope}:ip:${digest(clientAddress(request))}`);
}

export function resetAuthRateLimitsForTesting(): void {
  if (process.env.NODE_ENV !== "test") return;
  buckets.clear();
}
