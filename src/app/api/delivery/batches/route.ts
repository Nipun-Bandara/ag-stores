import type { NextRequest } from "next/server";

import { UserRole } from "@/generated/prisma/client";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireApiRole } from "@/lib/auth/request";
import { deliveryBatchErrorResponse } from "@/lib/delivery-batch-http";
import { listActiveDeliveryBatches } from "@/services/delivery-batch-management.service";
import { createDeliveryBatch } from "@/services/delivery-batch.service";
import { createDeliveryBatchSchema } from "@/validations/delivery-batch";

export async function GET(request: NextRequest) {
  const authorization = await requireApiRole(request, UserRole.DELIVERY_PERSON);
  if (!authorization.authorized) return authorization.response;

  try {
    return successResponse(await listActiveDeliveryBatches(authorization.user));
  } catch (error) {
    return deliveryBatchErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const authorization = await requireApiRole(request, UserRole.DELIVERY_PERSON);
  if (!authorization.authorized) return authorization.response;

  const body = createDeliveryBatchSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!body.success) {
    return errorResponse(
      {
        code: "VALIDATION_ERROR",
        message: "Select one or more valid orders.",
        details: body.error.flatten().fieldErrors,
      },
      400,
    );
  }

  try {
    return successResponse(
      await createDeliveryBatch(authorization.user, body.data),
      { status: 201 },
    );
  } catch (error) {
    return deliveryBatchErrorResponse(error);
  }
}
