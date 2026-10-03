import { errorResponse } from "@/lib/api-response";
import { CustomerOrderError } from "@/services/customer-order.service";

export function customerOrderErrorResponse(error: unknown) {
  if (error instanceof CustomerOrderError) {
    return errorResponse(
      { code: error.code, message: error.message },
      error.status,
    );
  }
  console.error("Customer order request failed", error);
  return errorResponse(
    { code: "CUSTOMER_ORDER_ERROR", message: "Unable to load orders." },
    500,
  );
}
