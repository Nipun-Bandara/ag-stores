import { errorResponse } from "@/lib/api-response";
import { CustomerAddressError } from "@/services/customer-address.service";

export function addressErrorResponse(error: unknown) {
  if (error instanceof CustomerAddressError) {
    return errorResponse(
      { code: error.code, message: error.message },
      error.status,
    );
  }

  console.error("Customer address request failed", error);
  return errorResponse(
    { code: "ADDRESS_ERROR", message: "Unable to complete the request." },
    500,
  );
}
