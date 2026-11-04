import { PrismaPg } from "@prisma/adapter-pg";

import {
  CatalogStatus,
  PreferredLanguage,
  PrismaClient,
  UserRole,
  UserStatus,
} from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

async function main() {
  if (
    process.env.ALLOW_DEV_SEED !== "1" ||
    process.env.NODE_ENV === "production"
  ) {
    throw new Error(
      "Development fixtures require ALLOW_DEV_SEED=1 outside production.",
    );
  }
  const passwordHash = await hashPassword("ChangeMe123!");
  async function fixture(
    key: string,
    email: string,
    phone: string,
    firstName: string,
    lastName: string,
    role: UserRole,
    preferredLanguage: PreferredLanguage,
  ) {
    const keyed = await prisma.user.findUnique({
      where: { developmentFixtureKey: key },
    });
    const matches = keyed
      ? [keyed]
      : await prisma.user.findMany({ where: { OR: [{ email }, { phone }] } });
    if (matches.length > 1)
      throw new Error(
        `Conflicting development fixture contacts for ${key}; resolve manually.`,
      );
    const existing = matches[0];
    if (existing) {
      if (existing.role !== role)
        throw new Error(`Unexpected role for development fixture ${key}.`);
      if (existing.developmentFixtureKey === key) return existing;
      return prisma.user.update({
        where: { id: existing.id },
        data: { developmentFixtureKey: key },
      });
    }
    return prisma.user.create({
      data: {
        developmentFixtureKey: key,
        firstName,
        lastName,
        email,
        phone,
        passwordHash,
        role,
        preferredLanguage,
        status: UserStatus.ACTIVE,
      },
    });
  }
  await fixture(
    "admin",
    "admin@agstores.local",
    "+94700000001",
    "AG Stores",
    "Administrator",
    UserRole.ADMIN,
    PreferredLanguage.EN,
  );
  const owner = await fixture(
    "owner",
    "owner@agstores.local",
    "+94700000002",
    "Sample Shop",
    "Owner",
    UserRole.SHOP_OWNER,
    PreferredLanguage.EN,
  );
  const deliveryPerson = await fixture(
    "delivery",
    "delivery@agstores.local",
    "+94700000003",
    "Sample Delivery",
    "Person",
    UserRole.DELIVERY_PERSON,
    PreferredLanguage.SI,
  );
  await fixture(
    "customer",
    "customer@agstores.local",
    "+94700000004",
    "Sample",
    "Customer",
    UserRole.CUSTOMER,
    PreferredLanguage.EN,
  );

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
      minimumOrderAmount: "0.00",
      deliveryFee: "250.00",
      maximumDeliveryRadiusKm: "50.00",
    },
  });

  if (!deliveryPerson.assignedShopId) {
    await prisma.user.update({
      where: { id: deliveryPerson.id },
      data: { assignedShopId: shop.id },
    });
  }

  const groceries = await prisma.category.upsert({
    where: {
      shopId_nameEn: { shopId: shop.id, nameEn: "Groceries" },
    },
    update: {},
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
    update: {},
    create: {
      shopId: shop.id,
      nameEn: "Beverages",
      nameSi: "පාන වර්ග",
      status: CatalogStatus.ACTIVE,
    },
  });

  const seasonal = await prisma.category.upsert({
    where: {
      shopId_nameEn: { shopId: shop.id, nameEn: "Seasonal" },
    },
    update: {},
    create: {
      shopId: shop.id,
      nameEn: "Seasonal",
      nameSi: "සෘතුමය",
      status: CatalogStatus.INACTIVE,
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
      lowStockThreshold: 10,
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
      lowStockThreshold: 5,
      isAvailable: true,
    },
  });

  await prisma.product.upsert({
    where: { shopId_nameEn: { shopId: shop.id, nameEn: "Coconut Milk" } },
    update: {},
    create: {
      shopId: shop.id,
      categoryId: groceries.id,
      nameEn: "Coconut Milk",
      nameSi: "පොල් කිරි",
      descriptionEn: "Rich coconut milk for everyday cooking",
      price: "390.00",
      stockQuantity: 0,
      isAvailable: true,
    },
  });

  await prisma.product.upsert({
    where: {
      shopId_nameEn: { shopId: shop.id, nameEn: "Unavailable Sample" },
    },
    update: {},
    create: {
      shopId: shop.id,
      categoryId: groceries.id,
      nameEn: "Unavailable Sample",
      price: "100.00",
      stockQuantity: 10,
      isAvailable: false,
    },
  });

  await prisma.product.upsert({
    where: {
      shopId_nameEn: { shopId: shop.id, nameEn: "Inactive Category Sample" },
    },
    update: {},
    create: {
      shopId: shop.id,
      categoryId: seasonal.id,
      nameEn: "Inactive Category Sample",
      price: "150.00",
      stockQuantity: 5,
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
