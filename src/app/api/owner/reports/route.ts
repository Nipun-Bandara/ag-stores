import type { NextRequest } from "next/server";

import { UserRole } from "@/generated/prisma/client";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireApiRole } from "@/lib/auth/request";
import { getOwnerReports } from "@/services/owner-report.service";
import { ownerReportFiltersSchema } from "@/validations/owner-report";

export async function GET(request: NextRequest) {
  const authorization = await requireApiRole(request, UserRole.SHOP_OWNER);
  if (!authorization.authorized) return authorization.response;

  const filters = ownerReportFiltersSchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!filters.success) {
    return errorResponse(
      {
        code: "VALIDATION_ERROR",
        message: "Report filters are invalid.",
        details: filters.error.flatten().fieldErrors,
      },
      400,
    );
  }
  return successResponse(
    await getOwnerReports(authorization.user, filters.data),
  );
}
