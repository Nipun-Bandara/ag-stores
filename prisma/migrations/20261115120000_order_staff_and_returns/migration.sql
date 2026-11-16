-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'ORDER_STAFF';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'ORDER_RETURN_RECORDED';
ALTER TYPE "AuditAction" ADD VALUE 'ORDER_RETURN_REVIEWED';
ALTER TYPE "AuditAction" ADD VALUE 'ORDER_REFUND_RECORDED';
ALTER TYPE "AuditAction" ADD VALUE 'STAFF_ACCOUNT_UPDATED';

-- CreateTable
CREATE TABLE "order_returns" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "orderItemId" UUID NOT NULL,
    "quantity" DECIMAL(13,3) NOT NULL,
    "refundAmount" DECIMAL(12,2) NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "status" "ReturnStatus" NOT NULL DEFAULT 'PENDING',
    "restock" BOOLEAN NOT NULL DEFAULT false,
    "recordedById" UUID NOT NULL,
    "reviewedById" UUID,
    "reviewNote" VARCHAR(500),
    "reviewedAt" TIMESTAMPTZ(3),
    "refundPaidAt" TIMESTAMPTZ(3),
    "refundPaidById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_returns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_returns_orderId_createdAt_idx" ON "order_returns"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "order_returns_orderItemId_status_idx" ON "order_returns"("orderItemId", "status");

-- AddForeignKey
ALTER TABLE "order_returns" ADD CONSTRAINT "order_returns_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_returns" ADD CONSTRAINT "order_returns_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
