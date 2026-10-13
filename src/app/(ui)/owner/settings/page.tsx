import type { Metadata } from "next";

import { UserRole } from "@/generated/prisma/client";
import { ShopSettingsForm } from "@/features/owner/components/shop-settings-form";
import { requireRole } from "@/lib/auth/server";
import { listOwnerShopSettings } from "@/services/shop-settings.service";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Shop settings | AG Stores" };

export default async function OwnerSettingsPage() {
  const user = await requireRole(UserRole.SHOP_OWNER, "/owner/settings");
  const shops = await listOwnerShopSettings(user);

  return (
    <section className="min-w-0 w-full">
      <h1 className="text-3xl font-semibold tracking-tight">Shop settings</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Configure shop details and the commercial rules enforced at checkout.
      </p>
      <div className="mt-8 space-y-6">
        {shops.length ? (
          shops.map((shop) => <ShopSettingsForm key={shop.id} initial={shop} />)
        ) : (
          <Card
            as="p"
            className="gap-0 border-dashed p-8 text-sm text-muted-foreground border ring-0"
          >
            No shop is assigned to this account.
          </Card>
        )}
      </div>
    </section>
  );
}
