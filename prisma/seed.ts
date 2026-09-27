import { scryptSync } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";

import {
  CatalogStatus,
  PreferredLanguage,
  PrismaClient,
  UserRole,
  UserStatus,
} from "../src/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

function hashSeedPassword(password: string): string {
  const salt = "ag-stores-development-seed";
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

const passwordHash = hashSeedPassword("ChangeMe123!");

async function main() {
  await prisma.user.upsert({
    where: { email: "admin@agstores.local" },
    update: {},
    create: {
      name: "AG Stores Administrator",
      email: "admin@agstores.local",
      phone: "+94700000001",
      passwordHash,
      role: UserRole.ADMIN,
      preferredLanguage: PreferredLanguage.EN,
      status: UserStatus.ACTIVE,
    },
  });

  const owner = await prisma.user.upsert({
    where: { email: "owner@agstores.local" },
    update: {},
    create: {
      name: "Sample Shop Owner",
      email: "owner@agstores.local",
      phone: "+94700000002",
      passwordHash,
      role: UserRole.SHOP_OWNER,
      preferredLanguage: PreferredLanguage.EN,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.user.upsert({
    where: { email: "delivery@agstores.local" },
    update: {},
    create: {
      name: "Sample Delivery Person",
      email: "delivery@agstores.local",
      phone: "+94700000003",
      passwordHash,
      role: UserRole.DELIVERY_PERSON,
      preferredLanguage: PreferredLanguage.SI,
      status: UserStatus.ACTIVE,
    },
  });

  await prisma.user.upsert({
    where: { email: "customer@agstores.local" },
    update: {},
    create: {
      name: "Sample Customer",
      email: "customer@agstores.local",
      phone: "+94700000004",
      passwordHash,
      role: UserRole.CUSTOMER,
      preferredLanguage: PreferredLanguage.EN,
      status: UserStatus.ACTIVE,
    },
  });

  let shop = await prisma.shop.findFirst({
    where: { ownerId: owner.id, name: "Colombo Fresh Market" },
  });

  shop ??= await prisma.shop.create({
    data: {
      ownerId: owner.id,
      name: "Colombo Fresh Market",
      address: "100 Galle Road, Colombo 03",
      latitude: "6.906944",
      longitude: "79.850000",
      phone: "+94112345678",
      isOpen: true,
    },
  });

  const groceries = await prisma.category.upsert({
    where: {
      shopId_nameEn: { shopId: shop.id, nameEn: "Groceries" },
    },
    update: { nameSi: "සිල්ලර බඩු", status: CatalogStatus.ACTIVE },
    create: {
      shopId: shop.id,
      nameEn: "Groceries",
      nameSi: "සිල්ලර බඩු",
      status: CatalogStatus.ACTIVE,
    },
  });

  const beverages = await prisma.category.upsert({
    where: {
      shopId_nameEn: { shopId: shop.id, nameEn: "Beverages" },
    },
    update: { nameSi: "පාන වර්ග", status: CatalogStatus.ACTIVE },
    create: {
      shopId: shop.id,
      nameEn: "Beverages",
      nameSi: "පාන වර්ග",
      status: CatalogStatus.ACTIVE,
    },
  });

  await prisma.product.upsert({
    where: { shopId_nameEn: { shopId: shop.id, nameEn: "Red Rice 1kg" } },
    update: {},
    create: {
      shopId: shop.id,
      categoryId: groceries.id,
      nameEn: "Red Rice 1kg",
      nameSi: "රතු සහල් කිලෝ 1",
      descriptionEn: "Locally sourced red rice",
      price: "420.00",
      stockQuantity: 50,
      isAvailable: true,
    },
  });

  await prisma.product.upsert({
    where: { shopId_nameEn: { shopId: shop.id, nameEn: "Ceylon Tea" } },
    update: {},
    create: {
      shopId: shop.id,
      categoryId: beverages.id,
      nameEn: "Ceylon Tea",
      nameSi: "ලංකා තේ",
      descriptionEn: "100g pure Ceylon black tea",
      price: "680.00",
      stockQuantity: 30,
      isAvailable: true,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
