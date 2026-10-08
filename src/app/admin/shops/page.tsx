import type { Metadata } from "next";

import Link from "next/link";

import { UserRole } from "@/generated/prisma/client";
import { AdminShopForm } from "@/features/admin/components/admin-shop-form";
import { AdminShopStatusControl } from "@/features/admin/components/admin-shop-status-control";
import { RoleAwareNavigation } from "@/features/auth/components/role-aware-navigation";
import { requireRole } from "@/lib/auth/server";
import { getAdminShopManagement } from "@/services/admin-shop.service";

export const metadata: Metadata = { title: "Shops | AG Stores" };

export default async function AdminShopsPage() {
  const administrator = await requireRole(UserRole.ADMIN, "/admin/shops");
  const management = await getAdminShopManagement(administrator);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <RoleAwareNavigation user={administrator} />
      <section className="pt-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Shop management
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Create shops, assign owners, and control customer availability.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section aria-labelledby="create-shop-heading">
            <h2 id="create-shop-heading" className="mb-4 text-lg font-semibold">
              Create shop
            </h2>
            <AdminShopForm owners={management.owners} />
          </section>

          <section aria-labelledby="shops-heading">
            <div className="flex items-center justify-between gap-4">
              <h2 id="shops-heading" className="text-lg font-semibold">
                Shops
              </h2>
              <p className="text-sm text-neutral-500">
                {management.shops.length}{" "}
                {management.shops.length === 1 ? "shop" : "shops"}
              </p>
            </div>
            {management.shops.length ? (
              <div className="mt-4 space-y-4">
                {management.shops.map((shop) => (
                  <article
                    key={shop.id}
                    data-testid="admin-shop-card"
                    className="rounded-xl border bg-white p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <Link
                          href={`/admin/shops/${shop.id}`}
                          className="font-semibold underline"
                        >
                          {shop.name}
                        </Link>
                        <p className="mt-1 text-sm text-neutral-600">
                          Owner: {shop.owner.name}
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                          {shop.address}
                        </p>
                      </div>
                      <div className="flex gap-2 text-xs font-medium">
                        <span className="rounded-full bg-neutral-100 px-2 py-1">
                          {shop.isActive ? "Active" : "Inactive"}
                        </span>
                        <span className="rounded-full bg-neutral-100 px-2 py-1">
                          {shop.isOpen ? "Open" : "Closed"}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4">
                      <AdminShopStatusControl
                        shopId={shop.id}
                        shopName={shop.name}
                        initialIsActive={shop.isActive}
                      />
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-dashed p-5 text-sm text-neutral-600">
                No shops have been created.
              </p>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
