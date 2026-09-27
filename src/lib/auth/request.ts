import type { NextRequest } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { getUserForSessionToken } from "@/services/auth.service";

export async function authenticateRequest(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = await getUserForSessionToken(token);

  return user && token ? { user, token } : null;
}
