import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { UserRole } from "@/generated/prisma/client";
import { orderStatusLabels } from "@/features/orders/order-presentation";
import { requireRole } from "@/lib/auth/server";
import { getDictionary, routePath } from "@/lib/i18n/config";
import { getLocaleContext, getServerText } from "@/lib/i18n/server";
import { formatLocaleDate, translate } from "@/lib/i18n/text";
import {
  addMinorUnits,
  minorUnitsToMoney,
  moneyToMinorUnits,
} from "@/lib/money";
import { listCustomerAddresses } from "@/services/customer-address.service";
import { listCustomerOrders } from "@/services/customer-order.service";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerText();
  return { title: `${t("Account")} | AG Stores` };
}

export default async function AccountPage() {
  const [user, localeContext] = await Promise.all([
    requireRole(UserRole.CUSTOMER, "/account"),
    getLocaleContext(),
  ]);
  const [orders, addresses] = await Promise.all([
    listCustomerOrders(user),
    listCustomerAddresses(user),
  ]);
  const { locale, localizedRoute } = localeContext;
  const copy = getDictionary(locale).account;
  const href = (path: string) => routePath(path, locale, localizedRoute);
  const completedOrders = orders.orderHistory.filter(
    (order) => order.status === "DELIVERED",
  );
  const totalSpent = minorUnitsToMoney(
    completedOrders.reduce(
      (sum, order) => addMinorUnits(sum, moneyToMinorUnits(order.total)),
      "0",
    ),
  );
  const recentOrders = [...orders.activeOrders, ...orders.orderHistory]
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 4);

  const monthKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
  });
  const keyFor = (value: string | Date) => {
    const parts = monthKey.formatToParts(new Date(value));
    return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}`;
  };
  const currentMonthKey = keyFor(new Date());
  const currentYear = Number(currentMonthKey.slice(0, 4));
  const currentMonth = Number(currentMonthKey.slice(5, 7));
  const monthFormatter = new Intl.DateTimeFormat(
    locale === "si" ? "si-LK" : "en-LK",
    {
      month: "short",
      timeZone: "UTC",
    },
  );
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(currentYear, currentMonth - 6 + index, 1));
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    return {
      key,
      label: monthFormatter.format(date),
      count: completedOrders.filter((order) => keyFor(order.createdAt) === key)
        .length,
    };
  });
  const maxMonthCount = Math.max(1, ...months.map((month) => month.count));

  return (
    <section className="min-w-0 w-full space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {copy.yourAccount}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {copy.dashboardDescription}
          </p>
        </div>
        <Link href={href("/account/orders")} className={buttonVariants()}>
          {copy.viewAllOrders}
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: copy.totalOrders,
            value: orders.activeOrders.length + orders.orderHistory.length,
            detail: copy.allTime,
          },
          {
            label: copy.activeDeliveries,
            value: orders.activeOrders.length,
            detail: copy.trackActive,
          },
          {
            label: copy.deliveredOrders,
            value: completedOrders.length,
            detail: copy.successfullyDelivered,
          },
          {
            label: copy.spentOnDelivered,
            value: `LKR ${totalSpent}`,
            detail: copy.excludesCancelled,
          },
        ].map((metric) => (
          <Card key={metric.label} as="article">
            <CardHeader>
              <CardDescription>{metric.label}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums">
                {metric.value}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {metric.detail}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card as="section" aria-labelledby="delivery-chart-title">
          <CardHeader>
            <CardTitle id="delivery-chart-title">
              {copy.deliveryTrend}
            </CardTitle>
            <CardDescription>{copy.deliveryTrendDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <ol
              className="grid h-44 grid-cols-6 items-end gap-2"
              aria-label={copy.deliveryTrend}
            >
              {months.map((month) => (
                <li
                  key={month.key}
                  className="flex h-full min-w-0 flex-col items-center justify-end gap-2"
                  aria-label={`${month.label} ${month.key.slice(0, 4)}: ${month.count}`}
                >
                  <span className="text-xs font-medium tabular-nums">
                    {month.count}
                  </span>
                  <div className="flex h-28 w-full items-end rounded-md bg-muted/50 p-1">
                    <div
                      className="w-full rounded-sm bg-primary"
                      style={{
                        height: `${month.count ? Math.max(8, (month.count / maxMonthCount) * 100) : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {month.label}
                  </span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card as="section" aria-labelledby="next-step-title">
          <CardHeader>
            <CardTitle id="next-step-title">{copy.quickActions}</CardTitle>
            <CardDescription>{copy.quickActionsDescription}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Link
              href={href("/account/orders")}
              className={buttonVariants({
                variant: "outline",
                className: "justify-start",
              })}
            >
              {copy.trackOrders}
            </Link>
            <Link
              href={href("/account/addresses")}
              className={buttonVariants({
                variant: "outline",
                className: "justify-start",
              })}
            >
              {copy.deliveryAddresses}
            </Link>
            <Link
              href={href("/account/profile")}
              className={buttonVariants({
                variant: "outline",
                className: "justify-start",
              })}
            >
              {copy.editProfile}
            </Link>
            <Link
              href={href("/account/security")}
              className={buttonVariants({
                variant: "outline",
                className: "justify-start",
              })}
            >
              {copy.changePassword}
            </Link>
            {addresses.length === 0 ? (
              <p className="pt-2 text-sm text-muted-foreground">
                {copy.addAddressPrompt}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card as="section" aria-labelledby="recent-orders-title">
        <CardHeader className="sm:grid-cols-[1fr_auto]">
          <div>
            <CardTitle id="recent-orders-title">{copy.recentOrders}</CardTitle>
            <CardDescription>{copy.recentOrdersDescription}</CardDescription>
          </div>
          <Link
            href={href("/account/orders")}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {copy.viewAllOrders}
          </Link>
        </CardHeader>
        <CardContent>
          {recentOrders.length ? (
            <ul className="divide-y divide-border">
              {recentOrders.map((order) => (
                <li
                  key={order.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{order.shopName}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatLocaleDate(locale, order.createdAt, {
                        dateStyle: "medium",
                      })}{" "}
                      · {order.itemCount}{" "}
                      {order.itemCount === 1 ? copy.item : copy.items}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge
                      variant={
                        order.status === "DELIVERED"
                          ? "success"
                          : orders.activeOrders.some(
                                (active) => active.id === order.id,
                              )
                            ? "info"
                            : "muted"
                      }
                    >
                      {translate(locale, orderStatusLabels[order.status])}
                    </Badge>
                    <span className="font-medium tabular-nums">
                      LKR {order.total}
                    </span>
                    <Link
                      href={href(`/account/orders/${order.id}`)}
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                      })}
                    >
                      {copy.viewDetails}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>{copy.noOrdersYet}</EmptyTitle>
              </EmptyHeader>
              <EmptyContent>
                <Link href={href("/products")} className={buttonVariants()}>
                  {copy.startShopping}
                </Link>
              </EmptyContent>
            </Empty>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
