import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/server";
export default async function StaffLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireRole("ORDER_STAFF", "/staff/orders");
  if (!user.assignedShopId) redirect("/forbidden");
  return children;
}
