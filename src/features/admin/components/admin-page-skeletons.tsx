import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, ClipboardList, Store, Truck, Users } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Text } from "@/features/i18n/components/text";

function LoadingPage({ children }: { children: ReactNode }) {
  return (
    <section className="min-w-0 w-full" aria-busy="true">
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
    <header>
      <h1 className="text-3xl font-semibold tracking-tight">
        <Text value={title} />
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        <Text value={description} />
      </p>
    </header>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="text-lg font-semibold">
      <Text value={children} />
    </h2>
  );
}

function DetailHeading({ shop = false }: { shop?: boolean }) {
  return (
    <>
      <Link
        href={shop ? "/admin/shops" : "/admin/users"}
        className="text-sm font-medium underline"
      >
        <Text value={shop ? "← Back to shops " : "← Back to users "} />
      </Link>
      <div className="mt-5 flex flex-wrap justify-between gap-4">
        <div className="w-full max-w-md space-y-2">
          <p className="text-sm text-muted-foreground">
            <Text value={shop ? "Shop details" : "Account details"} />
          </p>
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
    </>
  );
}

function FieldPlaceholder({
  label,
  loading = true,
  tall = false,
}: {
  label: string;
  loading?: boolean;
  tall?: boolean;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <p className="text-sm font-medium">
        <Text value={label} />
      </p>
      {loading ? (
        <Skeleton className={tall ? "h-24 w-full" : "h-10 w-full"} />
      ) : tall ? (
        <Textarea disabled aria-label={label} className="min-h-24 w-full" />
      ) : (
        <Input disabled aria-label={label} className="h-10 w-full" />
      )}
    </div>
  );
}

function StaticSelect({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 space-y-2">
      <p className="text-sm font-medium">
        <Text value={label} />
      </p>
      <Button
        disabled
        variant="outline"
        className="h-10 w-full justify-start font-normal"
      >
        <Text value={value} />
      </Button>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {["Categories", "Products", "Orders", "Delivery personnel"].map(
        (label) => (
          <Card key={label} className="min-w-0 gap-3 p-4">
            <p className="text-xs text-muted-foreground">
              <Text value={label} />
            </p>
            <Skeleton className="h-8 w-1/2" />
          </Card>
        ),
      )}
    </div>
  );
}

function TableSkeleton({ columns }: { columns: string[] }) {
  return (
    <Table className="min-w-[640px]">
      <TableHeader>
        <TableRow>
          {columns.map((label) => (
            <TableHead key={label}>
              <Text value={label} />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 6 }, (_, row) => (
          <TableRow key={row}>
            {columns.map((label, column) => (
              <TableCell key={label} className="py-4">
                <div className="space-y-2">
                  <Skeleton
                    className={column === 0 ? "h-4 w-32" : "h-4 w-20"}
                  />
                  {column < 2 ? <Skeleton className="h-3 w-24" /> : null}
                </div>
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function RecordCardSkeleton({ badges = 1 }: { badges?: number }) {
  return (
    <Card className="min-w-0 gap-0 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
        <div className="flex shrink-0 flex-col items-center gap-2">
          <div className="flex gap-1">
            {Array.from({ length: badges }, (_, index) => (
              <Skeleton key={index} className="h-5 w-12 rounded-full" />
            ))}
          </div>
          <div className="flex gap-2">
            <Skeleton className="size-8" />
            <Skeleton className="size-8" />
          </div>
        </div>
      </div>
    </Card>
  );
}

function ShopFormPlaceholder({ editing = false }: { editing?: boolean }) {
  return (
    <Card className="min-w-0 gap-0 p-5 sm:p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FieldPlaceholder label="Shop owner" />
        </div>
        <div className="sm:col-span-2">
          <FieldPlaceholder label="Shop name" loading={editing} />
        </div>
        <div className="sm:col-span-2">
          <FieldPlaceholder label="Address" loading={editing} tall />
        </div>
        <FieldPlaceholder label="Phone" loading={editing} />
        <div className="flex items-center gap-3 self-end py-2">
          {editing ? (
            <Skeleton className="size-4 shrink-0" />
          ) : (
            <Checkbox disabled aria-label="Open for customer orders" />
          )}
          <p className="text-sm">
            <Text value="Open for customer orders" />
          </p>
        </div>
        <div className="space-y-3 sm:col-span-2">
          <p className="text-sm font-medium">
            <Text value="Pin location" />
          </p>
          {editing ? (
            <Skeleton className="h-4 w-full" />
          ) : (
            <p className="text-sm text-muted-foreground">
              <Text value="Search the map, tap your exact spot, or use your current location." />
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button disabled variant="outline">
              <Text value="Choose on map" />
            </Button>
            <Button disabled variant="outline">
              <Text value="Use my current location" />
            </Button>
          </div>
        </div>
        <FieldPlaceholder
          label="Minimum order amount (LKR)"
          loading={editing}
        />
        <FieldPlaceholder label="Delivery fee (LKR)" loading={editing} />
        <div className="sm:col-span-2">
          <FieldPlaceholder
            label="Maximum delivery radius (km)"
            loading={editing}
          />
        </div>
      </div>
      <Button disabled variant="success" className="mt-6 w-fit">
        <Text value={editing ? "Save shop" : "Create shop"} />
      </Button>
    </Card>
  );
}

export function AdminDashboardSkeleton() {
  const metrics = [
    ["Orders today", "Across all shops"],
    ["Delivered sales today", "Product sales, excluding delivery fees"],
    ["Total users", "All registered accounts"],
    ["Shops accepting orders", "Active and open / all shops"],
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
    <LoadingPage>
      <div className="space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-4 w-28" />
          <Heading
            title="Administration dashboard"
            description="Monitor orders, shops, and account access across the platform."
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map(([label, detail]) => (
            <Card key={label} className="min-w-0 gap-3 p-4">
              <p className="text-sm text-muted-foreground">
                <Text value={label!} />
              </p>
              <Skeleton className="h-8 w-2/3" />
              <p className="text-xs text-muted-foreground">
                <Text value={detail!} />
              </p>
            </Card>
          ))}
        </div>
        <nav
          aria-label="Administration shortcuts"
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
              <Icon
                className="size-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="block">
                  <Text value={label} />
                </span>
                <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                  <Text value={description} />
                </span>
              </span>
              <ArrowUpRight className="size-4 shrink-0" aria-hidden="true" />
            </Link>
          ))}
        </nav>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <Card className="min-w-0 gap-0 p-5">
            <SectionTitle>Order activity</SectionTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              <Text value="Orders placed over the last seven days" />
            </p>
            <Skeleton className="mt-4 h-52 w-full" />
            <p className="mt-3 text-xs text-muted-foreground">
              <Text value="Daily figures use Sri Lanka time." />
            </p>
          </Card>
          <Card className="min-w-0 gap-0 p-5">
            <SectionTitle>Current fulfilment</SectionTitle>
            <dl className="mt-4 space-y-5">
              {[
                "Awaiting confirmation",
                "Confirmed and preparing",
                "Ready for delivery",
                "Assigned",
                "Out for delivery",
              ].map((label) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-sm text-muted-foreground">
                    <Text value={label} />
                  </dt>
                  <dd>
                    <Skeleton className="h-4 w-6" />
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted/50 p-3">
              <Skeleton className="h-4 w-8" />
              <Text value="Deliveries completed today" />
            </div>
          </Card>
        </div>
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
          <Card className="min-w-0 gap-4 p-5">
            <SectionTitle>Accounts and access</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              {[
                "Customer",
                "Shop owner",
                "Delivery person",
                "Administrator",
              ].map((label) => (
                <div key={label} className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">
                    <Text value={label} />
                  </p>
                  <Skeleton className="mt-2 h-6 w-12" />
                </div>
              ))}
            </div>
            {[
              "Inactive or suspended accounts",
              "Inactive shops",
              "Active riders without a shop",
            ].map((label) => (
              <div key={label} className="flex justify-between gap-3 text-sm">
                <Text value={label} />
                <Skeleton className="h-5 w-8 shrink-0" />
              </div>
            ))}
          </Card>
          <Card className="min-w-0 gap-3 p-5">
            <SectionTitle>Recent customer cancellations</SectionTitle>
            <p className="text-xs text-muted-foreground">
              <Text value="Latest six cancellations across all shops." />
            </p>
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-28 w-full" />
            ))}
          </Card>
        </div>
      </div>
    </LoadingPage>
  );
}

export function AdminUsersSkeleton() {
  return (
    <LoadingPage>
      <Heading
        title="User management"
        description="Search accounts, review access roles, and manage account status."
      />
      <Card className="mt-8 gap-0 p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_auto_auto]">
          <FieldPlaceholder label="Search users" loading={false} />
          <StaticSelect label="Role" value="All roles" />
          <StaticSelect label="Status" value="All statuses" />
          <Button disabled className="h-10 self-end">
            <Text value="Apply filters" />
          </Button>
          <Button disabled variant="outline" className="h-10 self-end">
            <Text value="Clear" />
          </Button>
        </div>
      </Card>
      <div className="mt-8 flex justify-between gap-4">
        <SectionTitle>Users</SectionTitle>
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="mt-4 min-w-0">
        <TableSkeleton
          columns={["User", "Contact", "Role", "Status", "Actions"]}
        />
      </div>
    </LoadingPage>
  );
}

export function AdminUserDetailSkeleton() {
  const sections = [
    {
      title: "Identity and access",
      fields: ["Email", "Phone", "Role", "Status", "Preferred language"],
    },
    {
      title: "Account activity",
      fields: [
        "Created",
        "Last updated",
        "Saved addresses",
        "Customer orders",
        "Delivery batches",
      ],
    },
  ];
  return (
    <LoadingPage>
      <DetailHeading />
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {sections.map((section) => (
          <Card key={section.title} className="min-w-0 gap-0 p-5">
            <SectionTitle>{section.title}</SectionTitle>
            <dl className="mt-4 space-y-4">
              {section.fields.map((label) => (
                <div key={label}>
                  <dt className="text-sm text-muted-foreground">
                    <Text value={label} />
                  </dt>
                  <dd>
                    <Skeleton className="mt-1 h-4 w-3/4" />
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        ))}
      </div>
      <Card className="mt-6 gap-3 p-5">
        <SectionTitle>Shop relationships</SectionTitle>
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </Card>
    </LoadingPage>
  );
}

export function AdminShopsSkeleton() {
  return (
    <LoadingPage>
      <Heading
        title="Shop management"
        description="Create shops, assign owners, and control customer availability."
      />
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="min-w-0 space-y-4">
          <SectionTitle>Create shop</SectionTitle>
          <ShopFormPlaceholder />
        </div>
        <div className="min-w-0 space-y-4">
          <SectionTitle>Shops</SectionTitle>
          {Array.from({ length: 4 }, (_, index) => (
            <RecordCardSkeleton key={index} badges={2} />
          ))}
        </div>
      </div>
    </LoadingPage>
  );
}

export function AdminShopDetailSkeleton() {
  return (
    <LoadingPage>
      <DetailHeading shop />
      <div className="mt-8">
        <StatsSkeleton />
      </div>
      <div className="mt-8 space-y-4">
        <SectionTitle>Edit shop</SectionTitle>
        <ShopFormPlaceholder editing />
      </div>
    </LoadingPage>
  );
}

export function AdminDeliveryPersonnelSkeleton() {
  return (
    <LoadingPage>
      <Heading
        title="Delivery personnel administration"
        description="View and manage delivery accounts across every shop."
      />
      <Card className="mt-8 gap-4 p-5">
        <SectionTitle>Create delivery account</SectionTitle>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <FieldPlaceholder label="Name" loading={false} />
          <FieldPlaceholder label="Email" loading={false} />
          <FieldPlaceholder label="Phone" loading={false} />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <FieldPlaceholder label="Assigned shop" />
          <StaticSelect label="Status" value="Active" />
          <Button disabled variant="success" className="h-10 w-fit self-end">
            <Text value="Create delivery account" />
          </Button>
        </div>
      </Card>
      <div className="mt-8">
        <SectionTitle>Delivery personnel</SectionTitle>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <RecordCardSkeleton key={index} />
        ))}
      </div>
    </LoadingPage>
  );
}

export function AdminAuditLogsSkeleton() {
  return (
    <LoadingPage>
      <Heading
        title="Audit logs"
        description="Recent sensitive administrative and business actions."
      />
      <Card className="mt-6 min-w-0 gap-0 py-0">
        <TableSkeleton
          columns={["Time", "Action", "Actor", "Entity", "Safe metadata"]}
        />
      </Card>
    </LoadingPage>
  );
}
