import { errorResponse } from "@/lib/api-response";
import { NotificationError } from "@/services/notification.service";

export function notificationErrorResponse(error: unknown) {
  if (error instanceof NotificationError) {
    return errorResponse(
      { code: error.code, message: error.message },
      error.status,
    );
  }
  console.error("Notification request failed", error);
  return errorResponse(
    { code: "NOTIFICATION_ERROR", message: "Unable to complete the request." },
    500,
  );
}
