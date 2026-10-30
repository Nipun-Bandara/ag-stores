import type { NextRequest } from "next/server";

import { UserRole } from "@/generated/prisma/client";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireApiRole } from "@/lib/auth/request";
import { productErrorResponse } from "@/lib/product-http";
import {
  getOwnerProduct,
  ProductError,
  updateProduct,
} from "@/services/product.service";
import { productIdSchema, productUpdateSchema } from "@/validations/product";

type ProductContext = { params: Promise<{ productId: string }> };

async function parseProductId(context: ProductContext): Promise<string> {
  const parsed = productIdSchema.safeParse((await context.params).productId);
  if (!parsed.success) {
    throw new ProductError("PRODUCT_NOT_FOUND", "Product not found.", 404);
  }
  return parsed.data;
}

export async function GET(request: NextRequest, context: ProductContext) {
  const authorization = await requireApiRole(request, UserRole.SHOP_OWNER);
  if (!authorization.authorized) return authorization.response;

  try {
    return successResponse(
      await getOwnerProduct(authorization.user, await parseProductId(context)),
    );
  } catch (error) {
    return productErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: ProductContext) {
  const authorization = await requireApiRole(request, UserRole.SHOP_OWNER);
  if (!authorization.authorized) return authorization.response;

  const parsed = productUpdateSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return errorResponse(
      {
        code: "VALIDATION_ERROR",
        message: "Product details are invalid.",
        details: parsed.error.flatten().fieldErrors,
      },
      400,
    );
  }

  try {
    return successResponse(
      await updateProduct(
        authorization.user,
        await parseProductId(context),
        parsed.data,
      ),
    );
  } catch (error) {
    return productErrorResponse(error);
  }
}
