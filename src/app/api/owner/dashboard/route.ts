import type { NextRequest } from "next/server";

import { UserRole } from "@/generated/prisma/client";
import { roleDashboardResponse } from "@/lib/auth/role-api";

export function GET(request: NextRequest) {
  return roleDashboardResponse(request, UserRole.SHOP_OWNER);
}
