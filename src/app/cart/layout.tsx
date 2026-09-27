import type { ReactNode } from "react";

import { UserRole } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth/server";

export default async function CartLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireRole(UserRole.CUSTOMER, "/cart");
  return children;
}
