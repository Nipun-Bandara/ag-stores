import type { ReactNode } from "react";

import { UserRole } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth/server";

export default async function OwnerLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireRole(UserRole.SHOP_OWNER, "/owner");
  return children;
}
