import { getDb } from "@/db";
import { UserRole } from "@/generated/prisma/client";
import {
  PrismaAdminUserRepository,
  type AdminUserDetailRecord,
  type AdminUserListRecord,
  type AdminUserRepository,
} from "@/repositories/admin-user.repository";
import type { AuthenticatedUser } from "@/types/auth";
import type {
  AdminUserFilters,
  AdminUserStatusInput,
} from "@/validations/admin-user";

type AdminUserErrorCode =
  "ADMIN_ONLY" | "USER_NOT_FOUND" | "FINAL_ACTIVE_ADMIN";

export class AdminUserError extends Error {
  constructor(
    readonly code: AdminUserErrorCode,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AdminUserError";
  }
}

function repository(): AdminUserRepository {
  return new PrismaAdminUserRepository(getDb());
}

function requireAdministrator(user: AuthenticatedUser) {
  if (user.role !== UserRole.ADMIN) {
    throw new AdminUserError(
      "ADMIN_ONLY",
      "Administrator access is required.",
      403,
    );
  }
}

function toListView(user: AdminUserListRecord) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    preferredLanguage: user.preferredLanguage,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function toDetailView(user: AdminUserDetailRecord) {
  return {
    ...toListView(user),
    assignedShop: user.assignedShop,
    ownedShops: user.ownedShops,
    activity: {
      savedAddresses: user._count.addresses,
      customerOrders: user._count.customerOrders,
      deliveryBatches: user._count.deliveryBatches,
    },
  };
}

export async function listAdminUsers(
  administrator: AuthenticatedUser,
  filters: AdminUserFilters = {},
  users: AdminUserRepository = repository(),
) {
  requireAdministrator(administrator);
  return (await users.findMany(filters)).map(toListView);
}

export async function getAdminUser(
  administrator: AuthenticatedUser,
  userId: string,
  users: AdminUserRepository = repository(),
) {
  requireAdministrator(administrator);
  const user = await users.findById(userId);
  if (!user) {
    throw new AdminUserError("USER_NOT_FOUND", "User not found.", 404);
  }
  return toDetailView(user);
}

export async function setAdminUserStatus(
  administrator: AuthenticatedUser,
  userId: string,
  input: AdminUserStatusInput,
  users: AdminUserRepository = repository(),
) {
  requireAdministrator(administrator);
  const result = await users.setStatus(administrator.id, userId, input.status);
  if (result.kind === "not_found") {
    throw new AdminUserError("USER_NOT_FOUND", "User not found.", 404);
  }
  if (result.kind === "final_active_admin") {
    throw new AdminUserError(
      "FINAL_ACTIVE_ADMIN",
      "The final active administrator cannot be deactivated.",
      409,
    );
  }
  return toDetailView(result.user);
}

export type AdminUserListView = Awaited<ReturnType<typeof listAdminUsers>>;
export type AdminUserDetailView = Awaited<ReturnType<typeof getAdminUser>>;
