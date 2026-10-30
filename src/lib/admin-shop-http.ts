import { errorResponse } from "@/lib/api-response";
import { AdminShopError } from "@/services/admin-shop.service";

export function adminShopErrorResponse(error: unknown) {
  if (error instanceof AdminShopError) {
    return errorResponse(
      { code: error.code, message: error.message },
      error.status,
    );
  }

  console.error("Admin shop request failed", error);
  return errorResponse(
    { code: "ADMIN_SHOP_ERROR", message: "Unable to complete the request." },
    500,
  );
}
