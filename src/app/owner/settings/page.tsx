import type { Metadata } from "next";

import { UserRole } from "@/generated/prisma/client";
import { RoleAwareNavigation } from "@/features/auth/components/role-aware-navigation";
import { ShopSettingsForm } from "@/features/owner/components/shop-settings-form";
import { requireRole } from "@/lib/auth/server";
import { listOwnerShopSettings } from "@/services/shop-settings.service";

export const metadata: Metadata = { title: "Shop settings | AG Stores" };

export default async function OwnerSettingsPage() {
  const user = await requireRole(UserRole.SHOP_OWNER, "/owner/settings");
  const shops = await listOwnerShopSettings(user);

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-10 sm:px-6 sm:py-16">
      <RoleAwareNavigation user={user} />
      <section className="pt-8">
        <h1 className="text-3xl font-semibold tracking-tight">Shop settings</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Configure shop details and the commercial rules enforced at checkout.
        </p>
        <div className="mt-8 space-y-6">
          {shops.length ? (
            shops.map((shop) => (
              <ShopSettingsForm key={shop.id} initial={shop} />
            ))
          ) : (
            <p className="rounded-xl border border-dashed p-8 text-sm text-neutral-600">
              No shop is assigned to this account.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
