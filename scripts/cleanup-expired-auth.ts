import "dotenv/config";
import { getDb } from "../src/db";

// Logins already prune each user's own expired sessions; this sweeps the rest
// (users who never log in again) and expired rate-limit counters. Safe to run
// on a schedule, e.g. daily.
const db = getDb();
const now = new Date();
const [sessions, rateLimits] = await db.$transaction([
  db.authSession.deleteMany({ where: { expiresAt: { lte: now } } }),
  db.authRateLimit.deleteMany({ where: { resetAt: { lte: now } } }),
]);
console.log({
  expiredSessionsDeleted: sessions.count,
  expiredRateLimitsDeleted: rateLimits.count,
});
await db.$disconnect();
