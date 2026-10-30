import { createHash, randomBytes } from "node:crypto";

import type { SessionCredentials } from "@/types/auth";

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createSessionCredentials(now = new Date()): SessionCredentials {
  const token = randomBytes(32).toString("base64url");

  return {
    token,
    tokenHash: hashSessionToken(token),
    expiresAt: new Date(now.getTime() + SESSION_TTL_SECONDS * 1000),
  };
}
