-- The existing products.price remains the regular/reference price. No discounts are invented.
CREATE TABLE "product_discount_tiers" (
  "id" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "position" INTEGER NOT NULL,
  "minimumQuantity" DECIMAL(13,3) NOT NULL,
  "discountAmount" DECIMAL(12,2) NOT NULL,
  CONSTRAINT "product_discount_tiers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_discount_tiers_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "product_discount_tiers_values_check" CHECK ("position" BETWEEN 1 AND 4 AND "minimumQuantity" > 0 AND "discountAmount" >= 0)
);
CREATE UNIQUE INDEX "product_discount_tiers_productId_position_key" ON "product_discount_tiers"("productId", "position");
CREATE UNIQUE INDEX "product_discount_tiers_productId_minimumQuantity_key" ON "product_discount_tiers"("productId", "minimumQuantity");
-- NULL means unknown historical reference/discount, not a fabricated historical saving.
ALTER TABLE "order_items" ADD COLUMN "regularPrice" DECIMAL(12,2), ADD COLUMN "appliedDiscount" DECIMAL(12,2);
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_price_snapshot_check" CHECK (
  ("regularPrice" IS NULL AND "appliedDiscount" IS NULL) OR
  ("regularPrice" IS NOT NULL AND "appliedDiscount" IS NOT NULL AND "regularPrice" >= 0 AND "appliedDiscount" >= 0 AND "unitPrice" = "regularPrice" - "appliedDiscount")
);
