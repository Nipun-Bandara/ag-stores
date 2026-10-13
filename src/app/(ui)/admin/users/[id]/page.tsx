import type { Metadata } from "next";

import Link from "next/link";
import { notFound } from "next/navigation";

import { UserRole } from "@/generated/prisma/client";
import { UserStatusControl } from "@/features/admin/components/user-status-control";
import { requireRole } from "@/lib/auth/server";
import { AdminUserError, getAdminUser } from "@/services/admin-user.service";
import { adminUserIdSchema } from "@/validations/admin-user";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "User details | AG Stores" };

const dateFormatter = new Intl.DateTimeFormat("en-LK", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Colombo",
});

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

  return (
    <section className="min-w-0 w-full">
      <Link href="/admin/users" className="text-sm font-medium underline">
        ← Back to users
      </Link>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Account details</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {user.name}
          </h1>
          <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
            {user.id}
          </p>
        </div>
        <UserStatusControl
          userId={user.id}
          userName={user.name}
          initialStatus={user.status}
        />
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card as="section" className="gap-0 p-5">
          <h2 className="text-lg font-semibold">Identity and access</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Detail label="Email" value={user.email ?? "Not provided"} />
            <Detail label="Phone" value={user.phone ?? "Not provided"} />
            <Detail label="Role" value={user.role.replaceAll("_", " ")} />
            <Detail label="Status" value={user.status} />
            <Detail
              label="Preferred language"
              value={user.preferredLanguage === "SI" ? "Sinhala" : "English"}
            />
          </dl>
        </Card>

        <Card as="section" className="gap-0 p-5">
          <h2 className="text-lg font-semibold">Account activity</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Detail
              label="Created"
              value={dateFormatter.format(new Date(user.createdAt))}
            />
            <Detail
              label="Last updated"
              value={dateFormatter.format(new Date(user.updatedAt))}
            />
            <Detail
              label="Saved addresses"
              value={String(user.activity.savedAddresses)}
            />
            <Detail
              label="Customer orders"
              value={String(user.activity.customerOrders)}
            />
            <Detail
              label="Delivery batches"
              value={String(user.activity.deliveryBatches)}
            />
          </dl>
        </Card>
      </div>

      {user.assignedShop || user.ownedShops.length ? (
        <Card as="section" className="gap-0 mt-6 p-5">
          <h2 className="text-lg font-semibold">Shop relationships</h2>
          {user.assignedShop ? (
            <p className="mt-3 text-sm">
              Assigned shop: <strong>{user.assignedShop.name}</strong>
            </p>
          ) : null}
          {user.ownedShops.length ? (
            <div className="mt-3 text-sm">
              <p className="text-muted-foreground">Owned shops</p>
              <ul className="mt-1 list-inside list-disc">
                {user.ownedShops.map((shop) => (
                  <li key={shop.id}>{shop.name}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      ) : null}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
