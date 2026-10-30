import type { NextRequest } from "next/server";

import { UserRole } from "@/generated/prisma/client";
import { successResponse } from "@/lib/api-response";
import { requireApiRole } from "@/lib/auth/request";
import { ownerOrderErrorResponse } from "@/lib/owner-order-http";
import { getOwnerOrder, OwnerOrderError } from "@/services/owner-order.service";
import { orderIdSchema } from "@/validations/order";

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/owner/orders/[orderId]">,
) {
  const authorization = await requireApiRole(request, UserRole.SHOP_OWNER);
  if (!authorization.authorized) return authorization.response;

  const orderId = orderIdSchema.safeParse((await context.params).orderId);
  if (!orderId.success) {
    return ownerOrderErrorResponse(
      new OwnerOrderError("ORDER_NOT_FOUND", "Order not found.", 404),
    );
  }

  try {
    return successResponse(
      await getOwnerOrder(authorization.user, orderId.data),
    );
  } catch (error) {
    return ownerOrderErrorResponse(error);
  }
}
