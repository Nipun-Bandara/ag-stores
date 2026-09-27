-- AlterTable
ALTER TABLE "customer_addresses"
ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "customer_addresses_customerId_isDefault_idx"
ON "customer_addresses"("customerId", "isDefault");

-- A customer may have at most one default delivery address. Prisma does not
-- currently express partial unique indexes, so this invariant lives here.
CREATE UNIQUE INDEX "customer_addresses_one_default_per_customer_key"
ON "customer_addresses"("customerId")
WHERE "isDefault" = true;
