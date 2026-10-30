-- Rename existing values so current orders retain their closest equivalent state.
ALTER TYPE "OrderStatus" RENAME VALUE 'PENDING' TO 'PLACED';
ALTER TYPE "OrderStatus" RENAME VALUE 'READY_FOR_PICKUP' TO 'READY_FOR_DELIVERY';

-- Extend the lifecycle with assignment and terminal failure states.
ALTER TYPE "OrderStatus" ADD VALUE 'ASSIGNED' AFTER 'READY_FOR_DELIVERY';
ALTER TYPE "OrderStatus" ADD VALUE 'REJECTED' AFTER 'CANCELLED';
ALTER TYPE "OrderStatus" ADD VALUE 'FAILED_DELIVERY' AFTER 'REJECTED';

-- CreateTable
CREATE TABLE "order_status_history" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "fromStatus" "OrderStatus" NOT NULL,
    "toStatus" "OrderStatus" NOT NULL,
    "changedById" UUID NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_status_history_orderId_createdAt_idx"
ON "order_status_history"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "order_status_history_changedById_createdAt_idx"
ON "order_status_history"("changedById", "createdAt");

-- AddForeignKey
ALTER TABLE "order_status_history"
ADD CONSTRAINT "order_status_history_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "orders"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_history"
ADD CONSTRAINT "order_status_history_changedById_fkey"
FOREIGN KEY ("changedById") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
