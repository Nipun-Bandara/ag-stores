import { errorResponse } from "@/lib/api-response";
import { OrderStatusServiceError } from "@/services/order-status.service";

export function orderStatusErrorResponse(error: unknown) {
  if (error instanceof OrderStatusServiceError) {
    return errorResponse(
      { code: error.code, message: error.message },
      error.status,
    );
  }
  console.error("Order status transition failed", error);
  return errorResponse(
    { code: "ORDER_STATUS_ERROR", message: "Unable to update order status." },
    500,
  );
}
