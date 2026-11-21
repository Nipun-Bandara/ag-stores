import type { NextRequest } from "next/server";

import { UserRole } from "@/generated/prisma/client";
import {
  errorResponse,
  fieldErrors,
  successResponse,
} from "@/lib/api-response";
import { authenticateRequest } from "@/lib/auth/request";
import { requireSameOrigin } from "@/lib/security/request-origin";
import { cartErrorResponse } from "@/lib/cart-http";
import { validateCartForCheckout } from "@/services/cart.service";
import { cartValidationSchema } from "@/validations/cart";

/**
 * Prices a cart with current products, stock and discounts. It reads only
 * public catalogue data, so guests may use it to see live cart totals; placing
 * the order (POST /api/checkout) still requires a signed-in customer.
 */
export async function POST(request: NextRequest) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;

  const authentication = await authenticateRequest(request);
  if (authentication && authentication.user.role !== UserRole.CUSTOMER) {
    return errorResponse(
      {
        code: "FORBIDDEN",
        message: "You do not have permission to access this resource.",
      },
      403,
    );
  }

  const parsed = cartValidationSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return errorResponse(
      {
        code: "VALIDATION_ERROR",
        message: "Cart items are invalid.",
        details: fieldErrors(parsed.error),
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
