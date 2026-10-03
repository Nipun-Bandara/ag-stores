import type { Metadata } from "next";

import Link from "next/link";

import { OrderStatus, UserRole } from "@/generated/prisma/client";
import { RoleAwareNavigation } from "@/features/auth/components/role-aware-navigation";
import { OwnerOrderList } from "@/features/owner/components/owner-order-list";
import { orderStatusLabels } from "@/features/orders/order-presentation";
import { requireRole } from "@/lib/auth/server";
import { getOwnerOrderDashboard } from "@/services/owner-order.service";
import { ownerOrderFiltersSchema } from "@/validations/owner-order";

export const metadata: Metadata = { title: "Orders | AG Stores" };

interface OwnerOrdersPageProps {
  searchParams: Promise<{
    status?: string | string[];
    date?: string | string[];
    customer?: string | string[];
    orderNumber?: string | string[];
  }>;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function OwnerOrdersPage({
  searchParams,
}: OwnerOrdersPageProps) {
  const user = await requireRole(UserRole.SHOP_OWNER, "/owner/orders");
  const query = await searchParams;
  const rawFilters = {
    status: first(query.status) || undefined,
    date: first(query.date) || undefined,
    customer: first(query.customer) || undefined,
    orderNumber: first(query.orderNumber) || undefined,
  };
  const parsed = ownerOrderFiltersSchema.safeParse(rawFilters);
  const filters = parsed.success ? parsed.data : {};
  const dashboard = await getOwnerOrderDashboard(user, filters);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <RoleAwareNavigation user={user} />
      <section className="pt-8">
        <h1 className="text-3xl font-semibold tracking-tight">Orders</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Review incoming orders and move them through shop preparation.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {dashboard.summaries.map((summary) => (
            <div key={summary.key} className="rounded-xl border bg-white p-4">
              <p className="text-xs font-medium text-neutral-500">
                {summary.label}
              </p>
              <p className="mt-2 text-2xl font-semibold">{summary.count}</p>
            </div>
          ))}
        </div>

        <form className="mt-8 grid gap-4 rounded-xl border p-5 md:grid-cols-2 lg:grid-cols-5">
          <label className="text-sm font-medium" htmlFor="status">
            Status
            <select
              id="status"
              name="status"
              defaultValue={filters.status ?? ""}
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
          <label className="text-sm font-medium" htmlFor="date">
            Date
            <input
              id="date"
              name="date"
              type="date"
              defaultValue={filters.date ?? ""}
              className="mt-1.5 h-10 w-full rounded-md border px-3 text-sm"
            />
          </label>
          <label className="text-sm font-medium" htmlFor="customer">
            Customer
            <input
              id="customer"
              name="customer"
              defaultValue={filters.customer ?? ""}
              placeholder="Name, email, or phone"
              className="mt-1.5 h-10 w-full rounded-md border px-3 text-sm"
            />
          </label>
          <label className="text-sm font-medium" htmlFor="orderNumber">
            Order number
            <input
              id="orderNumber"
              name="orderNumber"
              defaultValue={filters.orderNumber ?? ""}
              placeholder="Full order number"
              className="mt-1.5 h-10 w-full rounded-md border px-3 font-mono text-sm"
            />
          </label>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="h-10 rounded-md bg-neutral-950 px-4 text-sm font-medium text-white"
            >
              Apply filters
            </button>
            <Link
              href="/owner/orders"
              className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium"
            >
              Clear
            </Link>
          </div>
        </form>
        {!parsed.success ? (
          <p role="alert" className="mt-3 text-sm text-red-700">
            One or more filters were invalid and have been cleared.
          </p>
        ) : null}

        <OwnerOrderList orders={dashboard.orders} />
      </section>
    </main>
  );
}
