ALTER TYPE "AuditAction" ADD VALUE 'ORDER_PACKING_UPDATED';

ALTER TABLE "shops" ADD COLUMN "weightDifferenceAllowancePct" DECIMAL(5,2) NOT NULL DEFAULT 10.00;
ALTER TABLE "shops" ADD CONSTRAINT "shops_weight_allowance_check" CHECK ("weightDifferenceAllowancePct" BETWEEN 0 AND 100);

-- NULL estimated amounts and packingRequired=false keep old orders readable as historical orders.
ALTER TABLE "orders"
  ADD COLUMN "estimatedSubtotal" DECIMAL(12,2),
  ADD COLUMN "estimatedTotal" DECIMAL(12,2),
  ADD COLUMN "packingRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "packingVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "packingFinalizedAt" TIMESTAMPTZ(3);
ALTER TABLE "orders" ADD CONSTRAINT "orders_packing_version_check" CHECK ("packingVersion" >= 0);

ALTER TABLE "order_items"
  ADD COLUMN "packedQuantity" DECIMAL(13,3),
  ADD COLUMN "contactAgreedAt" TIMESTAMPTZ(3),
  ADD COLUMN "contactNote" VARCHAR(500),
  ADD COLUMN "contactWeight" DECIMAL(13,3);
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_packing_check" CHECK (
  ("packedQuantity" IS NULL OR ("sellingUnit" = 'KG' AND "packedQuantity" > 0))
  AND (("contactAgreedAt" IS NULL AND "contactNote" IS NULL AND "contactWeight" IS NULL)
    OR ("contactAgreedAt" IS NOT NULL AND "contactNote" IS NOT NULL AND length(trim("contactNote")) > 0 AND "contactWeight" IS NOT NULL AND "packedQuantity" IS NOT NULL AND "contactWeight" = "packedQuantity"))
);
