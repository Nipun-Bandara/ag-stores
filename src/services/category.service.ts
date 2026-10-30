import { getDb } from "@/db";
import { isUniqueConstraintError } from "@/repositories/auth.repository";
import {
  PrismaCategoryRepository,
  type CategoryRecord,
  type CategoryRepository,
  type OwnerShopRecord,
} from "@/repositories/category.repository";
import type { AuthenticatedUser } from "@/types/auth";
import type {
  CategoryCreateInput,
  CategoryStatusInput,
  CategoryUpdateInput,
} from "@/validations/category";

type CategoryErrorCode =
  | "OWNER_ONLY"
  | "CATEGORY_NOT_FOUND"
  | "SHOP_NOT_FOUND"
  | "SHOP_REQUIRED"
  | "DUPLICATE_CATEGORY";

export interface CategoryView {
  id: string;
  shopId: string;
  shopName: string;
  nameEn: string;
  nameSi: string | null;
  status: "ACTIVE" | "INACTIVE";
}

export interface CategoryManagementView {
  shops: OwnerShopRecord[];
  categories: CategoryView[];
}

export class CategoryError extends Error {
  constructor(
    readonly code: CategoryErrorCode,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "CategoryError";
  }
}

function getCategoryRepository(): CategoryRepository {
  return new PrismaCategoryRepository(getDb());
}

function assertOwner(user: AuthenticatedUser): void {
  if (user.role !== "SHOP_OWNER") {
    throw new CategoryError(
      "OWNER_ONLY",
      "Shop owner access is required.",
      403,
    );
  }
}

function toCategoryView(category: CategoryRecord): CategoryView {
  return {
    id: category.id,
    shopId: category.shopId,
    shopName: category.shop.name,
    nameEn: category.nameEn,
    nameSi: category.nameSi,
    status: category.status,
  };
}

async function handleWrite<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new CategoryError(
        "DUPLICATE_CATEGORY",
        "That shop already has a category with this English name.",
        409,
      );
    }
    throw error;
  }
}

async function assertOwnedShop(
  ownerId: string,
  shopId: string,
  repository: CategoryRepository,
): Promise<void> {
  if (!(await repository.ownerHasShop(ownerId, shopId))) {
    throw new CategoryError("SHOP_NOT_FOUND", "Shop not found.", 404);
  }
}

export async function getOwnerCategoryManagement(
  user: AuthenticatedUser,
  repository: CategoryRepository = getCategoryRepository(),
): Promise<CategoryManagementView> {
  assertOwner(user);
  const [shops, categories] = await Promise.all([
    repository.findOwnerShops(user.id),
    repository.findByOwner(user.id),
  ]);
  return { shops, categories: categories.map(toCategoryView) };
}

export async function listManagedCategories(
  user: AuthenticatedUser,
  shopId: string | undefined,
  repository: CategoryRepository = getCategoryRepository(),
): Promise<CategoryView[]> {
  if (user.role === "SHOP_OWNER") {
    if (shopId) await assertOwnedShop(user.id, shopId, repository);
    return (await repository.findByOwner(user.id, shopId)).map(toCategoryView);
  }
  if (user.role === "ADMIN") {
    if (!shopId) {
      throw new CategoryError(
        "SHOP_REQUIRED",
        "A shop ID is required for administrator category views.",
        400,
      );
    }
    return (await repository.findByShop(shopId, false)).map(toCategoryView);
  }
  throw new CategoryError(
    "OWNER_ONLY",
    "Shop owner or administrator access is required.",
    403,
  );
}

export async function listStorefrontCategories(
  shopId: string,
  repository: CategoryRepository = getCategoryRepository(),
): Promise<CategoryView[]> {
  return (await repository.findByShop(shopId, true)).map(toCategoryView);
}

export async function createCategory(
  user: AuthenticatedUser,
  input: CategoryCreateInput,
  repository: CategoryRepository = getCategoryRepository(),
): Promise<CategoryView> {
  assertOwner(user);
  await assertOwnedShop(user.id, input.shopId, repository);
  return toCategoryView(await handleWrite(() => repository.create(input)));
}

export async function updateCategory(
  user: AuthenticatedUser,
  categoryId: string,
  input: CategoryUpdateInput,
  repository: CategoryRepository = getCategoryRepository(),
): Promise<CategoryView> {
  assertOwner(user);
  const category = await handleWrite(() =>
    repository.updateOwned(user.id, categoryId, input),
  );
  if (!category) {
    throw new CategoryError("CATEGORY_NOT_FOUND", "Category not found.", 404);
  }
  return toCategoryView(category);
}

export async function setCategoryStatus(
  user: AuthenticatedUser,
  categoryId: string,
  input: CategoryStatusInput,
  repository: CategoryRepository = getCategoryRepository(),
): Promise<CategoryView> {
  assertOwner(user);
  const category = await repository.setStatusOwned(user.id, categoryId, input);
  if (!category) {
    throw new CategoryError("CATEGORY_NOT_FOUND", "Category not found.", 404);
  }
  return toCategoryView(category);
}
