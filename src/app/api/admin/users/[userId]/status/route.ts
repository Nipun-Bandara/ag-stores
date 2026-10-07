import type { NextRequest } from "next/server";

import { UserRole } from "@/generated/prisma/client";
import { errorResponse, successResponse } from "@/lib/api-response";
import { adminUserErrorResponse } from "@/lib/admin-user-http";
import { requireApiRole } from "@/lib/auth/request";
import {
  AdminUserError,
  setAdminUserStatus,
} from "@/services/admin-user.service";
import {
  adminUserIdSchema,
  adminUserStatusSchema,
} from "@/validations/admin-user";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  const authorization = await requireApiRole(request, UserRole.ADMIN);
  if (!authorization.authorized) return authorization.response;

  const userId = adminUserIdSchema.safeParse((await context.params).userId);
  const body = adminUserStatusSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!body.success) {
    return errorResponse(
      {
        code: "VALIDATION_ERROR",
        message: "User status is invalid.",
        details: body.error.flatten().fieldErrors,
      },
      400,
    );
  }
  if (!userId.success) {
    return adminUserErrorResponse(
      new AdminUserError("USER_NOT_FOUND", "User not found.", 404),
    );
  }

  try {
    return successResponse(
      await setAdminUserStatus(authorization.user, userId.data, body.data),
    );
  } catch (error) {
    return adminUserErrorResponse(error);
  }
}
