import type { NextRequest } from "next/server";

import { UserRole } from "@/generated/prisma/client";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireApiRole } from "@/lib/auth/request";
import { profileErrorResponse } from "@/lib/profile-http";
import { changeCustomerPassword } from "@/services/customer-profile.service";
import { passwordChangeSchema } from "@/validations/profile";

export async function POST(request: NextRequest) {
  const authorization = await requireApiRole(request, UserRole.CUSTOMER);
  if (!authorization.authorized) {
    return authorization.response;
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
      authorization.user,
      authorization.token,
      parsed.data,
    );
    return successResponse({ passwordChanged: true });
  } catch (error) {
    return profileErrorResponse(error);
  }
}
