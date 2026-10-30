import type { NextRequest } from "next/server";

import { UserRole } from "@/generated/prisma/client";
import { errorResponse, successResponse } from "@/lib/api-response";
import { adminShopErrorResponse } from "@/lib/admin-shop-http";
import { requireApiRole } from "@/lib/auth/request";
import {
  createAdminShop,
  getAdminShopManagement,
} from "@/services/admin-shop.service";
import { adminShopInputSchema } from "@/validations/admin-shop";

export async function GET(request: NextRequest) {
  const authorization = await requireApiRole(request, UserRole.ADMIN);
  if (!authorization.authorized) return authorization.response;

  try {
    return successResponse(await getAdminShopManagement(authorization.user));
  } catch (error) {
    return adminShopErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const authorization = await requireApiRole(request, UserRole.ADMIN);
  if (!authorization.authorized) return authorization.response;
  const parsed = adminShopInputSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return errorResponse(
      {
        code: "VALIDATION_ERROR",
        message: "Shop details are invalid.",
        details: parsed.error.flatten().fieldErrors,
      },
      400,
    );
  }

  try {
    return successResponse(
      await createAdminShop(authorization.user, parsed.data),
      { status: 201 },
    );
  } catch (error) {
    return adminShopErrorResponse(error);
  }
}
