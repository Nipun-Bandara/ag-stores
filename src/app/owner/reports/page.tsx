import type { Metadata } from "next";
import Link from "next/link";

import { OrderStatus, UserRole } from "@/generated/prisma/client";
import { RoleAwareNavigation } from "@/features/auth/components/role-aware-navigation";
import { orderStatusLabels } from "@/features/orders/order-presentation";
import { requireRole } from "@/lib/auth/server";
import { getOwnerReports } from "@/services/owner-report.service";
import { ownerReportFiltersSchema } from "@/validations/owner-report";

export const metadata: Metadata = { title: "Reports | AG Stores" };

interface OwnerReportsPageProps {
  searchParams: Promise<{
    from?: string | string[];
    to?: string | string[];
    status?: string | string[];
  }>;
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function OwnerReportsPage({
  searchParams,
}: OwnerReportsPageProps) {
  const user = await requireRole(UserRole.SHOP_OWNER, "/owner/reports");
  const query = await searchParams;
  const rawFilters = {
    ...(first(query.from) ? { from: first(query.from) } : {}),
    ...(first(query.to) ? { to: first(query.to) } : {}),
    ...(first(query.status) ? { status: first(query.status) } : {}),
  };
  const parsed = ownerReportFiltersSchema.safeParse(rawFilters);
  const reports = await getOwnerReports(
    user,
    parsed.success ? parsed.data : {},
  );
  const revenueByDate = new Map(
    reports.dailyRevenue.map((metric) => [metric.date, metric.revenue]),
  );

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <RoleAwareNavigation user={user} />
      <section className="pt-8">
        <h1 className="text-3xl font-semibold tracking-tight">Reports</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Basic order, revenue, delivery, product, and stock reporting for your
          shops.
        </p>

        <form className="mt-8 grid gap-4 rounded-xl border bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-medium" htmlFor="from">
            From
            <input
              id="from"
              name="from"
              type="date"
              defaultValue={reports.filters.from}
              className="mt-1.5 h-10 w-full rounded-md border px-3 text-sm"
            />
          </label>
          <label className="text-sm font-medium" htmlFor="to">
            To
            <input
              id="to"
              name="to"
              type="date"
              defaultValue={reports.filters.to}
              className="mt-1.5 h-10 w-full rounded-md border px-3 text-sm"
            />
          </label>
          <label className="text-sm font-medium" htmlFor="status">
            Status
            <select
              id="status"
              name="status"
              defaultValue={reports.filters.status ?? ""}
              className="mt-1.5 h-10 w-full rounded-md border bg-white px-3 text-sm"
            >
              <option value="">All statuses</option>
              {Object.values(OrderStatus).map((status) => (
                <option key={status} value={status}>
                  {orderStatusLabels[status]}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="h-10 rounded-md bg-neutral-950 px-4 text-sm font-medium text-white"
            >
              Apply filters
            </button>
            <Link
              href="/owner/reports"
              className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium"
            >
              Reset
            </Link>
          </div>
        </form>
        {!parsed.success ? (
          <p role="alert" className="mt-3 text-sm text-red-700">
            Invalid report filters were reset to the default range.
          </p>
        ) : null}

        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ["orders", "Total orders", reports.summary.totalOrders],
            [
              "revenue",
              "Delivered revenue",
              `LKR ${reports.summary.totalRevenue}`,
            ],
            [
              "completed",
              "Completed deliveries",
              reports.summary.completedDeliveries,
            ],
            ["failed", "Failed deliveries", reports.summary.failedDeliveries],
          ].map(([key, label, value]) => (
            <div
              key={key}
              data-testid={`owner-report-${key}`}
              className="rounded-xl border bg-white p-4"
            >
              <p className="text-xs font-medium text-neutral-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border bg-white p-5">
            <h2 className="text-lg font-semibold">Daily orders and revenue</h2>
            {reports.dailyOrders.length ? (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b text-neutral-500">
                    <tr>
                      <th className="py-2 font-medium">Date</th>
                      <th className="py-2 font-medium">Orders</th>
                      <th className="py-2 font-medium">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {reports.dailyOrders.map((metric) => (
                      <tr key={metric.date} data-testid="daily-report-row">
                        <td className="py-3">{metric.date}</td>
                        <td className="py-3">{metric.orders}</td>
                        <td className="py-3">
                          LKR {revenueByDate.get(metric.date) ?? "0.00"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-4 text-sm text-neutral-500">
                No orders were found for this period.
              </p>
            )}
          </section>

          <section className="rounded-xl border bg-white p-5">
            <h2 className="text-lg font-semibold">Orders by status</h2>
            {reports.ordersByStatus.length ? (
              <ul className="mt-4 divide-y">
                {reports.ordersByStatus.map((metric) => (
                  <li
                    key={metric.status}
                    className="flex justify-between gap-4 py-3 text-sm"
                  >
                    <span>{orderStatusLabels[metric.status]}</span>
                    <span className="font-semibold">{metric.orders}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-neutral-500">
                No status totals are available.
              </p>
            )}
          </section>

          <section className="rounded-xl border bg-white p-5">
            <h2 className="text-lg font-semibold">Best-selling products</h2>
            {reports.bestSellingProducts.length ? (
              <ol className="mt-4 divide-y">
                {reports.bestSellingProducts.map((product) => (
                  <li
                    key={product.productId}
                    className="flex justify-between gap-4 py-3 text-sm"
                  >
                    <span>
                      <span className="font-medium">{product.nameEn}</span>
                      <span className="block text-xs text-neutral-500">
                        {product.shopName}
                      </span>
                    </span>
                    <span className="font-semibold">
                      {product.quantitySold} sold
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 text-sm text-neutral-500">
                No product sales were found for this period.
              </p>
            )}
          </section>

          <section className="rounded-xl border bg-white p-5">
            <h2 className="text-lg font-semibold">Low-stock products</h2>
            {reports.lowStockProducts.length ? (
              <ul className="mt-4 divide-y">
                {reports.lowStockProducts.map((product) => (
                  <li
                    key={product.productId}
                    className="flex justify-between gap-4 py-3 text-sm"
                  >
                    <span>
                      <span className="font-medium">{product.nameEn}</span>
                      <span className="block text-xs text-neutral-500">
                        {product.shopName}
                      </span>
                    </span>
                    <span>
                      {product.stockQuantity} / {product.lowStockThreshold}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-neutral-500">
                No products are currently low on stock.
              </p>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
