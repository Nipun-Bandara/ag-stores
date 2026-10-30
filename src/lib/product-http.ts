import { errorResponse } from "@/lib/api-response";
import { ProductError } from "@/services/product.service";

export function productErrorResponse(error: unknown) {
  if (error instanceof ProductError) {
    return errorResponse(
      { code: error.code, message: error.message },
      error.status,
    );
  }

  console.error("Product request failed", error);
  return errorResponse(
    { code: "PRODUCT_ERROR", message: "Unable to complete the request." },
    500,
  );
}
