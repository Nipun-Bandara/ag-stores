import type { Metadata } from "next";

import Link from "next/link";
import { notFound } from "next/navigation";

import { UserRole } from "@/generated/prisma/client";
import { AdminShopForm } from "@/features/admin/components/admin-shop-form";
import { AdminShopStatusControl } from "@/features/admin/components/admin-shop-status-control";
import { RoleAwareNavigation } from "@/features/auth/components/role-aware-navigation";
import { requireRole } from "@/lib/auth/server";
import { AdminShopError, getAdminShop } from "@/services/admin-shop.service";
import { adminShopIdSchema } from "@/validations/admin-shop";

export const metadata: Metadata = { title: "Shop details | AG Stores" };

export default async function AdminShopDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const shopId = adminShopIdSchema.safeParse((await params).id);
  if (!shopId.success) notFound();
  const administrator = await requireRole(
    UserRole.ADMIN,
    `/admin/shops/${shopId.data}`,
  );
  const data = await getAdminShop(administrator, shopId.data).catch((error) => {
    if (error instanceof AdminShopError && error.code === "SHOP_NOT_FOUND") {
      notFound();
    }
    throw error;
  });

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <RoleAwareNavigation user={administrator} />
      <section className="pt-8">
        <Link href="/admin/shops" className="text-sm font-medium underline">
          ← Back to shops
        </Link>
        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-neutral-500">Shop details</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              {data.shop.name}
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              Owned by {data.shop.owner.name}
            </p>
          </div>
          <AdminShopStatusControl
            shopId={data.shop.id}
            shopName={data.shop.name}
            initialIsActive={data.shop.isActive}
          />
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ["Categories", data.shop.counts.categories],
              ["Products", data.shop.counts.products],
              ["Orders", data.shop.counts.orders],
              ["Delivery personnel", data.shop.counts.deliveryPersonnel],
            ] as const
          ).map(([label, count]) => (
            <div key={label} className="rounded-xl border bg-white p-4">
              <p className="text-xs font-medium text-neutral-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold">{count}</p>
            </div>
          ))}
        </div>

        <section className="mt-8" aria-labelledby="edit-shop-heading">
          <h2 id="edit-shop-heading" className="mb-4 text-lg font-semibold">
            Edit shop
          </h2>
          <AdminShopForm owners={data.owners} shop={data.shop} />
        </section>
      </section>
    </main>
  );
}
