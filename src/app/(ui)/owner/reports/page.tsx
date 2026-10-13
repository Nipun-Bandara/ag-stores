import type { Metadata } from "next";
import Link from "next/link";

import { OrderStatus, UserRole } from "@/generated/prisma/client";
import { orderStatusLabels } from "@/features/orders/order-presentation";
import { requireRole } from "@/lib/auth/server";
import { getOwnerReports } from "@/services/owner-report.service";
import { ownerReportFiltersSchema } from "@/validations/owner-report";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Button, buttonVariants } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";

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
    <section className="min-w-0 w-full">
      <h1 className="text-3xl font-semibold tracking-tight">Reports</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Basic order, revenue, delivery, product, and stock reporting for your
        shops.
      </p>

      <Card className="gap-0 mt-8 p-5">
        <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Label className="text-sm font-medium" htmlFor="from">
            From
            <Input
              id="from"
              name="from"
              type="date"
              defaultValue={reports.filters.from}
              className="mt-1.5 h-10 w-full"
            />
          </Label>
          <Label className="text-sm font-medium" htmlFor="to">
            To
            <Input
              id="to"
              name="to"
              type="date"
              defaultValue={reports.filters.to}
              className="mt-1.5 h-10 w-full"
            />
          </Label>
          <Label className="text-sm font-medium" htmlFor="status">
            Status
            <NativeSelect
              id="status"
              name="status"
              defaultValue={reports.filters.status ?? ""}
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
          <div className="flex items-end gap-2">
            <Button type="submit" className="h-10">
              Apply filters
            </Button>
            <Link
              href="/owner/reports"
              className={buttonVariants({
                variant: "outline",
                className: "inline-flex h-10 items-center",
              })}
            >
              Reset
            </Link>
          </div>
        </form>
      </Card>
      {!parsed.success ? (
        <Alert variant="destructive" role="alert" className="mt-3">
          Invalid report filters were reset to the default range.
        </Alert>
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
          <Card
            key={key}
            data-testid={`owner-report-${key}`}
            className="gap-0 p-4"
          >
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card as="section" className="gap-0 p-5">
          <h2 className="text-lg font-semibold">Daily orders and revenue</h2>
          {reports.dailyOrders.length ? (
            <div className="mt-4 overflow-x-auto">
              <Table className="min-w-full text-left text-sm">
                <TableHeader className="border-b text-muted-foreground">
                  <TableRow>
                    <TableHead className="py-2 font-medium">Date</TableHead>
                    <TableHead className="py-2 font-medium">Orders</TableHead>
                    <TableHead className="py-2 font-medium">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y">
                  {reports.dailyOrders.map((metric) => (
                    <TableRow key={metric.date} data-testid="daily-report-row">
                      <TableCell className="py-3">{metric.date}</TableCell>
                      <TableCell className="py-3">{metric.orders}</TableCell>
                      <TableCell className="py-3">
                        LKR {revenueByDate.get(metric.date) ?? "0.00"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              No orders were found for this period.
            </p>
          )}
        </Card>

        <Card as="section" className="gap-0 p-5">
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
            <p className="mt-4 text-sm text-muted-foreground">
              No status totals are available.
            </p>
          )}
        </Card>

        <Card as="section" className="gap-0 p-5">
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
                    <span className="block text-xs text-muted-foreground">
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
            <p className="mt-4 text-sm text-muted-foreground">
              No product sales were found for this period.
            </p>
          )}
        </Card>

        <Card as="section" className="gap-0 p-5">
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
                    <span className="block text-xs text-muted-foreground">
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
            <p className="mt-4 text-sm text-muted-foreground">
              No products are currently low on stock.
            </p>
          )}
        </Card>
      </div>
    </section>
  );
}
