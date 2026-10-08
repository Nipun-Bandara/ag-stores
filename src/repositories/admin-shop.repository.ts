import {
  AuditAction,
  AuditEntityType,
  Prisma,
  type PrismaClient,
  UserRole,
  UserStatus,
} from "@/generated/prisma/client";
import { writeAuditLog } from "@/repositories/audit-write.repository";
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
  create(
    actorId: string,
    input: AdminShopInput,
  ): Promise<AdminShopMutationResult>;
  update(
    actorId: string,
    shopId: string,
    input: AdminShopInput,
  ): Promise<AdminShopMutationResult>;
  setActive(
    actorId: string,
    shopId: string,
    isActive: boolean,
  ): Promise<AdminShopRecord | null>;
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

  create(
    actorId: string,
    input: AdminShopInput,
  ): Promise<AdminShopMutationResult> {
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
      await writeAuditLog(transaction, {
        actorId,
        action: AuditAction.SHOP_CREATED,
        entityType: AuditEntityType.SHOP,
        entityId: shop.id,
        metadata: { ownerId: shop.ownerId, name: shop.name },
      });
      return { kind: "saved", shop };
    });
  }

  update(
    actorId: string,
    shopId: string,
    input: AdminShopInput,
  ): Promise<AdminShopMutationResult> {
    return this.prisma.$transaction(async (transaction) => {
      const [shop, owner] = await Promise.all([
        transaction.shop.findUnique({
          where: { id: shopId },
          select: {
            id: true,
            ownerId: true,
            name: true,
            address: true,
            phone: true,
            latitude: true,
            longitude: true,
            isOpen: true,
            minimumOrderAmount: true,
            deliveryFee: true,
            maximumDeliveryRadiusKm: true,
          },
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
      const changedFields = [
        ["ownerId", shop.ownerId, updated.ownerId],
        ["name", shop.name, updated.name],
        ["address", shop.address, updated.address],
        ["phone", shop.phone, updated.phone],
        ["latitude", shop.latitude.toString(), updated.latitude.toString()],
        ["longitude", shop.longitude.toString(), updated.longitude.toString()],
        ["isOpen", shop.isOpen, updated.isOpen],
        [
          "minimumOrderAmount",
          shop.minimumOrderAmount.toString(),
          updated.minimumOrderAmount.toString(),
        ],
        [
          "deliveryFee",
          shop.deliveryFee.toString(),
          updated.deliveryFee.toString(),
        ],
        [
          "maximumDeliveryRadiusKm",
          shop.maximumDeliveryRadiusKm.toString(),
          updated.maximumDeliveryRadiusKm.toString(),
        ],
      ]
        .filter(([, previous, next]) => previous !== next)
        .map(([field]) => field);
      if (changedFields.length > 0) {
        await writeAuditLog(transaction, {
          actorId,
          action: AuditAction.SHOP_UPDATED,
          entityType: AuditEntityType.SHOP,
          entityId: updated.id,
          metadata: { changedFields },
        });
      }
      return { kind: "saved", shop: updated };
    });
  }

  setActive(
    actorId: string,
    shopId: string,
    isActive: boolean,
  ): Promise<AdminShopRecord | null> {
    return this.prisma.$transaction(async (transaction) => {
      const shop = await transaction.shop.findUnique({
        where: { id: shopId },
        select: { id: true, isActive: true },
      });
      if (!shop) return null;

      const updated = await transaction.shop.update({
        where: { id: shopId },
        data: {
          isActive,
          // An administratively inactive shop must not advertise itself as
          // open. Reactivation deliberately does not reopen it.
          ...(!isActive ? { isOpen: false } : {}),
        },
        select: adminShopSelect,
      });
      if (shop.isActive !== isActive) {
        await writeAuditLog(transaction, {
          actorId,
          action: AuditAction.SHOP_STATUS_UPDATED,
          entityType: AuditEntityType.SHOP,
          entityId: updated.id,
          metadata: {
            previousStatus: shop.isActive ? "ACTIVE" : "INACTIVE",
            newStatus: isActive ? "ACTIVE" : "INACTIVE",
          },
        });
      }
      return updated;
    });
  }
}
