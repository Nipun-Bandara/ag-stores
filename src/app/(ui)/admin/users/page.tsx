import type { Metadata } from "next";

import Link from "next/link";

import { UserRole, UserStatus } from "@/generated/prisma/client";
import { UserStatusControl } from "@/features/admin/components/user-status-control";
import { requireRole } from "@/lib/auth/server";
import { listAdminUsers } from "@/services/admin-user.service";
import { adminUserFiltersSchema } from "@/validations/admin-user";
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
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

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
    <section className="min-w-0 w-full">
      <h1 className="text-3xl font-semibold tracking-tight">User management</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Search accounts, review access roles, and manage account status.
      </p>

      <Card className="gap-0 mt-8 p-5">
        <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_auto_auto]">
          <Label className="text-sm font-medium" htmlFor="search">
            Search users
            <Input
              id="search"
              name="search"
              defaultValue={filters.search ?? ""}
              placeholder="Name, email, or phone"
              maxLength={150}
              className="mt-1.5 h-10 w-full"
            />
          </Label>
          <Label className="text-sm font-medium" htmlFor="role">
            Role
            <NativeSelect
              id="role"
              name="role"
              defaultValue={filters.role ?? ""}
              className="mt-1.5 h-10 w-full"
            >
              <NativeSelectOption value="">All roles</NativeSelectOption>
              {Object.values(UserRole).map((role) => (
                <NativeSelectOption key={role} value={role}>
                  {roleLabels[role]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Label>
          <Label className="text-sm font-medium" htmlFor="status">
            Status
            <NativeSelect
              id="status"
              name="status"
              defaultValue={filters.status ?? ""}
              className="mt-1.5 h-10 w-full"
            >
              <NativeSelectOption value="">All statuses</NativeSelectOption>
              {Object.values(UserStatus).map((status) => (
                <NativeSelectOption key={status} value={status}>
                  {statusLabels[status]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Label>
          <Button type="submit" className="h-10 self-end">
            Apply filters
          </Button>
          <Link
            href="/admin/users"
            className={buttonVariants({
              variant: "outline",
              className: "inline-flex h-10 items-center self-end",
            })}
          >
            Clear
          </Link>
        </form>
      </Card>
      {!parsed.success ? (
        <Alert variant="destructive" role="alert" className="mt-3">
          One or more filters were invalid and have been cleared.
        </Alert>
      ) : null}

      <section className="mt-8" aria-labelledby="users-heading">
        <div className="flex items-center justify-between gap-4">
          <h2 id="users-heading" className="text-lg font-semibold">
            Users
          </h2>
          <p className="text-sm text-muted-foreground">
            {users.length} {users.length === 1 ? "account" : "accounts"}
          </p>
        </div>
        {users.length ? (
          <Card className="gap-0 mt-4 overflow-x-auto">
            <Table className="w-full min-w-[760px] text-left text-sm">
              <TableHeader className="border-b bg-muted/50 text-muted-foreground">
                <TableRow>
                  <TableHead className="px-4 py-3 font-medium">User</TableHead>
                  <TableHead className="px-4 py-3 font-medium">
                    Contact
                  </TableHead>
                  <TableHead className="px-4 py-3 font-medium">Role</TableHead>
                  <TableHead className="px-4 py-3 font-medium">
                    Status
                  </TableHead>
                  <TableHead className="px-4 py-3 font-medium">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y">
                {users.map((user) => (
                  <TableRow key={user.id} data-testid="admin-user-row">
                    <TableCell className="px-4 py-4">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="font-semibold underline"
                      >
                        {user.name}
                      </Link>
                    </TableCell>
                    <TableCell className="px-4 py-4 text-muted-foreground">
                      {user.email ?? user.phone ?? "Not provided"}
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      {roleLabels[user.role]}
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <Badge
                        variant="secondary"
                        data-testid={`user-status-${user.id}`}
                      >
                        {statusLabels[user.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <UserStatusControl
                        userId={user.id}
                        userName={user.name}
                        initialStatus={user.status}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <Card
            as="p"
            className="gap-0 mt-4 border-dashed p-5 text-sm text-muted-foreground border ring-0"
          >
            No users match these filters.
          </Card>
        )}
      </section>
    </section>
  );
}
