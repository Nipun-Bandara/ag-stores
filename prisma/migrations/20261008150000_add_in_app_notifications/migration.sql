CREATE TYPE "NotificationType" AS ENUM (
  'ORDER_PLACED',
  'ORDER_CONFIRMED',
  'ORDER_READY_FOR_DELIVERY',
  'ORDER_ASSIGNED',
  'ORDER_OUT_FOR_DELIVERY',
  'ORDER_DELIVERED',
  'ORDER_REJECTED',
  'ORDER_CANCELLED'
);

CREATE TABLE "notifications" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "orderId" UUID NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" VARCHAR(160) NOT NULL,
  "message" VARCHAR(500) NOT NULL,
  "readAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notifications_userId_orderId_type_key"
  ON "notifications"("userId", "orderId", "type");
CREATE INDEX "notifications_userId_readAt_createdAt_idx"
  ON "notifications"("userId", "readAt", "createdAt");
CREATE INDEX "notifications_orderId_type_idx"
  ON "notifications"("orderId", "type");

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
