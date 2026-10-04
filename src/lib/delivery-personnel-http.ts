import { errorResponse } from "@/lib/api-response";
import { DeliveryPersonnelError } from "@/services/delivery-personnel.service";

export function deliveryPersonnelErrorResponse(error: unknown) {
  if (error instanceof DeliveryPersonnelError) {
    return errorResponse(
      { code: error.code, message: error.message },
      error.status,
    );
  }

  console.error("Delivery personnel request failed", error);
  return errorResponse(
    {
      code: "DELIVERY_PERSONNEL_ERROR",
      message: "Unable to complete the request.",
    },
    500,
  );
}
