import { BackLink } from "@/components/ui/back-link";
import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Download,
  CalendarDays,
  Pencil,
  Save,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Text } from "@/features/i18n/components/text";

function DataSkeleton(props: ComponentProps<typeof Skeleton>) {
  return <Skeleton aria-hidden="true" {...props} />;
}

function LoadingPage({
  children,
  centered = false,
}: {
  children: ReactNode;
  centered?: boolean;
}) {
  return (
    <section
      className={`min-w-0 w-full ${centered ? "mx-auto max-w-5xl" : ""}`}
      aria-busy="true"
    >
      <span role="status" className="sr-only">
        <Text value="Loading" />
      </span>
      {children}
    </section>
  );
}

function Heading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">
        <Text value={title} />
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        <Text value={description} />
      </p>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <h2 className="text-lg font-semibold">
      <Text value={title} />
    </h2>
  );
}

function Field({
  label,
  loading = true,
  tall = false,
  value = "",
  className = "",
}: {
  label: string;
  loading?: boolean;
  tall?: boolean;
  value?: string;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <Label className="block text-sm font-medium">
        <Text value={label} />
        {loading ? (
          <DataSkeleton className={`mt-1.5 w-full ${tall ? "h-28" : "h-10"}`} />
        ) : tall ? (
          <Textarea
            disabled
            defaultValue={value}
            className="mt-1.5 min-h-28 w-full"
          />
        ) : (
          <Input disabled defaultValue={value} className="mt-1.5 h-10 w-full" />
        )}
      </Label>
    </div>
  );
}

function StaticSelect({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <Label className="block text-sm font-medium">
        <Text value={label} />
        <Select disabled value="static">
          <SelectTrigger className="mt-1.5 h-10 w-full data-[size=default]:h-10">
            <SelectValue>
              <Text value={value} />
            </SelectValue>
          </SelectTrigger>
        </Select>
      </Label>
    </div>
  );
}

function DateFilter({
  label,
  input = false,
}: {
  label: string;
  input?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-medium">
        <Text value={label} />
      </p>
      {input ? (
        <>
          <InputGroup className="mt-1.5 h-10">
            <InputGroupInput disabled />
            <InputGroupAddon align="inline-end" className="pr-2">
              <InputGroupButton
                disabled
                variant="ghost"
                size="icon-xs"
                aria-label="Select date"
              >
                <CalendarDays aria-hidden="true" />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <p className="mt-1 text-xs text-muted-foreground">
            <Text value="Type a date or choose from the calendar." />
          </p>
        </>
      ) : (
        <Button
          disabled
          variant="outline"
          className="mt-1.5 h-10 w-full justify-between"
        >
          <Text value="Select date" />
          <CalendarDays aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}

function Metrics({
  labels,
  className = "",
}: {
  labels: string[];
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`}>
      {labels.map((label) => (
        <Card key={label} className="gap-0 p-4">
          <p className="text-xs font-medium text-muted-foreground">
            <Text value={label} />
          </p>
          <DataSkeleton className="mt-2 h-8 w-20 max-w-full" />
        </Card>
      ))}
    </div>
  );
}

function ListRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="mt-4 space-y-4">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <DataSkeleton className="h-4 w-3/4" />
            <DataSkeleton className="h-3 w-1/2" />
          </div>
          <DataSkeleton className="h-4 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}

function RecordCards({ type }: { type: "category" | "personnel" }) {
  return (
    <div
      className={`mt-4 grid gap-4 md:grid-cols-2 ${type === "category" ? "xl:grid-cols-3" : "2xl:grid-cols-3"}`}
    >
      {Array.from({ length: 3 }, (_, index) => (
        <Card key={index} className="gap-0 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <DataSkeleton className="h-5 w-3/4" />
              <DataSkeleton className="h-4 w-2/3" />
              <DataSkeleton className="h-3 w-1/2" />
              {type === "personnel" ? (
                <DataSkeleton className="h-3 w-2/3" />
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col items-center gap-2">
              <DataSkeleton className="h-6 w-16 rounded-full" />
              <div className="flex gap-2">
                <Button
                  disabled
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label="Edit"
                >
                  <Pencil aria-hidden="true" />
                </Button>
                <DataSkeleton className="size-8" />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function OwnerDashboardSkeleton() {
  return (
    <LoadingPage>
      <DataSkeleton className="h-5 w-32" />
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <Heading
          title="Shop owner dashboard"
          description="Track order activity and manage your shop catalog."
        />
        <Link href="/owner/orders" className={buttonVariants()}>
          <Text value="Manage orders" />
        </Link>
      </div>
      <section className="mt-8">
        <SectionTitle title="Shop overview" />
        <p className="mt-1 text-sm text-muted-foreground">
          <Text value="Workflow counts are current. Daily totals use Sri Lanka time, and revenue includes delivered orders only." />
        </p>
        <Metrics
          labels={[
            "Orders today",
            "Pending orders",
            "Preparing",
            "Ready for delivery",
            "Out for delivery",
            "Delivered today",
            "Today's revenue",
            "Low-stock products",
          ]}
          className="mt-4 sm:grid-cols-4"
        />
      </section>
      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <SectionTitle title="Low-stock products" />
            <p className="mt-1 text-sm text-muted-foreground">
              <Text value="Products with remaining stock at or below their configured threshold." />
            </p>
          </div>
          <Link
            href="/owner/products?inventoryStatus=LOW_STOCK"
            className="text-sm font-medium underline"
          >
            <Text value="Review inventory" />
          </Link>
        </div>
        <Card className="mt-4 gap-0 p-4">
          <ListRows />
        </Card>
      </section>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Orders", "/owner/orders", "Review and prepare customer orders."],
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
          [
            "Reports",
            "/owner/reports",
            "Review order, revenue, delivery, and inventory summaries.",
          ],
        ].map(([title, href, description]) => (
          <Link key={href} href={href!} className="block rounded-xl">
            <Card className="h-full gap-0 p-5">
              <h2 className="font-semibold">
                <Text value={title!} />
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                <Text value={description!} />
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </LoadingPage>
  );
}

export function OwnerProductsSkeleton() {
  return (
    <LoadingPage>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Heading
          title="Products"
          description="Manage product details, availability, prices, and stock."
        />
        <Link href="/owner/products/new" className={buttonVariants()}>
          <Text value="Add product" />
        </Link>
      </div>
      <Card className="mt-8 gap-0 p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
          <Field label="Search" loading={false} />
          <Field label="Category" />
          <StaticSelect label="Inventory" value="All stock levels" />
          <Button disabled variant="outline" className="h-10 self-end">
            <Text value="Apply filters" />
          </Button>
        </div>
      </Card>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="gap-0 p-5">
            <div className="flex justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-2">
                <DataSkeleton className="h-5 w-3/4" />
                <DataSkeleton className="h-4 w-2/3" />
              </div>
              <div className="space-y-2">
                <DataSkeleton className="h-6 w-20 rounded-full" />
                <DataSkeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {["Price", "Stock"].map((label) => (
                <div key={label}>
                  <p className="text-sm text-muted-foreground">
                    <Text value={label} />
                  </p>
                  <DataSkeleton className="mt-1 h-5 w-20" />
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div className="min-w-0 flex-1">
                <Field label="Low-stock threshold" />
              </div>
              <div className="min-w-0 flex-1">
                <Field label="Stock" />
              </div>
              <div className="flex gap-2">
                <Button disabled size="icon" aria-label="Update stock">
                  <Save aria-hidden="true" />
                </Button>
                <Button
                  disabled
                  variant="outline"
                  size="icon"
                  aria-label="Edit"
                >
                  <Pencil aria-hidden="true" />
                </Button>
                <DataSkeleton className="size-9" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </LoadingPage>
  );
}

export function OwnerProductFormSkeleton({
  editing = false,
}: {
  editing?: boolean;
}) {
  return (
    <LoadingPage centered>
      <Heading
        title={editing ? "Edit product" : "Add product"}
        description={
          editing
            ? "Update product information without changing its shop."
            : "Create a product for one of your shops."
        }
      />
      <div className="mx-auto mt-8 grid w-full max-w-5xl gap-5 sm:grid-cols-6 lg:grid-cols-12">
        <Field label="Shop" className="sm:col-span-3 lg:col-span-6" />
        <Field label="Category" className="sm:col-span-3 lg:col-span-6" />
        {["English name", "Sinhala name"].map((label) => (
          <Field
            key={label}
            label={label}
            loading={editing}
            className="sm:col-span-3 lg:col-span-6"
          />
        ))}
        {["English description", "Sinhala description"].map((label) => (
          <Field
            key={label}
            label={label}
            loading={editing}
            tall
            className="sm:col-span-3 lg:col-span-6"
          />
        ))}
        <Field
          label="Price"
          loading={editing}
          value="0.00"
          className="sm:col-span-2 lg:col-span-4"
        />
        <Field
          label="Stock quantity"
          loading={editing}
          value="0"
          className="sm:col-span-2 lg:col-span-4"
        />
        <Field
          label="Low-stock threshold"
          loading={editing}
          value="5"
          className="sm:col-span-2 lg:col-span-4"
        />
        <div className="sm:col-span-6 lg:col-span-12">
          <Field label="Image URL" loading={editing} />
          <p className="mt-1 text-xs text-muted-foreground">
            <Text value="Image uploads are not available yet. Provide a hosted image URL." />
          </p>
        </div>
        <div className="flex items-center gap-2 sm:col-span-6 lg:col-span-12">
          {editing ? (
            <DataSkeleton className="size-4" />
          ) : (
            <Checkbox disabled checked />
          )}
          <p className="text-sm font-medium">
            <Text value="Product is available" />
          </p>
        </div>
        <div className="flex flex-wrap gap-3 sm:col-span-6 lg:col-span-12">
          <Button disabled className="h-10">
            <Text value={editing ? "Save product" : "Create product"} />
          </Button>
          <Link
            href="/owner/products"
            className={buttonVariants({
              variant: "outline",
              className: "h-10",
            })}
          >
            <Text value="Cancel" />
          </Link>
        </div>
      </div>
    </LoadingPage>
  );
}

export function OwnerCategoriesSkeleton() {
  return (
    <LoadingPage>
      <Heading
        title="Product categories"
        description="Organize each shop's products in English and Sinhala."
      />
      <div className="mt-8 space-y-8">
        <Card className="gap-0 p-5">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto] lg:items-end">
            <div className="md:col-span-2 lg:col-span-4">
              <SectionTitle title="Create a category" />
            </div>
            <Field label="Shop" />
            <Field label="English name" loading={false} />
            <Field label="Sinhala name" loading={false} />
            <Button disabled className="h-10 md:col-span-2 lg:col-span-1">
              <Text value="Create category" />
            </Button>
          </div>
        </Card>
        <section>
          <SectionTitle title="Categories" />
          <RecordCards type="category" />
        </section>
      </div>
    </LoadingPage>
  );
}

export function OwnerDeliveryPersonnelSkeleton() {
  return (
    <LoadingPage>
      <Heading
        title="Delivery personnel"
        description="Create and manage delivery accounts assigned to your shops."
      />
      <div className="mt-8 space-y-8">
        <Card className="gap-0 p-5">
          <SectionTitle title="Create delivery account" />
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {["Name", "Email", "Phone"].map((label) => (
              <Field key={label} label={label} loading={false} />
            ))}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3 xl:items-end">
            <Field label="Assigned shop" />
            <StaticSelect label="Status" value="Active" />
            <Button disabled className="h-10 w-fit md:col-span-2 xl:col-span-1">
              <Text value="Create delivery account" />
            </Button>
          </div>
        </Card>
        <section>
          <SectionTitle title="Delivery personnel" />
          <RecordCards type="personnel" />
        </section>
      </div>
    </LoadingPage>
  );
}

export function OwnerOrdersSkeleton() {
  return (
    <LoadingPage>
      <Heading
        title="Orders"
        description="Review incoming orders and move them through shop preparation."
      />
      <Metrics
        labels={[
          "Newly placed",
          "Confirmed",
          "Preparing",
          "Ready for delivery",
          "Assigned",
          "Completed",
          "Rejected / cancelled",
        ]}
        className="mt-8 sm:grid-cols-4 lg:grid-cols-7"
      />
      <Card className="mt-6 gap-0 p-4 sm:p-5">
        <div className="grid items-start gap-x-4 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
          <StaticSelect label="Status" value="All statuses" />
          <DateFilter label="Date" input />
          <Field label="Customer" loading={false} />
          <Field label="Order number" loading={false} />
          <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:justify-end xl:col-span-4">
            <Button disabled className="h-10 sm:min-w-32">
              <Text value="Apply filters" />
            </Button>
            <Link
              href="/owner/orders"
              className={buttonVariants({
                variant: "outline",
                className: "h-10 sm:min-w-24",
              })}
            >
              <Text value="Clear" />
            </Link>
          </div>
        </div>
      </Card>
      <div className="mt-6 grid items-start gap-4 xl:grid-cols-2">
        {Array.from({ length: 3 }, (_, index) => (
          <Card key={index} className="min-w-0 gap-0 p-4 sm:p-5">
            <div className="flex justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  <Text value="Order number" />
                </p>
                <DataSkeleton className="mt-1 h-5 w-full max-w-72" />
              </div>
              <div className="space-y-2">
                <DataSkeleton className="h-6 w-24 rounded-full" />
                <DataSkeleton className="h-5 w-24" />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {["Customer", "Shop"].map((label) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">
                    <Text value={label} />
                  </p>
                  <DataSkeleton className="mt-1 h-4 w-3/4" />
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <DataSkeleton className="h-3 w-32" />
                <DataSkeleton className="h-3 w-12" />
              </div>
              <Button
                disabled
                variant="outline"
                size="icon"
                aria-label="View order"
              >
                <ArrowUpRight aria-hidden="true" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </LoadingPage>
  );
}

export function OwnerOrderDetailSkeleton() {
  return (
    <LoadingPage>
      <BackLink href="/owner/orders">
        <Text value="Back to orders" />
      </BackLink>
      <div className="mt-5 flex flex-wrap justify-between gap-4">
        <div className="min-w-0 w-full max-w-lg">
          <p className="text-sm text-muted-foreground">
            <Text value="Order number" />
          </p>
          <DataSkeleton className="mt-1 h-8 w-full" />
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Text value="Placed" />
            <DataSkeleton className="h-4 w-28" />
            <Text value="at" />
            <DataSkeleton className="h-4 w-24" />
          </div>
        </div>
        <DataSkeleton className="h-6 w-24 rounded-full" />
      </div>
      <Card className="mt-6 gap-0 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle title="Update order status" />
          <div className="flex flex-wrap gap-2">
            <DataSkeleton className="h-9 w-32" />
            <DataSkeleton className="h-9 w-24" />
          </div>
        </div>
      </Card>
      <div className="mt-6 grid items-start gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,1fr)]">
        <Card className="min-w-0 gap-0 p-4 sm:p-5">
          <SectionTitle title="Customer and delivery" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {["Customer", "Contact", "Delivery address"].map((label) => (
              <div key={label}>
                <p className="text-sm text-muted-foreground">
                  <Text value={label} />
                </p>
                <DataSkeleton className="mt-1 h-5 w-3/4" />
              </div>
            ))}
          </div>
        </Card>
        <Card className="min-w-0 gap-0 p-4 sm:p-5">
          <SectionTitle title="Payment summary" />
          <dl className="mt-4 space-y-3 text-sm">
            {["Subtotal", "Delivery fee", "Total"].map((label) => (
              <div key={label} className="flex justify-between gap-4">
                <dt>
                  <Text value={label} />
                </dt>
                <dd>
                  <DataSkeleton className="h-5 w-24" />
                </dd>
              </div>
            ))}
            <div className="flex justify-between gap-4">
              <dt>
                <Text value="Payment method" />
              </dt>
              <dd>
                <Text value="Cash on Delivery" />
              </dd>
            </div>
          </dl>
        </Card>
      </div>
      <div className="mt-4 grid items-start gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,1fr)]">
        <Card className="min-w-0 gap-0 p-4 sm:p-5">
          <SectionTitle title="Products" />
          <ListRows />
        </Card>
        <Card className="min-w-0 gap-0 p-4 sm:p-5">
          <SectionTitle title="Status history" />
          <div className="mt-5 space-y-6">
            {[0, 1, 2].map((index) => (
              <div key={index} className="flex gap-3">
                <DataSkeleton className="size-6 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <DataSkeleton className="h-3 w-2/3" />
                  <DataSkeleton className="h-4 w-full" />
                  <DataSkeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </LoadingPage>
  );
}

export function OwnerReportsSkeleton() {
  return (
    <LoadingPage>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <Heading
          title="Reports"
          description="Basic order, revenue, delivery, product, and stock reporting for your shops."
        />
        <Button disabled variant="outline" className="h-10">
          <Download aria-hidden="true" />
          <Text value="Export report" />
        </Button>
      </div>
      <Card className="mt-8 gap-0 p-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,1fr))_auto]">
          <DateFilter label="From" input />
          <DateFilter label="To" input />
          <StaticSelect label="Status" value="All statuses" />
          <div className="flex items-end gap-2 sm:col-span-2 xl:col-span-1 xl:pt-6.5">
            <Button disabled className="h-10">
              <Text value="Apply filters" />
            </Button>
            <Link
              href="/owner/reports"
              className={buttonVariants({
                variant: "outline",
                className: "h-10",
              })}
            >
              <Text value="Reset" />
            </Link>
          </div>
        </div>
      </Card>
      <Metrics
        labels={[
          "Total orders",
          "Delivered revenue",
          "Completed deliveries",
          "Failed deliveries",
        ]}
        className="mt-8 lg:grid-cols-4"
      />
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="gap-0 p-5">
          <SectionTitle title="Daily orders and revenue" />
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  {["Date", "Orders", "Revenue"].map((label) => (
                    <TableHead key={label}>
                      <Text value={label} />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 4 }, (_, index) => (
                  <TableRow key={index}>
                    {[0, 1, 2].map((column) => (
                      <TableCell key={column}>
                        <DataSkeleton className="h-4 w-full min-w-12" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
        {[
          "Orders by status",
          "Best-selling products",
          "Low-stock products",
        ].map((title) => (
          <Card key={title} className="gap-0 p-5">
            <SectionTitle title={title} />
            <ListRows rows={4} />
          </Card>
        ))}
      </div>
    </LoadingPage>
  );
}

export function OwnerSettingsSkeleton() {
  return (
    <LoadingPage>
      <Heading
        title="Shop settings"
        description="Configure shop details and the commercial rules enforced at checkout."
      />
      <div className="mt-8 space-y-6">
        <Card className="gap-0 p-5 sm:p-6">
          <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-end">
              <Field
                label="Shop name"
                className="sm:col-span-2 xl:col-span-1"
              />
              <Field label="Phone" />
              <div className="flex items-center gap-3 self-end py-2">
                <DataSkeleton className="size-4 shrink-0" />
                <p className="text-sm font-medium">
                  <Text value="Open for customer orders" />
                </p>
              </div>
            </div>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <Field label="Address" tall />
              <div className="min-w-0 space-y-3 rounded-lg bg-muted/40 p-3">
                <p className="text-sm font-medium">
                  <Text value="Pin location" />
                </p>
                <DataSkeleton className="h-6 w-36" />
                <DataSkeleton className="h-4 w-full" />
                <div className="flex flex-wrap gap-2">
                  <Button disabled variant="outline">
                    <Text value="Choose on map" />
                  </Button>
                  <Button disabled variant="outline">
                    <Text value="Use my current location" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Minimum order amount (LKR)" />
              <Field label="Delivery fee (LKR)" />
              <div className="sm:col-span-2 lg:col-span-1">
                <Field label="Maximum delivery radius (km)" />
                <p className="mt-1 text-xs text-muted-foreground">
                  <Text value="Uses approximate straight-line distance, not road distance." />
                </p>
              </div>
            </div>
            <Button disabled>
              <Text value="Save settings" />
            </Button>
          </div>
        </Card>
      </div>
    </LoadingPage>
  );
}
