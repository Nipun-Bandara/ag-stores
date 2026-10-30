import { errorResponse } from "@/lib/api-response";
import { CartValidationError } from "@/services/cart.service";

export function cartErrorResponse(error: unknown) {
  if (error instanceof CartValidationError) {
    return errorResponse({ code: error.code, message: error.message }, 409);
  }
  console.error("Cart validation failed", error);
  return errorResponse(
    { code: "CART_ERROR", message: "Unable to validate the cart." },
    500,
  );
}
