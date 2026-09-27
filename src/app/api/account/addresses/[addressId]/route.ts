import type { NextRequest } from "next/server";

import { UserRole } from "@/generated/prisma/client";
import { addressErrorResponse } from "@/lib/address-http";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireApiRole } from "@/lib/auth/request";
import {
  CustomerAddressError,
  deleteCustomerAddress,
  updateCustomerAddress,
} from "@/services/customer-address.service";
import { addressIdSchema, addressInputSchema } from "@/validations/address";

type AddressContext = { params: Promise<{ addressId: string }> };

async function parseAddressId(context: AddressContext) {
  const parsed = addressIdSchema.safeParse((await context.params).addressId);
  if (!parsed.success) {
    throw new CustomerAddressError(
      "ADDRESS_NOT_FOUND",
      "Address not found.",
      404,
    );
  }
  return parsed.data;
}

export async function PATCH(request: NextRequest, context: AddressContext) {
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
      await updateCustomerAddress(
        authorization.user,
        await parseAddressId(context),
        parsed.data,
      ),
    );
  } catch (error) {
    return addressErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, context: AddressContext) {
  const authorization = await requireApiRole(request, UserRole.CUSTOMER);
  if (!authorization.authorized) return authorization.response;

  try {
    await deleteCustomerAddress(
      authorization.user,
      await parseAddressId(context),
    );
    return new Response(null, { status: 204 });
  } catch (error) {
    return addressErrorResponse(error);
  }
}
