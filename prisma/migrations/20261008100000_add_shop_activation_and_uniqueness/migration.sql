ALTER TABLE "shops"
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX "shops_ownerId_name_key" ON "shops"("ownerId", "name");
CREATE UNIQUE INDEX "shops_phone_key" ON "shops"("phone");
CREATE INDEX "shops_isActive_isOpen_idx" ON "shops"("isActive", "isOpen");
