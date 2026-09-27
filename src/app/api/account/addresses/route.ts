import type { NextRequest } from "next/server";

import { UserRole } from "@/generated/prisma/client";
import { addressErrorResponse } from "@/lib/address-http";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireApiRole } from "@/lib/auth/request";
import {
  createCustomerAddress,
  listCustomerAddresses,
} from "@/services/customer-address.service";
import { addressInputSchema } from "@/validations/address";

export async function GET(request: NextRequest) {
  const authorization = await requireApiRole(request, UserRole.CUSTOMER);
  if (!authorization.authorized) return authorization.response;

  try {
    return successResponse(await listCustomerAddresses(authorization.user));
  } catch (error) {
    return addressErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const authorization = await requireApiRole(request, UserRole.CUSTOMER);
  if (!authorization.authorized) return authorization.response;

  const parsed = addressInputSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return errorResponse(
      {
        code: "VALIDATION_ERROR",
        message: "Address details are invalid.",
        details: parsed.error.flatten().fieldErrors,
      },
      400,
    );
  }

  try {
    return successResponse(
      await createCustomerAddress(authorization.user, parsed.data),
      { status: 201 },
    );
  } catch (error) {
    return addressErrorResponse(error);
  }
}
