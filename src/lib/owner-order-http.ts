import { errorResponse } from "@/lib/api-response";
import { OwnerOrderError } from "@/services/owner-order.service";

export function ownerOrderErrorResponse(error: unknown) {
  if (error instanceof OwnerOrderError) {
    return errorResponse(
      { code: error.code, message: error.message },
      error.status,
    );
  }
  console.error("Owner order request failed", error);
  return errorResponse(
    { code: "OWNER_ORDER_ERROR", message: "Unable to complete the request." },
    500,
  );
}
