import type { ReactNode } from "react";

import { UserRole } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth/server";

export default async function DeliveryLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireRole(UserRole.DELIVERY_PERSON, "/delivery");
  return children;
}
