import type { NextRequest } from "next/server";

import { UserRole } from "@/generated/prisma/client";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireApiRole } from "@/lib/auth/request";
import { deliveryBatchErrorResponse } from "@/lib/delivery-batch-http";
import {
  DeliveryBatchManagementError,
  completeDeliveryOrder,
} from "@/services/delivery-batch-management.service";
import {
  batchIdSchema,
  completeDeliveryOrderSchema,
} from "@/validations/delivery-batch";
import { orderIdSchema } from "@/validations/order";

export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/delivery/batches/[batchId]/orders/[orderId]/status">,
) {
  const authorization = await requireApiRole(request, UserRole.DELIVERY_PERSON);
  if (!authorization.authorized) return authorization.response;

  const params = await context.params;
  const batchId = batchIdSchema.safeParse(params.batchId);
  const orderId = orderIdSchema.safeParse(params.orderId);
  if (!batchId.success || !orderId.success) {
    return deliveryBatchErrorResponse(
      new DeliveryBatchManagementError(
        "ORDER_NOT_IN_BATCH",
        "Order not found in this delivery batch.",
        404,
      ),
    );
  }
  const body = completeDeliveryOrderSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!body.success) {
    return errorResponse(
      {
        code: "VALIDATION_ERROR",
        message: "The delivery result is invalid.",
        details: body.error.flatten().fieldErrors,
      },
      400,
    );
  }

  try {
    return successResponse(
      await completeDeliveryOrder(
        authorization.user,
        batchId.data,
        orderId.data,
        body.data,
      ),
    );
  } catch (error) {
    return deliveryBatchErrorResponse(error);
  }
}
