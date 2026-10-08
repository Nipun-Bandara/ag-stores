import type { NextRequest } from "next/server";

import { UserRole } from "@/generated/prisma/client";
import { successResponse, errorResponse } from "@/lib/api-response";
import { authenticateRequest } from "@/lib/auth/request";
import { setLocaleCookie } from "@/lib/i18n/cookie";
import { requireSameOrigin } from "@/lib/security/request-origin";
import { updateCustomerLanguage } from "@/services/customer-profile.service";
import { localePreferenceSchema } from "@/validations/locale";

export async function PATCH(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const parsed = localePreferenceSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return errorResponse(
      { code: "VALIDATION_ERROR", message: "Language preference is invalid." },
      400,
    );
  }

  const authentication = await authenticateRequest(request);
  if (authentication?.user.role === UserRole.CUSTOMER) {
    await updateCustomerLanguage(authentication.user, parsed.data.locale);
  }

  const response = successResponse({ locale: parsed.data.locale });
  setLocaleCookie(response, parsed.data.locale);
  return response;
}
