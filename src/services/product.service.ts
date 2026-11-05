import { tierViews, type DiscountTier } from "@/lib/pricing";
import { firstOrderQuantity } from "@/lib/quantity";
import { getDb } from "@/db";
import { deletePhoto, isManagedPhotoUrl } from "@/lib/product-photo-storage";
import { isUniqueConstraintError } from "@/repositories/auth.repository";
import {
  PrismaProductRepository,
  type ProductCategoryRecord,
  type ProductFilters,
  type ProductRecord,
  type ProductRepository,
  type ProductShopRecord,
} from "@/repositories/product.repository";
import type { AuthenticatedUser } from "@/types/auth";
import type {
  ProductAvailabilityInput,
  ProductCreateInput,
  ProductStockInput,
  ProductUpdateInput,
} from "@/validations/product";

type ProductErrorCode =
  | "OWNER_ONLY"
  | "PRODUCT_NOT_FOUND"
  | "CATEGORY_NOT_FOUND"
  | "DUPLICATE_PRODUCT";

export interface ProductView {
  itemCode: string | null;
  barcode: string | null;
  id: string;
  shopId: string;
  shopName: string;
  categoryId: string;
  categoryName: string;
  categoryNameSi: string | null;
  categoryStatus: "ACTIVE" | "INACTIVE";
  nameEn: string;
  nameSi: string | null;
  descriptionEn: string | null;
  descriptionSi: string | null;
  price: string;
  discountTiers: DiscountTier[];
  sellingUnit: "UNIT" | "KG";
  minimumOrderQuantity: number;
  orderingIncrement: number;
  stockQuantity: number;
  lowStockThreshold: number;
  inventoryStatus: "OUT_OF_STOCK" | "LOW_STOCK" | "AVAILABLE";
  imageUrl: string | null;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFormOptions {
  shops: ProductShopRecord[];
  categories: ProductCategoryRecord[];
}

export class ProductError extends Error {
  constructor(
    readonly code: ProductErrorCode,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ProductError";
  }
}

function getProductRepository(): ProductRepository {
  return new PrismaProductRepository(getDb());
}

function assertOwner(user: AuthenticatedUser): void {
  if (user.role !== "SHOP_OWNER") {
    throw new ProductError("OWNER_ONLY", "Shop owner access is required.", 403);
  }
}

function toProductView(product: ProductRecord): ProductView {
  const inventoryStatus =
    Number(product.stockQuantity) < firstOrderQuantity(product)
      ? "OUT_OF_STOCK"
      : Number(product.stockQuantity) <= Number(product.lowStockThreshold)
        ? "LOW_STOCK"
        : "AVAILABLE";
  return {
    itemCode: product.itemCode,
    barcode: product.barcode,
    id: product.id,
    shopId: product.shopId,
    shopName: product.shop.name,
    categoryId: product.categoryId,
    categoryName: product.category.nameEn,
    categoryNameSi: product.category.nameSi,
    categoryStatus: product.category.status,
    nameEn: product.nameEn,
    nameSi: product.nameSi,
    descriptionEn: product.descriptionEn,
    descriptionSi: product.descriptionSi,
    price: product.price.toFixed(2),
    discountTiers: tierViews(product.discountTiers),
    sellingUnit: product.sellingUnit,
    minimumOrderQuantity: Number(product.minimumOrderQuantity),
    orderingIncrement: Number(product.orderingIncrement),
    stockQuantity: Number(product.stockQuantity),
    lowStockThreshold: Number(product.lowStockThreshold),
    inventoryStatus,
    imageUrl: product.imageUrl,
    isAvailable: product.isAvailable,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

async function handleWrite<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ProductError(
        "DUPLICATE_PRODUCT",
        "That shop already has a product with this English name, item code or barcode.",
        409,
      );
    }
    throw error;
  }
}

async function assertOwnedCategory(
  ownerId: string,
  shopId: string,
  categoryId: string,
  repository: ProductRepository,
): Promise<void> {
  if (!(await repository.ownerHasCategory(ownerId, shopId, categoryId))) {
    throw new ProductError(
      "CATEGORY_NOT_FOUND",
      "Category not found for this shop.",
      404,
    );
  }
}

export async function getProductFormOptions(
  user: AuthenticatedUser,
  repository: ProductRepository = getProductRepository(),
): Promise<ProductFormOptions> {
  assertOwner(user);
  const [shops, categories] = await Promise.all([
    repository.findOwnerShops(user.id),
    repository.findOwnerCategories(user.id),
  ]);
  return { shops, categories };
}

export async function listOwnerProducts(
  user: AuthenticatedUser,
  filters: ProductFilters = {},
  repository: ProductRepository = getProductRepository(),
): Promise<ProductView[]> {
  assertOwner(user);
  return (await repository.findManyOwned(user.id, filters)).map(toProductView);
}

export async function getOwnerProduct(
  user: AuthenticatedUser,
  productId: string,
  repository: ProductRepository = getProductRepository(),
): Promise<ProductView> {
  assertOwner(user);
  const product = await repository.findOwnedById(user.id, productId);
  if (!product) {
    throw new ProductError("PRODUCT_NOT_FOUND", "Product not found.", 404);
  }
  return toProductView(product);
}

export async function createProduct(
  user: AuthenticatedUser,
  input: ProductCreateInput,
  repository: ProductRepository = getProductRepository(),
): Promise<ProductView> {
  assertOwner(user);
  if (
    isManagedPhotoUrl(input.imageUrl) ||
    (input.imageUploadId && input.imageUrl)
  )
    throw new ProductError(
      "PRODUCT_NOT_FOUND",
      "Invalid photo reference. Choose the photo again.",
      400,
    );
  await assertOwnedCategory(
    user.id,
    input.shopId,
    input.categoryId,
    repository,
  );
  return toProductView(
    await handleWrite(() =>
      repository.create(
        {
          ...input,
          minimumOrderQuantity: input.sellingUnit === "KG" ? 0.002 : 1,
          orderingIncrement: input.sellingUnit === "KG" ? 0.001 : 1,
        },
        user.id,
      ),
    ),
  );
}

export async function updateProduct(
  user: AuthenticatedUser,
  productId: string,
  input: ProductUpdateInput,
  repository: ProductRepository = getProductRepository(),
): Promise<ProductView> {
  assertOwner(user);
  const existing = await repository.findOwnedById(user.id, productId);
  if (!existing) {
    throw new ProductError("PRODUCT_NOT_FOUND", "Product not found.", 404);
  }
  if (isManagedPhotoUrl(input.imageUrl) && input.imageUrl !== existing.imageUrl)
    throw new ProductError(
      "PRODUCT_NOT_FOUND",
      "Invalid photo reference. Choose the photo again.",
      400,
    );
  await assertOwnedCategory(
    user.id,
    existing.shopId,
    input.categoryId,
    repository,
  );
  const updated = await handleWrite(() =>
    repository.update(user.id, productId, input),
  );
  if (
    existing.imageStorageKey &&
    existing.imageStorageKey !== updated.imageStorageKey
  ) {
    const key = existing.imageStorageKey;
    try {
      const db = getDb();
      if (!(await db.product.count({ where: { imageStorageKey: key } }))) {
        await deletePhoto(key);
        await db.productPhotoUpload.updateMany({
          where: { storageKey: key, deletedAt: null },
          data: { deletedAt: new Date(), purgedAt: new Date() },
        });
      }
    } catch (error) {
      console.error("Deferred product photo cleanup", error);
    }
  }
  return toProductView(updated);
}

export async function setProductAvailability(
  user: AuthenticatedUser,
  productId: string,
  input: ProductAvailabilityInput,
  repository: ProductRepository = getProductRepository(),
): Promise<ProductView> {
  assertOwner(user);
  const product = await repository.setAvailabilityOwned(
    user.id,
    productId,
    input,
  );
  if (!product) {
    throw new ProductError("PRODUCT_NOT_FOUND", "Product not found.", 404);
  }
  return toProductView(product);
}

export async function updateProductStock(
  user: AuthenticatedUser,
  productId: string,
  input: ProductStockInput,
  repository: ProductRepository = getProductRepository(),
): Promise<ProductView> {
  assertOwner(user);
  const product = await repository.updateStockOwned(
    user.id,
    user.id,
    productId,
    input,
  );
  if (!product) {
    throw new ProductError("PRODUCT_NOT_FOUND", "Product not found.", 404);
  }
  return toProductView(product);
}
