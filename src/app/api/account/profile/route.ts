import type { NextRequest } from "next/server";

import { UserRole } from "@/generated/prisma/client";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireApiRole } from "@/lib/auth/request";
import { profileErrorResponse } from "@/lib/profile-http";
import {
  getCustomerProfile,
  updateCustomerProfile,
} from "@/services/customer-profile.service";
import { profileUpdateSchema } from "@/validations/profile";

export async function GET(request: NextRequest) {
  const authorization = await requireApiRole(request, UserRole.CUSTOMER);
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
  const authorization = await requireApiRole(request, UserRole.CUSTOMER);
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
    return successResponse(
      await updateCustomerProfile(authorization.user, parsed.data),
    );
  } catch (error) {
    return profileErrorResponse(error);
  }
}
