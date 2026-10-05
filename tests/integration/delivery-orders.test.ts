// @vitest-environment node

import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { GET as availableOrdersRoute } from "@/app/api/delivery/orders/route";
import { POST as loginRoute } from "@/app/api/auth/login/route";
import { OrderStatus, PrismaClient, UserRole } from "@/generated/prisma/client";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { hashSessionToken } from "@/lib/auth/session-token";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

function request(path: string, token: string) {
  return new NextRequest(`http://localhost${path}`, {
    headers: { Cookie: `${SESSION_COOKIE_NAME}=${token}` },
  });
}

async function login(email: string) {
  const response = await loginRoute(
    new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: email,
        password: "ChangeMe123!",
      }),
    }),
  );
  return response.cookies.get(SESSION_COOKIE_NAME)?.value ?? "";
}

describeWithDatabase("available delivery orders API", () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString:
        databaseUrl ?? "postgresql://unused:unused@127.0.0.1:1/unused",
    }),
  });
  const suffix = randomUUID();
  const tokens: string[] = [];
  const orderIds: string[] = [];
  const addressIds: string[] = [];
  let deliveryToken = "";
  let customerToken = "";
  let ownerToken = "";
  let adminToken = "";
  let customerId = "";
  let otherOwnerId = "";
  let otherShopId = "";
  let batchId = "";
  let nearOrderId = "";
  let farOrderId = "";
  let preparingOrderId = "";
  let assignedOrderId = "";
  let otherShopOrderId = "";

  beforeAll(async () => {
    [deliveryToken, customerToken, ownerToken, adminToken] = await Promise.all([
      login("delivery@agstores.local"),
      login("customer@agstores.local"),
      login("owner@agstores.local"),
      login("admin@agstores.local"),
    ]);
    tokens.push(deliveryToken, customerToken, ownerToken, adminToken);

    const deliveryPerson = await prisma.user.findUniqueOrThrow({
      where: { email: "delivery@agstores.local" },
    });
    const shop = await prisma.shop.findUniqueOrThrow({
      where: { id: deliveryPerson.assignedShopId ?? "" },
    });
    const products = await prisma.product.findMany({
      where: { shopId: shop.id },
      orderBy: { id: "asc" },
      take: 2,
    });
    expect(products).toHaveLength(2);

    const digits = suffix.replace(/\D/g, "").padEnd(8, "1").slice(0, 8);
    const customer = await prisma.user.create({
      data: {
        name: `Sensitive Customer ${suffix}`,
        email: `sensitive-${suffix}@example.test`,
        phone: `+9478${digits}`,
        passwordHash: "test-only-not-used",
        role: UserRole.CUSTOMER,
      },
    });
    customerId = customer.id;
    const otherOwner = await prisma.user.create({
      data: {
        name: "Other Available Orders Owner",
        email: `other-orders-owner-${suffix}@example.test`,
        phone: `+9479${digits}`,
        passwordHash: "test-only-not-used",
        role: UserRole.SHOP_OWNER,
      },
    });
    otherOwnerId = otherOwner.id;
    const otherShop = await prisma.shop.create({
      data: {
        ownerId: otherOwner.id,
        name: `Other Orders Shop ${suffix}`,
        address: "1 Other Shop Road",
        latitude: "7.200000",
        longitude: "80.200000",
        phone: `+9412${digits}`,
      },
    });
    otherShopId = otherShop.id;

    const [nearAddress, farAddress] = await Promise.all([
      prisma.customerAddress.create({
        data: {
          customerId: customer.id,
          label: "Secret Home",
          address: "42 Secret Lane, Colombo 05, Colombo",
          latitude: "6.910000",
          longitude: "79.855000",
        },
      }),
      prisma.customerAddress.create({
        data: {
          customerId: customer.id,
          label: "Private Office",
          address: "99 Hidden Avenue, Kaduwela, Colombo",
          latitude: "7.000000",
          longitude: "80.000000",
        },
      }),
    ]);
    addressIds.push(nearAddress.id, farAddress.id);

    const base = {
      customerId: customer.id,
      subtotal: "200.00",
      deliveryFee: "50.00",
      total: "250.00",
      customerNote: "Customer gate code 9876",
    };
    const [near, far, preparing, assigned, other] = await Promise.all([
      prisma.order.create({
        data: {
          ...base,
          shopId: shop.id,
          deliveryAddressId: nearAddress.id,
          status: OrderStatus.READY_FOR_DELIVERY,
          createdAt: new Date("2026-09-01T08:00:00.000Z"),
          items: {
            create: [
              { productId: products[0]!.id, quantity: 1, unitPrice: "100" },
              { productId: products[1]!.id, quantity: 1, unitPrice: "100" },
            ],
          },
        },
      }),
      prisma.order.create({
        data: {
          ...base,
          shopId: shop.id,
          deliveryAddressId: farAddress.id,
          status: OrderStatus.READY_FOR_DELIVERY,
          createdAt: new Date("2026-10-03T08:00:00.000Z"),
          items: {
            create: {
              productId: products[0]!.id,
              quantity: 2,
              unitPrice: "100",
            },
          },
        },
      }),
      prisma.order.create({
        data: {
          ...base,
          shopId: shop.id,
          deliveryAddressId: nearAddress.id,
          status: OrderStatus.PREPARING,
        },
      }),
      prisma.order.create({
        data: {
          ...base,
          shopId: shop.id,
          deliveryAddressId: nearAddress.id,
          status: OrderStatus.READY_FOR_DELIVERY,
        },
      }),
      prisma.order.create({
        data: {
          ...base,
          shopId: otherShop.id,
          deliveryAddressId: nearAddress.id,
          status: OrderStatus.READY_FOR_DELIVERY,
        },
      }),
    ]);
    nearOrderId = near.id;
    farOrderId = far.id;
    preparingOrderId = preparing.id;
    assignedOrderId = assigned.id;
    otherShopOrderId = other.id;
    orderIds.push(near.id, far.id, preparing.id, assigned.id, other.id);

    const batch = await prisma.deliveryBatch.create({
      data: { deliveryPersonId: deliveryPerson.id },
    });
    batchId = batch.id;
    await prisma.deliveryBatchOrder.create({
      data: { batchId: batch.id, orderId: assigned.id, sequence: 1 },
    });
  });

  afterAll(async () => {
    if (batchId) {
      await prisma.deliveryBatchOrder.deleteMany({ where: { batchId } });
      await prisma.deliveryBatch.deleteMany({ where: { id: batchId } });
    }
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.customerAddress.deleteMany({
      where: { id: { in: addressIds } },
    });
    if (customerId) await prisma.user.deleteMany({ where: { id: customerId } });
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

  it("returns only unassigned ready orders from the assigned shop", async () => {
    const response = await availableOrdersRoute(
      request("/api/delivery/orders", deliveryToken),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    const visibleIds = payload.data.orders.map(
      (order: { id: string }) => order.id,
    );
    expect(visibleIds).toEqual(
      expect.arrayContaining([farOrderId, nearOrderId]),
    );
    expect(visibleIds.indexOf(farOrderId)).toBeLessThan(
      visibleIds.indexOf(nearOrderId),
    );
    expect(payload.data.orders).not.toContainEqual(
      expect.objectContaining({ id: preparingOrderId }),
    );
    expect(payload.data.orders).not.toContainEqual(
      expect.objectContaining({ id: assignedOrderId }),
    );
    expect(payload.data.orders).not.toContainEqual(
      expect.objectContaining({ id: otherShopOrderId }),
    );
    expect(
      payload.data.orders.find(
        (order: { id: string }) => order.id === nearOrderId,
      ),
    ).toMatchObject({
      deliveryArea: "Colombo 05, Colombo",
      itemCount: 2,
      total: "250.00",
    });
  });

  it("sorts and filters by distance and creation time", async () => {
    const distanceResponse = await availableOrdersRoute(
      request(
        "/api/delivery/orders?sortBy=distance&direction=asc&maxDistanceKm=5",
        deliveryToken,
      ),
    );
    const distancePayload = await distanceResponse.json();
    const distanceIds = distancePayload.data.orders.map(
      (order: { id: string }) => order.id,
    );
    expect(distanceIds).toContain(nearOrderId);
    expect(distanceIds).not.toContain(farOrderId);
    expect(
      distancePayload.data.orders.every(
        (order: { distanceKm: number }) => order.distanceKm <= 5,
      ),
    ).toBe(true);

    const createdResponse = await availableOrdersRoute(
      request(
        "/api/delivery/orders?sortBy=createdAt&direction=asc&createdAfter=2026-10-01",
        deliveryToken,
      ),
    );
    const createdPayload = await createdResponse.json();
    const createdIds = createdPayload.data.orders.map(
      (order: { id: string }) => order.id,
    );
    expect(createdIds).toContain(farOrderId);
    expect(createdIds).not.toContain(nearOrderId);
    expect(
      createdPayload.data.orders.every(
        (order: { createdAt: string }) =>
          new Date(order.createdAt) >= new Date("2026-09-30T18:30:00.000Z"),
      ),
    ).toBe(true);
  });

  it("does not expose customer identity, exact address, coordinates, or notes", async () => {
    const response = await availableOrdersRoute(
      request("/api/delivery/orders", deliveryToken),
    );
    const payload = await response.json();
    const serialized = JSON.stringify(payload);

    expect(Object.keys(payload.data.orders[0]).sort()).toEqual(
      [
        "createdAt",
        "deliveryArea",
        "distanceKm",
        "id",
        "itemCount",
        "total",
      ].sort(),
    );
    for (const sensitive of [
      `Sensitive Customer ${suffix}`,
      `sensitive-${suffix}@example.test`,
      "42 Secret Lane",
      "99 Hidden Avenue",
      "Customer gate code 9876",
      '"latitude"',
      '"longitude"',
      '"customer"',
      '"deliveryAddress"',
    ]) {
      expect(serialized).not.toContain(sensitive);
    }
  });

  it("rejects customer, owner, and administrator roles", async () => {
    for (const token of [customerToken, ownerToken, adminToken]) {
      const response = await availableOrdersRoute(
        request("/api/delivery/orders", token),
      );
      expect(response.status).toBe(403);
    }
  });
});
