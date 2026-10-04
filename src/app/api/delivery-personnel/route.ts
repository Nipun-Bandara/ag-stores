import type { NextRequest } from "next/server";

import { UserRole } from "@/generated/prisma/client";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireApiAnyRole } from "@/lib/auth/request";
import { deliveryPersonnelErrorResponse } from "@/lib/delivery-personnel-http";
import {
  createDeliveryPerson,
  getDeliveryPersonnelManagement,
} from "@/services/delivery-personnel.service";
import { deliveryPersonnelCreateSchema } from "@/validations/delivery-personnel";

const managementRoles = [UserRole.SHOP_OWNER, UserRole.ADMIN] as const;

export async function GET(request: NextRequest) {
  const authorization = await requireApiAnyRole(request, managementRoles);
  if (!authorization.authorized) return authorization.response;

  try {
    return successResponse(
      await getDeliveryPersonnelManagement(authorization.user),
    );
  } catch (error) {
    return deliveryPersonnelErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const authorization = await requireApiAnyRole(request, managementRoles);
  if (!authorization.authorized) return authorization.response;

  const parsed = deliveryPersonnelCreateSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return errorResponse(
      {
        code: "VALIDATION_ERROR",
        message: "Delivery personnel details are invalid.",
        details: parsed.error.flatten().fieldErrors,
      },
      400,
    );
  }

  try {
    return successResponse(
      await createDeliveryPerson(authorization.user, parsed.data),
      { status: 201 },
    );
  } catch (error) {
    return deliveryPersonnelErrorResponse(error);
  }
}
