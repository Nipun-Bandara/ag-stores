import {
  Prisma,
  type PrismaClient,
  UserRole,
  type UserStatus,
} from "@/generated/prisma/client";
import type {
  DeliveryPersonnelCreateInput,
  DeliveryPersonnelUpdateInput,
} from "@/validations/delivery-personnel";

const deliveryPersonnelSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  assignedShopId: true,
  assignedShop: { select: { name: true } },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type DeliveryPersonnelRecord = Prisma.UserGetPayload<{
  select: typeof deliveryPersonnelSelect;
}>;

export interface DeliveryPersonnelShopRecord {
  id: string;
  name: string;
}

export type DeliveryPersonnelScope =
  { kind: "all" } | { kind: "owner"; ownerId: string };

export interface DeliveryPersonnelRepository {
  findShops(
    scope: DeliveryPersonnelScope,
  ): Promise<DeliveryPersonnelShopRecord[]>;
  findPersonnel(
    scope: DeliveryPersonnelScope,
  ): Promise<DeliveryPersonnelRecord[]>;
  canUseShop(scope: DeliveryPersonnelScope, shopId: string): Promise<boolean>;
  create(
    input: DeliveryPersonnelCreateInput,
    passwordHash: string,
  ): Promise<DeliveryPersonnelRecord>;
  updateManaged(
    scope: DeliveryPersonnelScope,
    personId: string,
    input: DeliveryPersonnelUpdateInput,
  ): Promise<DeliveryPersonnelRecord | null>;
  setStatusManaged(
    scope: DeliveryPersonnelScope,
    personId: string,
    status: UserStatus,
  ): Promise<DeliveryPersonnelRecord | null>;
}

function personnelWhere(scope: DeliveryPersonnelScope) {
  return {
    role: UserRole.DELIVERY_PERSON,
    ...(scope.kind === "owner"
      ? { assignedShop: { ownerId: scope.ownerId } }
      : {}),
  } satisfies Prisma.UserWhereInput;
}

export class PrismaDeliveryPersonnelRepository implements DeliveryPersonnelRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findShops(
    scope: DeliveryPersonnelScope,
  ): Promise<DeliveryPersonnelShopRecord[]> {
    return this.prisma.shop.findMany({
      where: scope.kind === "owner" ? { ownerId: scope.ownerId } : {},
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: { id: true, name: true },
    });
  }

  findPersonnel(
    scope: DeliveryPersonnelScope,
  ): Promise<DeliveryPersonnelRecord[]> {
    return this.prisma.user.findMany({
      where: personnelWhere(scope),
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: deliveryPersonnelSelect,
    });
  }

  async canUseShop(
    scope: DeliveryPersonnelScope,
    shopId: string,
  ): Promise<boolean> {
    return (
      (await this.prisma.shop.count({
        where: {
          id: shopId,
          ...(scope.kind === "owner" ? { ownerId: scope.ownerId } : {}),
        },
      })) === 1
    );
  }

  create(
    input: DeliveryPersonnelCreateInput,
    passwordHash: string,
  ): Promise<DeliveryPersonnelRecord> {
    return this.prisma.user.create({
      data: {
        assignedShopId: input.assignedShopId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        passwordHash,
        role: UserRole.DELIVERY_PERSON,
        status: input.status,
      },
      select: deliveryPersonnelSelect,
    });
  }

  updateManaged(
    scope: DeliveryPersonnelScope,
    personId: string,
    input: DeliveryPersonnelUpdateInput,
  ): Promise<DeliveryPersonnelRecord | null> {
    return this.prisma.$transaction(async (transaction) => {
      const person = await transaction.user.findFirst({
        where: { id: personId, ...personnelWhere(scope) },
        select: { id: true },
      });
      if (!person) return null;

      return transaction.user.update({
        where: { id: personId },
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone,
          assignedShopId: input.assignedShopId,
        },
        select: deliveryPersonnelSelect,
      });
    });
  }

  setStatusManaged(
    scope: DeliveryPersonnelScope,
    personId: string,
    status: UserStatus,
  ): Promise<DeliveryPersonnelRecord | null> {
    return this.prisma.$transaction(async (transaction) => {
      const person = await transaction.user.findFirst({
        where: { id: personId, ...personnelWhere(scope) },
        select: { id: true },
      });
      if (!person) return null;

      const updated = await transaction.user.update({
        where: { id: personId },
        data: { status },
        select: deliveryPersonnelSelect,
      });
      if (status !== "ACTIVE") {
        await transaction.authSession.deleteMany({
          where: { userId: personId },
        });
      }
      return updated;
    });
  }
}
