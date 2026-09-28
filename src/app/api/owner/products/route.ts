import type { NextRequest } from "next/server";

import { UserRole } from "@/generated/prisma/client";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireApiRole } from "@/lib/auth/request";
import { productErrorResponse } from "@/lib/product-http";
import { createProduct, listOwnerProducts } from "@/services/product.service";
import {
  productCategoryFilterSchema,
  productCreateSchema,
  productSearchSchema,
} from "@/validations/product";

export async function GET(request: NextRequest) {
  const authorization = await requireApiRole(request, UserRole.SHOP_OWNER);
  if (!authorization.authorized) return authorization.response;

  const categoryValue = request.nextUrl.searchParams.get("categoryId");
  const searchValue = request.nextUrl.searchParams.get("search");
  const category = categoryValue
    ? productCategoryFilterSchema.safeParse(categoryValue)
    : undefined;
  const search = searchValue
    ? productSearchSchema.safeParse(searchValue)
    : undefined;
  if ((category && !category.success) || (search && !search.success)) {
    return errorResponse(
      { code: "VALIDATION_ERROR", message: "Product filters are invalid." },
      400,
    );
  }

  try {
    return successResponse(
      await listOwnerProducts(authorization.user, {
        ...(category?.success ? { categoryId: category.data } : {}),
        ...(search?.success ? { search: search.data } : {}),
      }),
    );
  } catch (error) {
    return productErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const authorization = await requireApiRole(request, UserRole.SHOP_OWNER);
  if (!authorization.authorized) return authorization.response;

  const parsed = productCreateSchema.safeParse(
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
      await createProduct(authorization.user, parsed.data),
      { status: 201 },
    );
  } catch (error) {
    return productErrorResponse(error);
  }
}
