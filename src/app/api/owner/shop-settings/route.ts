import type { NextRequest } from "next/server";

import { UserRole } from "@/generated/prisma/client";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireApiRole } from "@/lib/auth/request";
import { shopSettingsErrorResponse } from "@/lib/shop-settings-http";
import {
  listOwnerShopSettings,
  updateShopSettings,
} from "@/services/shop-settings.service";
import { shopSettingsUpdateSchema } from "@/validations/shop-settings";

export async function GET(request: NextRequest) {
  const authorization = await requireApiRole(request, UserRole.SHOP_OWNER);
  if (!authorization.authorized) return authorization.response;

  try {
    return successResponse(await listOwnerShopSettings(authorization.user));
  } catch (error) {
    return shopSettingsErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  const authorization = await requireApiRole(request, UserRole.SHOP_OWNER);
  if (!authorization.authorized) return authorization.response;
  const parsed = shopSettingsUpdateSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return errorResponse(
      {
        code: "VALIDATION_ERROR",
        message: "Shop settings are invalid.",
        details: parsed.error.flatten().fieldErrors,
      },
      400,
    );
  }

  try {
    return successResponse(
      await updateShopSettings(authorization.user, parsed.data),
    );
  } catch (error) {
    return shopSettingsErrorResponse(error);
  }
}
