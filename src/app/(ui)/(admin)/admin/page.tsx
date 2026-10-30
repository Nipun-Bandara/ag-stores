import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  ClipboardList,
  ShoppingBag,
  Store,
  Truck,
  Users,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { AdminOrderChart } from "@/features/admin/components/admin-order-chart";
import { DateText } from "@/features/i18n/components/date-text";
import { Text } from "@/features/i18n/components/text";
import { UserRole } from "@/generated/prisma/client";
import { requireRole } from "@/lib/auth/server";
import { getServerText } from "@/lib/i18n/server";
import { ROLE_LABELS } from "@/lib/navigation";
import { getAdminDashboard } from "@/services/admin-dashboard.service";
import { listRecentOrderCancellations } from "@/services/admin-order.service";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerText();
  return { title: `${t("Administration dashboard")} | AG Stores` };
}

export default async function AdminDashboardPage() {
  const user = await requireRole(UserRole.ADMIN, "/admin");
  const [dashboard, cancellations, t] = await Promise.all([
    getAdminDashboard(user),
    listRecentOrderCancellations(user),
    getServerText(),
  ]);
  const metrics = [
    {
      label: "Orders today",
      value: dashboard.ordersToday,
      detail: "Across all shops",
      icon: ShoppingBag,
    },
    {
      label: "Delivered sales today",
      value: `LKR ${dashboard.salesToday}`,
      detail: "Product sales, excluding delivery fees",
      icon: Wallet,
    },
    {
      label: "Total users",
      value: dashboard.totalUsers,
      detail: "All registered accounts",
      icon: Users,
    },
    {
      label: "Shops accepting orders",
      value: `${dashboard.openShops} / ${dashboard.totalShops}`,
      detail: "Active and open / all shops",
      icon: Store,
    },
  ];
  const shortcuts = [
    {
      label: "Manage users",
      description: "Accounts and access",
      href: "/admin/users",
      icon: Users,
    },
    {
      label: "Manage shops",
      description: "Shop details and availability",
      href: "/admin/shops",
      icon: Store,
    },
    {
      label: "Delivery personnel",
      description: "Rider accounts and assignments",
      href: "/admin/delivery-personnel",
      icon: Truck,
    },
    {
      label: "View audit logs",
      description: "Review platform changes",
      href: "/admin/audit-logs",
      icon: ClipboardList,
    },
  ];

  return (
    <section className="min-w-0 w-full space-y-6">
      <header>
        <p className="text-sm text-muted-foreground">{user.name}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          {t("Administration dashboard")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("Monitor orders, shops, and account access across the platform.")}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, detail, icon: Icon }) => (
          <Card key={label} className="min-w-0 gap-0 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-muted-foreground">
                {t(label)}
              </p>
              <Icon
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </div>
            <p className="mt-2 break-words text-2xl font-semibold tabular-nums">
              {value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t(detail)}</p>
          </Card>
        ))}
      </div>

      <nav
        aria-label={t("Administration shortcuts")}
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {shortcuts.map(({ label, description, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={buttonVariants({
              variant: "outline",
              className:
                "h-auto min-w-0 justify-start gap-3 whitespace-normal p-3 text-left",
            })}
          >
            <Icon className="size-5 shrink-0 text-primary" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{t(label)}</span>
              <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                {t(description)}
              </span>
            </span>
            <ArrowUpRight
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          </Link>
        ))}
      </nav>

      <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card
          as="section"
          className="min-w-0 gap-0 p-4 sm:p-5"
          aria-labelledby="order-activity-heading"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 id="order-activity-heading" className="text-lg font-semibold">
                {t("Order activity")}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("Orders placed over the last seven days")}
              </p>
            </div>
            <Badge variant="secondary">
              {dashboard.weekOrders} {t("Orders")}
            </Badge>
          </div>
          {dashboard.weekOrders > 0 ? (
            <AdminOrderChart data={dashboard.dailyOrders} />
          ) : (
            <Empty className="mt-4 min-h-52">
              <EmptyHeader>
                <EmptyTitle>
                  {t("No orders in the last seven days.")}
                </EmptyTitle>
              </EmptyHeader>
            </Empty>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            {t("Daily figures use Sri Lanka time.")}
          </p>
        </Card>
        <Card
          as="section"
          className="min-w-0 gap-0 p-4 sm:p-5"
          aria-labelledby="fulfilment-heading"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="fulfilment-heading" className="text-lg font-semibold">
              {t("Current fulfilment")}
            </h2>
            <Badge variant="info">
              {dashboard.activeOrders} {t("Active orders")}
            </Badge>
          </div>
          <dl className="mt-3 space-y-1">
            {dashboard.pipeline.map((stage) => (
              <div
                key={stage.label}
                className="flex items-center justify-between gap-3 rounded-md px-2 py-2 text-sm"
              >
                <dt className="text-muted-foreground">{t(stage.label)}</dt>
                <dd className="font-semibold tabular-nums">{stage.count}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 rounded-lg bg-muted/50 p-3 text-sm">
            <span className="font-semibold tabular-nums">
              {dashboard.deliveredToday}
            </span>{" "}
            {t("Deliveries completed today")}
          </p>
        </Card>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <Card
          as="section"
          className="min-w-0 gap-0 p-4 sm:p-5"
          aria-labelledby="account-overview-heading"
        >
          <h2 id="account-overview-heading" className="text-lg font-semibold">
            {t("Accounts and access")}
          </h2>
          <dl className="mt-3 grid grid-cols-2 gap-3">
            {dashboard.roles.map(({ role, total }) => (
              <div key={role} className="min-w-0 rounded-lg bg-muted/50 p-3">
                <dt className="text-xs text-muted-foreground">
                  {t(ROLE_LABELS[role])}
                </dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums">
                  {total}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">
                {t("Inactive or suspended accounts")}
              </span>
              <Badge
                variant={dashboard.restrictedUsers ? "warning" : "secondary"}
              >
                {dashboard.restrictedUsers}
              </Badge>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">
                {t("Inactive shops")}
              </span>
              <Badge
                variant={dashboard.inactiveShops ? "warning" : "secondary"}
              >
                {dashboard.inactiveShops}
              </Badge>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">
                {t("Active riders without a shop")}
              </span>
              <Badge
                variant={dashboard.unassignedRiders ? "warning" : "secondary"}
              >
                {dashboard.unassignedRiders}
              </Badge>
            </div>
          </div>
        </Card>
        <Card
          as="section"
          className="min-w-0 gap-0 p-4 sm:p-5"
          aria-labelledby="cancellations-heading"
        >
          <h2 id="cancellations-heading" className="text-lg font-semibold">
            {t("Recent customer cancellations")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("Latest six cancellations across all shops.")}
          </p>
          {cancellations.length ? (
            <div className="mt-3 space-y-3">
              {cancellations.slice(0, 6).map((order) => (
                <article
                  key={order.id}
                  className="rounded-lg bg-muted/40 p-3 text-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-words font-medium">
                        {order.customer.name}
                      </p>
                      <p className="mt-0.5 break-words text-xs text-muted-foreground">
                        {order.shopName}
                      </p>
                    </div>
                    <p className="font-medium tabular-nums">
                      LKR {order.total}
                    </p>
                  </div>
                  <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
                    {order.id}
                  </p>
                  {order.cancellationReason ? (
                    <p className="mt-1 break-words">
                      <Text value="Reason: " />
                      {order.cancellationReason}
                    </p>
                  ) : null}
                  {order.cancelledAt ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      <Text value="Cancelled " />
                      <DateText value={order.cancelledAt} />
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <Empty className="mt-4">
              <EmptyHeader>
                <EmptyTitle>
                  {t("No customer cancellations have been recorded.")}
                </EmptyTitle>
              </EmptyHeader>
            </Empty>
          )}
        </Card>
      </div>
    </section>
  );
}
