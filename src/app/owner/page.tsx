import type { Metadata } from "next";

import Link from "next/link";

import { UserRole } from "@/generated/prisma/client";
import { RoleAwareNavigation } from "@/features/auth/components/role-aware-navigation";
import { requireRole } from "@/lib/auth/server";
import { getOwnerOrderDashboard } from "@/services/owner-order.service";

export const metadata: Metadata = { title: "Owner dashboard | AG Stores" };

export default async function OwnerDashboardPage() {
  const user = await requireRole(UserRole.SHOP_OWNER, "/owner");
  const dashboard = await getOwnerOrderDashboard(user);

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
            className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-medium text-white"
          >
            Manage orders
          </Link>
        </div>

        <section className="mt-8" aria-labelledby="order-summary-heading">
          <h2 id="order-summary-heading" className="text-lg font-semibold">
            Order overview
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {dashboard.summaries.map((summary) => (
              <div key={summary.key} className="rounded-xl border bg-white p-4">
                <p className="text-xs font-medium text-neutral-500">
                  {summary.label}
                </p>
                <p className="mt-2 text-2xl font-semibold">{summary.count}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {(
            [
              [
                "Orders",
                "/owner/orders",
                "Review and prepare customer orders.",
              ],
              [
                "Products",
                "/owner/products",
                "Manage products, prices, and stock.",
              ],
              [
                "Categories",
                "/owner/categories",
                "Organize the storefront catalog.",
              ],
            ] as const
          ).map(([title, href, description]) => (
            <Link
              key={href}
              href={href}
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
