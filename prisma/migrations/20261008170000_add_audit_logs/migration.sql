CREATE TYPE "AuditAction" AS ENUM (
  'PRODUCT_PRICE_UPDATED',
  'PRODUCT_STOCK_UPDATED',
  'ORDER_STATUS_CHANGED',
  'USER_STATUS_UPDATED',
  'SHOP_CREATED',
  'SHOP_UPDATED',
  'SHOP_STATUS_UPDATED'
);

CREATE TYPE "AuditEntityType" AS ENUM ('PRODUCT', 'ORDER', 'USER', 'SHOP');

CREATE TABLE "audit_logs" (
  "id" UUID NOT NULL,
  "actorId" UUID NOT NULL,
  "action" "AuditAction" NOT NULL,
  "entityType" "AuditEntityType" NOT NULL,
  "entityId" UUID NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
CREATE INDEX "audit_logs_actorId_createdAt_idx"
  ON "audit_logs"("actorId", "createdAt");
CREATE INDEX "audit_logs_entityType_entityId_createdAt_idx"
  ON "audit_logs"("entityType", "entityId", "createdAt");
