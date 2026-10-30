import type { NextRequest } from "next/server";

import { UserRole } from "@/generated/prisma/client";
import { errorResponse, successResponse } from "@/lib/api-response";
import { adminShopErrorResponse } from "@/lib/admin-shop-http";
import { requireApiRole } from "@/lib/auth/request";
import {
  AdminShopError,
  setAdminShopStatus,
} from "@/services/admin-shop.service";
import {
  adminShopIdSchema,
  adminShopStatusSchema,
} from "@/validations/admin-shop";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ shopId: string }> },
) {
  const authorization = await requireApiRole(request, UserRole.ADMIN);
  if (!authorization.authorized) return authorization.response;
  const shopId = adminShopIdSchema.safeParse((await context.params).shopId);
  const body = adminShopStatusSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!body.success) {
    return errorResponse(
      { code: "VALIDATION_ERROR", message: "Shop status is invalid." },
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
      await setAdminShopStatus(authorization.user, shopId.data, body.data),
    );
  } catch (error) {
    return adminShopErrorResponse(error);
  }
}
