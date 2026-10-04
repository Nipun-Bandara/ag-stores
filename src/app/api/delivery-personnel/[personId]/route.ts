import type { NextRequest } from "next/server";

import { UserRole } from "@/generated/prisma/client";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireApiAnyRole } from "@/lib/auth/request";
import { deliveryPersonnelErrorResponse } from "@/lib/delivery-personnel-http";
import {
  DeliveryPersonnelError,
  updateDeliveryPerson,
} from "@/services/delivery-personnel.service";
import {
  deliveryPersonIdSchema,
  deliveryPersonnelUpdateSchema,
} from "@/validations/delivery-personnel";

export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/delivery-personnel/[personId]">,
) {
  const authorization = await requireApiAnyRole(request, [
    UserRole.SHOP_OWNER,
    UserRole.ADMIN,
  ]);
  if (!authorization.authorized) return authorization.response;

  const personId = deliveryPersonIdSchema.safeParse(
    (await context.params).personId,
  );
  const body = deliveryPersonnelUpdateSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!body.success) {
    return errorResponse(
      {
        code: "VALIDATION_ERROR",
        message: "Delivery personnel details are invalid.",
        details: body.error.flatten().fieldErrors,
      },
      400,
    );
  }

  try {
    if (!personId.success) {
      throw new DeliveryPersonnelError(
        "DELIVERY_PERSON_NOT_FOUND",
        "Delivery person not found.",
        404,
      );
    }
    return successResponse(
      await updateDeliveryPerson(authorization.user, personId.data, body.data),
    );
  } catch (error) {
    return deliveryPersonnelErrorResponse(error);
  }
}
