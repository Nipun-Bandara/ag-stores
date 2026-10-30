ALTER TABLE "users" ADD COLUMN "assignedShopId" UUID;

ALTER TABLE "users"
ADD CONSTRAINT "users_assignedShopId_fkey"
FOREIGN KEY ("assignedShopId") REFERENCES "shops"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "users_assignedShopId_status_idx"
ON "users"("assignedShopId", "status");
