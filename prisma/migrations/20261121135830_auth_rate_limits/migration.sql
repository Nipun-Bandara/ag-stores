-- CreateTable
CREATE TABLE "auth_rate_limits" (
    "key" VARCHAR(128) NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "auth_rate_limits_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "auth_rate_limits_resetAt_idx" ON "auth_rate_limits"("resetAt");
