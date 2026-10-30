import { getDb } from "@/db";
import {
  PrismaStorefrontRepository,
  type StorefrontCategoryRecord,
  type StorefrontProductFilters,
  type StorefrontProductRecord,
  type StorefrontRepository,
} from "@/repositories/storefront.repository";

export interface StorefrontCategoryView {
  id: string;
  shopId: string;
  shopName: string;
  nameEn: string;
  nameSi: string | null;
  productCount: number;
}

export interface StorefrontProductView {
  id: string;
  shopId: string;
  shopName: string;
  categoryId: string;
  categoryNameEn: string;
  categoryNameSi: string | null;
  nameEn: string;
  nameSi: string | null;
  descriptionEn: string | null;
  descriptionSi: string | null;
  price: string;
  stockQuantity: number;
  imageUrl: string | null;
  isOutOfStock: boolean;
}

function getStorefrontRepository(): StorefrontRepository {
  return new PrismaStorefrontRepository(getDb());
}

function toCategoryView(
  category: StorefrontCategoryRecord,
): StorefrontCategoryView {
  return {
    id: category.id,
    shopId: category.shopId,
    shopName: category.shop.name,
    nameEn: category.nameEn,
    nameSi: category.nameSi,
    productCount: category._count.products,
  };
}

function toProductView(
  product: StorefrontProductRecord,
): StorefrontProductView {
  return {
    id: product.id,
    shopId: product.shopId,
    shopName: product.shop.name,
    categoryId: product.categoryId,
    categoryNameEn: product.category.nameEn,
    categoryNameSi: product.category.nameSi,
    nameEn: product.nameEn,
    nameSi: product.nameSi,
    descriptionEn: product.descriptionEn,
    descriptionSi: product.descriptionSi,
    price: product.price.toFixed(2),
    stockQuantity: product.stockQuantity,
    imageUrl: product.imageUrl,
    isOutOfStock: product.stockQuantity === 0,
  };
}

export async function listStorefrontCategories(
  limit?: number,
  repository: StorefrontRepository = getStorefrontRepository(),
): Promise<StorefrontCategoryView[]> {
  return (await repository.findCategories(limit)).map(toCategoryView);
}

export async function getStorefrontCategory(
  categoryId: string,
  repository: StorefrontRepository = getStorefrontRepository(),
): Promise<StorefrontCategoryView | null> {
  const category = await repository.findCategoryById(categoryId);
  return category ? toCategoryView(category) : null;
}

export async function listStorefrontProducts(
  filters: StorefrontProductFilters = {},
  repository: StorefrontRepository = getStorefrontRepository(),
): Promise<StorefrontProductView[]> {
  return (await repository.findProducts(filters)).map(toProductView);
}

export async function getStorefrontProduct(
  productId: string,
  repository: StorefrontRepository = getStorefrontRepository(),
): Promise<StorefrontProductView | null> {
  const product = await repository.findProductById(productId);
  return product ? toProductView(product) : null;
}
