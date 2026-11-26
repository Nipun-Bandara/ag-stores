// @vitest-environment node
import { getDb } from "@/db";

import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const photoStorage = vi.hoisted(() => ({ remove: vi.fn() }));
vi.mock("@/lib/product-photo-storage", () => ({
  publicPhotoUrl: (key: string) =>
    `https://mock.supabase.test/storage/v1/object/public/product-photos/${key}`,
  isManagedPhotoUrl: (url: string | null) =>
    !!url?.includes("/storage/v1/object/public/product-photos/"),
  deletePhoto: photoStorage.remove,
}));

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
import { cleanupProductPhotos } from "@/services/product-photo-cleanup.service";

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
      identifier: (await getDb().user.findUniqueOrThrow({ where: { email } }))
        .phone,
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
  const photoProductIds: string[] = [];
  const photoUploadIds: string[] = [];

  const input = () => ({
    itemCode: `000-${suffix}`,
    shopId: ownerShopId,
    categoryId,
    nameEn: `Integration Product ${suffix}`,
    nameSi: "පරීක්ෂණ නිෂ්පාදනය",
    descriptionEn: `Searchable description ${suffix}`,
    descriptionSi: null,
    price: "1234.50",
    stockQuantity: 12,
    lowStockThreshold: 4,
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
        firstName: "Other Product",
        lastName: "Owner",
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
    await prisma.productPhotoUpload.deleteMany({
      where: { id: { in: photoUploadIds } },
    });
    await prisma.authSession.deleteMany({
      where: {
        tokenHash: { in: tokens.filter(Boolean).map(hashSessionToken) },
      },
    });
    await prisma.product.deleteMany({
      where: {
        id: {
          in: [productId, otherProductId, ...photoProductIds].filter(Boolean),
        },
      },
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
    const negativeThreshold = await createProduct(
      request("/api/owner/products", "POST", ownerToken, {
        ...input(),
        lowStockThreshold: -1,
      }),
    );

    expect(negativePrice.status).toBe(400);
    expect(negativeStock.status).toBe(400);
    expect(negativeThreshold.status).toBe(400);
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
      lowStockThreshold: 4,
      inventoryStatus: "AVAILABLE",
      isAvailable: true,
      categoryId,
    });
  });

  it("creates a fractional-stock KG product with an attached photo", async () => {
    const ownerId = (
      await prisma.shop.findUniqueOrThrow({ where: { id: ownerShopId } })
    ).ownerId;
    const key = `products/${ownerShopId}/${randomUUID()}.webp`;
    const upload = await prisma.productPhotoUpload.create({
      data: { shopId: ownerShopId, ownerId, storageKey: key },
    });
    photoUploadIds.push(upload.id);

    const response = await createProduct(
      request("/api/owner/products", "POST", ownerToken, {
        ...input(),
        itemCode: `kg-photo-${randomUUID()}`,
        nameEn: `KG Photo ${randomUUID()}`,
        sellingUnit: "KG",
        minimumOrderQuantity: 0.002,
        orderingIncrement: 0.001,
        stockQuantity: 1.5,
        lowStockThreshold: 0.25,
        imageUrl: null,
        imageUploadId: upload.id,
      }),
    );
    expect(response.status).toBe(201);
    const created = (await response.json()).data;
    photoProductIds.push(created.id);
    const product = await prisma.product.findUniqueOrThrow({
      where: { id: created.id },
    });
    expect(product.sellingUnit).toBe("KG");
    expect(product.stockQuantity.toString()).toBe("1.5");
    expect(product.imageStorageKey).toBe(key);
    expect(
      (
        await prisma.productPhotoUpload.findUniqueOrThrow({
          where: { id: upload.id },
        })
      ).attachedAt,
    ).not.toBeNull();
  });

  it("attaches only a same-owner shop upload and preserves a photo on failed edits", async () => {
    const ownerId = (
      await prisma.shop.findUniqueOrThrow({ where: { id: ownerShopId } })
    ).ownerId;
    const firstKey = `products/${ownerShopId}/${randomUUID()}.webp`;
    const firstUpload = await prisma.productPhotoUpload.create({
      data: { shopId: ownerShopId, ownerId, storageKey: firstKey },
    });
    photoUploadIds.push(firstUpload.id);
    const create = await createProduct(
      request("/api/owner/products", "POST", ownerToken, {
        ...input(),
        itemCode: `photo-${randomUUID()}`,
        nameEn: `Photo ${randomUUID()}`,
        imageUrl: null,
        imageUploadId: firstUpload.id,
      }),
    );
    expect(create.status).toBe(201);
    const created = (await create.json()).data;
    photoProductIds.push(created.id);
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: created.id } }))
        .imageStorageKey,
    ).toBe(firstKey);
    expect(
      (
        await prisma.productPhotoUpload.findUniqueOrThrow({
          where: { id: firstUpload.id },
        })
      ).attachedAt,
    ).not.toBeNull();

    const foreign = await prisma.productPhotoUpload.create({
      data: {
        shopId: otherShopId,
        ownerId: otherOwnerId,
        storageKey: `products/${otherShopId}/${randomUUID()}.webp`,
      },
    });
    photoUploadIds.push(foreign.id);
    const denied = await updateProduct(
      request(`/api/owner/products/${created.id}`, "PATCH", ownerToken, {
        ...input(),
        shopId: undefined,
        itemCode: created.itemCode,
        nameEn: created.nameEn,
        imageUrl: null,
        imageUploadId: foreign.id,
      }),
      context(created.id),
    );
    expect(denied.status).toBe(409);
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: created.id } }))
        .imageStorageKey,
    ).toBe(firstKey);

    const secondKey = `products/${ownerShopId}/${randomUUID()}.webp`;
    const secondUpload = await prisma.productPhotoUpload.create({
      data: {
        shopId: ownerShopId,
        ownerId,
        productId: created.id,
        storageKey: secondKey,
      },
    });
    photoUploadIds.push(secondUpload.id);
    photoStorage.remove.mockImplementationOnce(async (key: string) => {
      expect(key).toBe(firstKey);
      expect(
        (await prisma.product.findUniqueOrThrow({ where: { id: created.id } }))
          .imageStorageKey,
      ).toBe(secondKey);
      throw new Error("Storage unavailable");
    });
    const replaced = await updateProduct(
      request(`/api/owner/products/${created.id}`, "PATCH", ownerToken, {
        ...input(),
        shopId: undefined,
        itemCode: created.itemCode,
        nameEn: created.nameEn,
        imageUrl: null,
        imageUploadId: secondUpload.id,
      }),
      context(created.id),
    );
    expect(replaced.status).toBe(200);
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: created.id } }))
        .imageStorageKey,
    ).toBe(secondKey);
    expect(
      (
        await prisma.productPhotoUpload.findUniqueOrThrow({
          where: { id: firstUpload.id },
        })
      ).deletedAt,
    ).toBeNull();

    const failedSave = await updateProduct(
      request(`/api/owner/products/${created.id}`, "PATCH", ownerToken, {
        ...input(),
        shopId: undefined,
        itemCode: created.itemCode,
        nameEn: `Integration Product ${suffix}`,
        imageUrl: null,
      }),
      context(created.id),
    );
    expect(failedSave.status).toBe(409);
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: created.id } }))
        .imageStorageKey,
    ).toBe(secondKey);

    const removed = await updateProduct(
      request(`/api/owner/products/${created.id}`, "PATCH", ownerToken, {
        ...input(),
        shopId: undefined,
        itemCode: created.itemCode,
        nameEn: created.nameEn,
        imageUrl: null,
      }),
      context(created.id),
    );
    expect(removed.status).toBe(200);
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: created.id } }))
        .imageStorageKey,
    ).toBeNull();
    expect(photoStorage.remove).toHaveBeenCalledWith(secondKey);
  });

  it("keeps an external legacy URL when other product details change", async () => {
    const before = await prisma.product.findUniqueOrThrow({
      where: { id: productId },
    });
    expect(before.imageUrl).toBe("https://example.test/product.jpg");
    const saved = await updateProduct(
      request(`/api/owner/products/${productId}`, "PATCH", ownerToken, {
        ...input(),
        shopId: undefined,
        nameEn: `Legacy Photo ${suffix}`,
        imageUrl: before.imageUrl,
      }),
      context(productId),
    );
    expect(saved.status).toBe(200);
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: productId } }))
        .imageUrl,
    ).toBe(before.imageUrl);
  });

  it("cleans abandoned uploads after a grace period while keeping referenced photos", async () => {
    const ownerId = (
      await prisma.shop.findUniqueOrThrow({ where: { id: ownerShopId } })
    ).ownerId;
    const old = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const activeKey = `products/${ownerShopId}/${randomUUID()}.webp`;
    const abandonedKey = `products/${ownerShopId}/${randomUUID()}.webp`;
    const active = await prisma.product.create({
      data: {
        shopId: ownerShopId,
        categoryId,
        nameEn: `Active photo ${randomUUID()}`,
        price: "1.00",
        imageUrl: `https://mock.supabase.test/storage/v1/object/public/product-photos/${activeKey}`,
        imageStorageKey: activeKey,
      },
    });
    photoProductIds.push(active.id);
    for (const [key, productId] of [
      [activeKey, active.id],
      [abandonedKey, null],
    ] as const) {
      const upload = await prisma.productPhotoUpload.create({
        data: {
          shopId: ownerShopId,
          ownerId,
          productId,
          storageKey: key,
          createdAt: old,
          ...(productId ? { attachedAt: old } : {}),
        },
      });
      photoUploadIds.push(upload.id);
    }
    const removed: string[] = [];
    const result = await cleanupProductPhotos(prisma, async (key) => {
      removed.push(key);
    });
    expect(removed).toContain(abandonedKey);
    expect(removed).not.toContain(activeKey);
    expect(result.retained).toBeGreaterThanOrEqual(1);
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: active.id } }))
        .imageStorageKey,
    ).toBe(activeKey);

    const retryKey = `products/${ownerShopId}/${randomUUID()}.webp`;
    const retryUpload = await prisma.productPhotoUpload.create({
      data: {
        shopId: ownerShopId,
        ownerId,
        storageKey: retryKey,
        createdAt: old,
      },
    });
    photoUploadIds.push(retryUpload.id);
    const failed = await cleanupProductPhotos(prisma, async (key) => {
      if (key === retryKey) throw new Error("offline");
    });
    expect(failed.failed).toBe(1);
    expect(
      (
        await prisma.productPhotoUpload.findUniqueOrThrow({
          where: { id: retryUpload.id },
        })
      ).purgedAt,
    ).toBeNull();
    const retried: string[] = [];
    await cleanupProductPhotos(prisma, async (key) => {
      retried.push(key);
    });
    expect(retried).toContain(retryKey);
    expect(
      (
        await prisma.productPhotoUpload.findUniqueOrThrow({
          where: { id: retryUpload.id },
        })
      ).purgedAt,
    ).not.toBeNull();
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
        lowStockThreshold: 10,
      }),
      context(productId),
    );

    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({
      nameEn: `Updated Product ${suffix}`,
      price: "999.99",
    });
    expect(stockResponse.status).toBe(200);
    expect((await stockResponse.json()).data).toMatchObject({
      stockQuantity: 25,
      lowStockThreshold: 10,
      inventoryStatus: "AVAILABLE",
    });
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

  it("filters out-of-stock, low-stock, and available products", async () => {
    async function filter(inventoryStatus: string) {
      const response = await listProducts(
        request(
          `/api/owner/products?categoryId=${categoryId}&inventoryStatus=${inventoryStatus}`,
          "GET",
          ownerToken,
        ),
      );
      expect(response.status).toBe(200);
      return (await response.json()).data as Array<{
        id: string;
        inventoryStatus: string;
      }>;
    }

    expect((await filter("AVAILABLE")).map(({ id }) => id)).toContain(
      productId,
    );

    await prisma.product.update({
      where: { id: productId },
      data: { stockQuantity: 5, lowStockThreshold: 10 },
    });
    const lowStock = await filter("LOW_STOCK");
    expect(lowStock).toContainEqual(
      expect.objectContaining({ id: productId, inventoryStatus: "LOW_STOCK" }),
    );

    await prisma.product.update({
      where: { id: productId },
      data: { stockQuantity: 0 },
    });
    const outOfStock = await filter("OUT_OF_STOCK");
    expect(outOfStock).toContainEqual(
      expect.objectContaining({
        id: productId,
        inventoryStatus: "OUT_OF_STOCK",
      }),
    );
  });
});
