import type { NextRequest } from "next/server";

import { UserRole } from "@/generated/prisma/client";
import { successResponse } from "@/lib/api-response";
import { requireApiRole } from "@/lib/auth/request";
import { customerOrderErrorResponse } from "@/lib/customer-order-http";
import {
  CustomerOrderError,
  getCustomerOrderDetails,
} from "@/services/customer-order.service";
import { orderIdSchema } from "@/validations/order";

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/account/orders/[orderId]">,
) {
  const authorization = await requireApiRole(request, UserRole.CUSTOMER);
  if (!authorization.authorized) return authorization.response;

  const orderId = orderIdSchema.safeParse((await context.params).orderId);
  if (!orderId.success) {
    return customerOrderErrorResponse(
      new CustomerOrderError("ORDER_NOT_FOUND", "Order not found.", 404),
    );
  }

  try {
    return successResponse(
      await getCustomerOrderDetails(authorization.user, orderId.data),
    );
  } catch (error) {
    return customerOrderErrorResponse(error);
  }
}
