import { getServerText } from "@/lib/i18n/server";
import { Text } from "@/features/i18n/components/text";
import type { Metadata } from "next";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { UserRole } from "@/generated/prisma/client";
import { UserStatusControl } from "@/features/admin/components/user-status-control";
import { requireRole } from "@/lib/auth/server";
import { AdminUserError, getAdminUser } from "@/services/admin-user.service";
import { adminUserIdSchema } from "@/validations/admin-user";
import { Card } from "@/components/ui/card";
import { getCurrentLocale } from "@/lib/i18n/server";
import { formatLocaleDate } from "@/lib/i18n/text";
import { ROLE_LABELS } from "@/lib/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getServerText();
  return { title: `${t("User details")} | AG Stores` };
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = adminUserIdSchema.safeParse((await params).id);
  if (!userId.success) notFound();
  const administrator = await requireRole(
    UserRole.ADMIN,
    `/admin/users/${userId.data}`,
  );
  const user = await getAdminUser(administrator, userId.data).catch((error) => {
    if (error instanceof AdminUserError && error.code === "USER_NOT_FOUND") {
      notFound();
    }
    throw error;
  });
  const locale = await getCurrentLocale();

  return (
    <section className="min-w-0 w-full">
      <Link
        href="/admin/users"
        className={buttonVariants({ variant: null, className: "px-0" })}
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        <Text value="Back to users" />
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            <Text value={"Account details"} />
          </p>
          <h1 className="mt-1 break-words text-3xl font-semibold tracking-tight">
            {user.name}
          </h1>
          <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
            {user.id}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Badge
            variant={
              user.status === "ACTIVE"
                ? "success"
                : user.status === "SUSPENDED"
                  ? "warning"
                  : "secondary"
            }
          >
            <Text
              value={
                {
                  ACTIVE: "Active",
                  INACTIVE: "Inactive",
                  SUSPENDED: "Suspended",
                }[user.status]
              }
            />
          </Badge>
          <UserStatusControl
            userId={user.id}
            userName={user.name}
            initialStatus={user.status}
          />
        </div>
      </div>

      <div className="mt-6 grid items-start gap-4 xl:grid-cols-2">
        <Card as="section" className="min-w-0 gap-0 p-4 sm:p-5">
          <h2 className="text-lg font-semibold">
            <Text value={"Identity and access"} />
          </h2>
          <dl className="mt-4 grid gap-x-5 gap-y-4 text-sm sm:grid-cols-2">
            <Detail label="Email" value={user.email ?? "Not provided"} />
            <Detail label="Phone" value={user.phone ?? "Not provided"} />
            <Detail label="Role" value={ROLE_LABELS[user.role]} />
            <Detail
              label="Status"
              value={
                {
                  ACTIVE: "Active",
                  INACTIVE: "Inactive",
                  SUSPENDED: "Suspended",
                }[user.status]
              }
            />
            <Detail
              label="Preferred language"
              value={user.preferredLanguage === "SI" ? "Sinhala" : "English"}
            />
          </dl>
        </Card>

        <Card as="section" className="min-w-0 gap-0 p-4 sm:p-5">
          <h2 className="text-lg font-semibold">
            <Text value={"Account activity"} />
          </h2>
          <dl className="mt-4 grid grid-cols-1 gap-3 min-[360px]:grid-cols-3">
            {[
              ["Saved addresses", user.activity.savedAddresses],
              ["Customer orders", user.activity.customerOrders],
              ["Delivery batches", user.activity.deliveryBatches],
            ].map(([label, count]) => (
              <div
                key={String(label)}
                className="min-w-0 rounded-lg bg-muted/50 p-3"
              >
                <dt className="text-xs text-muted-foreground">
                  <Text value={String(label)} />
                </dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">
                  {count}
                </dd>
              </div>
            ))}
          </dl>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <Detail
              label="Created"
              value={formatLocaleDate(locale, user.createdAt)}
            />
            <Detail
              label="Last updated"
              value={formatLocaleDate(locale, user.updatedAt)}
            />
          </dl>
        </Card>
      </div>

      {user.assignedShop || user.ownedShops.length ? (
        <Card as="section" className="min-w-0 gap-0 mt-4 p-4 sm:p-5">
          <h2 className="text-lg font-semibold">
            <Text value={"Shop relationships"} />
          </h2>
          <div className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
            {user.assignedShop ? (
              <div className="min-w-0">
                <Text value={"Assigned shop: "} />
                <Link
                  href={`/admin/shops/${user.assignedShop.id}`}
                  className="font-medium text-primary hover:opacity-80"
                >
                  {user.assignedShop.name}
                </Link>
              </div>
            ) : null}
            {user.ownedShops.length ? (
              <div className="min-w-0">
                <p className="text-muted-foreground">
                  <Text value={"Owned shops"} />
                </p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {user.ownedShops.map((shop) => (
                    <li key={shop.id} className="max-w-full">
                      <Link
                        href={`/admin/shops/${shop.id}`}
                        className={buttonVariants({
                          variant: "secondary",
                          size: "sm",
                          className:
                            "h-auto max-w-full whitespace-normal break-words text-left",
                        })}
                      >
                        {shop.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">
        <Text value={label} />
      </dt>
      <dd className="mt-1 break-words font-medium [overflow-wrap:anywhere]">
        <Text value={value} />
      </dd>
    </div>
  );
}
