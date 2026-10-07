import type { Metadata } from "next";

import Link from "next/link";

import { UserRole } from "@/generated/prisma/client";
import { RoleAwareNavigation } from "@/features/auth/components/role-aware-navigation";
import { requireRole } from "@/lib/auth/server";
import { getOwnerDashboard } from "@/services/owner-dashboard.service";

export const metadata: Metadata = { title: "Owner dashboard | AG Stores" };

export default async function OwnerDashboardPage() {
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
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <RoleAwareNavigation user={user} />
      <section className="pt-8">
        <p className="text-sm font-medium text-neutral-500">{user.name}</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Shop owner dashboard
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              Track order activity and manage your shop catalog.
            </p>
          </div>
          <Link
            href="/owner/orders"
            aria-label="Open order workflow"
            className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-medium text-white"
          >
            Manage orders
          </Link>
        </div>

        <section className="mt-8" aria-labelledby="shop-summary-heading">
          <h2 id="shop-summary-heading" className="text-lg font-semibold">
            Shop overview
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Workflow counts are current. Daily totals use Sri Lanka time, and
            revenue includes delivered orders only.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {metrics.map((metric) => (
              <div
                key={metric.key}
                className="rounded-xl border bg-white p-4"
                data-testid={`owner-dashboard-metric-${metric.key}`}
              >
                <p className="text-xs font-medium text-neutral-500">
                  {metric.label}
                </p>
                <p className="mt-2 text-2xl font-semibold">{metric.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8" aria-labelledby="low-stock-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="low-stock-heading" className="text-lg font-semibold">
                Low-stock products
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Products with remaining stock at or below their configured
                threshold.
              </p>
            </div>
            <Link
              href="/owner/products?inventoryStatus=LOW_STOCK"
              className="text-sm font-medium underline"
            >
              Review inventory
            </Link>
          </div>
          {dashboard.lowStockProducts.length ? (
            <div className="mt-4 overflow-hidden rounded-xl border bg-white">
              <ul className="divide-y" data-testid="low-stock-products">
                {dashboard.lowStockProducts.map((product) => (
                  <li
                    key={product.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-4"
                  >
                    <div>
                      <p className="font-medium">{product.nameEn}</p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {product.shopName}
                      </p>
                    </div>
                    <p className="text-sm">
                      <span className="font-semibold">
                        {product.stockQuantity}
                      </span>{" "}
                      in stock · threshold {product.lowStockThreshold}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed bg-white p-5 text-sm text-neutral-600">
              No products are currently low on stock.
            </p>
          )}
        </section>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
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
            ] as const
          ).map(([title, href, description, accessibleLabel]) => (
            <Link
              key={href}
              href={href}
              aria-label={accessibleLabel}
              className="rounded-xl border bg-white p-5"
            >
              <h2 className="font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-neutral-600">{description}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
