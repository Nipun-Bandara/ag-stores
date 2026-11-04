CREATE TYPE "SellingUnit" AS ENUM ('UNIT', 'KG');
ALTER TABLE "products"
  ADD COLUMN "itemCode" VARCHAR(100),
  ADD COLUMN "barcode" VARCHAR(100),
  ADD COLUMN "sellingUnit" "SellingUnit" NOT NULL DEFAULT 'UNIT',
  ADD COLUMN "minimumOrderQuantity" DECIMAL(13,3) NOT NULL DEFAULT 1,
  ADD COLUMN "orderingIncrement" DECIMAL(13,3) NOT NULL DEFAULT 1,
  ALTER COLUMN "stockQuantity" TYPE DECIMAL(13,3),
  ALTER COLUMN "lowStockThreshold" TYPE DECIMAL(13,3);
ALTER TABLE "order_items"
  ADD COLUMN "sellingUnit" "SellingUnit" NOT NULL DEFAULT 'UNIT',
  ALTER COLUMN "quantity" TYPE DECIMAL(13,3);
CREATE UNIQUE INDEX "products_shopId_itemCode_key" ON "products"("shopId", "itemCode");
CREATE UNIQUE INDEX "products_shopId_barcode_key" ON "products"("shopId", "barcode");
ALTER TABLE "products" ADD CONSTRAINT "products_selling_setup_check" CHECK (
  "minimumOrderQuantity" > 0 AND "orderingIncrement" > 0 AND
  "stockQuantity" >= 0 AND "lowStockThreshold" >= 0 AND
  ("sellingUnit" = 'KG' OR (
    mod("stockQuantity", 1) = 0 AND mod("lowStockThreshold", 1) = 0 AND
    mod("minimumOrderQuantity", 1) = 0 AND mod("orderingIncrement", 1) = 0
  ))
);
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_quantity_check";
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_quantity_check" CHECK (
  "quantity" > 0 AND ("sellingUnit" = 'KG' OR mod("quantity", 1) = 0)
);
