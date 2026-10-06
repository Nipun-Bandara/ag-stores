import type { NextRequest } from "next/server";

import { UserRole } from "@/generated/prisma/client";
import { successResponse } from "@/lib/api-response";
import { requireApiRole } from "@/lib/auth/request";
import { deliveryBatchErrorResponse } from "@/lib/delivery-batch-http";
import {
  DeliveryBatchManagementError,
  startDeliveryBatch,
} from "@/services/delivery-batch-management.service";
import { batchIdSchema } from "@/validations/delivery-batch";

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/delivery/batches/[batchId]/start">,
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
  try {
    return successResponse(
      await startDeliveryBatch(authorization.user, batchId.data),
    );
  } catch (error) {
    return deliveryBatchErrorResponse(error);
  }
}
