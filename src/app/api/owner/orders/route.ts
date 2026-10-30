import type { NextRequest } from "next/server";

import { UserRole } from "@/generated/prisma/client";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireApiRole } from "@/lib/auth/request";
import { ownerOrderErrorResponse } from "@/lib/owner-order-http";
import { getOwnerOrderDashboard } from "@/services/owner-order.service";
import { ownerOrderFiltersSchema } from "@/validations/owner-order";

export async function GET(request: NextRequest) {
  const authorization = await requireApiRole(request, UserRole.SHOP_OWNER);
  if (!authorization.authorized) return authorization.response;

  const parsed = ownerOrderFiltersSchema.safeParse({
    status: request.nextUrl.searchParams.get("status") || undefined,
    date: request.nextUrl.searchParams.get("date") || undefined,
    customer: request.nextUrl.searchParams.get("customer") || undefined,
    orderNumber: request.nextUrl.searchParams.get("orderNumber") || undefined,
  });
  if (!parsed.success) {
    return errorResponse(
      {
        code: "VALIDATION_ERROR",
        message: "Order filters are invalid.",
        details: parsed.error.flatten().fieldErrors,
      },
      400,
    );
  }

  try {
    return successResponse(
      await getOwnerOrderDashboard(authorization.user, parsed.data),
    );
  } catch (error) {
    return ownerOrderErrorResponse(error);
  }
}
