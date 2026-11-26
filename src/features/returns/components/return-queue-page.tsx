import Link from "next/link";
import { getReturnQueue } from "@/services/order-return.service";
import { requireRole } from "@/lib/auth/server";
import { getLocaleContext, getServerText } from "@/lib/i18n/server";
import { routePath, localizeBilingual } from "@/lib/i18n/config";
import { parseProductPage } from "@/lib/product-pagination";
import { ProductPagination } from "@/features/products/components/product-pagination";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableCell,
  TableBody,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";

export type ReturnQuery = Promise<{
  page?: string | string[];
  pageSize?: string | string[];
  status?: string | string[];
}>;
export async function ReturnQueuePage({
  staff = false,
  searchParams,
}: {
  staff?: boolean;
  searchParams: ReturnQuery;
}) {
  const user = await requireRole(
    staff ? "ORDER_STAFF" : "SHOP_OWNER",
    staff ? "/staff/returns" : "/owner/returns",
  );
  const query = await searchParams;
  const value = Array.isArray(query.status) ? query.status[0] : query.status;
  const status =
    value === "APPROVED" || value === "REJECTED" ? value : "PENDING";
  const [data, t, { locale, localizedRoute }] = await Promise.all([
    getReturnQueue(user, parseProductPage(query), status),
    getServerText(),
    getLocaleContext(),
  ]);
  const options = [
    { value: "PENDING", label: t("Pending review") },
    { value: "APPROVED", label: t("Approved") },
    { value: "REJECTED", label: t("Rejected") },
  ];
  return (
    <section className="w-full min-w-0">
      <h1 className="text-3xl font-semibold tracking-tight">
        {t("Returns and refunds")}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t(
          staff
            ? "Record returns from the delivered order. Approved refunds can be recorded as paid after handing cash to the customer."
            : "Review returned goods before approving refunds and any stock restoration.",
        )}
      </p>
      <form className="mt-6 flex flex-wrap items-end gap-3">
        <Label className="block w-full sm:w-56" htmlFor="return-status">
          {t("Status")}
          <Select
            name="status"
            items={options}
            key={status}
            defaultValue={status}
          >
            <SelectTrigger
              id="return-status"
              className="mt-1.5 h-10 w-full data-[size=default]:h-10"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Label>
        <Button type="submit" className="h-10" variant="outline">
          {t("Apply filter")}
        </Button>
      </form>
      <ProductPagination
        page={data.page}
        pageSize={data.pageSize}
        pageCount={data.pageCount}
        total={data.total}
      />
      {data.records.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("Product")}</TableHead>
              <TableHead>{t("Customer")}</TableHead>
              <TableHead>{t("Quantity")}</TableHead>
              <TableHead>{t("Refund")}</TableHead>
              <TableHead className="text-right">{t("Actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.records.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="min-w-40 whitespace-normal">
                  <p className="font-medium">
                    {localizeBilingual(
                      record.orderItem.product.nameEn,
                      record.orderItem.product.nameSi,
                      locale,
                    )}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {record.order.shop.name}
                  </p>
                </TableCell>
                <TableCell>{record.order.customer.name}</TableCell>
                <TableCell>
                  {record.quantity}{" "}
                  {t(record.orderItem.sellingUnit === "KG" ? "kg" : "units")}
                </TableCell>
                <TableCell>
                  LKR {record.refundAmount}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t(
                      record.refundPaidAt
                        ? "Cash refund paid"
                        : record.status === "APPROVED"
                          ? "Refund pending"
                          : record.status === "REJECTED"
                            ? "Rejected"
                            : "Pending review",
                    )}
                  </p>
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={routePath(
                      `${staff ? "/staff" : "/owner"}/orders/${record.orderId}#returns`,
                      locale,
                      localizedRoute,
                    )}
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                    })}
                  >
                    {t("View order")}
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{t("No returns match this status.")}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      )}
      {data.total ? (
        <ProductPagination
          page={data.page}
          pageSize={data.pageSize}
          pageCount={data.pageCount}
          total={data.total}
          compact
        />
      ) : null}
    </section>
  );
}
