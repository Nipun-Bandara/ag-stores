import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { authenticateRequest } from "@/lib/auth/request";
import { profileErrorResponse } from "@/lib/profile-http";
import {
  getCustomerProfile,
  updateCustomerProfile,
} from "@/services/customer-profile.service";
import { profileUpdateSchema } from "@/validations/profile";

function unauthenticatedResponse() {
  return errorResponse(
    { code: "UNAUTHENTICATED", message: "Authentication is required." },
    401,
  );
}

export async function GET(request: NextRequest) {
  const authentication = await authenticateRequest(request);
  if (!authentication) {
    return unauthenticatedResponse();
  }

  try {
    return successResponse(await getCustomerProfile(authentication.user));
  } catch (error) {
    return profileErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  const authentication = await authenticateRequest(request);
  if (!authentication) {
    return unauthenticatedResponse();
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
      await updateCustomerProfile(authentication.user, parsed.data),
    );
  } catch (error) {
    return profileErrorResponse(error);
  }
}
