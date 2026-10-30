import type { NextRequest } from "next/server";

import { UserRole } from "@/generated/prisma/client";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireApiAnyRole, requireApiRole } from "@/lib/auth/request";
import { categoryErrorResponse } from "@/lib/category-http";
import {
  createCategory,
  listManagedCategories,
} from "@/services/category.service";
import {
  categoryCreateSchema,
  categoryShopIdSchema,
} from "@/validations/category";

export async function GET(request: NextRequest) {
  const authorization = await requireApiAnyRole(request, [
    UserRole.SHOP_OWNER,
    UserRole.ADMIN,
  ]);
  if (!authorization.authorized) return authorization.response;

  const shopIdValue = request.nextUrl.searchParams.get("shopId") ?? undefined;
  const shopId = shopIdValue
    ? categoryShopIdSchema.safeParse(shopIdValue)
    : undefined;
  if (shopId && !shopId.success) {
    return errorResponse(
      { code: "VALIDATION_ERROR", message: "Shop ID is invalid." },
      400,
    );
  }

  try {
    return successResponse(
      await listManagedCategories(
        authorization.user,
        shopId?.success ? shopId.data : undefined,
      ),
    );
  } catch (error) {
    return categoryErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const authorization = await requireApiRole(request, UserRole.SHOP_OWNER);
  if (!authorization.authorized) return authorization.response;

  const parsed = categoryCreateSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return errorResponse(
      {
        code: "VALIDATION_ERROR",
        message: "Category details are invalid.",
        details: parsed.error.flatten().fieldErrors,
      },
      400,
    );
  }

  try {
    return successResponse(
      await createCategory(authorization.user, parsed.data),
      { status: 201 },
    );
  } catch (error) {
    return categoryErrorResponse(error);
  }
}
