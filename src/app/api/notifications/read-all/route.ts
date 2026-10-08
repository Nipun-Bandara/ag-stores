import type { NextRequest } from "next/server";

import { successResponse } from "@/lib/api-response";
import { requireApiAuth } from "@/lib/auth/request";
import { notificationErrorResponse } from "@/lib/notification-http";
import { markAllNotificationsRead } from "@/services/notification.service";

export async function PATCH(request: NextRequest) {
  const authorization = await requireApiAuth(request);
  if (!authorization.authorized) return authorization.response;

  try {
    return successResponse(await markAllNotificationsRead(authorization.user));
  } catch (error) {
    return notificationErrorResponse(error);
  }
}
