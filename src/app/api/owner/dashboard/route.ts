import type { NextRequest } from "next/server";

import { UserRole } from "@/generated/prisma/client";
import { successResponse } from "@/lib/api-response";
import { requireApiRole } from "@/lib/auth/request";
import { getOwnerDashboard } from "@/services/owner-dashboard.service";

export async function GET(request: NextRequest) {
  const authorization = await requireApiRole(request, UserRole.SHOP_OWNER);
  if (!authorization.authorized) return authorization.response;

  return successResponse({
    dashboard: UserRole.SHOP_OWNER,
    user: authorization.user,
    metrics: await getOwnerDashboard(authorization.user),
  });
}
