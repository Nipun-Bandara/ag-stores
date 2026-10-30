import { errorResponse } from "@/lib/api-response";
import { CheckoutError } from "@/services/checkout.service";

export function checkoutErrorResponse(error: unknown) {
  if (error instanceof CheckoutError) {
    return errorResponse(
      { code: error.code, message: error.message },
      error.status,
    );
  }
  console.error("Checkout failed", error);
  return errorResponse(
    { code: "CHECKOUT_ERROR", message: "Unable to complete checkout." },
    500,
  );
}
