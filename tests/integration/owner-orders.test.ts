// @vitest-environment node

import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { POST as loginRoute } from "@/app/api/auth/login/route";
import { GET as getOwnerOrderRoute } from "@/app/api/owner/orders/[orderId]/route";
import { PATCH as updateOwnerOrderStatusRoute } from "@/app/api/owner/orders/[orderId]/status/route";
import { GET as listOwnerOrdersRoute } from "@/app/api/owner/orders/route";
import { OrderStatus, PrismaClient, UserRole } from "@/generated/prisma/client";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { hashSessionToken } from "@/lib/auth/session-token";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

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

function context(orderId: string) {
  return { params: Promise.resolve({ orderId }) };
}

async function login(email: string): Promise<string> {
  const response = await loginRoute(
    request("/api/auth/login", "POST", undefined, {
      identifier: email,
      password: "ChangeMe123!",
    }),
  );
  expect(response.status).toBe(200);
  return response.cookies.get(SESSION_COOKIE_NAME)?.value ?? "";
}

describeWithDatabase("owner order management API", () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString:
        databaseUrl ?? "postgresql://unused:unused@127.0.0.1:1/unused",
    }),
  });
  const suffix = randomUUID();
  const orderIds: string[] = [];
  const tokens: string[] = [];
  let ownerToken: string;
  let customerToken: string;
  let customerId: string;
  let addressId: string;
  let shopId: string;
  let otherOwnerId: string;
  let otherShopId: string;
  let workflowOrderId: string;
  let rejectedOrderId: string;
  let confirmedOrderId: string;
  let otherShopOrderId: string;
  let orderDate: string;

  beforeAll(async () => {
    ownerToken = await login("owner@agstores.local");
    customerToken = await login("customer@agstores.local");
    tokens.push(ownerToken, customerToken);

    const owner = await prisma.user.findUniqueOrThrow({
      where: { email: "owner@agstores.local" },
    });
    const customer = await prisma.user.findUniqueOrThrow({
      where: { email: "customer@agstores.local" },
    });
    customerId = customer.id;
    shopId = (
      await prisma.shop.findFirstOrThrow({ where: { ownerId: owner.id } })
    ).id;
    addressId = (
      await prisma.customerAddress.create({
        data: {
          customerId,
          label: `Owner orders ${suffix}`,
          address: "25 Integration Test Road",
          latitude: "6.927079",
          longitude: "79.861244",
        },
      })
    ).id;

    const otherOwner = await prisma.user.create({
      data: {
        name: "Other Order Owner",
        email: `other-order-owner-${suffix}@example.test`,
        passwordHash: "integration-test-only",
        role: UserRole.SHOP_OWNER,
      },
    });
    otherOwnerId = otherOwner.id;
    otherShopId = (
      await prisma.shop.create({
        data: {
          ownerId: otherOwner.id,
          name: `Other Order Shop ${suffix}`,
          address: "1 Other Shop Road",
          latitude: "6.900000",
          longitude: "79.800000",
          phone: `+94${Date.now().toString().slice(-9)}`,
        },
      })
    ).id;

    const baseOrder = {
      customerId,
      deliveryAddressId: addressId,
      subtotal: "100.00",
      deliveryFee: "25.00",
      total: "125.00",
    };
    const [workflowOrder, rejectedOrder, confirmedOrder, otherShopOrder] =
      await Promise.all([
        prisma.order.create({ data: { ...baseOrder, shopId } }),
        prisma.order.create({ data: { ...baseOrder, shopId } }),
        prisma.order.create({
          data: { ...baseOrder, shopId, status: OrderStatus.CONFIRMED },
        }),
        prisma.order.create({ data: { ...baseOrder, shopId: otherShopId } }),
      ]);
    workflowOrderId = workflowOrder.id;
    rejectedOrderId = rejectedOrder.id;
    confirmedOrderId = confirmedOrder.id;
    otherShopOrderId = otherShopOrder.id;
    orderDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Colombo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(workflowOrder.createdAt);
    orderIds.push(
      workflowOrderId,
      rejectedOrderId,
      confirmedOrderId,
      otherShopOrderId,
    );
  });

  afterAll(async () => {
    await prisma.orderStatusHistory.deleteMany({
      where: { orderId: { in: orderIds } },
    });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    if (addressId) {
      await prisma.customerAddress.deleteMany({ where: { id: addressId } });
    }
    if (otherShopId) {
      await prisma.shop.deleteMany({ where: { id: otherShopId } });
    }
    if (otherOwnerId) {
      await prisma.user.deleteMany({ where: { id: otherOwnerId } });
    }
    await prisma.authSession.deleteMany({
      where: {
        tokenHash: { in: tokens.filter(Boolean).map(hashSessionToken) },
      },
    });
    await prisma.$disconnect();
  });

  it("lists only owned orders and applies status, date, customer, and order-number filters", async () => {
    const filterPaths = [
      `/api/owner/orders?status=${OrderStatus.CONFIRMED}`,
      `/api/owner/orders?date=${orderDate}`,
      `/api/owner/orders?customer=${encodeURIComponent("Sample Customer")}`,
      `/api/owner/orders?orderNumber=${workflowOrderId}`,
    ];

    const responses = await Promise.all(
      filterPaths.map((path) =>
        listOwnerOrdersRoute(request(path, "GET", ownerToken)),
      ),
    );
    const payloads = await Promise.all(
      responses.map((response) => response.json()),
    );

    expect(responses.every((response) => response.status === 200)).toBe(true);
    expect(payloads[0].data.orders).toContainEqual(
      expect.objectContaining({ id: confirmedOrderId }),
    );
    expect(payloads[0].data.orders).not.toContainEqual(
      expect.objectContaining({ id: workflowOrderId }),
    );
    expect(payloads[1].data.orders).toContainEqual(
      expect.objectContaining({ id: workflowOrderId }),
    );
    expect(payloads[2].data.orders).not.toContainEqual(
      expect.objectContaining({ id: otherShopOrderId }),
    );
    expect(payloads[3].data.orders).toEqual([
      expect.objectContaining({ id: workflowOrderId }),
    ]);
  });

  it("returns owned order details but conceals another shop's order", async () => {
    const owned = await getOwnerOrderRoute(
      request(`/api/owner/orders/${workflowOrderId}`, "GET", ownerToken),
      context(workflowOrderId),
    );
    const other = await getOwnerOrderRoute(
      request(`/api/owner/orders/${otherShopOrderId}`, "GET", ownerToken),
      context(otherShopOrderId),
    );

    expect(owned.status).toBe(200);
    expect((await owned.json()).data).toMatchObject({
      id: workflowOrderId,
      status: OrderStatus.PLACED,
    });
    expect(other.status).toBe(404);
  });

  it("allows the owner to confirm and move an order through shop preparation", async () => {
    for (const status of [
      OrderStatus.CONFIRMED,
      OrderStatus.PREPARING,
      OrderStatus.READY_FOR_DELIVERY,
    ]) {
      const response = await updateOwnerOrderStatusRoute(
        request(
          `/api/owner/orders/${workflowOrderId}/status`,
          "PATCH",
          ownerToken,
          { status },
        ),
        context(workflowOrderId),
      );
      expect(response.status).toBe(200);
      expect((await response.json()).data.status).toBe(status);
    }
  });

  it("allows the owner to reject a newly placed order", async () => {
    const response = await updateOwnerOrderStatusRoute(
      request(
        `/api/owner/orders/${rejectedOrderId}/status`,
        "PATCH",
        ownerToken,
        { status: OrderStatus.REJECTED },
      ),
      context(rejectedOrderId),
    );

    expect(response.status).toBe(200);
    expect((await response.json()).data.status).toBe(OrderStatus.REJECTED);
  });

  it("blocks invalid transitions and changes to another shop's order", async () => {
    const invalid = await updateOwnerOrderStatusRoute(
      request(
        `/api/owner/orders/${workflowOrderId}/status`,
        "PATCH",
        ownerToken,
        { status: OrderStatus.CONFIRMED },
      ),
      context(workflowOrderId),
    );
    const anotherShop = await updateOwnerOrderStatusRoute(
      request(
        `/api/owner/orders/${otherShopOrderId}/status`,
        "PATCH",
        ownerToken,
        { status: OrderStatus.CONFIRMED },
      ),
      context(otherShopOrderId),
    );

    expect(invalid.status).toBe(409);
    expect(anotherShop.status).toBe(403);
  });

  it("rejects customers from every owner order endpoint", async () => {
    const list = await listOwnerOrdersRoute(
      request("/api/owner/orders", "GET", customerToken),
    );
    const detail = await getOwnerOrderRoute(
      request(`/api/owner/orders/${workflowOrderId}`, "GET", customerToken),
      context(workflowOrderId),
    );
    const update = await updateOwnerOrderStatusRoute(
      request(
        `/api/owner/orders/${workflowOrderId}/status`,
        "PATCH",
        customerToken,
        { status: OrderStatus.DELIVERED },
      ),
      context(workflowOrderId),
    );

    expect(list.status).toBe(403);
    expect(detail.status).toBe(403);
    expect(update.status).toBe(403);
  });
});
