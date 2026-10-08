import { getDb } from "@/db";
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
  id: string;
  shopId: string;
  shopName: string;
  categoryId: string;
  categoryName: string;
  categoryStatus: "ACTIVE" | "INACTIVE";
  nameEn: string;
  nameSi: string | null;
  descriptionEn: string | null;
  descriptionSi: string | null;
  price: string;
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
    product.stockQuantity === 0
      ? "OUT_OF_STOCK"
      : product.stockQuantity <= product.lowStockThreshold
        ? "LOW_STOCK"
        : "AVAILABLE";
  return {
    id: product.id,
    shopId: product.shopId,
    shopName: product.shop.name,
    categoryId: product.categoryId,
    categoryName: product.category.nameEn,
    categoryStatus: product.category.status,
    nameEn: product.nameEn,
    nameSi: product.nameSi,
    descriptionEn: product.descriptionEn,
    descriptionSi: product.descriptionSi,
    price: product.price.toFixed(2),
    stockQuantity: product.stockQuantity,
    lowStockThreshold: product.lowStockThreshold,
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
        "That shop already has a product with this English name.",
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
  await assertOwnedCategory(
    user.id,
    input.shopId,
    input.categoryId,
    repository,
  );
  return toProductView(await handleWrite(() => repository.create(input)));
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
  await assertOwnedCategory(
    user.id,
    existing.shopId,
    input.categoryId,
    repository,
  );
  return toProductView(
    await handleWrite(() => repository.update(user.id, productId, input)),
  );
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
