// @vitest-environment node

import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { POST as cancelOrderRoute } from "@/app/api/account/orders/[orderId]/cancel/route";
import { POST as registerRoute } from "@/app/api/auth/register/route";
import { OrderStatus, PrismaClient } from "@/generated/prisma/client";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { hashSessionToken } from "@/lib/auth/session-token";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

function request(orderId: string, token: string, reason?: string) {
  return new NextRequest(
    `http://localhost/api/account/orders/${orderId}/cancel`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `${SESSION_COOKIE_NAME}=${token}`,
      },
      body: JSON.stringify({ reason }),
    },
  );
}

function context(orderId: string) {
  return { params: Promise.resolve({ orderId }) };
}

describeWithDatabase("customer order cancellation API", () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString:
        databaseUrl ?? "postgresql://unused:unused@127.0.0.1:1/unused",
    }),
  });
  const suffix = randomUUID();
  const userIds: string[] = [];
  const tokens: string[] = [];
  const addressIds: string[] = [];
  const orderIds: string[] = [];
  let customerToken = "";
  let otherCustomerToken = "";
  let productId = "";
  let originalStock = 0;
  let placedOrderId = "";
  let confirmedOrderId = "";
  let preparingOrderId = "";
  let deliveredOrderId = "";
  let otherCustomerOrderId = "";

  async function register(email: string, name: string) {
    const response = await registerRoute(
      new NextRequest("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
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
      `cancel-customer-${suffix}@example.test`,
      "Cancellation Customer",
    );
    const otherCustomer = await register(
      `cancel-other-${suffix}@example.test`,
      "Other Customer",
    );
    customerToken = customer.token;
    otherCustomerToken = otherCustomer.token;

    const shop = await prisma.shop.findFirstOrThrow();
    const product = await prisma.product.findFirstOrThrow({
      where: { shopId: shop.id },
    });
    productId = product.id;
    originalStock = product.stockQuantity;

    const [address, otherAddress] = await Promise.all([
      prisma.customerAddress.create({
        data: {
          customerId: customer.id,
          label: `Cancellation ${suffix}`,
          address: "10 Cancellation Lane",
          latitude: "6.927079",
          longitude: "79.861244",
        },
      }),
      prisma.customerAddress.create({
        data: {
          customerId: otherCustomer.id,
          label: `Private ${suffix}`,
          address: "20 Private Lane",
          latitude: "6.900000",
          longitude: "79.800000",
        },
      }),
    ]);
    addressIds.push(address.id, otherAddress.id);

    await prisma.product.update({
      where: { id: product.id },
      data: { stockQuantity: { decrement: 2 } },
    });

    const base = {
      shopId: shop.id,
      subtotal: "200.00",
      deliveryFee: "50.00",
      total: "250.00",
    };
    const [placed, confirmed, preparing, delivered, other] = await Promise.all([
      prisma.order.create({
        data: {
          ...base,
          customerId: customer.id,
          deliveryAddressId: address.id,
          status: OrderStatus.PLACED,
          items: {
            create: { productId: product.id, quantity: 2, unitPrice: "100" },
          },
        },
      }),
      prisma.order.create({
        data: {
          ...base,
          customerId: customer.id,
          deliveryAddressId: address.id,
          status: OrderStatus.CONFIRMED,
        },
      }),
      prisma.order.create({
        data: {
          ...base,
          customerId: customer.id,
          deliveryAddressId: address.id,
          status: OrderStatus.PREPARING,
        },
      }),
      prisma.order.create({
        data: {
          ...base,
          customerId: customer.id,
          deliveryAddressId: address.id,
          status: OrderStatus.DELIVERED,
        },
      }),
      prisma.order.create({
        data: {
          ...base,
          customerId: otherCustomer.id,
          deliveryAddressId: otherAddress.id,
          status: OrderStatus.PLACED,
        },
      }),
    ]);
    placedOrderId = placed.id;
    confirmedOrderId = confirmed.id;
    preparingOrderId = preparing.id;
    deliveredOrderId = delivered.id;
    otherCustomerOrderId = other.id;
    orderIds.push(
      placed.id,
      confirmed.id,
      preparing.id,
      delivered.id,
      other.id,
    );
  });

  afterAll(async () => {
    await prisma.orderStatusHistory.deleteMany({
      where: { orderId: { in: orderIds } },
    });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.customerAddress.deleteMany({
      where: { id: { in: addressIds } },
    });
    if (productId) {
      await prisma.product.update({
        where: { id: productId },
        data: { stockQuantity: originalStock },
      });
    }
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

  it("cancels a PLACED order and stores timestamp, reason, and history", async () => {
    const response = await cancelOrderRoute(
      request(placedOrderId, customerToken, "Ordered by mistake"),
      context(placedOrderId),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toMatchObject({
      orderId: placedOrderId,
      previousStatus: OrderStatus.PLACED,
      status: OrderStatus.CANCELLED,
      cancellationReason: "Ordered by mistake",
    });
    const stored = await prisma.order.findUniqueOrThrow({
      where: { id: placedOrderId },
      include: { statusHistory: true },
    });
    expect(stored.status).toBe(OrderStatus.CANCELLED);
    expect(stored.cancelledAt).toBeInstanceOf(Date);
    expect(stored.cancellationReason).toBe("Ordered by mistake");
    expect(stored.statusHistory).toContainEqual(
      expect.objectContaining({
        fromStatus: OrderStatus.PLACED,
        toStatus: OrderStatus.CANCELLED,
        changedById: userIds[0],
        note: "Ordered by mistake",
      }),
    );
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: productId } }))
        .stockQuantity,
    ).toBe(originalStock);

    const secondResponse = await cancelOrderRoute(
      request(placedOrderId, customerToken, "Second attempt"),
      context(placedOrderId),
    );
    expect(secondResponse.status).toBe(409);
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: productId } }))
        .stockQuantity,
    ).toBe(originalStock);
  });

  for (const [label, getOrderId] of [
    ["CONFIRMED", () => confirmedOrderId],
    ["PREPARING", () => preparingOrderId],
    ["DELIVERED", () => deliveredOrderId],
  ] as const) {
    it(`rejects customer cancellation for a ${label} order`, async () => {
      const orderId = getOrderId();
      const response = await cancelOrderRoute(
        request(orderId, customerToken),
        context(orderId),
      );
      expect(response.status).toBe(409);
      expect(
        await prisma.order.findUniqueOrThrow({ where: { id: orderId } }),
      ).toMatchObject({
        status: label,
        cancelledAt: null,
        cancellationReason: null,
      });
    });
  }

  it("prevents a customer from cancelling another customer's order", async () => {
    const response = await cancelOrderRoute(
      request(otherCustomerOrderId, customerToken),
      context(otherCustomerOrderId),
    );
    expect(response.status).toBe(403);
    expect(
      await prisma.order.findUniqueOrThrow({
        where: { id: otherCustomerOrderId },
      }),
    ).toMatchObject({ status: OrderStatus.PLACED, cancelledAt: null });

    const ownerResponse = await cancelOrderRoute(
      request(otherCustomerOrderId, otherCustomerToken),
      context(otherCustomerOrderId),
    );
    expect(ownerResponse.status).toBe(200);
  });
});
