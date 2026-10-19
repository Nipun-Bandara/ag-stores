import { getServerText } from "@/lib/i18n/server";
import { Text } from "@/features/i18n/components/text";
import type { Metadata } from "next";

import Link from "next/link";

import { UserRole } from "@/generated/prisma/client";
import { AdminShopForm } from "@/features/admin/components/admin-shop-form";
import { AdminShopStatusControl } from "@/features/admin/components/admin-shop-status-control";
import { requireRole } from "@/lib/auth/server";
import { getAdminShopManagement } from "@/services/admin-shop.service";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerText();
  return { title: `${t("Shops")} | AG Stores` };
}

export default async function AdminShopsPage() {
  const administrator = await requireRole(UserRole.ADMIN, "/admin/shops");
  const management = await getAdminShopManagement(administrator);

  return (
    <section className="min-w-0 w-full">
      <h1 className="text-3xl font-semibold tracking-tight">
        <Text value={"Shop management"} />
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        <Text
          value={
            "Create shops, assign owners, and control customer availability. "
          }
        />
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section aria-labelledby="create-shop-heading">
          <h2 id="create-shop-heading" className="mb-4 text-lg font-semibold">
            <Text value={"Create shop "} />
          </h2>
          <AdminShopForm owners={management.owners} />
        </section>

        <section aria-labelledby="shops-heading">
          <div className="flex items-center justify-between gap-4">
            <h2 id="shops-heading" className="text-lg font-semibold">
              <Text value={"Shops "} />
            </h2>
            <p className="text-sm text-muted-foreground">
              {management.shops.length}{" "}
              <Text value={management.shops.length === 1 ? "shop" : "shops"} />
            </p>
          </div>
          {management.shops.length ? (
            <div className="mt-4 space-y-4">
              {management.shops.map((shop) => (
                <Card
                  as="article"
                  key={shop.id}
                  data-testid="admin-shop-card"
                  className="gap-0 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <Link
                        href={`/admin/shops/${shop.id}`}
                        className="font-semibold underline"
                      >
                        {shop.name}
                      </Link>
                      <p className="mt-1 text-sm text-muted-foreground">
                        <Text value={"Owner: "} />
                        {shop.owner.name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {shop.address}
                      </p>
                    </div>
                    <div className="flex gap-2 text-xs font-medium">
                      <Badge variant="secondary">
                        <Text value={shop.isActive ? "Active" : "Inactive"} />
                      </Badge>
                      <Badge variant="secondary">
                        <Text value={shop.isOpen ? "Open" : "Closed"} />
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-4">
                    <AdminShopStatusControl
                      shopId={shop.id}
                      shopName={shop.name}
                      initialIsActive={shop.isActive}
                    />
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Empty className="mt-4">
              <EmptyHeader>
                <EmptyTitle>
                  <Text value={"No shops have been created. "} />
                </EmptyTitle>
              </EmptyHeader>
            </Empty>
          )}
        </section>
      </div>
    </section>
  );
}
