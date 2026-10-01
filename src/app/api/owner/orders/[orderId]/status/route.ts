import type { NextRequest } from "next/server";

import { UserRole } from "@/generated/prisma/client";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireApiRole } from "@/lib/auth/request";
import { orderStatusErrorResponse } from "@/lib/order-status-http";
import { transitionOrderStatus } from "@/services/order-status.service";
import {
  orderIdSchema,
  orderStatusTransitionSchema,
} from "@/validations/order";

export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/owner/orders/[orderId]/status">,
) {
  const authorization = await requireApiRole(request, UserRole.SHOP_OWNER);
  if (!authorization.authorized) return authorization.response;

  const orderId = orderIdSchema.safeParse((await context.params).orderId);
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
