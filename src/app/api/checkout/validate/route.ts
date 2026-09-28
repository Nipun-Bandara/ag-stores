import type { NextRequest } from "next/server";

import { UserRole } from "@/generated/prisma/client";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireApiRole } from "@/lib/auth/request";
import { cartErrorResponse } from "@/lib/cart-http";
import { validateCartForCheckout } from "@/services/cart.service";
import { cartValidationSchema } from "@/validations/cart";

export async function POST(request: NextRequest) {
  const authorization = await requireApiRole(request, UserRole.CUSTOMER);
  if (!authorization.authorized) return authorization.response;

  const parsed = cartValidationSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return errorResponse(
      {
        code: "VALIDATION_ERROR",
        message: "Cart items are invalid.",
        details: parsed.error.flatten().fieldErrors,
      },
      400,
    );
  }

  try {
    return successResponse(await validateCartForCheckout(parsed.data));
  } catch (error) {
    return cartErrorResponse(error);
  }
}
