import { errorResponse } from "@/lib/api-response";
import { ReturnError } from "@/services/order-return.service";
export function returnErrorResponse(error: unknown) {
  if (error instanceof ReturnError)
    return errorResponse(
      { code: "RETURN_ERROR", message: error.message },
      error.status,
    );
  console.error("Order return failed", error);
  return errorResponse(
    { code: "RETURN_ERROR", message: "Unable to process this return." },
    500,
  );
}
