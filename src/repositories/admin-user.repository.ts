import {
  AuditAction,
  AuditEntityType,
  Prisma,
  type PrismaClient,
  UserRole,
  UserStatus,
} from "@/generated/prisma/client";
import { withSerializableRetry } from "@/lib/db-transaction";
import { writeAuditLog } from "@/repositories/audit-write.repository";
import type { AdminUserFilters } from "@/validations/admin-user";

const adminUserListSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  preferredLanguage: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

const adminUserDetailSelect = {
  ...adminUserListSelect,
  assignedShop: { select: { id: true, name: true } },
  ownedShops: {
    orderBy: [{ name: "asc" as const }, { id: "asc" as const }],
    select: { id: true, name: true },
  },
  _count: {
    select: {
      addresses: true,
      customerOrders: true,
      deliveryBatches: true,
    },
  },
} satisfies Prisma.UserSelect;

export type AdminUserListRecord = Prisma.UserGetPayload<{
  select: typeof adminUserListSelect;
}>;

export type AdminUserDetailRecord = Prisma.UserGetPayload<{
  select: typeof adminUserDetailSelect;
}>;

export type AdminUserStatusResult =
  | { kind: "updated"; user: AdminUserDetailRecord }
  | { kind: "not_found" }
  | { kind: "final_active_admin" };

type ManageableUserStatus = Extract<UserStatus, "ACTIVE" | "INACTIVE">;

export interface AdminUserRepository {
  findMany(filters: AdminUserFilters): Promise<AdminUserListRecord[]>;
  findById(userId: string): Promise<AdminUserDetailRecord | null>;
  setStatus(
    actorId: string,
    userId: string,
    status: ManageableUserStatus,
  ): Promise<AdminUserStatusResult>;
}

function userWhere(filters: AdminUserFilters): Prisma.UserWhereInput {
  const search = filters.search?.trim();
  return {
    ...(filters.role ? { role: filters.role } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search } },
          ],
        }
      : {}),
  };
}

export class PrismaAdminUserRepository implements AdminUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findMany(filters: AdminUserFilters): Promise<AdminUserListRecord[]> {
    return this.prisma.user.findMany({
      where: userWhere(filters),
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      select: adminUserListSelect,
    });
  }

  findById(userId: string): Promise<AdminUserDetailRecord | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: adminUserDetailSelect,
    });
  }

  setStatus(
    actorId: string,
    userId: string,
    status: ManageableUserStatus,
  ): Promise<AdminUserStatusResult> {
    return withSerializableRetry(() =>
      this.prisma.$transaction(
        async (transaction) => {
          // Serialize admin status changes so concurrent requests cannot both
          // pass the final-active-admin check.
          await transaction.$queryRaw`SELECT pg_advisory_xact_lock(71606464696::bigint)::text AS "lock"`;

          const target = await transaction.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true, status: true },
          });
          if (!target) return { kind: "not_found" } as const;

          if (
            status === UserStatus.INACTIVE &&
            target.role === UserRole.ADMIN &&
            target.status === UserStatus.ACTIVE
          ) {
            const activeAdmins = await transaction.user.count({
              where: { role: UserRole.ADMIN, status: UserStatus.ACTIVE },
            });
            if (activeAdmins <= 1) {
              return { kind: "final_active_admin" } as const;
            }
          }

          const user = await transaction.user.update({
            where: { id: userId },
            data: { status },
            select: adminUserDetailSelect,
          });
          if (status !== UserStatus.ACTIVE) {
            await transaction.authSession.deleteMany({
              where: { userId },
            });
          }
          if (target.status !== status) {
            await writeAuditLog(transaction, {
              actorId,
              action: AuditAction.USER_STATUS_UPDATED,
              entityType: AuditEntityType.USER,
              entityId: target.id,
              metadata: {
                previousStatus: target.status,
                newStatus: status,
                targetRole: target.role,
              },
            });
          }

          return { kind: "updated", user } as const;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );
  }
}
