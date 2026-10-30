import { getServerText } from "@/lib/i18n/server";
import { Text } from "@/features/i18n/components/text";
import type { Metadata } from "next";

import { UserRole } from "@/generated/prisma/client";
import { DeliveryPersonnelManager } from "@/features/delivery/components/delivery-personnel-manager";
import { requireRole } from "@/lib/auth/server";
import { getDeliveryPersonnelManagement } from "@/services/delivery-personnel.service";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerText();
  return { title: `${t("Delivery personnel")} | AG Stores` };
}

export default async function OwnerDeliveryPersonnelPage() {
  const user = await requireRole(
    UserRole.SHOP_OWNER,
    "/owner/delivery-personnel",
  );
  const data = await getDeliveryPersonnelManagement(user);

  return (
    <section className="min-w-0 w-full">
      <h1 className="text-3xl font-semibold tracking-tight">
        <Text value={"Delivery personnel "} />
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        <Text
          value={"Create and manage delivery accounts assigned to your shops. "}
        />
      </p>
      <DeliveryPersonnelManager initialData={data} />
    </section>
  );
}
