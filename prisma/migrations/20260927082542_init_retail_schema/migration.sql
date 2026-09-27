-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'SHOP_OWNER', 'DELIVERY_PERSON', 'ADMIN');

-- CreateEnum
CREATE TYPE "PreferredLanguage" AS ENUM ('EN', 'SI');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CatalogStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeliveryBatchStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "phone" VARCHAR(32) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL,
    "preferredLanguage" "PreferredLanguage" NOT NULL DEFAULT 'EN',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shops" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(10,6) NOT NULL,
    "phone" VARCHAR(32) NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "shops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_addresses" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "label" VARCHAR(80) NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(10,6) NOT NULL,

    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "shopId" UUID NOT NULL,
    "nameEn" VARCHAR(120) NOT NULL,
    "nameSi" VARCHAR(120),
    "status" "CatalogStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "shopId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "nameEn" VARCHAR(180) NOT NULL,
    "nameSi" VARCHAR(180),
    "descriptionEn" TEXT,
    "descriptionSi" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "stockQuantity" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" VARCHAR(2048),
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "shopId" UUID NOT NULL,
    "deliveryAddressId" UUID NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "deliveryFee" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "customerNote" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_batches" (
    "id" UUID NOT NULL,
    "deliveryPersonId" UUID NOT NULL,
    "status" "DeliveryBatchStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),

    CONSTRAINT "delivery_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_batch_orders" (
    "batchId" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,

    CONSTRAINT "delivery_batch_orders_pkey" PRIMARY KEY ("batchId","orderId")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE INDEX "shops_ownerId_idx" ON "shops"("ownerId");

-- CreateIndex
CREATE INDEX "shops_isOpen_idx" ON "shops"("isOpen");

-- CreateIndex
CREATE INDEX "customer_addresses_customerId_idx" ON "customer_addresses"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_addresses_id_customerId_key" ON "customer_addresses"("id", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_addresses_customerId_label_key" ON "customer_addresses"("customerId", "label");

-- CreateIndex
CREATE INDEX "categories_shopId_status_idx" ON "categories"("shopId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "categories_id_shopId_key" ON "categories"("id", "shopId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_shopId_nameEn_key" ON "categories"("shopId", "nameEn");

-- CreateIndex
CREATE INDEX "products_categoryId_shopId_idx" ON "products"("categoryId", "shopId");

-- CreateIndex
CREATE INDEX "products_shopId_isAvailable_idx" ON "products"("shopId", "isAvailable");

-- CreateIndex
CREATE UNIQUE INDEX "products_shopId_nameEn_key" ON "products"("shopId", "nameEn");

-- CreateIndex
CREATE INDEX "orders_customerId_createdAt_idx" ON "orders"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "orders_shopId_status_createdAt_idx" ON "orders"("shopId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "orders_deliveryAddressId_customerId_idx" ON "orders"("deliveryAddressId", "customerId");

-- CreateIndex
CREATE INDEX "orders_status_createdAt_idx" ON "orders"("status", "createdAt");

-- CreateIndex
CREATE INDEX "order_items_productId_idx" ON "order_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "order_items_orderId_productId_key" ON "order_items"("orderId", "productId");

-- CreateIndex
CREATE INDEX "delivery_batches_deliveryPersonId_status_idx" ON "delivery_batches"("deliveryPersonId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_batch_orders_orderId_key" ON "delivery_batch_orders"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_batch_orders_batchId_sequence_key" ON "delivery_batch_orders"("batchId", "sequence");

-- AddForeignKey
ALTER TABLE "shops" ADD CONSTRAINT "shops_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_shopId_fkey" FOREIGN KEY ("categoryId", "shopId") REFERENCES "categories"("id", "shopId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_deliveryAddressId_customerId_fkey" FOREIGN KEY ("deliveryAddressId", "customerId") REFERENCES "customer_addresses"("id", "customerId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_batches" ADD CONSTRAINT "delivery_batches_deliveryPersonId_fkey" FOREIGN KEY ("deliveryPersonId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_batch_orders" ADD CONSTRAINT "delivery_batch_orders_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "delivery_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_batch_orders" ADD CONSTRAINT "delivery_batch_orders_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Domain checks not expressible in the Prisma schema.
ALTER TABLE "shops"
  ADD CONSTRAINT "shops_latitude_check" CHECK ("latitude" BETWEEN -90 AND 90),
  ADD CONSTRAINT "shops_longitude_check" CHECK ("longitude" BETWEEN -180 AND 180);

ALTER TABLE "customer_addresses"
  ADD CONSTRAINT "customer_addresses_latitude_check" CHECK ("latitude" BETWEEN -90 AND 90),
  ADD CONSTRAINT "customer_addresses_longitude_check" CHECK ("longitude" BETWEEN -180 AND 180);

ALTER TABLE "products"
  ADD CONSTRAINT "products_price_check" CHECK ("price" >= 0),
  ADD CONSTRAINT "products_stock_quantity_check" CHECK ("stockQuantity" >= 0);

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_subtotal_check" CHECK ("subtotal" >= 0),
  ADD CONSTRAINT "orders_delivery_fee_check" CHECK ("deliveryFee" >= 0),
  ADD CONSTRAINT "orders_total_check" CHECK ("total" = "subtotal" + "deliveryFee");

ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_quantity_check" CHECK ("quantity" > 0),
  ADD CONSTRAINT "order_items_unit_price_check" CHECK ("unitPrice" >= 0);

ALTER TABLE "delivery_batches"
  ADD CONSTRAINT "delivery_batches_dates_check"
    CHECK (
      "completedAt" IS NULL
      OR ("startedAt" IS NOT NULL AND "completedAt" >= "startedAt")
    );

ALTER TABLE "delivery_batch_orders"
  ADD CONSTRAINT "delivery_batch_orders_sequence_check" CHECK ("sequence" > 0);
