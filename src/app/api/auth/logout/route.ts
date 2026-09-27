import type { NextRequest } from "next/server";

import { successResponse } from "@/lib/api-response";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { clearSessionCookie } from "@/lib/auth/cookie";
import { authErrorResponse } from "@/lib/auth/http";
import { logout } from "@/services/auth.service";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  try {
    await logout(token);
    const response = successResponse({ loggedOut: true });
    response.headers.set("Cache-Control", "no-store");
    clearSessionCookie(response);
    return response;
  } catch (error) {
    return authErrorResponse(error);
  }
}
