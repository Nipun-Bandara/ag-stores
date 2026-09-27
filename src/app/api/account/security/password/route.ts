import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { authenticateRequest } from "@/lib/auth/request";
import { profileErrorResponse } from "@/lib/profile-http";
import { changeCustomerPassword } from "@/services/customer-profile.service";
import { passwordChangeSchema } from "@/validations/profile";

export async function POST(request: NextRequest) {
  const authentication = await authenticateRequest(request);
  if (!authentication) {
    return errorResponse(
      { code: "UNAUTHENTICATED", message: "Authentication is required." },
      401,
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = passwordChangeSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      {
        code: "VALIDATION_ERROR",
        message: "Password details are invalid.",
        details: parsed.error.flatten().fieldErrors,
      },
      400,
    );
  }

  try {
    await changeCustomerPassword(
      authentication.user,
      authentication.token,
      parsed.data,
    );
    return successResponse({ passwordChanged: true });
  } catch (error) {
    return profileErrorResponse(error);
  }
}
