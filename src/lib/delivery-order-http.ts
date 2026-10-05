import { errorResponse } from "@/lib/api-response";
import { DeliveryOrderError } from "@/services/delivery-order.service";

export function deliveryOrderErrorResponse(error: unknown) {
  if (error instanceof DeliveryOrderError) {
    return errorResponse(
      { code: error.code, message: error.message },
      error.status,
    );
  }

  console.error("Available delivery order request failed", error);
  return errorResponse(
    {
      code: "DELIVERY_ORDER_ERROR",
      message: "Unable to load available orders.",
    },
    500,
  );
}
