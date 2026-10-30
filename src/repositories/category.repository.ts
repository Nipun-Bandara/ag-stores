import {
  CatalogStatus,
  Prisma,
  type PrismaClient,
} from "@/generated/prisma/client";
import type {
  CategoryCreateInput,
  CategoryStatusInput,
  CategoryUpdateInput,
} from "@/validations/category";

const categorySelect = {
  id: true,
  shopId: true,
  nameEn: true,
  nameSi: true,
  status: true,
  shop: { select: { name: true } },
} satisfies Prisma.CategorySelect;

export interface CategoryRecord {
  id: string;
  shopId: string;
  nameEn: string;
  nameSi: string | null;
  status: CatalogStatus;
  shop: { name: string };
}

export interface OwnerShopRecord {
  id: string;
  name: string;
}

export interface CategoryRepository {
  findOwnerShops(ownerId: string): Promise<OwnerShopRecord[]>;
  ownerHasShop(ownerId: string, shopId: string): Promise<boolean>;
  findByOwner(ownerId: string, shopId?: string): Promise<CategoryRecord[]>;
  findByShop(shopId: string, activeOnly: boolean): Promise<CategoryRecord[]>;
  create(input: CategoryCreateInput): Promise<CategoryRecord>;
  updateOwned(
    ownerId: string,
    categoryId: string,
    input: CategoryUpdateInput,
  ): Promise<CategoryRecord | null>;
  setStatusOwned(
    ownerId: string,
    categoryId: string,
    input: CategoryStatusInput,
  ): Promise<CategoryRecord | null>;
}

export class PrismaCategoryRepository implements CategoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findOwnerShops(ownerId: string): Promise<OwnerShopRecord[]> {
    return this.prisma.shop.findMany({
      where: { ownerId },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: { id: true, name: true },
    });
  }

  async ownerHasShop(ownerId: string, shopId: string): Promise<boolean> {
    return (
      (await this.prisma.shop.count({ where: { id: shopId, ownerId } })) === 1
    );
  }

  findByOwner(ownerId: string, shopId?: string): Promise<CategoryRecord[]> {
    return this.prisma.category.findMany({
      where: {
        shop: { ownerId },
        ...(shopId ? { shopId } : {}),
      },
      orderBy: [{ shop: { name: "asc" } }, { nameEn: "asc" }],
      select: categorySelect,
    });
  }

  findByShop(shopId: string, activeOnly: boolean): Promise<CategoryRecord[]> {
    return this.prisma.category.findMany({
      where: {
        shopId,
        ...(activeOnly ? { status: CatalogStatus.ACTIVE } : {}),
      },
      orderBy: { nameEn: "asc" },
      select: categorySelect,
    });
  }

  create(input: CategoryCreateInput): Promise<CategoryRecord> {
    return this.prisma.category.create({
      data: {
        shopId: input.shopId,
        nameEn: input.nameEn,
        nameSi: input.nameSi,
        status: CatalogStatus.ACTIVE,
      },
      select: categorySelect,
    });
  }

  updateOwned(
    ownerId: string,
    categoryId: string,
    input: CategoryUpdateInput,
  ): Promise<CategoryRecord | null> {
    return this.prisma.$transaction(async (transaction) => {
      const category = await transaction.category.findFirst({
        where: { id: categoryId, shop: { ownerId } },
        select: { id: true },
      });
      if (!category) return null;

      return transaction.category.update({
        where: { id: categoryId },
        data: { nameEn: input.nameEn, nameSi: input.nameSi },
        select: categorySelect,
      });
    });
  }

  setStatusOwned(
    ownerId: string,
    categoryId: string,
    input: CategoryStatusInput,
  ): Promise<CategoryRecord | null> {
    return this.prisma.$transaction(async (transaction) => {
      const category = await transaction.category.findFirst({
        where: { id: categoryId, shop: { ownerId } },
        select: { id: true },
      });
      if (!category) return null;

      return transaction.category.update({
        where: { id: categoryId },
        data: { status: input.status },
        select: categorySelect,
      });
    });
  }
}
