import type { NextRequest } from "next/server";

import { successResponse } from "@/lib/api-response";
import { requireApiAuth } from "@/lib/auth/request";
import { notificationErrorResponse } from "@/lib/notification-http";
import {
  markNotificationRead,
  NotificationError,
} from "@/services/notification.service";
import { notificationIdSchema } from "@/validations/notification";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ notificationId: string }> },
) {
  const authorization = await requireApiAuth(request);
  if (!authorization.authorized) return authorization.response;
  const notificationId = notificationIdSchema.safeParse(
    (await context.params).notificationId,
  );
  if (!notificationId.success) {
    return notificationErrorResponse(
      new NotificationError(
        "NOTIFICATION_NOT_FOUND",
        "Notification not found.",
        404,
      ),
    );
  }

  try {
    return successResponse(
      await markNotificationRead(authorization.user, notificationId.data),
    );
  } catch (error) {
    return notificationErrorResponse(error);
  }
}
