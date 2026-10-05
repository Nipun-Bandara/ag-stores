import type { NextRequest } from "next/server";

import { UserRole } from "@/generated/prisma/client";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireApiRole } from "@/lib/auth/request";
import { deliveryOrderErrorResponse } from "@/lib/delivery-order-http";
import { listAvailableDeliveryOrders } from "@/services/delivery-order.service";
import { availableDeliveryOrderFiltersSchema } from "@/validations/delivery-order";

export async function GET(request: NextRequest) {
  const authorization = await requireApiRole(request, UserRole.DELIVERY_PERSON);
  if (!authorization.authorized) return authorization.response;

  const search = request.nextUrl.searchParams;
  const rawFilters = Object.fromEntries(search.entries());
  const filters = availableDeliveryOrderFiltersSchema.safeParse(rawFilters);
  if (!filters.success) {
    return errorResponse(
      {
        code: "VALIDATION_ERROR",
        message: "Available-order filters are invalid.",
        details: filters.error.flatten().fieldErrors,
      },
      400,
    );
  }

  try {
    return successResponse(
      await listAvailableDeliveryOrders(authorization.user, filters.data),
    );
  } catch (error) {
    return deliveryOrderErrorResponse(error);
  }
}
