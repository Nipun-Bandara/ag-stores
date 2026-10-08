import {
  Prisma,
  type PrismaClient,
  UserRole,
  UserStatus,
} from "@/generated/prisma/client";
import type { AdminShopInput } from "@/validations/admin-shop";

const adminShopSelect = {
  id: true,
  ownerId: true,
  name: true,
  address: true,
  latitude: true,
  longitude: true,
  phone: true,
  isActive: true,
  isOpen: true,
  minimumOrderAmount: true,
  deliveryFee: true,
  maximumDeliveryRadiusKm: true,
  createdAt: true,
  updatedAt: true,
  owner: {
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
    },
  },
  _count: {
    select: {
      categories: true,
      products: true,
      orders: true,
      deliveryPersonnel: true,
    },
  },
} satisfies Prisma.ShopSelect;

const assignableOwnerSelect = {
  id: true,
  name: true,
  email: true,
} satisfies Prisma.UserSelect;

export type AdminShopRecord = Prisma.ShopGetPayload<{
  select: typeof adminShopSelect;
}>;
export type AssignableOwnerRecord = Prisma.UserGetPayload<{
  select: typeof assignableOwnerSelect;
}>;

export type AdminShopMutationResult =
  | { kind: "saved"; shop: AdminShopRecord }
  | { kind: "shop_not_found" }
  | { kind: "owner_not_found" };

export interface AdminShopRepository {
  findMany(): Promise<AdminShopRecord[]>;
  findById(shopId: string): Promise<AdminShopRecord | null>;
  findAssignableOwners(): Promise<AssignableOwnerRecord[]>;
  create(input: AdminShopInput): Promise<AdminShopMutationResult>;
  update(
    shopId: string,
    input: AdminShopInput,
  ): Promise<AdminShopMutationResult>;
  setActive(shopId: string, isActive: boolean): Promise<AdminShopRecord | null>;
}

const assignableOwnerWhere = {
  role: UserRole.SHOP_OWNER,
  status: UserStatus.ACTIVE,
} satisfies Prisma.UserWhereInput;

function shopData(input: AdminShopInput) {
  return {
    ownerId: input.ownerId,
    name: input.name,
    address: input.address,
    latitude: input.latitude,
    longitude: input.longitude,
    phone: input.phone,
    isOpen: input.isOpen,
    minimumOrderAmount: input.minimumOrderAmount,
    deliveryFee: input.deliveryFee,
    maximumDeliveryRadiusKm: input.maximumDeliveryRadiusKm,
  };
}

export class PrismaAdminShopRepository implements AdminShopRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findMany(): Promise<AdminShopRecord[]> {
    return this.prisma.shop.findMany({
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: adminShopSelect,
    });
  }

  findById(shopId: string): Promise<AdminShopRecord | null> {
    return this.prisma.shop.findUnique({
      where: { id: shopId },
      select: adminShopSelect,
    });
  }

  findAssignableOwners(): Promise<AssignableOwnerRecord[]> {
    return this.prisma.user.findMany({
      where: assignableOwnerWhere,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: assignableOwnerSelect,
    });
  }

  create(input: AdminShopInput): Promise<AdminShopMutationResult> {
    return this.prisma.$transaction(async (transaction) => {
      const owner = await transaction.user.findFirst({
        where: { id: input.ownerId, ...assignableOwnerWhere },
        select: { id: true },
      });
      if (!owner) return { kind: "owner_not_found" };

      const shop = await transaction.shop.create({
        data: shopData(input),
        select: adminShopSelect,
      });
      return { kind: "saved", shop };
    });
  }

  update(
    shopId: string,
    input: AdminShopInput,
  ): Promise<AdminShopMutationResult> {
    return this.prisma.$transaction(async (transaction) => {
      const [shop, owner] = await Promise.all([
        transaction.shop.findUnique({
          where: { id: shopId },
          select: { id: true },
        }),
        transaction.user.findFirst({
          where: { id: input.ownerId, ...assignableOwnerWhere },
          select: { id: true },
        }),
      ]);
      if (!shop) return { kind: "shop_not_found" };
      if (!owner) return { kind: "owner_not_found" };

      const updated = await transaction.shop.update({
        where: { id: shopId },
        data: shopData(input),
        select: adminShopSelect,
      });
      return { kind: "saved", shop: updated };
    });
  }

  setActive(
    shopId: string,
    isActive: boolean,
  ): Promise<AdminShopRecord | null> {
    return this.prisma.$transaction(async (transaction) => {
      const shop = await transaction.shop.findUnique({
        where: { id: shopId },
        select: { id: true },
      });
      if (!shop) return null;

      return transaction.shop.update({
        where: { id: shopId },
        data: {
          isActive,
          // An administratively inactive shop must not advertise itself as
          // open. Reactivation deliberately does not reopen it.
          ...(!isActive ? { isOpen: false } : {}),
        },
        select: adminShopSelect,
      });
    });
  }
}
