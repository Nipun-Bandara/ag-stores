import { randomBytes } from "node:crypto";
import { getDb } from "@/db";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { hashPassword } from "@/lib/auth/password";
import { writeAuditLog } from "@/repositories/audit-write.repository";
import { isUniqueConstraintError } from "@/repositories/auth.repository";
import type { AuthenticatedUser } from "@/types/auth";
import {
  orderStaffSchema,
  type OrderStaffInput,
} from "@/validations/order-staff";

export class StaffError extends Error {
  constructor(
    readonly message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}
function managementScope(actor: AuthenticatedUser): Prisma.ShopWhereInput {
  if (actor.role === "ADMIN") return {};
  if (actor.role === "SHOP_OWNER") return { ownerId: actor.id };
  throw new StaffError("Shop owner or administrator access is required.", 403);
}
const staffSelect = {
  id: true,
  firstName: true,
  lastName: true,
  phone: true,
  email: true,
  status: true,
  assignedShopId: true,
  assignedShop: { select: { name: true } },
} satisfies Prisma.UserSelect;

export async function getOrderStaff(
  actor: AuthenticatedUser,
  database?: PrismaClient,
) {
  const scope = managementScope(actor);
  const db = database ?? getDb();
  const [shops, staff] = await Promise.all([
    db.shop.findMany({
      where: scope,
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.user.findMany({
      where: { role: "ORDER_STAFF", assignedShop: scope },
      select: staffSelect,
      orderBy: [{ firstName: "asc" }, { id: "asc" }],
    }),
  ]);
  return { shops, staff };
}
export type StaffManagement = Awaited<ReturnType<typeof getOrderStaff>>;

export async function saveOrderStaff(
  actor: AuthenticatedUser,
  input: OrderStaffInput,
  staffId?: string,
  database?: PrismaClient,
) {
  const scope = managementScope(actor);
  input = orderStaffSchema.parse(input);
  const db = database ?? getDb();
  const shops = await db.shop.findMany({ where: scope, select: { id: true } });
  const assignedShopId =
    input.assignedShopId ?? (shops.length === 1 ? shops[0]!.id : undefined);
  if (!assignedShopId || !shops.some((shop) => shop.id === assignedShopId))
    throw new StaffError("Choose a shop you manage.", 403);
  const temporaryPassword = staffId
    ? undefined
    : `Ag${randomBytes(12).toString("base64url")}7a`;
  const passwordHash = temporaryPassword
    ? await hashPassword(temporaryPassword)
    : undefined;
  try {
    const staff = await db.$transaction(
      async (tx) => {
        if (
          staffId &&
          !(await tx.user.findFirst({
            where: { id: staffId, role: "ORDER_STAFF", assignedShop: scope },
            select: { id: true },
          }))
        )
          throw new StaffError("Staff account not found.", 404);
        const data = {
          ...input,
          assignedShopId,
          name: `${input.firstName} ${input.lastName}`,
        };
        const saved = staffId
          ? await tx.user.update({
              where: { id: staffId },
              data,
              select: staffSelect,
            })
          : await tx.user.create({
              data: {
                ...data,
                role: "ORDER_STAFF",
                passwordHash: passwordHash!,
                preferredLanguage: "EN",
              },
              select: staffSelect,
            });
        if (staffId)
          await tx.authSession.deleteMany({ where: { userId: staffId } });
        await writeAuditLog(tx, {
          actorId: actor.id,
          action: "STAFF_ACCOUNT_UPDATED",
          entityType: "USER",
          entityId: saved.id,
          metadata: {
            operation: staffId ? "updated" : "created",
            assignedShopId,
          },
        });
        return saved;
      },
      {
        timeout: 20000,
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
    return { staff, ...(temporaryPassword ? { temporaryPassword } : {}) };
  } catch (error) {
    if (isUniqueConstraintError(error))
      throw new StaffError(
        "An account already exists with that mobile number or email.",
        409,
      );
    throw error;
  }
}

export async function setOrderStaffStatus(
  actor: AuthenticatedUser,
  staffId: string,
  status: "ACTIVE" | "INACTIVE",
  database?: PrismaClient,
) {
  const scope = managementScope(actor);
  const db = database ?? getDb();
  return db.$transaction(
    async (tx) => {
      const changed = await tx.user.updateMany({
        where: { id: staffId, role: "ORDER_STAFF", assignedShop: scope },
        data: { status },
      });
      if (!changed.count) throw new StaffError("Staff account not found.", 404);
      await tx.authSession.deleteMany({ where: { userId: staffId } });
      await writeAuditLog(tx, {
        actorId: actor.id,
        action: "USER_STATUS_UPDATED",
        entityType: "USER",
        entityId: staffId,
        metadata: { newStatus: status },
      });
      return { id: staffId, status };
    },
    { timeout: 20000 },
  );
}
