import "dotenv/config";
import { getDb } from "../src/db";
import { cleanupProductPhotos } from "../src/services/product-photo-cleanup.service";

if (process.env.ALLOW_PRODUCT_PHOTO_CLEANUP !== "1")
  throw new Error(
    "Set ALLOW_PRODUCT_PHOTO_CLEANUP=1 to run product photo cleanup.",
  );

const db = getDb();
const result = await cleanupProductPhotos(db);
console.log(result);
await db.$disconnect();
if (result.failed) process.exitCode = 1;
