import type { NextRequest } from "next/server";

import { UserRole } from "@/generated/prisma/client";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireApiRole } from "@/lib/auth/request";
import { deliveryBatchErrorResponse } from "@/lib/delivery-batch-http";
import {
  DeliveryBatchManagementError,
  reorderDeliveryBatch,
} from "@/services/delivery-batch-management.service";
import {
  batchIdSchema,
  reorderDeliveryBatchSchema,
} from "@/validations/delivery-batch";

export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/delivery/batches/[batchId]/sequence">,
) {
  const authorization = await requireApiRole(request, UserRole.DELIVERY_PERSON);
  if (!authorization.authorized) return authorization.response;

  const batchId = batchIdSchema.safeParse((await context.params).batchId);
  if (!batchId.success) {
    return deliveryBatchErrorResponse(
      new DeliveryBatchManagementError(
        "BATCH_NOT_FOUND",
        "Delivery batch not found.",
        404,
      ),
    );
  }
  const body = reorderDeliveryBatchSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!body.success) {
    return errorResponse(
      {
        code: "VALIDATION_ERROR",
        message: "The delivery sequence is invalid.",
        details: body.error.flatten().fieldErrors,
      },
      400,
    );
  }

  try {
    return successResponse(
      await reorderDeliveryBatch(authorization.user, batchId.data, body.data),
    );
  } catch (error) {
    return deliveryBatchErrorResponse(error);
  }
}
