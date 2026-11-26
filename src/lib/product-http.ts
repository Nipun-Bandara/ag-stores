import { PricingConfigurationError } from "@/lib/pricing";
import { SellingSetupError } from "@/lib/quantity";
import { errorResponse } from "@/lib/api-response";
import { ProductError } from "@/services/product.service";

export function productErrorResponse(error: unknown) {
  if (
    error instanceof Error &&
    (error.message === "PHOTO_UPLOAD_NOT_OWNED" ||
      error.message === "PHOTO_REFERENCE_INVALID")
  )
    return errorResponse(
      {
        code: "INVALID_PHOTO",
        message:
          "This photo cannot be attached to this product. Choose it again.",
      },
      409,
    );
  if (error instanceof PricingConfigurationError)
    return errorResponse(
      { code: "INVALID_PRICING", message: error.message },
      409,
    );
  if (error instanceof SellingSetupError)
    return errorResponse(
      { code: "INVALID_SELLING_SETUP", message: error.message },
      409,
    );

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
