import { errorResponse } from "@/lib/api-response";
import { ShopSettingsError } from "@/services/shop-settings.service";

export function shopSettingsErrorResponse(error: unknown) {
  if (error instanceof ShopSettingsError) {
    return errorResponse(
      { code: error.code, message: error.message },
      error.status,
    );
  }
  console.error("Shop settings request failed", error);
  return errorResponse(
    { code: "SHOP_SETTINGS_ERROR", message: "Unable to update shop settings." },
    500,
  );
}
