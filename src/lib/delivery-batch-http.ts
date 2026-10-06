import { errorResponse } from "@/lib/api-response";
import { DeliveryBatchError } from "@/services/delivery-batch.service";

export function deliveryBatchErrorResponse(error: unknown) {
  if (error instanceof DeliveryBatchError) {
    return errorResponse(
      { code: error.code, message: error.message },
      error.status,
    );
  }

  console.error("Delivery batch request failed", error);
  return errorResponse(
    {
      code: "DELIVERY_BATCH_ERROR",
      message: "Unable to create the delivery batch.",
    },
    500,
  );
}
