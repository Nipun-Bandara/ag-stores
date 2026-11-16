import { errorResponse } from "@/lib/api-response";
import { StaffError } from "@/services/order-staff.service";
export function staffErrorResponse(error: unknown) {
  if (error instanceof StaffError)
    return errorResponse(
      { code: "STAFF_ERROR", message: error.message },
      error.status,
    );
  console.error("Staff management failed", error);
  return errorResponse(
    { code: "STAFF_ERROR", message: "Unable to save staff account." },
    500,
  );
}
