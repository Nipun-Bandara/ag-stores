import type { Metadata } from "next";

import Link from "next/link";

import { UserRole } from "@/generated/prisma/client";
import { RoleAwareNavigation } from "@/features/auth/components/role-aware-navigation";
import { formatOrderDate } from "@/features/orders/order-presentation";
import { requireRole } from "@/lib/auth/server";
import { listAvailableDeliveryOrders } from "@/services/delivery-order.service";
import { availableDeliveryOrderFiltersSchema } from "@/validations/delivery-order";

export const metadata: Metadata = { title: "Available orders | AG Stores" };

interface DeliveryOrdersPageProps {
  searchParams: Promise<{
    sortBy?: string | string[];
    direction?: string | string[];
    maxDistanceKm?: string | string[];
    createdAfter?: string | string[];
  }>;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DeliveryOrdersPage({
  searchParams,
}: DeliveryOrdersPageProps) {
  const user = await requireRole(UserRole.DELIVERY_PERSON, "/delivery/orders");
  const query = await searchParams;
  const rawFilters = Object.fromEntries(
    Object.entries(query).flatMap(([key, value]) => {
      const selected = first(value);
      return selected ? [[key, selected]] : [];
    }),
  );
  const parsed = availableDeliveryOrderFiltersSchema.safeParse(rawFilters);
  const filters = parsed.success
    ? parsed.data
    : availableDeliveryOrderFiltersSchema.parse({});
  const data = await listAvailableDeliveryOrders(user, filters);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <RoleAwareNavigation user={user} />
      <section className="pt-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          Available orders
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Ready orders from {data.shop.name} that have not yet been assigned.
        </p>

        <form className="mt-8 grid gap-4 rounded-xl border p-5 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-sm font-medium" htmlFor="maxDistanceKm">
            Maximum distance
            <input
              id="maxDistanceKm"
              name="maxDistanceKm"
              type="number"
              min="0.1"
              max="500"
              step="0.1"
              defaultValue={filters.maxDistanceKm ?? ""}
              placeholder="Kilometres"
              className="mt-1.5 h-10 w-full rounded-md border px-3 text-sm"
            />
          </label>
          <label className="text-sm font-medium" htmlFor="createdAfter">
            Created after
            <input
              id="createdAfter"
              name="createdAfter"
              type="date"
              defaultValue={filters.createdAfter ?? ""}
              className="mt-1.5 h-10 w-full rounded-md border px-3 text-sm"
            />
          </label>
          <label className="text-sm font-medium" htmlFor="sortBy">
            Sort by
            <select
              id="sortBy"
              name="sortBy"
              defaultValue={filters.sortBy}
              className="mt-1.5 h-10 w-full rounded-md border bg-white px-3 text-sm"
            >
              <option value="createdAt">Creation time</option>
              <option value="distance">Distance</option>
            </select>
          </label>
          <label className="text-sm font-medium" htmlFor="direction">
            Direction
            <select
              id="direction"
              name="direction"
              defaultValue={filters.direction}
              className="mt-1.5 h-10 w-full rounded-md border bg-white px-3 text-sm"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="h-10 rounded-md bg-neutral-950 px-4 text-sm font-medium text-white"
            >
              Apply
            </button>
            <Link
              href="/delivery/orders"
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

        {data.orders.length ? (
          <div className="mt-6 grid gap-4">
            {data.orders.map((order) => (
              <article
                key={order.id}
                data-testid="available-order-card"
                className="rounded-xl border bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                      Order ID
                    </p>
                    <p className="mt-1 break-all font-mono text-sm font-semibold">
                      {order.id}
                    </p>
                    <p className="mt-3 text-sm font-medium">
                      {order.deliveryArea}
                    </p>
                    <p className="mt-1 text-sm text-neutral-600">
                      {order.itemCount} item
                      {order.itemCount === 1 ? "" : "s"} ·{" "}
                      {order.distanceKm.toFixed(1)} km from shop
                    </p>
                    <time className="mt-1 block text-xs text-neutral-500">
                      {formatOrderDate(order.createdAt)}
                    </time>
                  </div>
                  <p className="font-semibold">LKR {order.total}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-dashed p-10 text-center text-sm text-neutral-600">
            No ready orders match these filters.
          </div>
        )}
      </section>
    </main>
  );
}
