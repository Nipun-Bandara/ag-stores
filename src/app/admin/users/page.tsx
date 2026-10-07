import type { Metadata } from "next";

import Link from "next/link";

import { UserRole, UserStatus } from "@/generated/prisma/client";
import { UserStatusControl } from "@/features/admin/components/user-status-control";
import { RoleAwareNavigation } from "@/features/auth/components/role-aware-navigation";
import { requireRole } from "@/lib/auth/server";
import { listAdminUsers } from "@/services/admin-user.service";
import { adminUserFiltersSchema } from "@/validations/admin-user";

export const metadata: Metadata = { title: "Users | AG Stores" };

const roleLabels: Record<UserRole, string> = {
  CUSTOMER: "Customer",
  SHOP_OWNER: "Shop owner",
  DELIVERY_PERSON: "Delivery person",
  ADMIN: "Administrator",
};

const statusLabels: Record<UserStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  SUSPENDED: "Suspended",
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string | string[];
    role?: string | string[];
    status?: string | string[];
  }>;
}) {
  const administrator = await requireRole(UserRole.ADMIN, "/admin/users");
  const query = await searchParams;
  const parsed = adminUserFiltersSchema.safeParse({
    search: first(query.search) || undefined,
    role: first(query.role) || undefined,
    status: first(query.status) || undefined,
  });
  const filters = parsed.success ? parsed.data : {};
  const users = await listAdminUsers(administrator, filters);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <RoleAwareNavigation user={administrator} />
      <section className="pt-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          User management
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Search accounts, review access roles, and manage account status.
        </p>

        <form className="mt-8 grid gap-4 rounded-xl border p-5 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_auto_auto]">
          <label className="text-sm font-medium" htmlFor="search">
            Search users
            <input
              id="search"
              name="search"
              defaultValue={filters.search ?? ""}
              placeholder="Name, email, or phone"
              maxLength={150}
              className="mt-1.5 h-10 w-full rounded-md border px-3 text-sm"
            />
          </label>
          <label className="text-sm font-medium" htmlFor="role">
            Role
            <select
              id="role"
              name="role"
              defaultValue={filters.role ?? ""}
              className="mt-1.5 h-10 w-full rounded-md border bg-white px-3 text-sm"
            >
              <option value="">All roles</option>
              {Object.values(UserRole).map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium" htmlFor="status">
            Status
            <select
              id="status"
              name="status"
              defaultValue={filters.status ?? ""}
              className="mt-1.5 h-10 w-full rounded-md border bg-white px-3 text-sm"
            >
              <option value="">All statuses</option>
              {Object.values(UserStatus).map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="h-10 self-end rounded-md bg-neutral-950 px-4 text-sm font-medium text-white"
          >
            Apply filters
          </button>
          <Link
            href="/admin/users"
            className="inline-flex h-10 items-center self-end rounded-md border px-4 text-sm font-medium"
          >
            Clear
          </Link>
        </form>
        {!parsed.success ? (
          <p role="alert" className="mt-3 text-sm text-red-700">
            One or more filters were invalid and have been cleared.
          </p>
        ) : null}

        <section className="mt-8" aria-labelledby="users-heading">
          <div className="flex items-center justify-between gap-4">
            <h2 id="users-heading" className="text-lg font-semibold">
              Users
            </h2>
            <p className="text-sm text-neutral-500">
              {users.length} {users.length === 1 ? "account" : "accounts"}
            </p>
          </div>
          {users.length ? (
            <div className="mt-4 overflow-x-auto rounded-xl border bg-white">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b bg-neutral-50 text-neutral-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Contact</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((user) => (
                    <tr key={user.id} data-testid="admin-user-row">
                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="font-semibold underline"
                        >
                          {user.name}
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-neutral-600">
                        {user.email ?? user.phone ?? "Not provided"}
                      </td>
                      <td className="px-4 py-4">{roleLabels[user.role]}</td>
                      <td className="px-4 py-4">
                        <span
                          data-testid={`user-status-${user.id}`}
                          className="rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium"
                        >
                          {statusLabels[user.status]}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <UserStatusControl
                          userId={user.id}
                          userName={user.name}
                          initialStatus={user.status}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed p-5 text-sm text-neutral-600">
              No users match these filters.
            </p>
          )}
        </section>
      </section>
    </main>
  );
}
