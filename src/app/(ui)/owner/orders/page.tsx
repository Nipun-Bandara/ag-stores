import type { Metadata } from "next";

import Link from "next/link";

import { OrderStatus, UserRole } from "@/generated/prisma/client";
import { OwnerOrderList } from "@/features/owner/components/owner-order-list";
import { orderStatusLabels } from "@/features/orders/order-presentation";
import { requireRole } from "@/lib/auth/server";
import { getOwnerOrderDashboard } from "@/services/owner-order.service";
import { ownerOrderFiltersSchema } from "@/validations/owner-order";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";

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
    <section className="min-w-0 w-full">
      <h1 className="text-3xl font-semibold tracking-tight">Orders</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Review incoming orders and move them through shop preparation.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {dashboard.summaries.map((summary) => (
          <Card key={summary.key} className="gap-0 p-4">
            <p className="text-xs font-medium text-muted-foreground">
              {summary.label}
            </p>
            <p className="mt-2 text-2xl font-semibold">{summary.count}</p>
          </Card>
        ))}
      </div>

      <Card className="gap-0 mt-8 p-5">
        <form className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Label className="text-sm font-medium" htmlFor="status">
            Status
            <NativeSelect
              id="status"
              name="status"
              defaultValue={filters.status ?? ""}
              className="mt-1.5 h-10 w-full"
            >
              <NativeSelectOption value="">All statuses</NativeSelectOption>
              {Object.values(OrderStatus).map((status) => (
                <NativeSelectOption key={status} value={status}>
                  {orderStatusLabels[status]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Label>
          <Label className="text-sm font-medium" htmlFor="date">
            Date
            <Input
              id="date"
              name="date"
              type="date"
              defaultValue={filters.date ?? ""}
              className="mt-1.5 h-10 w-full"
            />
          </Label>
          <Label className="text-sm font-medium" htmlFor="customer">
            Customer
            <Input
              id="customer"
              name="customer"
              defaultValue={filters.customer ?? ""}
              placeholder="Name, email, or phone"
              className="mt-1.5 h-10 w-full"
            />
          </Label>
          <Label className="text-sm font-medium" htmlFor="orderNumber">
            Order number
            <Input
              id="orderNumber"
              name="orderNumber"
              defaultValue={filters.orderNumber ?? ""}
              placeholder="Full order number"
              className="mt-1.5 h-10 w-full font-mono"
            />
          </Label>
          <div className="flex items-end gap-2">
            <Button type="submit" className="h-10">
              Apply filters
            </Button>
            <Link
              href="/owner/orders"
              className={buttonVariants({
                variant: "outline",
                className: "inline-flex h-10 items-center",
              })}
            >
              Clear
            </Link>
          </div>
        </form>
      </Card>
      {!parsed.success ? (
        <Alert variant="destructive" role="alert" className="mt-3">
          One or more filters were invalid and have been cleared.
        </Alert>
      ) : null}

      <OwnerOrderList orders={dashboard.orders} />
    </section>
  );
}
