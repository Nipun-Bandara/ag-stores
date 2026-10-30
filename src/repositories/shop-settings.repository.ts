import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { ShopSettingsUpdateInput } from "@/validations/shop-settings";

const shopSettingsSelect = {
  id: true,
  name: true,
  address: true,
  phone: true,
  latitude: true,
  longitude: true,
  isActive: true,
  isOpen: true,
  minimumOrderAmount: true,
  deliveryFee: true,
  maximumDeliveryRadiusKm: true,
  updatedAt: true,
} satisfies Prisma.ShopSelect;

export type ShopSettingsRecord = Prisma.ShopGetPayload<{
  select: typeof shopSettingsSelect;
}>;

export interface ShopSettingsRepository {
  findManyOwned(ownerId: string): Promise<ShopSettingsRecord[]>;
  updateOwned(
    ownerId: string,
    input: ShopSettingsUpdateInput,
  ): Promise<ShopSettingsRecord | null>;
}

export class PrismaShopSettingsRepository implements ShopSettingsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findManyOwned(ownerId: string): Promise<ShopSettingsRecord[]> {
    return this.prisma.shop.findMany({
      where: { ownerId },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: shopSettingsSelect,
    });
  }

  updateOwned(
    ownerId: string,
    input: ShopSettingsUpdateInput,
  ): Promise<ShopSettingsRecord | null> {
    return this.prisma.$transaction(async (transaction) => {
      const owned = await transaction.shop.findFirst({
        where: { id: input.shopId, ownerId },
        select: { id: true, isActive: true },
      });
      if (!owned) return null;

      return transaction.shop.update({
        where: { id: owned.id },
        data: {
          name: input.name,
          address: input.address,
          phone: input.phone,
          latitude: input.latitude,
          longitude: input.longitude,
          isOpen: owned.isActive ? input.isOpen : false,
          minimumOrderAmount: input.minimumOrderAmount,
          deliveryFee: input.deliveryFee,
          maximumDeliveryRadiusKm: input.maximumDeliveryRadiusKm,
        },
        select: shopSettingsSelect,
      });
    });
  }
}
