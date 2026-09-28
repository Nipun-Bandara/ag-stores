// @vitest-environment node

import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  GET as listProducts,
  POST as createProduct,
} from "@/app/api/owner/products/route";
import { PATCH as updateProduct } from "@/app/api/owner/products/[productId]/route";
import { PATCH as updateAvailability } from "@/app/api/owner/products/[productId]/availability/route";
import { PATCH as updateStock } from "@/app/api/owner/products/[productId]/stock/route";
import { POST as loginRoute } from "@/app/api/auth/login/route";
import { PrismaClient, UserRole } from "@/generated/prisma/client";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { hashSessionToken } from "@/lib/auth/session-token";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;
const password = "ChangeMe123!";

function request(path: string, method: string, token?: string, body?: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Cookie: `${SESSION_COOKIE_NAME}=${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function context(productId: string) {
  return { params: Promise.resolve({ productId }) };
}

async function login(email: string): Promise<string> {
  const response = await loginRoute(
    request("/api/auth/login", "POST", undefined, {
      identifier: email,
      password,
    }),
  );
  expect(response.status).toBe(200);
  return response.cookies.get(SESSION_COOKIE_NAME)?.value ?? "";
}

describeWithDatabase("shop owner product API", () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString:
        databaseUrl ?? "postgresql://unused:unused@127.0.0.1:1/unused",
    }),
  });
  const suffix = randomUUID();
  const tokens: string[] = [];
  let ownerToken: string;
  let customerToken: string;
  let ownerShopId: string;
  let categoryId: string;
  let productId: string;
  let otherOwnerId: string;
  let otherShopId: string;
  let otherCategoryId: string;
  let otherProductId: string;

  const input = () => ({
    shopId: ownerShopId,
    categoryId,
    nameEn: `Integration Product ${suffix}`,
    nameSi: "පරීක්ෂණ නිෂ්පාදනය",
    descriptionEn: `Searchable description ${suffix}`,
    descriptionSi: null,
    price: "1234.50",
    stockQuantity: 12,
    imageUrl: "https://example.test/product.jpg",
    isAvailable: true,
  });

  beforeAll(async () => {
    ownerToken = await login("owner@agstores.local");
    customerToken = await login("customer@agstores.local");
    tokens.push(ownerToken, customerToken);

    const owner = await prisma.user.findUniqueOrThrow({
      where: { email: "owner@agstores.local" },
    });
    ownerShopId = (
      await prisma.shop.findFirstOrThrow({ where: { ownerId: owner.id } })
    ).id;
    categoryId = (
      await prisma.category.create({
        data: { shopId: ownerShopId, nameEn: `Products ${suffix}` },
      })
    ).id;

    const otherOwner = await prisma.user.create({
      data: {
        name: "Other Product Owner",
        email: `product-owner-${suffix}@example.test`,
        phone: `+94${Date.now().toString().slice(-9)}`,
        passwordHash: "integration-test-only",
        role: UserRole.SHOP_OWNER,
      },
    });
    otherOwnerId = otherOwner.id;
    const otherShop = await prisma.shop.create({
      data: {
        ownerId: otherOwner.id,
        name: `Other Product Shop ${suffix}`,
        address: "2 Other Shop Road",
        latitude: "6.900000",
        longitude: "79.800000",
        phone: `+94${(Date.now() + 1).toString().slice(-9)}`,
      },
    });
    otherShopId = otherShop.id;
    otherCategoryId = (
      await prisma.category.create({
        data: { shopId: otherShop.id, nameEn: `Other Category ${suffix}` },
      })
    ).id;
    otherProductId = (
      await prisma.product.create({
        data: {
          shopId: otherShop.id,
          categoryId: otherCategoryId,
          nameEn: `Other Product ${suffix}`,
          price: "10.00",
          stockQuantity: 1,
        },
      })
    ).id;
  });

  afterAll(async () => {
    await prisma.authSession.deleteMany({
      where: {
        tokenHash: { in: tokens.filter(Boolean).map(hashSessionToken) },
      },
    });
    await prisma.product.deleteMany({
      where: { id: { in: [productId, otherProductId].filter(Boolean) } },
    });
    await prisma.category.deleteMany({
      where: { id: { in: [categoryId, otherCategoryId].filter(Boolean) } },
    });
    if (otherShopId)
      await prisma.shop.deleteMany({ where: { id: otherShopId } });
    if (otherOwnerId) {
      await prisma.user.deleteMany({ where: { id: otherOwnerId } });
    }
    await prisma.$disconnect();
  });

  it("rejects negative prices and stock", async () => {
    const negativePrice = await createProduct(
      request("/api/owner/products", "POST", ownerToken, {
        ...input(),
        price: "-0.01",
      }),
    );
    const negativeStock = await createProduct(
      request("/api/owner/products", "POST", ownerToken, {
        ...input(),
        stockQuantity: -1,
      }),
    );

    expect(negativePrice.status).toBe(400);
    expect(negativeStock.status).toBe(400);
  });

  it("prevents customers from creating products", async () => {
    const response = await createProduct(
      request("/api/owner/products", "POST", customerToken, input()),
    );
    expect(response.status).toBe(403);
  });

  it("creates a valid product with an exact decimal price", async () => {
    const response = await createProduct(
      request("/api/owner/products", "POST", ownerToken, input()),
    );
    const body = await response.json();
    productId = body.data.id;

    expect(response.status).toBe(201);
    expect(body.data).toMatchObject({
      price: "1234.50",
      stockQuantity: 12,
      isAvailable: true,
      categoryId,
    });
  });

  it("prevents customers from modifying products", async () => {
    const body = { ...input(), shopId: undefined };
    const response = await updateProduct(
      request(`/api/owner/products/${productId}`, "PATCH", customerToken, body),
      context(productId),
    );

    expect(response.status).toBe(403);
  });

  it("updates an owned product and its stock", async () => {
    const response = await updateProduct(
      request(`/api/owner/products/${productId}`, "PATCH", ownerToken, {
        ...input(),
        shopId: undefined,
        nameEn: `Updated Product ${suffix}`,
        price: "999.99",
      }),
      context(productId),
    );
    const stockResponse = await updateStock(
      request(`/api/owner/products/${productId}/stock`, "PATCH", ownerToken, {
        stockQuantity: 25,
      }),
      context(productId),
    );

    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({
      nameEn: `Updated Product ${suffix}`,
      price: "999.99",
    });
    expect(stockResponse.status).toBe(200);
    expect((await stockResponse.json()).data.stockQuantity).toBe(25);
  });

  it("marks a product unavailable", async () => {
    const response = await updateAvailability(
      request(
        `/api/owner/products/${productId}/availability`,
        "PATCH",
        ownerToken,
        { isAvailable: false },
      ),
      context(productId),
    );

    expect(response.status).toBe(200);
    expect((await response.json()).data.isAvailable).toBe(false);
  });

  it("prevents an owner from updating another shop's product", async () => {
    const body = { ...input(), shopId: undefined };
    const response = await updateProduct(
      request(
        `/api/owner/products/${otherProductId}`,
        "PATCH",
        ownerToken,
        body,
      ),
      context(otherProductId),
    );

    expect(response.status).toBe(404);
    expect(
      await prisma.product.findUniqueOrThrow({ where: { id: otherProductId } }),
    ).toMatchObject({ nameEn: `Other Product ${suffix}` });
  });

  it("filters products by category", async () => {
    const response = await listProducts(
      request(
        `/api/owner/products?categoryId=${categoryId}`,
        "GET",
        ownerToken,
      ),
    );
    const products = (await response.json()).data as Array<{
      id: string;
      categoryId: string;
    }>;

    expect(products).toContainEqual(
      expect.objectContaining({ id: productId, categoryId }),
    );
    expect(products.every((product) => product.categoryId === categoryId)).toBe(
      true,
    );
  });

  it("searches names and descriptions case-insensitively", async () => {
    const response = await listProducts(
      request(
        `/api/owner/products?search=${encodeURIComponent(`SEARCHABLE DESCRIPTION ${suffix}`)}`,
        "GET",
        ownerToken,
      ),
    );
    const products = (await response.json()).data as Array<{ id: string }>;

    expect(products.map(({ id }) => id)).toContain(productId);
    expect(products.map(({ id }) => id)).not.toContain(otherProductId);
  });
});
