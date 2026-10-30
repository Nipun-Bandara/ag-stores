ALTER TABLE "products"
ADD COLUMN "lowStockThreshold" INTEGER NOT NULL DEFAULT 5;

ALTER TABLE "products"
ADD CONSTRAINT "products_low_stock_threshold_check" CHECK ("lowStockThreshold" >= 0);
