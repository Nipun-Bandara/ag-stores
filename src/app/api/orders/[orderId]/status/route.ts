import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { requireApiAuth } from "@/lib/auth/request";
import { orderStatusErrorResponse } from "@/lib/order-status-http";
import { transitionOrderStatus } from "@/services/order-status.service";
import {
  orderIdSchema,
  orderStatusTransitionSchema,
} from "@/validations/order";

export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/orders/[orderId]/status">,
) {
  const authorization = await requireApiAuth(request);
  if (!authorization.authorized) return authorization.response;

  const { orderId: rawOrderId } = await context.params;
  const orderId = orderIdSchema.safeParse(rawOrderId);
  const body = orderStatusTransitionSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!orderId.success || !body.success) {
    return errorResponse(
      {
        code: "VALIDATION_ERROR",
        message: "Order status details are invalid.",
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
        body.data.status,
        body.data.note,
      ),
    );
  } catch (error) {
    return orderStatusErrorResponse(error);
  }
}
