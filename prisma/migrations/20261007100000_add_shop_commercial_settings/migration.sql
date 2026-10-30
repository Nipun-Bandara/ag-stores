ALTER TABLE "shops"
  ADD COLUMN "minimumOrderAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "deliveryFee" DECIMAL(12,2) NOT NULL DEFAULT 250,
  ADD COLUMN "maximumDeliveryRadiusKm" DECIMAL(8,2) NOT NULL DEFAULT 50;

ALTER TABLE "shops"
  ADD CONSTRAINT "shops_minimum_order_amount_check" CHECK ("minimumOrderAmount" >= 0),
  ADD CONSTRAINT "shops_delivery_fee_check" CHECK ("deliveryFee" >= 0),
  ADD CONSTRAINT "shops_maximum_delivery_radius_check" CHECK ("maximumDeliveryRadiusKm" > 0);
