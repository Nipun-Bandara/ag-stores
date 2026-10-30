import type { NextRequest } from "next/server";

import { UserRole } from "@/generated/prisma/client";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireApiRole } from "@/lib/auth/request";
import { listAuditLogs } from "@/services/audit-log.service";
import { auditLogFiltersSchema } from "@/validations/audit-log";

export async function GET(request: NextRequest) {
  const authorization = await requireApiRole(request, UserRole.ADMIN);
  if (!authorization.authorized) return authorization.response;

  const filters = auditLogFiltersSchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!filters.success) {
    return errorResponse(
      {
        code: "VALIDATION_ERROR",
        message: "Audit log filters are invalid.",
        details: filters.error.flatten().fieldErrors,
      },
      400,
    );
  }

  return successResponse(
    await listAuditLogs(authorization.user, {
      ...(filters.data.action ? { action: filters.data.action } : {}),
      ...(filters.data.entityType
        ? { entityType: filters.data.entityType }
        : {}),
    }),
  );
}
