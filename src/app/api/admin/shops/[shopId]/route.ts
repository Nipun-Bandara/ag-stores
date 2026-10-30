import type { NextRequest } from "next/server";

import { UserRole } from "@/generated/prisma/client";
import { errorResponse, successResponse } from "@/lib/api-response";
import { adminShopErrorResponse } from "@/lib/admin-shop-http";
import { requireApiRole } from "@/lib/auth/request";
import {
  AdminShopError,
  getAdminShop,
  updateAdminShop,
} from "@/services/admin-shop.service";
import {
  adminShopIdSchema,
  adminShopInputSchema,
} from "@/validations/admin-shop";

type ShopContext = { params: Promise<{ shopId: string }> };

export async function GET(request: NextRequest, context: ShopContext) {
  const authorization = await requireApiRole(request, UserRole.ADMIN);
  if (!authorization.authorized) return authorization.response;
  const shopId = adminShopIdSchema.safeParse((await context.params).shopId);
  if (!shopId.success) {
    return adminShopErrorResponse(
      new AdminShopError("SHOP_NOT_FOUND", "Shop not found.", 404),
    );
  }

  try {
    return successResponse(await getAdminShop(authorization.user, shopId.data));
  } catch (error) {
    return adminShopErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: ShopContext) {
  const authorization = await requireApiRole(request, UserRole.ADMIN);
  if (!authorization.authorized) return authorization.response;
  const shopId = adminShopIdSchema.safeParse((await context.params).shopId);
  const body = adminShopInputSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!body.success) {
    return errorResponse(
      {
        code: "VALIDATION_ERROR",
        message: "Shop details are invalid.",
        details: body.error.flatten().fieldErrors,
      },
      400,
    );
  }
  if (!shopId.success) {
    return adminShopErrorResponse(
      new AdminShopError("SHOP_NOT_FOUND", "Shop not found.", 404),
    );
  }

  try {
    return successResponse(
      await updateAdminShop(authorization.user, shopId.data, body.data),
    );
  } catch (error) {
    return adminShopErrorResponse(error);
  }
}
