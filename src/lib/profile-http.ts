import { errorResponse } from "@/lib/api-response";
import { CustomerProfileError } from "@/services/customer-profile.service";

export function profileErrorResponse(error: unknown) {
  if (error instanceof CustomerProfileError) {
    return errorResponse(
      { code: error.code, message: error.message },
      error.status,
    );
  }

  console.error("Customer profile request failed", error);
  return errorResponse(
    { code: "PROFILE_ERROR", message: "Unable to complete the request." },
    500,
  );
}
