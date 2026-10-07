import type { NextRequest } from "next/server";

import { UserRole } from "@/generated/prisma/client";
import { errorResponse, successResponse } from "@/lib/api-response";
import { adminUserErrorResponse } from "@/lib/admin-user-http";
import { requireApiRole } from "@/lib/auth/request";
import { listAdminUsers } from "@/services/admin-user.service";
import { adminUserFiltersSchema } from "@/validations/admin-user";

export async function GET(request: NextRequest) {
  const authorization = await requireApiRole(request, UserRole.ADMIN);
  if (!authorization.authorized) return authorization.response;

  const parsed = adminUserFiltersSchema.safeParse({
    search: request.nextUrl.searchParams.get("search") || undefined,
    role: request.nextUrl.searchParams.get("role") || undefined,
    status: request.nextUrl.searchParams.get("status") || undefined,
  });
  if (!parsed.success) {
    return errorResponse(
      { code: "VALIDATION_ERROR", message: "User filters are invalid." },
      400,
    );
  }

  try {
    return successResponse(
      await listAdminUsers(authorization.user, parsed.data),
    );
  } catch (error) {
    return adminUserErrorResponse(error);
  }
}
