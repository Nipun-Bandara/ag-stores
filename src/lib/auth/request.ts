import type { NextRequest } from "next/server";

import type { UserRole } from "@/generated/prisma/client";
import { errorResponse } from "@/lib/api-response";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { getUserForSessionToken } from "@/services/auth.service";

export async function authenticateRequest(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = await getUserForSessionToken(token);

  return user && token ? { user, token } : null;
}

export async function requireApiAuth(request: NextRequest) {
  const authentication = await authenticateRequest(request);

  if (!authentication) {
    return {
      authorized: false as const,
      response: errorResponse(
        { code: "UNAUTHENTICATED", message: "Authentication is required." },
        401,
      ),
    };
  }

  return { authorized: true as const, ...authentication };
}

export async function requireApiAnyRole(
  request: NextRequest,
  allowedRoles: readonly UserRole[],
) {
  const authentication = await requireApiAuth(request);
  if (!authentication.authorized) {
    return authentication;
  }

  if (!allowedRoles.includes(authentication.user.role)) {
    return {
      authorized: false as const,
      response: errorResponse(
        {
          code: "FORBIDDEN",
          message: "You do not have permission to access this resource.",
        },
        403,
      ),
    };
  }

  return authentication;
}

export function requireApiRole(request: NextRequest, role: UserRole) {
  return requireApiAnyRole(request, [role]);
}
