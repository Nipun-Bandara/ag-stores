import { UserRole } from "@/generated/prisma/client";
import { RoleAwareNavigation } from "@/features/auth/components/role-aware-navigation";
import { formatOrderDate } from "@/features/orders/order-presentation";
import { requireRole } from "@/lib/auth/server";
import { listRecentOrderCancellations } from "@/services/admin-order.service";

export default async function AdminDashboardPage() {
  const user = await requireRole(UserRole.ADMIN, "/admin");
  const cancellations = await listRecentOrderCancellations(user);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <RoleAwareNavigation user={user} />
      <section className="mt-8 rounded-xl border p-6 sm:p-8">
        <p className="text-sm font-medium text-neutral-500">{user.name}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Administration dashboard
        </h1>
        <p className="mt-3 text-neutral-600">
          Review customer order cancellations across all shops.
        </p>
      </section>

      <section className="mt-8 rounded-xl border bg-white p-5">
        <h2 className="text-xl font-semibold">Recent customer cancellations</h2>
        {cancellations.length ? (
          <div className="mt-4 divide-y">
            {cancellations.map((order) => (
              <article key={order.id} className="py-4 text-sm">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="break-all font-mono font-medium">
                      {order.id}
                    </p>
                    <p className="mt-1 text-neutral-600">
                      {order.customer.name} · {order.shopName}
                    </p>
                  </div>
                  <p className="font-medium">LKR {order.total}</p>
                </div>
                {order.cancelledAt ? (
                  <p className="mt-2 text-neutral-600">
                    Cancelled {formatOrderDate(order.cancelledAt)}
                  </p>
                ) : null}
                {order.cancellationReason ? (
                  <p className="mt-1">Reason: {order.cancellationReason}</p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-neutral-500">
            No customer cancellations have been recorded.
          </p>
        )}
      </section>
    </main>
  );
}
