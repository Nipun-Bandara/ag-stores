import type { NextRequest } from "next/server";

import { successResponse } from "@/lib/api-response";
import { requireApiAuth } from "@/lib/auth/request";
import { notificationErrorResponse } from "@/lib/notification-http";
import { getNotifications } from "@/services/notification.service";

export async function GET(request: NextRequest) {
  const authorization = await requireApiAuth(request);
  if (!authorization.authorized) return authorization.response;

  try {
    return successResponse(await getNotifications(authorization.user));
  } catch (error) {
    return notificationErrorResponse(error);
  }
}
