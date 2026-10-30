import type { NextRequest } from "next/server";

import { UserRole } from "@/generated/prisma/client";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireApiRole } from "@/lib/auth/request";
import { productErrorResponse } from "@/lib/product-http";
import { ProductError, updateProductStock } from "@/services/product.service";
import { productIdSchema, productStockSchema } from "@/validations/product";

type ProductContext = { params: Promise<{ productId: string }> };

export async function PATCH(request: NextRequest, context: ProductContext) {
  const authorization = await requireApiRole(request, UserRole.SHOP_OWNER);
  if (!authorization.authorized) return authorization.response;

  const parsed = productStockSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return errorResponse(
      {
        code: "VALIDATION_ERROR",
        message: "Stock quantity is invalid.",
        details: parsed.error.flatten().fieldErrors,
      },
      400,
    );
  }

  try {
    const productId = productIdSchema.safeParse(
      (await context.params).productId,
    );
    if (!productId.success) {
      throw new ProductError("PRODUCT_NOT_FOUND", "Product not found.", 404);
    }
    return successResponse(
      await updateProductStock(authorization.user, productId.data, parsed.data),
    );
  } catch (error) {
    return productErrorResponse(error);
  }
}
