import type { NextRequest } from "next/server";

import { UserRole } from "@/generated/prisma/client";
import { addressErrorResponse } from "@/lib/address-http";
import { requireApiRole } from "@/lib/auth/request";
import { successResponse } from "@/lib/api-response";
import {
  CustomerAddressError,
  setDefaultCustomerAddress,
} from "@/services/customer-address.service";
import { addressIdSchema } from "@/validations/address";

type AddressContext = { params: Promise<{ addressId: string }> };

export async function POST(request: NextRequest, context: AddressContext) {
  const authorization = await requireApiRole(request, UserRole.CUSTOMER);
  if (!authorization.authorized) return authorization.response;

  try {
    const parsed = addressIdSchema.safeParse((await context.params).addressId);
    if (!parsed.success) {
      throw new CustomerAddressError(
        "ADDRESS_NOT_FOUND",
        "Address not found.",
        404,
      );
    }
    return successResponse(
      await setDefaultCustomerAddress(authorization.user, parsed.data),
    );
  } catch (error) {
    return addressErrorResponse(error);
  }
}
