import type { NextRequest } from "next/server";

import type { UserRole } from "@/generated/prisma/client";
import { successResponse } from "@/lib/api-response";
import { requireApiRole } from "@/lib/auth/request";

export async function roleDashboardResponse(
  request: NextRequest,
  role: UserRole,
) {
  const authorization = await requireApiRole(request, role);
  if (!authorization.authorized) {
    return authorization.response;
  }

  return successResponse({
    dashboard: role,
    user: authorization.user,
  });
}
