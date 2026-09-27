// @vitest-environment node

import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  GET as listCategories,
  POST as createCategory,
} from "@/app/api/owner/categories/route";
import { PATCH as updateCategory } from "@/app/api/owner/categories/[categoryId]/route";
import { PATCH as updateCategoryStatus } from "@/app/api/owner/categories/[categoryId]/status/route";
import { GET as listStorefrontCategories } from "@/app/api/shops/[shopId]/categories/route";
import { POST as loginRoute } from "@/app/api/auth/login/route";
import {
  CatalogStatus,
  PrismaClient,
  UserRole,
} from "@/generated/prisma/client";
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

function context(categoryId: string) {
  return { params: Promise.resolve({ categoryId }) };
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

describeWithDatabase("shop owner category API", () => {
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
  let deliveryToken: string;
  let adminToken: string;
  let ownerShopId: string;
  let otherOwnerId: string;
  let otherShopId: string;
  let otherCategoryId: string;
  let categoryId: string;

  beforeAll(async () => {
    ownerToken = await login("owner@agstores.local");
    customerToken = await login("customer@agstores.local");
    deliveryToken = await login("delivery@agstores.local");
    adminToken = await login("admin@agstores.local");
    tokens.push(ownerToken, customerToken, deliveryToken, adminToken);

    const owner = await prisma.user.findUniqueOrThrow({
      where: { email: "owner@agstores.local" },
    });
    ownerShopId = (
      await prisma.shop.findFirstOrThrow({ where: { ownerId: owner.id } })
    ).id;

    const otherOwner = await prisma.user.create({
      data: {
        name: "Other Category Owner",
        email: `category-owner-${suffix}@example.test`,
        phone: `+94${Date.now().toString().slice(-9)}`,
        passwordHash: "integration-test-only",
        role: UserRole.SHOP_OWNER,
      },
    });
    otherOwnerId = otherOwner.id;
    const otherShop = await prisma.shop.create({
      data: {
        ownerId: otherOwner.id,
        name: `Other Shop ${suffix}`,
        address: "1 Other Shop Road",
        latitude: "6.900000",
        longitude: "79.800000",
        phone: `+94${(Date.now() + 1).toString().slice(-9)}`,
      },
    });
    otherShopId = otherShop.id;
    otherCategoryId = (
      await prisma.category.create({
        data: {
          shopId: otherShop.id,
          nameEn: "Other owner's category",
          status: CatalogStatus.ACTIVE,
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
    if (categoryId) {
      await prisma.category.deleteMany({ where: { id: categoryId } });
    }
    if (otherCategoryId) {
      await prisma.category.deleteMany({ where: { id: otherCategoryId } });
    }
    if (otherShopId) {
      await prisma.shop.deleteMany({ where: { id: otherShopId } });
    }
    if (otherOwnerId) {
      await prisma.user.deleteMany({ where: { id: otherOwnerId } });
    }
    await prisma.$disconnect();
  });

  it("returns validation errors for invalid category data", async () => {
    const response = await createCategory(
      request("/api/owner/categories", "POST", ownerToken, {
        shopId: "not-a-uuid",
        nameEn: "",
        nameSi: 42,
      }),
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("prevents customers and delivery people from creating categories", async () => {
    const input = { shopId: ownerShopId, nameEn: "Forbidden", nameSi: null };
    const customerResponse = await createCategory(
      request("/api/owner/categories", "POST", customerToken, input),
    );
    const deliveryResponse = await createCategory(
      request("/api/owner/categories", "POST", deliveryToken, input),
    );

    expect(customerResponse.status).toBe(403);
    expect(deliveryResponse.status).toBe(403);
  });

  it("creates and lists a category for the owner's shop", async () => {
    const response = await createCategory(
      request("/api/owner/categories", "POST", ownerToken, {
        shopId: ownerShopId,
        nameEn: `Seasonal ${suffix}`,
        nameSi: "සෘතුමය",
      }),
    );
    const body = await response.json();
    categoryId = body.data.id;

    const listResponse = await listCategories(
      request("/api/owner/categories", "GET", ownerToken),
    );
    const categories = (await listResponse.json()).data as Array<{
      id: string;
    }>;

    expect(response.status).toBe(201);
    expect(body.data).toMatchObject({
      shopId: ownerShopId,
      status: "ACTIVE",
    });
    expect(categories.some(({ id }) => id === categoryId)).toBe(true);
  });

  it("updates an owned category", async () => {
    const response = await updateCategory(
      request(`/api/owner/categories/${categoryId}`, "PATCH", ownerToken, {
        nameEn: `Updated Seasonal ${suffix}`,
        nameSi: "යාවත්කාලීන",
      }),
      context(categoryId),
    );

    expect(response.status).toBe(200);
    expect((await response.json()).data.nameEn).toBe(
      `Updated Seasonal ${suffix}`,
    );
  });

  it("prevents an owner from editing another shop's category", async () => {
    const response = await updateCategory(
      request(`/api/owner/categories/${otherCategoryId}`, "PATCH", ownerToken, {
        nameEn: "Compromised",
        nameSi: null,
      }),
      context(otherCategoryId),
    );

    expect(response.status).toBe(404);
    expect(
      await prisma.category.findUniqueOrThrow({
        where: { id: otherCategoryId },
      }),
    ).toMatchObject({ nameEn: "Other owner's category" });
  });

  it("deactivates a category", async () => {
    const response = await updateCategoryStatus(
      request(
        `/api/owner/categories/${categoryId}/status`,
        "PATCH",
        ownerToken,
        { status: "INACTIVE" },
      ),
      context(categoryId),
    );

    expect(response.status).toBe(200);
    expect((await response.json()).data.status).toBe("INACTIVE");
  });

  it("allows administrators to view inactive shop categories", async () => {
    const response = await listCategories(
      request(`/api/owner/categories?shopId=${ownerShopId}`, "GET", adminToken),
    );
    const categories = (await response.json()).data as Array<{
      id: string;
      status: string;
    }>;

    expect(response.status).toBe(200);
    expect(categories).toContainEqual(
      expect.objectContaining({ id: categoryId, status: "INACTIVE" }),
    );
  });

  it("excludes inactive categories from the customer storefront", async () => {
    const response = await listStorefrontCategories(
      new Request(`http://localhost/api/shops/${ownerShopId}/categories`),
      { params: Promise.resolve({ shopId: ownerShopId }) },
    );
    const categories = (await response.json()).data as Array<{
      id: string;
      status: string;
    }>;

    expect(response.status).toBe(200);
    expect(categories.some(({ id }) => id === categoryId)).toBe(false);
    expect(categories.every(({ status }) => status === "ACTIVE")).toBe(true);
  });
});
