import { BilingualText } from "@/features/i18n/components/bilingual-text";
import { getServerText } from "@/lib/i18n/server";
import { Text } from "@/features/i18n/components/text";
import type { Metadata } from "next";

import Link from "next/link";

import { UserRole } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth/server";
import { getOwnerDashboard } from "@/services/owner-dashboard.service";
import { Card } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { buttonVariants } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerText();
  return { title: `${t("Owner dashboard")} | AG Stores` };
}

export default async function OwnerDashboardPage() {
  const t = await getServerText();
  const user = await requireRole(UserRole.SHOP_OWNER, "/owner");
  const dashboard = await getOwnerDashboard(user);
  const metrics = [
    {
      key: "orders-today",
      label: "Orders today",
      value: dashboard.ordersToday,
    },
    { key: "pending", label: "Pending orders", value: dashboard.pendingOrders },
    { key: "preparing", label: "Preparing", value: dashboard.preparingOrders },
    {
      key: "ready",
      label: "Ready for delivery",
      value: dashboard.readyForDelivery,
    },
    {
      key: "out-for-delivery",
      label: "Out for delivery",
      value: dashboard.outForDelivery,
    },
    {
      key: "delivered-today",
      label: "Delivered today",
      value: dashboard.deliveredToday,
    },
    {
      key: "revenue-today",
      label: "Today's revenue",
      value: `LKR ${dashboard.revenueToday}`,
    },
    {
      key: "low-stock",
      label: "Low-stock products",
      value: dashboard.lowStockProducts.length,
    },
  ] as const;

  return (
    <section className="min-w-0 w-full">
      <p className="text-sm font-medium text-muted-foreground">{user.name}</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            <Text value={"Shop owner dashboard "} />
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            <Text
              value={"Track order activity and manage your shop catalog. "}
            />
          </p>
        </div>
        <Link
          href="/owner/orders"
          aria-label={t("Open order workflow")}
          className={buttonVariants({ variant: "default", className: "" })}
        >
          <Text value={"Manage orders "} />
        </Link>
      </div>

      <section className="mt-8" aria-labelledby="shop-summary-heading">
        <h2 id="shop-summary-heading" className="text-lg font-semibold">
          <Text value={"Shop overview "} />
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          <Text
            value={
              "Workflow counts are current. Daily totals use Sri Lanka time, and revenue includes delivered orders only. "
            }
          />
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {metrics.map((metric) => (
            <Card
              key={metric.key}
              className="gap-0 p-4"
              data-testid={`owner-dashboard-metric-${metric.key}`}
            >
              <p className="text-xs font-medium text-muted-foreground">
                <Text value={metric.label} />
              </p>
              <p className="mt-2 text-2xl font-semibold">{metric.value}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="low-stock-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="low-stock-heading" className="text-lg font-semibold">
              <Text value={"Low-stock products "} />
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              <Text
                value={
                  "Products with remaining stock at or below their configured threshold. "
                }
              />
            </p>
          </div>
          <Link
            href="/owner/products?inventoryStatus=LOW_STOCK"
            className="text-sm font-medium underline"
          >
            <Text value={"Review inventory "} />
          </Link>
        </div>
        {dashboard.lowStockProducts.length ? (
          <Card className="gap-0 mt-4 overflow-hidden">
            <ul className="divide-y" data-testid="low-stock-products">
              {dashboard.lowStockProducts.map((product) => (
                <li
                  key={product.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div>
                    <p className="font-medium">
                      <BilingualText
                        english={product.nameEn}
                        sinhala={product.nameSi}
                      />
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {product.shopName}
                    </p>
                  </div>
                  <p className="text-sm">
                    <span className="font-semibold">
                      {product.stockQuantity}
                    </span>{" "}
                    <Text value={"in stock · threshold "} />
                    {product.lowStockThreshold}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <Empty className="mt-4">
            <EmptyHeader>
              <EmptyTitle>
                <Text value={"No products are currently low on stock. "} />
              </EmptyTitle>
            </EmptyHeader>
          </Empty>
        )}
      </section>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            [
              "Orders",
              "/owner/orders",
              "Review and prepare customer orders.",
              "Open workflow",
            ],
            [
              "Products",
              "/owner/products",
              "Manage products, prices, and stock.",
              "Open inventory",
            ],
            [
              "Categories",
              "/owner/categories",
              "Organize the storefront catalog.",
              "Open catalog setup",
            ],
            [
              "Reports",
              "/owner/reports",
              "Review order, revenue, delivery, and inventory summaries.",
              "Open reports",
            ],
          ] as const
        ).map(([title, href, description, accessibleLabel]) => (
          <Link
            key={href}
            href={href}
            aria-label={t(accessibleLabel)}
            className="block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Card className="h-full gap-0 p-5">
              <h2 className="font-semibold">
                <Text value={title} />
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                <Text value={description} />
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
