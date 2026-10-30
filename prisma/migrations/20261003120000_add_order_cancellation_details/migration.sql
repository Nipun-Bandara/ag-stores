-- Store cancellation details directly on the order for customer and management views.
ALTER TABLE "orders"
ADD COLUMN "cancelledAt" TIMESTAMPTZ(3),
ADD COLUMN "cancellationReason" VARCHAR(500);

-- Backfill existing cancelled orders from their audit event when possible.
UPDATE "orders" AS "order"
SET
    "cancelledAt" = COALESCE((
        SELECT "history"."createdAt"
        FROM "order_status_history" AS "history"
        WHERE "history"."orderId" = "order"."id"
          AND "history"."toStatus" = 'CANCELLED'
        ORDER BY "history"."createdAt" DESC
        LIMIT 1
    ), "order"."updatedAt"),
    "cancellationReason" = (
        SELECT "history"."note"
        FROM "order_status_history" AS "history"
        WHERE "history"."orderId" = "order"."id"
          AND "history"."toStatus" = 'CANCELLED'
        ORDER BY "history"."createdAt" DESC
        LIMIT 1
    )
WHERE "order"."status" = 'CANCELLED';

-- Cover environments where a legacy cancelled order has no history row.
UPDATE "orders"
SET "cancelledAt" = "updatedAt"
WHERE "status" = 'CANCELLED' AND "cancelledAt" IS NULL;

CREATE INDEX "orders_cancelledAt_idx" ON "orders"("cancelledAt");
