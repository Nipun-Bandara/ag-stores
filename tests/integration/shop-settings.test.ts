// @vitest-environment node

import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { POST as loginRoute } from "@/app/api/auth/login/route";
import { POST as checkoutRoute } from "@/app/api/checkout/route";
import {
  GET as getSettingsRoute,
  PATCH as updateSettingsRoute,
} from "@/app/api/owner/shop-settings/route";
import {
  PreferredLanguage,
  PrismaClient,
  UserRole,
  UserStatus,
} from "@/generated/prisma/client";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { hashPassword } from "@/lib/auth/password";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

function apiRequest(
  url: string,
  token: string,
  method = "GET",
  body?: unknown,
) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: {
      Cookie: `${SESSION_COOKIE_NAME}=${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

describeWithDatabase("shop settings and checkout rules", () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString:
        databaseUrl ?? "postgresql://unused:unused@127.0.0.1:1/unused",
    }),
  });
  const suffix = randomUUID();
  const password = "SecurePassword123!";
  let ownerId: string;
  let customerId: string;
  let ownerToken: string;
  let customerToken: string;
  let shopId: string;
  let categoryId: string;
  let productId: string;
  let addressId: string;

  async function login(email: string) {
    const response = await loginRoute(
      new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: email, password }),
      }),
    );
    return response.cookies.get(SESSION_COOKIE_NAME)?.value ?? "";
  }

  beforeAll(async () => {
    const passwordHash = await hashPassword(password);
    const phoneDigits = suffix.replace(/\D/g, "").padEnd(8, "7").slice(0, 8);
    const [owner, customer] = await Promise.all([
      prisma.user.create({
        data: {
          name: "Settings Owner",
          email: `settings-owner-${suffix}@example.test`,
          phone: `+9471${phoneDigits}`,
          passwordHash,
          role: UserRole.SHOP_OWNER,
          preferredLanguage: PreferredLanguage.EN,
          status: UserStatus.ACTIVE,
        },
      }),
      prisma.user.create({
        data: {
          name: "Settings Customer",
          email: `settings-customer-${suffix}@example.test`,
          passwordHash,
          role: UserRole.CUSTOMER,
          preferredLanguage: PreferredLanguage.EN,
          status: UserStatus.ACTIVE,
        },
      }),
    ]);
    ownerId = owner.id;
    customerId = customer.id;
    ownerToken = await login(owner.email ?? "");
    customerToken = await login(customer.email ?? "");

    const shop = await prisma.shop.create({
      data: {
        ownerId,
        name: `Settings Shop ${suffix}`,
        address: "10 Test Road, Colombo",
        phone: "+94112345679",
        latitude: "6.927079",
        longitude: "79.861244",
        isOpen: true,
        minimumOrderAmount: "0.00",
        deliveryFee: "250.00",
        maximumDeliveryRadiusKm: "50.00",
      },
    });
    shopId = shop.id;
    categoryId = (
      await prisma.category.create({
        data: { shopId, nameEn: `Settings Category ${suffix}` },
      })
    ).id;
    productId = (
      await prisma.product.create({
        data: {
          shopId,
          categoryId,
          nameEn: `Settings Product ${suffix}`,
          price: "100.00",
          stockQuantity: 20,
        },
      })
    ).id;
    addressId = (
      await prisma.customerAddress.create({
        data: {
          customerId,
          label: "Home",
          address: "12 Test Road, Colombo",
          latitude: "6.927500",
          longitude: "79.862000",
          isDefault: true,
        },
      })
    ).id;
  });

  beforeEach(async () => {
    await prisma.shop.update({
      where: { id: shopId },
      data: {
        isOpen: true,
        minimumOrderAmount: "0.00",
        deliveryFee: "250.00",
        maximumDeliveryRadiusKm: "50.00",
      },
    });
    await prisma.product.update({
      where: { id: productId },
      data: { stockQuantity: 20, price: "100.00", isAvailable: true },
    });
  });

  afterEach(async () => {
    await prisma.orderItem.deleteMany({ where: { order: { customerId } } });
    await prisma.order.deleteMany({ where: { customerId } });
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
    const userIds = [ownerId, customerId].filter(Boolean);
    if (userIds.length) {
      await prisma.authSession.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await prisma.$disconnect();
  });

  const updateBody = () => ({
    shopId,
    name: `Updated Settings Shop ${suffix}`,
    address: "25 Updated Road, Colombo",
    phone: "+94112345680",
    latitude: "6.930000",
    longitude: "79.870000",
    isOpen: false,
    minimumOrderAmount: "500.00",
    deliveryFee: "75.50",
    maximumDeliveryRadiusKm: "12.25",
  });

  const checkoutBody = () => ({
    deliveryAddressId: addressId,
    items: [{ productId, quantity: 1 }],
  });

  it("lets an owner view and update all settings for their shop", async () => {
    const response = await updateSettingsRoute(
      apiRequest("/api/owner/shop-settings", ownerToken, "PATCH", updateBody()),
    );
    const payload = await response.json();
    const saved = await prisma.shop.findUniqueOrThrow({
      where: { id: shopId },
    });

    expect(response.status).toBe(200);
    expect(payload.data).toMatchObject({
      id: shopId,
      isOpen: false,
      minimumOrderAmount: "500.00",
      deliveryFee: "75.50",
      maximumDeliveryRadiusKm: "12.25",
    });
    expect(saved.name).toBe(updateBody().name);

    const getResponse = await getSettingsRoute(
      apiRequest("/api/owner/shop-settings", ownerToken),
    );
    expect(getResponse.status).toBe(200);
  });

  it("denies a non-owner", async () => {
    const response = await updateSettingsRoute(
      apiRequest(
        "/api/owner/shop-settings",
        customerToken,
        "PATCH",
        updateBody(),
      ),
    );
    expect(response.status).toBe(403);
  });

  it("blocks checkout while the shop is closed and rolls back stock", async () => {
    await prisma.shop.update({
      where: { id: shopId },
      data: { isOpen: false },
    });
    const response = await checkoutRoute(
      apiRequest("/api/checkout", customerToken, "POST", checkoutBody()),
    );
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("SHOP_CLOSED");
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: productId } }))
        .stockQuantity,
    ).toBe(20);
  });

  it("enforces the minimum order amount", async () => {
    await prisma.shop.update({
      where: { id: shopId },
      data: { minimumOrderAmount: "100.01" },
    });
    const response = await checkoutRoute(
      apiRequest("/api/checkout", customerToken, "POST", checkoutBody()),
    );
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("MINIMUM_ORDER_NOT_MET");
  });

  it("enforces the maximum approximate delivery radius", async () => {
    await prisma.shop.update({
      where: { id: shopId },
      data: { maximumDeliveryRadiusKm: "0.01" },
    });
    const response = await checkoutRoute(
      apiRequest("/api/checkout", customerToken, "POST", checkoutBody()),
    );
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("OUTSIDE_DELIVERY_RADIUS");
  });

  it("uses the configured delivery fee in the stored total", async () => {
    await prisma.shop.update({
      where: { id: shopId },
      data: { deliveryFee: "42.50" },
    });
    const response = await checkoutRoute(
      apiRequest("/api/checkout", customerToken, "POST", checkoutBody()),
    );
    const payload = await response.json();
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: payload.data.id },
    });
    expect(response.status).toBe(201);
    expect(payload.data).toMatchObject({
      subtotal: "100.00",
      deliveryFee: "42.50",
      total: "142.50",
    });
    expect(order.total.toFixed(2)).toBe("142.50");
  });
});
