import { DateText } from "@/features/i18n/components/date-text";
import { Text } from "@/features/i18n/components/text";
import Link from "next/link";

import { UserRole } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth/server";
import { listRecentOrderCancellations } from "@/services/admin-order.service";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

export default async function AdminDashboardPage() {
  const user = await requireRole(UserRole.ADMIN, "/admin");
  const cancellations = await listRecentOrderCancellations(user);

  return (
    <section className="min-w-0 w-full">
      <Card as="section" className="gap-0 p-4 sm:p-6">
        <p className="text-sm font-medium text-muted-foreground">{user.name}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          <Text value={"Administration dashboard "} />
        </h1>
        <p className="mt-3 text-muted-foreground">
          <Text
            value={"Review customer order cancellations across all shops. "}
          />
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/admin/users"
            className={buttonVariants({
              variant: "default",
              className: "inline-flex",
            })}
          >
            <Text value={"Manage users "} />
          </Link>
          <Link
            href="/admin/shops"
            className={buttonVariants({
              variant: "outline",
              className: "inline-flex",
            })}
          >
            <Text value={"Manage shops "} />
          </Link>
          <Link
            href="/admin/audit-logs"
            className={buttonVariants({
              variant: "outline",
              className: "inline-flex",
            })}
          >
            <Text value={"View audit logs "} />
          </Link>
        </div>
      </Card>

      <Card as="section" className="gap-0 mt-8 p-5">
        <h2 className="text-xl font-semibold">
          <Text value={"Recent customer cancellations"} />
        </h2>
        {cancellations.length ? (
          <div className="mt-4 divide-y">
            {cancellations.map((order) => (
              <article key={order.id} className="py-4 text-sm">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="break-all font-mono font-medium">
                      {order.id}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {order.customer.name} · {order.shopName}
                    </p>
                  </div>
                  <p className="font-medium">LKR {order.total}</p>
                </div>
                {order.cancelledAt ? (
                  <p className="mt-2 text-muted-foreground">
                    <Text value={"Cancelled "} />
                    <DateText value={order.cancelledAt} />
                  </p>
                ) : null}
                {order.cancellationReason ? (
                  <p className="mt-1">
                    <Text value={"Reason: "} />
                    {order.cancellationReason}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <Empty className="mt-4">
            <EmptyHeader>
              <EmptyTitle>
                <Text
                  value={"No customer cancellations have been recorded. "}
                />
              </EmptyTitle>
            </EmptyHeader>
          </Empty>
        )}
      </Card>
    </section>
  );
}
