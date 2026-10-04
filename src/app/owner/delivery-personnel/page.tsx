import type { Metadata } from "next";

import { UserRole } from "@/generated/prisma/client";
import { RoleAwareNavigation } from "@/features/auth/components/role-aware-navigation";
import { DeliveryPersonnelManager } from "@/features/delivery/components/delivery-personnel-manager";
import { requireRole } from "@/lib/auth/server";
import { getDeliveryPersonnelManagement } from "@/services/delivery-personnel.service";

export const metadata: Metadata = { title: "Delivery personnel | AG Stores" };

export default async function OwnerDeliveryPersonnelPage() {
  const user = await requireRole(
    UserRole.SHOP_OWNER,
    "/owner/delivery-personnel",
  );
  const data = await getDeliveryPersonnelManagement(user);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <RoleAwareNavigation user={user} />
      <section className="pt-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Delivery personnel
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Create and manage delivery accounts assigned to your shops.
        </p>
        <DeliveryPersonnelManager initialData={data} />
      </section>
    </main>
  );
}
