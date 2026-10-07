import type { NextRequest } from "next/server";

import { UserRole } from "@/generated/prisma/client";
import { successResponse } from "@/lib/api-response";
import { adminUserErrorResponse } from "@/lib/admin-user-http";
import { requireApiRole } from "@/lib/auth/request";
import { AdminUserError, getAdminUser } from "@/services/admin-user.service";
import { adminUserIdSchema } from "@/validations/admin-user";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  const authorization = await requireApiRole(request, UserRole.ADMIN);
  if (!authorization.authorized) return authorization.response;

  const userId = adminUserIdSchema.safeParse((await context.params).userId);
  if (!userId.success) {
    return adminUserErrorResponse(
      new AdminUserError("USER_NOT_FOUND", "User not found.", 404),
    );
  }

  try {
    return successResponse(await getAdminUser(authorization.user, userId.data));
  } catch (error) {
    return adminUserErrorResponse(error);
  }
}
