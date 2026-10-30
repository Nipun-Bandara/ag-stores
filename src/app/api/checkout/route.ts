import type { NextRequest } from "next/server";

import { UserRole } from "@/generated/prisma/client";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireApiRole } from "@/lib/auth/request";
import { checkoutErrorResponse } from "@/lib/checkout-http";
import { checkout } from "@/services/checkout.service";
import { checkoutSchema } from "@/validations/checkout";

export async function POST(request: NextRequest) {
  const authorization = await requireApiRole(request, UserRole.CUSTOMER);
  if (!authorization.authorized) return authorization.response;

  const parsed = checkoutSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return errorResponse(
      {
        code: "VALIDATION_ERROR",
        message: "Checkout details are invalid.",
        details: parsed.error.flatten().fieldErrors,
      },
      400,
    );
  }

  try {
    return successResponse(await checkout(authorization.user, parsed.data), {
      status: 201,
    });
  } catch (error) {
    return checkoutErrorResponse(error);
  }
}
