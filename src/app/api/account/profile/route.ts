import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { requireApiAuth } from "@/lib/auth/request";
import { profileErrorResponse } from "@/lib/profile-http";
import {
  getCustomerProfile,
  updateCustomerProfile,
} from "@/services/customer-profile.service";
import { profileUpdateSchema } from "@/validations/profile";
import { setLocaleCookie } from "@/lib/i18n/cookie";
import { localeFromPreference } from "@/lib/i18n/config";

export async function GET(request: NextRequest) {
  const authorization = await requireApiAuth(request);
  if (!authorization.authorized) {
    return authorization.response;
  }

  try {
    return successResponse(await getCustomerProfile(authorization.user));
  } catch (error) {
    return profileErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  const authorization = await requireApiAuth(request);
  if (!authorization.authorized) {
    return authorization.response;
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      {
        code: "VALIDATION_ERROR",
        message: "Profile details are invalid.",
        details: parsed.error.flatten().fieldErrors,
      },
      400,
    );
  }

  try {
    const profile = await updateCustomerProfile(
      authorization.user,
      parsed.data,
    );
    const response = successResponse(profile);
    response.headers.set("Cache-Control", "no-store");
    setLocaleCookie(response, localeFromPreference(profile.preferredLanguage));
    return response;
  } catch (error) {
    return profileErrorResponse(error);
  }
}
