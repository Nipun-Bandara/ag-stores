-- Add identity fields without replacing the immutable UUID key or its foreign keys.
BEGIN;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "firstName" VARCHAR(75);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastName" VARCHAR(75);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "legacyName" VARCHAR(151);
ALTER TABLE "users" ALTER COLUMN "legacyName" TYPE VARCHAR(151);
ALTER TABLE "users" ADD COLUMN "developmentFixtureKey" VARCHAR(32);
CREATE UNIQUE INDEX "users_developmentFixtureKey_key" ON "users"("developmentFixtureKey");
UPDATE "users" SET "legacyName" = "name" WHERE "legacyName" IS NULL;

-- Existing international/local formatting becomes one canonical mobile identity.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM (
      SELECT CASE
        WHEN regexp_replace("phone", '[[:space:]-]', '', 'g') ~ '^07[0-9]{8}$'
          THEN '+94' || substring(regexp_replace("phone", '[[:space:]-]', '', 'g') FROM 2)
        WHEN regexp_replace("phone", '[[:space:]-]', '', 'g') ~ '^\+947[0-9]{8}$'
          THEN regexp_replace("phone", '[[:space:]-]', '', 'g')
        ELSE NULL END AS canonical
      FROM "users"
    ) normalized WHERE canonical IS NOT NULL GROUP BY canonical HAVING count(*) > 1
  ) THEN RAISE EXCEPTION 'Mobile normalization collision; resolve duplicate users before migration'; END IF;
END $$;
UPDATE "users" SET "phone" = CASE
  WHEN regexp_replace("phone", '[[:space:]-]', '', 'g') ~ '^07[0-9]{8}$'
    THEN '+94' || substring(regexp_replace("phone", '[[:space:]-]', '', 'g') FROM 2)
  WHEN regexp_replace("phone", '[[:space:]-]', '', 'g') ~ '^\+947[0-9]{8}$'
    THEN regexp_replace("phone", '[[:space:]-]', '', 'g')
  ELSE "phone" END
WHERE "phone" IS NOT NULL;

-- Preserve the exact old name in legacyName, splitting at the final space.
UPDATE "users" SET
  "firstName" = COALESCE("firstName", regexp_replace(btrim("legacyName"), '[[:space:]]+[^[:space:]]+$', '')),
  "lastName" = COALESCE("lastName", substring(btrim("legacyName") FROM '[^[:space:]]+$'))
WHERE ("firstName" IS NULL OR "lastName" IS NULL) AND btrim("legacyName") ~ '[[:space:]]';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "users" WHERE "phone" IS NULL OR "phone" !~ '^\+947[0-9]{8}$'
    OR "firstName" IS NULL OR btrim("firstName") = '' OR length("firstName") > 75
    OR "lastName" IS NULL OR btrim("lastName") = '' OR length("lastName") > 75)
  THEN RAISE EXCEPTION 'Unresolved account identity; run account backfill check and correct records before migration'; END IF;
END $$;

ALTER TABLE "users" ALTER COLUMN "firstName" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "lastName" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "phone" SET NOT NULL;
ALTER TABLE "users" ALTER COLUMN "name" SET DEFAULT '';
ALTER TABLE "users" ALTER COLUMN "name" TYPE VARCHAR(151);
ALTER TABLE "users" ADD CONSTRAINT "users_mobile_canonical_check" CHECK ("phone" ~ '^\+947[0-9]{8}$');
ALTER TABLE "users" ADD CONSTRAINT "users_names_nonblank_check" CHECK (btrim("firstName") <> '' AND btrim("lastName") <> '');

-- name is a read-compatible display cache, never a second editable identity.
CREATE OR REPLACE FUNCTION derive_user_full_name() RETURNS trigger AS $$
BEGIN
  NEW."name" := btrim(NEW."firstName" || ' ' || NEW."lastName");
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER users_derive_full_name BEFORE INSERT OR UPDATE OF "firstName", "lastName", "name"
ON "users" FOR EACH ROW EXECUTE FUNCTION derive_user_full_name();
UPDATE "users" SET "name" = btrim("firstName" || ' ' || "lastName");
COMMIT;
