// @vitest-environment node

import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { POST as loginRoute } from "@/app/api/auth/login/route";
import { POST as checkoutRoute } from "@/app/api/checkout/route";
import {
  GET as shopDetailRoute,
  PATCH as updateShopRoute,
} from "@/app/api/admin/shops/[shopId]/route";
import { PATCH as shopStatusRoute } from "@/app/api/admin/shops/[shopId]/status/route";
import {
  GET as listShopsRoute,
  POST as createShopRoute,
} from "@/app/api/admin/shops/route";
import { PrismaClient, UserRole, UserStatus } from "@/generated/prisma/client";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { hashPassword } from "@/lib/auth/password";
import { hashSessionToken } from "@/lib/auth/session-token";
import { listStorefrontProducts } from "@/services/storefront.service";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

function request(path: string, token: string, method = "GET", body?: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: {
      Cookie: `${SESSION_COOKIE_NAME}=${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

function context(shopId: string) {
  return { params: Promise.resolve({ shopId }) };
}

async function login(email: string, password = "ChangeMe123!") {
  const response = await loginRoute(
    new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: email, password }),
    }),
  );
  return response.cookies.get(SESSION_COOKIE_NAME)?.value ?? "";
}

describeWithDatabase("admin shop management API", () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString:
        databaseUrl ?? "postgresql://unused:unused@127.0.0.1:1/unused",
    }),
  });
  const suffix = randomUUID();
  const digits = suffix.replace(/\D/g, "").padEnd(8, "6").slice(0, 8);
  const tokens: string[] = [];
  let adminToken = "";
  let customerToken = "";
  let ownerToken = "";
  let deliveryToken = "";
  let managedCustomerToken = "";
  let ownerOneId = "";
  let ownerTwoId = "";
  let customerId = "";
  let addressId = "";
  let shopId = "";
  let categoryId = "";
  let productId = "";

  const shopInput = () => ({
    ownerId: ownerOneId,
    name: `Managed Shop ${suffix}`,
    address: "100 Admin Shop Road, Colombo",
    phone: `+9414${digits}`,
    latitude: "6.927079",
    longitude: "79.861244",
    isOpen: true,
    minimumOrderAmount: "0.00",
    deliveryFee: "150.00",
    maximumDeliveryRadiusKm: "30.00",
  });

  beforeAll(async () => {
    [adminToken, customerToken, ownerToken, deliveryToken] = await Promise.all([
      login("admin@agstores.local"),
      login("customer@agstores.local"),
      login("owner@agstores.local"),
      login("delivery@agstores.local"),
    ]);
    tokens.push(adminToken, customerToken, ownerToken, deliveryToken);

    const passwordHash = await hashPassword("ChangeMe123!");
    const [ownerOne, ownerTwo, customer] = await Promise.all([
      prisma.user.create({
        data: {
          name: "First Managed Owner",
          email: `first-shop-owner-${suffix}@example.test`,
          passwordHash,
          role: UserRole.SHOP_OWNER,
        },
      }),
      prisma.user.create({
        data: {
          name: "Second Managed Owner",
          email: `second-shop-owner-${suffix}@example.test`,
          passwordHash,
          role: UserRole.SHOP_OWNER,
        },
      }),
      prisma.user.create({
        data: {
          name: "Managed Shop Customer",
          email: `shop-customer-${suffix}@example.test`,
          passwordHash,
          role: UserRole.CUSTOMER,
        },
      }),
    ]);
    ownerOneId = ownerOne.id;
    ownerTwoId = ownerTwo.id;
    customerId = customer.id;
    managedCustomerToken = await login(customer.email ?? "");
    tokens.push(managedCustomerToken);
    addressId = (
      await prisma.customerAddress.create({
        data: {
          customerId,
          label: "Home",
          address: "101 Admin Shop Road, Colombo",
          latitude: "6.927500",
          longitude: "79.862000",
        },
      })
    ).id;
  });

  afterAll(async () => {
    if (customerId) {
      await prisma.orderItem.deleteMany({ where: { order: { customerId } } });
      await prisma.order.deleteMany({ where: { customerId } });
      await prisma.customerAddress.deleteMany({ where: { customerId } });
    }
    if (productId)
      await prisma.product.deleteMany({ where: { id: productId } });
    if (categoryId)
      await prisma.category.deleteMany({ where: { id: categoryId } });
    if (shopId) await prisma.shop.deleteMany({ where: { id: shopId } });
    const userIds = [ownerOneId, ownerTwoId, customerId].filter(Boolean);
    await prisma.authSession.deleteMany({
      where: {
        OR: [
          { userId: { in: userIds } },
          { tokenHash: { in: tokens.filter(Boolean).map(hashSessionToken) } },
        ],
      },
    });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it("allows an administrator to create and view a shop", async () => {
    const response = await createShopRoute(
      request("/api/admin/shops", adminToken, "POST", shopInput()),
    );
    const payload = await response.json();
    shopId = payload.data.id;

    expect(response.status).toBe(201);
    expect(payload.data).toMatchObject({
      ownerId: ownerOneId,
      isActive: true,
      isOpen: true,
      deliveryFee: "150.00",
    });
    expect(JSON.stringify(payload)).not.toContain("passwordHash");

    const list = await listShopsRoute(request("/api/admin/shops", adminToken));
    const detail = await shopDetailRoute(
      request(`/api/admin/shops/${shopId}`, adminToken),
      context(shopId),
    );
    expect(list.status).toBe(200);
    expect((await list.json()).data.shops).toContainEqual(
      expect.objectContaining({ id: shopId }),
    );
    expect(detail.status).toBe(200);
  });

  it("edits a shop and assigns a different shop owner", async () => {
    const response = await updateShopRoute(
      request(`/api/admin/shops/${shopId}`, adminToken, "PATCH", {
        ...shopInput(),
        ownerId: ownerTwoId,
        address: "200 Reassigned Shop Road, Colombo",
      }),
      context(shopId),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toMatchObject({
      id: shopId,
      ownerId: ownerTwoId,
      address: "200 Reassigned Shop Road, Colombo",
    });
    expect(
      await prisma.shop.findUniqueOrThrow({ where: { id: shopId } }),
    ).toMatchObject({ ownerId: ownerTwoId });
  });

  it("enforces duplicate shop-name and phone constraints", async () => {
    const duplicateName = await createShopRoute(
      request("/api/admin/shops", adminToken, "POST", {
        ...shopInput(),
        ownerId: ownerTwoId,
        phone: `+9415${digits}`,
      }),
    );
    expect(duplicateName.status).toBe(409);
    expect((await duplicateName.json()).error.code).toBe("DUPLICATE_SHOP");

    const duplicatePhone = await createShopRoute(
      request("/api/admin/shops", adminToken, "POST", {
        ...shopInput(),
        name: `Different Shop ${suffix}`,
      }),
    );
    expect(duplicatePhone.status).toBe(409);
  });

  it("denies customer, owner, and delivery-person administration", async () => {
    for (const token of [customerToken, ownerToken, deliveryToken]) {
      expect(
        (await listShopsRoute(request("/api/admin/shops", token))).status,
      ).toBe(403);
      expect(
        (
          await createShopRoute(
            request("/api/admin/shops", token, "POST", shopInput()),
          )
        ).status,
      ).toBe(403);
    }
  });

  it("deactivates a shop, hides its catalog, and blocks checkout", async () => {
    categoryId = (
      await prisma.category.create({
        data: { shopId, nameEn: `Managed Category ${suffix}` },
      })
    ).id;
    productId = (
      await prisma.product.create({
        data: {
          shopId,
          categoryId,
          nameEn: `Managed Product ${suffix}`,
          price: "100.00",
          stockQuantity: 10,
        },
      })
    ).id;

    const response = await shopStatusRoute(
      request(`/api/admin/shops/${shopId}/status`, adminToken, "PATCH", {
        isActive: false,
      }),
      context(shopId),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({
      isActive: false,
      isOpen: false,
    });
    expect((await listStorefrontProducts()).map(({ id }) => id)).not.toContain(
      productId,
    );

    const checkout = await checkoutRoute(
      request("/api/checkout", managedCustomerToken, "POST", {
        deliveryAddressId: addressId,
        items: [{ productId, quantity: 1 }],
      }),
    );
    expect(checkout.status).toBe(409);
    expect((await checkout.json()).error.code).toBe("SHOP_INACTIVE");
    expect(
      await prisma.product.findUniqueOrThrow({ where: { id: productId } }),
    ).toMatchObject({ stockQuantity: 10 });

    const activate = await shopStatusRoute(
      request(`/api/admin/shops/${shopId}/status`, adminToken, "PATCH", {
        isActive: true,
      }),
      context(shopId),
    );
    expect(activate.status).toBe(200);
    expect((await activate.json()).data).toMatchObject({
      isActive: true,
      isOpen: false,
    });
  });
});
