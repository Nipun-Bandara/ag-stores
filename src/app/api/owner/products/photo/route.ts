import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { UserRole } from "@/generated/prisma/client";
import { getDb } from "@/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireApiRole } from "@/lib/auth/request";
import {
  deletePhoto,
  PhotoError,
  processPhoto,
  readBoundedPhotoRequest,
  uploadPhoto,
} from "@/lib/product-photo-storage";
import { productIdSchema } from "@/validations/product";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const auth = await requireApiRole(request, UserRole.SHOP_OWNER);
  if (!auth.authorized) return auth.response;
  const shopId = request.nextUrl.searchParams.get("shopId");
  const productId = request.nextUrl.searchParams.get("productId");
  if (
    !productIdSchema.safeParse(shopId).success ||
    (productId && !productIdSchema.safeParse(productId).success)
  )
    return errorResponse(
      {
        code: "INVALID_PHOTO_TARGET",
        message: "Select a valid shop or product.",
      },
      400,
    );
  const db = getDb();
  const shop = await db.shop.findFirst({
    where: { id: shopId!, ownerId: auth.user.id },
    select: { id: true },
  });
  if (!shop)
    return errorResponse(
      { code: "SHOP_NOT_FOUND", message: "Shop not found." },
      404,
    );
  if (productId) {
    const product = await db.product.findFirst({
      where: { id: productId, shopId: shop.id },
      select: { id: true },
    });
    if (!product)
      return errorResponse(
        { code: "PRODUCT_NOT_FOUND", message: "Product not found." },
        404,
      );
  }
  let key: string | undefined;
  let uploadId: string | undefined;
  try {
    const bytes = await processPhoto(await readBoundedPhotoRequest(request));
    key = `products/${shop.id}/${randomUUID()}.webp`;
    const upload = await db.productPhotoUpload.create({
      data: {
        shopId: shop.id,
        ownerId: auth.user.id,
        productId: productId || null,
        storageKey: key,
      },
      select: { id: true },
    });
    uploadId = upload.id;
    await uploadPhoto(key, bytes);
    return successResponse(upload, { status: 201 });
  } catch (error) {
    if (key && uploadId) {
      try {
        await deletePhoto(key);
        await db.productPhotoUpload.update({
          where: { id: uploadId },
          data: { deletedAt: new Date(), purgedAt: new Date() },
        });
      } catch {
        /* Scheduled cleanup retries this record. */
      }
    }
    if (error instanceof PhotoError)
      return errorResponse(
        { code: "PHOTO_ERROR", message: error.message },
        error.status,
      );
    console.error("Product photo upload failed", error);
    return errorResponse(
      {
        code: "PHOTO_ERROR",
        message: "Photo upload failed. Please try again.",
      },
      500,
    );
  }
}
