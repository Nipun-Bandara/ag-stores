import { getDb } from "@/db";
import {
  PrismaShopSettingsRepository,
  type ShopSettingsRecord,
  type ShopSettingsRepository,
} from "@/repositories/shop-settings.repository";
import type { AuthenticatedUser } from "@/types/auth";
import type { ShopSettingsUpdateInput } from "@/validations/shop-settings";

type ShopSettingsErrorCode = "OWNER_ONLY" | "SHOP_NOT_FOUND";

export class ShopSettingsError extends Error {
  constructor(
    readonly code: ShopSettingsErrorCode,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ShopSettingsError";
  }
}

function getRepository(): ShopSettingsRepository {
  return new PrismaShopSettingsRepository(getDb());
}

function assertOwner(user: AuthenticatedUser): void {
  if (user.role !== "SHOP_OWNER") {
    throw new ShopSettingsError(
      "OWNER_ONLY",
      "Shop owner access is required.",
      403,
    );
  }
}

function toView(shop: ShopSettingsRecord) {
  return {
    id: shop.id,
    name: shop.name,
    address: shop.address,
    phone: shop.phone,
    latitude: shop.latitude.toString(),
    longitude: shop.longitude.toString(),
    isActive: shop.isActive,
    isOpen: shop.isOpen,
    minimumOrderAmount: shop.minimumOrderAmount.toFixed(2),
    deliveryFee: shop.deliveryFee.toFixed(2),
    maximumDeliveryRadiusKm: shop.maximumDeliveryRadiusKm.toFixed(2),
    updatedAt: shop.updatedAt.toISOString(),
  };
}

export type ShopSettingsView = ReturnType<typeof toView>;

export async function listOwnerShopSettings(
  user: AuthenticatedUser,
  repository: ShopSettingsRepository = getRepository(),
): Promise<ShopSettingsView[]> {
  assertOwner(user);
  return (await repository.findManyOwned(user.id)).map(toView);
}

export async function updateShopSettings(
  user: AuthenticatedUser,
  input: ShopSettingsUpdateInput,
  repository: ShopSettingsRepository = getRepository(),
): Promise<ShopSettingsView> {
  assertOwner(user);
  const shop = await repository.updateOwned(user.id, input);
  if (!shop) {
    throw new ShopSettingsError("SHOP_NOT_FOUND", "Shop not found.", 404);
  }
  return toView(shop);
}
