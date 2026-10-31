import { getServerText } from "@/lib/i18n/server";
import { Text } from "@/features/i18n/components/text";
import type { Metadata } from "next";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { UserRole } from "@/generated/prisma/client";
import { AdminShopForm } from "@/features/admin/components/admin-shop-form";
import { AdminShopStatusControl } from "@/features/admin/components/admin-shop-status-control";
import { requireRole } from "@/lib/auth/server";
import { AdminShopError, getAdminShop } from "@/services/admin-shop.service";
import { adminShopIdSchema } from "@/validations/admin-shop";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerText();
  return { title: `${t("Shop details")} | AG Stores` };
}

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
    <section className="min-w-0 w-full">
      <Link
        href="/admin/shops"
        className={buttonVariants({ variant: null, className: "px-0" })}
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        <Text value="Back to shops" />
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            <Text value={"Shop details"} />
          </p>
          <h1 className="mt-1 break-words text-3xl font-semibold tracking-tight">
            {data.shop.name}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            <Text value={"Owned by "} />
            {data.shop.owner.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={data.shop.isActive ? "success" : "secondary"}>
            <Text value={data.shop.isActive ? "Active" : "Inactive"} />
          </Badge>
          <Badge variant="secondary">
            <Text value={data.shop.isOpen ? "Open" : "Closed"} />
          </Badge>
          <AdminShopStatusControl
            shopId={data.shop.id}
            shopName={data.shop.name}
            initialIsActive={data.shop.isActive}
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ["Categories", data.shop.counts.categories],
            ["Products", data.shop.counts.products],
            ["Orders", data.shop.counts.orders],
            ["Delivery personnel", data.shop.counts.deliveryPersonnel],
          ] as const
        ).map(([label, count]) => (
          <Card key={label} className="gap-0 p-4">
            <p className="text-xs font-medium text-muted-foreground">
              <Text value={label} />
            </p>
            <p className="mt-2 text-2xl font-semibold">{count}</p>
          </Card>
        ))}
      </div>

      <section className="mt-6" aria-labelledby="edit-shop-heading">
        <h2 id="edit-shop-heading" className="mb-4 text-lg font-semibold">
          <Text value={"Edit shop "} />
        </h2>
        <AdminShopForm
          key={`${data.shop.id}:${data.shop.updatedAt}`}
          owners={data.owners}
          shop={data.shop}
        />
      </section>
    </section>
  );
}
