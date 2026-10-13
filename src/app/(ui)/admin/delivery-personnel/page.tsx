import type { Metadata } from "next";

import { UserRole } from "@/generated/prisma/client";
import { DeliveryPersonnelManager } from "@/features/delivery/components/delivery-personnel-manager";
import { requireRole } from "@/lib/auth/server";
import { getDeliveryPersonnelManagement } from "@/services/delivery-personnel.service";

export const metadata: Metadata = { title: "Delivery personnel | AG Stores" };

export default async function AdminDeliveryPersonnelPage() {
  const user = await requireRole(UserRole.ADMIN, "/admin/delivery-personnel");
  const data = await getDeliveryPersonnelManagement(user);

  return (
    <section className="min-w-0 w-full">
      <h1 className="text-3xl font-semibold tracking-tight">
        Delivery personnel administration
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        View and manage delivery accounts across every shop.
      </p>
      <DeliveryPersonnelManager initialData={data} />
    </section>
  );
}
