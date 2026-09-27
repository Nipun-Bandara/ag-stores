-- AlterTable
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "phone" DROP NOT NULL;

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_tokenHash_key" ON "auth_sessions"("tokenHash");

-- Treat normalized email addresses as case-insensitively unique.
CREATE UNIQUE INDEX "users_email_lower_key"
ON "users"(LOWER("email"))
WHERE "email" IS NOT NULL;

-- CreateIndex
CREATE INDEX "auth_sessions_userId_idx" ON "auth_sessions"("userId");

-- CreateIndex
CREATE INDEX "auth_sessions_expiresAt_idx" ON "auth_sessions"("expiresAt");

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Public accounts may use either identifier, but never neither.
ALTER TABLE "users"
  ADD CONSTRAINT "users_email_or_phone_check"
    CHECK ("email" IS NOT NULL OR "phone" IS NOT NULL),
  ADD CONSTRAINT "users_phone_format_check"
    CHECK ("phone" IS NULL OR "phone" ~ '^\+[1-9][0-9]{7,14}$');

ALTER TABLE "auth_sessions"
  ADD CONSTRAINT "auth_sessions_token_hash_check"
    CHECK ("tokenHash" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "auth_sessions_expiry_check"
    CHECK ("expiresAt" > "createdAt");
