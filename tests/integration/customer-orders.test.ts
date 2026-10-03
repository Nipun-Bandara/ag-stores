// @vitest-environment node

import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { GET as getCustomerOrderRoute } from "@/app/api/account/orders/[orderId]/route";
import { GET as listCustomerOrdersRoute } from "@/app/api/account/orders/route";
import { POST as loginRoute } from "@/app/api/auth/login/route";
import { POST as registerRoute } from "@/app/api/auth/register/route";
import { OrderStatus, PrismaClient } from "@/generated/prisma/client";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { hashSessionToken } from "@/lib/auth/session-token";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

function request(path: string, token?: string) {
  return new NextRequest(`http://localhost${path}`, {
    headers: token ? { Cookie: `${SESSION_COOKIE_NAME}=${token}` } : {},
  });
}

function context(orderId: string) {
  return { params: Promise.resolve({ orderId }) };
}

describeWithDatabase("customer order history and tracking API", () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString:
        databaseUrl ?? "postgresql://unused:unused@127.0.0.1:1/unused",
    }),
  });
  const suffix = randomUUID();
  const userIds: string[] = [];
  const addressIds: string[] = [];
  const orderIds: string[] = [];
  const tokens: string[] = [];
  let customerToken: string;
  let otherCustomerToken: string;
  let ownerToken: string;
  let activeOrderId: string;
  let pastOrderId: string;
  let otherOrderId: string;

  async function register(email: string, name: string) {
    const response = await registerRoute(
      new NextRequest("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone: "",
          password: "SecurePassword123!",
          preferredLanguage: "EN",
        }),
      }),
    );
    const payload = await response.json();
    const token = response.cookies.get(SESSION_COOKIE_NAME)?.value ?? "";
    userIds.push(payload.data.id);
    tokens.push(token);
    return { id: payload.data.id as string, token };
  }

  beforeAll(async () => {
    const customer = await register(
      `customer-orders-${suffix}@example.test`,
      "Order Tracking Customer",
    );
    const otherCustomer = await register(
      `customer-orders-other-${suffix}@example.test`,
      "Other Order Customer",
    );
    customerToken = customer.token;
    otherCustomerToken = otherCustomer.token;

    const ownerLogin = await loginRoute(
      new NextRequest("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: "owner@agstores.local",
          password: "ChangeMe123!",
        }),
      }),
    );
    ownerToken = ownerLogin.cookies.get(SESSION_COOKIE_NAME)?.value ?? "";
    tokens.push(ownerToken);

    const owner = await prisma.user.findUniqueOrThrow({
      where: { email: "owner@agstores.local" },
    });
    const shop = await prisma.shop.findFirstOrThrow({
      where: { ownerId: owner.id },
    });
    const product = await prisma.product.findFirstOrThrow({
      where: { shopId: shop.id },
    });
    const [address, otherAddress] = await Promise.all([
      prisma.customerAddress.create({
        data: {
          customerId: customer.id,
          label: "Tracking Home",
          address: "18 Tracking Avenue",
          latitude: "6.927079",
          longitude: "79.861244",
        },
      }),
      prisma.customerAddress.create({
        data: {
          customerId: otherCustomer.id,
          label: "Other Home",
          address: "99 Private Road",
          latitude: "6.900000",
          longitude: "79.800000",
        },
      }),
    ]);
    addressIds.push(address.id, otherAddress.id);

    const orderData = {
      shopId: shop.id,
      subtotal: "246.90",
      deliveryFee: "25.00",
      total: "271.90",
      customerNote: "Ring the bell",
    };
    const [activeOrder, pastOrder, otherOrder] = await Promise.all([
      prisma.order.create({
        data: {
          ...orderData,
          customerId: customer.id,
          deliveryAddressId: address.id,
          status: OrderStatus.PREPARING,
          items: {
            create: {
              productId: product.id,
              quantity: 2,
              unitPrice: "123.45",
            },
          },
        },
      }),
      prisma.order.create({
        data: {
          ...orderData,
          customerId: customer.id,
          deliveryAddressId: address.id,
          status: OrderStatus.DELIVERED,
          items: {
            create: {
              productId: product.id,
              quantity: 2,
              unitPrice: "123.45",
            },
          },
        },
      }),
      prisma.order.create({
        data: {
          ...orderData,
          customerId: otherCustomer.id,
          deliveryAddressId: otherAddress.id,
          status: OrderStatus.CONFIRMED,
        },
      }),
    ]);
    activeOrderId = activeOrder.id;
    pastOrderId = pastOrder.id;
    otherOrderId = otherOrder.id;
    orderIds.push(activeOrderId, pastOrderId, otherOrderId);

    await prisma.orderStatusHistory.createMany({
      data: [
        {
          orderId: activeOrderId,
          fromStatus: OrderStatus.PLACED,
          toStatus: OrderStatus.CONFIRMED,
          changedById: owner.id,
          createdAt: new Date(activeOrder.createdAt.getTime() + 1_000),
        },
        {
          orderId: activeOrderId,
          fromStatus: OrderStatus.CONFIRMED,
          toStatus: OrderStatus.PREPARING,
          changedById: owner.id,
          createdAt: new Date(activeOrder.createdAt.getTime() + 2_000),
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.orderStatusHistory.deleteMany({
      where: { orderId: { in: orderIds } },
    });
    await prisma.orderItem.deleteMany({
      where: { orderId: { in: orderIds } },
    });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.customerAddress.deleteMany({
      where: { id: { in: addressIds } },
    });
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

  it("separates active orders from past order history", async () => {
    const response = await listCustomerOrdersRoute(
      request("/api/account/orders", customerToken),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.activeOrders).toContainEqual(
      expect.objectContaining({
        id: activeOrderId,
        status: OrderStatus.PREPARING,
      }),
    );
    expect(payload.data.orderHistory).toContainEqual(
      expect.objectContaining({
        id: pastOrderId,
        status: OrderStatus.DELIVERED,
      }),
    );
    expect(payload.data.activeOrders).not.toContainEqual(
      expect.objectContaining({ id: otherOrderId }),
    );
  });

  it("returns accurate details, status, timestamps, and decimal-safe item totals", async () => {
    const response = await getCustomerOrderRoute(
      request(`/api/account/orders/${activeOrderId}`, customerToken),
      context(activeOrderId),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toMatchObject({
      id: activeOrderId,
      status: OrderStatus.PREPARING,
      subtotal: "246.90",
      deliveryFee: "25.00",
      total: "271.90",
      customerNote: "Ring the bell",
      deliveryAddress: {
        label: "Tracking Home",
        address: "18 Tracking Avenue",
      },
    });
    expect(payload.data.items).toEqual([
      expect.objectContaining({
        quantity: 2,
        unitPrice: "123.45",
        lineTotal: "246.90",
      }),
    ]);
    expect(
      payload.data.timeline.map(({ status }: { status: string }) => status),
    ).toEqual([
      OrderStatus.PLACED,
      OrderStatus.CONFIRMED,
      OrderStatus.PREPARING,
    ]);
    expect(Date.parse(payload.data.createdAt)).not.toBeNaN();
    expect(Date.parse(payload.data.updatedAt)).not.toBeNaN();
  });

  it("conceals another customer's order", async () => {
    const response = await getCustomerOrderRoute(
      request(`/api/account/orders/${otherOrderId}`, customerToken),
      context(otherOrderId),
    );
    const reverseResponse = await getCustomerOrderRoute(
      request(`/api/account/orders/${activeOrderId}`, otherCustomerToken),
      context(activeOrderId),
    );

    expect(response.status).toBe(404);
    expect(reverseResponse.status).toBe(404);
  });

  it("rejects non-customer roles from customer order endpoints", async () => {
    const response = await listCustomerOrdersRoute(
      request("/api/account/orders", ownerToken),
    );
    expect(response.status).toBe(403);
  });
});
