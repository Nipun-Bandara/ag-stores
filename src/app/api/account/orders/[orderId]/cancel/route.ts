import type { NextRequest } from "next/server";

import { OrderStatus, UserRole } from "@/generated/prisma/client";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireApiRole } from "@/lib/auth/request";
import { orderStatusErrorResponse } from "@/lib/order-status-http";
import { transitionOrderStatus } from "@/services/order-status.service";
import {
  customerOrderCancellationSchema,
  orderIdSchema,
} from "@/validations/order";

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/account/orders/[orderId]/cancel">,
) {
  const authorization = await requireApiRole(request, UserRole.CUSTOMER);
  if (!authorization.authorized) return authorization.response;

  const orderId = orderIdSchema.safeParse((await context.params).orderId);
  const body = customerOrderCancellationSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!orderId.success || !body.success) {
    return errorResponse(
      {
        code: "VALIDATION_ERROR",
        message: "Cancellation details are invalid.",
        details: body.success ? undefined : body.error.flatten().fieldErrors,
      },
      400,
    );
  }

  try {
    return successResponse(
      await transitionOrderStatus(
        authorization.user,
        orderId.data,
        OrderStatus.CANCELLED,
        body.data.reason,
      ),
    );
  } catch (error) {
    return orderStatusErrorResponse(error);
  }
}
