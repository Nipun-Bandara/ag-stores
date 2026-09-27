import { cache } from "react";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { UserRole } from "@/generated/prisma/client";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { getUserForSessionToken } from "@/services/auth.service";

export const getAuthenticatedUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return getUserForSessionToken(token);
});

export async function requireAuth(returnTo = "/account") {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  return user;
}

export async function requireAnyRole(
  allowedRoles: readonly UserRole[],
  returnTo = "/account",
) {
  const user = await requireAuth(returnTo);

  if (!allowedRoles.includes(user.role)) {
    redirect("/forbidden");
  }

  return user;
}

export function requireRole(role: UserRole, returnTo = "/account") {
  return requireAnyRole([role], returnTo);
}

export const requireAuthenticatedUser = requireAuth;
