-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateIndex
CREATE INDEX "products_nameEn_trgm_idx" ON "products" USING GIN ("nameEn" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "products_nameSi_trgm_idx" ON "products" USING GIN ("nameSi" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "products_descriptionEn_trgm_idx" ON "products" USING GIN ("descriptionEn" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "products_descriptionSi_trgm_idx" ON "products" USING GIN ("descriptionSi" gin_trgm_ops);

