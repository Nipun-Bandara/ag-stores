import type { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { getUserForSessionToken } from "@/services/auth.service";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = await getUserForSessionToken(token);

  if (!user) {
    return errorResponse(
      { code: "UNAUTHENTICATED", message: "Authentication is required." },
      401,
    );
  }

  const response = successResponse(user);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
