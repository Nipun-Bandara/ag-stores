import { getDb } from "@/db";
import { UserRole } from "@/generated/prisma/client";
import { isUniqueConstraintError } from "@/repositories/auth.repository";
import {
  PrismaAdminShopRepository,
  type AdminShopRecord,
  type AdminShopRepository,
} from "@/repositories/admin-shop.repository";
import type { AuthenticatedUser } from "@/types/auth";
import type {
  AdminShopInput,
  AdminShopStatusInput,
} from "@/validations/admin-shop";

type AdminShopErrorCode =
  "ADMIN_ONLY" | "SHOP_NOT_FOUND" | "OWNER_NOT_FOUND" | "DUPLICATE_SHOP";

export class AdminShopError extends Error {
  constructor(
    readonly code: AdminShopErrorCode,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AdminShopError";
  }
}

function repository(): AdminShopRepository {
  return new PrismaAdminShopRepository(getDb());
}

function assertAdministrator(user: AuthenticatedUser) {
  if (user.role !== UserRole.ADMIN) {
    throw new AdminShopError(
      "ADMIN_ONLY",
      "Administrator access is required.",
      403,
    );
  }
}

function toView(shop: AdminShopRecord) {
  return {
    id: shop.id,
    ownerId: shop.ownerId,
    owner: shop.owner,
    name: shop.name,
    address: shop.address,
    latitude: shop.latitude.toString(),
    longitude: shop.longitude.toString(),
    phone: shop.phone,
    isActive: shop.isActive,
    isOpen: shop.isOpen,
    minimumOrderAmount: shop.minimumOrderAmount.toFixed(2),
    deliveryFee: shop.deliveryFee.toFixed(2),
    maximumDeliveryRadiusKm: shop.maximumDeliveryRadiusKm.toFixed(2),
    counts: {
      categories: shop._count.categories,
      products: shop._count.products,
      orders: shop._count.orders,
      deliveryPersonnel: shop._count.deliveryPersonnel,
    },
    createdAt: shop.createdAt.toISOString(),
    updatedAt: shop.updatedAt.toISOString(),
  };
}

function handleMutationResult(
  result: Awaited<ReturnType<AdminShopRepository["create"]>>,
) {
  if (result.kind === "shop_not_found") {
    throw new AdminShopError("SHOP_NOT_FOUND", "Shop not found.", 404);
  }
  if (result.kind === "owner_not_found") {
    throw new AdminShopError(
      "OWNER_NOT_FOUND",
      "Select an active shop-owner account.",
      400,
    );
  }
  return toView(result.shop);
}

async function handleDuplicate<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AdminShopError(
        "DUPLICATE_SHOP",
        "That owner already has a shop with this name, or the phone number is already in use.",
        409,
      );
    }
    throw error;
  }
}

export async function getAdminShopManagement(
  administrator: AuthenticatedUser,
  shops: AdminShopRepository = repository(),
) {
  assertAdministrator(administrator);
  const [records, owners] = await Promise.all([
    shops.findMany(),
    shops.findAssignableOwners(),
  ]);
  return { shops: records.map(toView), owners };
}

export async function getAdminShop(
  administrator: AuthenticatedUser,
  shopId: string,
  shops: AdminShopRepository = repository(),
) {
  assertAdministrator(administrator);
  const [shop, owners] = await Promise.all([
    shops.findById(shopId),
    shops.findAssignableOwners(),
  ]);
  if (!shop) {
    throw new AdminShopError("SHOP_NOT_FOUND", "Shop not found.", 404);
  }
  return { shop: toView(shop), owners };
}

export async function createAdminShop(
  administrator: AuthenticatedUser,
  input: AdminShopInput,
  shops: AdminShopRepository = repository(),
) {
  assertAdministrator(administrator);
  return handleDuplicate(async () =>
    handleMutationResult(await shops.create(administrator.id, input)),
  );
}

export async function updateAdminShop(
  administrator: AuthenticatedUser,
  shopId: string,
  input: AdminShopInput,
  shops: AdminShopRepository = repository(),
) {
  assertAdministrator(administrator);
  return handleDuplicate(async () =>
    handleMutationResult(await shops.update(administrator.id, shopId, input)),
  );
}

export async function setAdminShopStatus(
  administrator: AuthenticatedUser,
  shopId: string,
  input: AdminShopStatusInput,
  shops: AdminShopRepository = repository(),
) {
  assertAdministrator(administrator);
  const shop = await shops.setActive(administrator.id, shopId, input.isActive);
  if (!shop) {
    throw new AdminShopError("SHOP_NOT_FOUND", "Shop not found.", 404);
  }
  return toView(shop);
}

export type AdminShopManagementView = Awaited<
  ReturnType<typeof getAdminShopManagement>
>;
export type AdminShopView = AdminShopManagementView["shops"][number];
