ALTER TABLE "products" ADD COLUMN "imageStorageKey" VARCHAR(255);
CREATE UNIQUE INDEX "products_imageStorageKey_key" ON "products"("imageStorageKey");
CREATE TABLE "product_photo_uploads" (
  "id" UUID NOT NULL,
  "shopId" UUID NOT NULL,
  "ownerId" UUID NOT NULL,
  "productId" UUID,
  "storageKey" VARCHAR(255) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "attachedAt" TIMESTAMPTZ(3),
  "deletedAt" TIMESTAMPTZ(3),
  "purgedAt" TIMESTAMPTZ(3),
  CONSTRAINT "product_photo_uploads_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_photo_uploads_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "product_photo_uploads_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "product_photo_uploads_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "product_photo_uploads_storageKey_key" ON "product_photo_uploads"("storageKey");
CREATE INDEX "product_photo_uploads_attachedAt_createdAt_idx" ON "product_photo_uploads"("attachedAt", "createdAt");
