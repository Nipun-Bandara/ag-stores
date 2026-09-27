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

export async function requireAuthenticatedUser() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login?returnTo=%2Faccount");
  }

  return user;
}

export async function requireRole(allowedRoles: readonly UserRole[]) {
  const user = await requireAuthenticatedUser();

  if (!allowedRoles.includes(user.role)) {
    redirect("/account");
  }

  return user;
}
