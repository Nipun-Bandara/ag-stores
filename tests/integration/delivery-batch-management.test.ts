// @vitest-environment node

import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { POST as loginRoute } from "@/app/api/auth/login/route";
import { GET as listBatchesRoute } from "@/app/api/delivery/batches/route";
import { GET as getBatchRoute } from "@/app/api/delivery/batches/[batchId]/route";
import { PATCH as finishOrderRoute } from "@/app/api/delivery/batches/[batchId]/orders/[orderId]/status/route";
import { PATCH as reorderBatchRoute } from "@/app/api/delivery/batches/[batchId]/sequence/route";
import { POST as startBatchRoute } from "@/app/api/delivery/batches/[batchId]/start/route";
import {
  DeliveryBatchStatus,
  OrderStatus,
  PrismaClient,
  UserRole,
} from "@/generated/prisma/client";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { hashPassword } from "@/lib/auth/password";

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

function batchContext(batchId: string) {
  return { params: Promise.resolve({ batchId }) };
}

function orderContext(batchId: string, orderId: string) {
  return { params: Promise.resolve({ batchId, orderId }) };
}

async function login(email: string, password: string) {
  const response = await loginRoute(
    request("/api/auth/login", "", "POST", {
      identifier: email,
      password,
    }),
  );
  return response.cookies.get(SESSION_COOKIE_NAME)?.value ?? "";
}

describeWithDatabase("delivery batch lifecycle API", () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString:
        databaseUrl ?? "postgresql://unused:unused@127.0.0.1:1/unused",
    }),
  });
  const suffix = randomUUID();
  const password = "BatchLifecycle123!";
  const userIds: string[] = [];
  const shopIds: string[] = [];
  const addressIds: string[] = [];
  const orderIds: string[] = [];
  const batchIds: string[] = [];
  let riderToken = "";
  let otherRiderToken = "";
  let batchId = "";
  let foreignBatchId = "";
  let firstOrderId = "";
  let secondOrderId = "";

  beforeAll(async () => {
    const passwordHash = await hashPassword(password);
    const digits = suffix.replace(/\D/g, "").padEnd(8, "6").slice(0, 8);
    const owner = await prisma.user.create({
      data: {
        name: "Lifecycle Owner",
        email: `lifecycle-owner-${suffix}@example.test`,
        phone: `+9460${digits}`,
        passwordHash,
        role: UserRole.SHOP_OWNER,
      },
    });
    userIds.push(owner.id);
    const shop = await prisma.shop.create({
      data: {
        ownerId: owner.id,
        name: `Lifecycle Shop ${suffix}`,
        address: "1 Lifecycle Road",
        latitude: "6.927079",
        longitude: "79.861244",
        phone: `+9410${digits}`,
      },
    });
    shopIds.push(shop.id);
    const [rider, otherRider, customer] = await Promise.all([
      prisma.user.create({
        data: {
          assignedShopId: shop.id,
          name: "Lifecycle Rider",
          email: `lifecycle-rider-${suffix}@example.test`,
          phone: `+9461${digits}`,
          passwordHash,
          role: UserRole.DELIVERY_PERSON,
        },
      }),
      prisma.user.create({
        data: {
          assignedShopId: shop.id,
          name: "Other Lifecycle Rider",
          email: `lifecycle-other-rider-${suffix}@example.test`,
          phone: `+9462${digits}`,
          passwordHash,
          role: UserRole.DELIVERY_PERSON,
        },
      }),
      prisma.user.create({
        data: {
          name: "Lifecycle Customer",
          email: `lifecycle-customer-${suffix}@example.test`,
          phone: `+9463${digits}`,
          passwordHash,
          role: UserRole.CUSTOMER,
        },
      }),
    ]);
    userIds.push(rider.id, otherRider.id, customer.id);
    const address = await prisma.customerAddress.create({
      data: {
        customerId: customer.id,
        label: "Delivery home",
        address: "25 Lifecycle Avenue, Colombo",
        latitude: "6.910000",
        longitude: "79.850000",
      },
    });
    addressIds.push(address.id);
    const orderData = {
      customerId: customer.id,
      shopId: shop.id,
      deliveryAddressId: address.id,
      status: OrderStatus.ASSIGNED,
      subtotal: "100.00",
      deliveryFee: "25.00",
      total: "125.00",
    };
    const [firstOrder, secondOrder, foreignOrder] = await Promise.all([
      prisma.order.create({ data: orderData }),
      prisma.order.create({ data: orderData }),
      prisma.order.create({ data: orderData }),
    ]);
    firstOrderId = firstOrder.id;
    secondOrderId = secondOrder.id;
    orderIds.push(firstOrder.id, secondOrder.id, foreignOrder.id);
    const [batch, foreignBatch] = await Promise.all([
      prisma.deliveryBatch.create({
        data: {
          deliveryPersonId: rider.id,
          orders: {
            create: [
              { orderId: firstOrder.id, sequence: 1 },
              { orderId: secondOrder.id, sequence: 2 },
            ],
          },
        },
      }),
      prisma.deliveryBatch.create({
        data: {
          deliveryPersonId: otherRider.id,
          orders: { create: { orderId: foreignOrder.id, sequence: 1 } },
        },
      }),
    ]);
    batchId = batch.id;
    foreignBatchId = foreignBatch.id;
    batchIds.push(batch.id, foreignBatch.id);
    [riderToken, otherRiderToken] = await Promise.all([
      login(rider.email!, password),
      login(otherRider.email!, password),
    ]);
  });

  afterAll(async () => {
    await prisma.orderStatusHistory.deleteMany({
      where: { orderId: { in: orderIds } },
    });
    await prisma.deliveryBatchOrder.deleteMany({
      where: { orderId: { in: orderIds } },
    });
    await prisma.deliveryBatch.deleteMany({ where: { id: { in: batchIds } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.customerAddress.deleteMany({
      where: { id: { in: addressIds } },
    });
    await prisma.authSession.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.user.deleteMany({ where: { id: { in: userIds.slice(1) } } });
    await prisma.shop.deleteMany({ where: { id: { in: shopIds } } });
    const ownerId = userIds[0];
    if (ownerId) await prisma.user.deleteMany({ where: { id: ownerId } });
    await prisma.$disconnect();
  });

  it("lists and returns the rider's active batch with delivery locations", async () => {
    const listResponse = await listBatchesRoute(
      request("/api/delivery/batches", riderToken),
    );
    expect(listResponse.status).toBe(200);
    await expect(listResponse.json()).resolves.toMatchObject({
      data: expect.arrayContaining([
        expect.objectContaining({
          id: batchId,
          status: DeliveryBatchStatus.PENDING,
          orderCount: 2,
        }),
      ]),
    });

    const detailResponse = await getBatchRoute(
      request(`/api/delivery/batches/${batchId}`, riderToken),
      batchContext(batchId),
    );
    expect(detailResponse.status).toBe(200);
    await expect(detailResponse.json()).resolves.toMatchObject({
      data: {
        id: batchId,
        shopLocation: {
          id: expect.any(String),
          name: expect.stringContaining("Lifecycle Shop"),
          latitude: "6.927079",
          longitude: "79.861244",
        },
        orders: [
          {
            id: firstOrderId,
            sequence: 1,
            deliveryLocation: {
              address: "25 Lifecycle Avenue, Colombo",
              latitude: "6.91",
              longitude: "79.85",
            },
          },
          { id: secondOrderId, sequence: 2 },
        ],
      },
    });
  });

  it("prevents another rider from accessing or starting the batch", async () => {
    const detail = await getBatchRoute(
      request(`/api/delivery/batches/${batchId}`, otherRiderToken),
      batchContext(batchId),
    );
    const start = await startBatchRoute(
      request(
        `/api/delivery/batches/${batchId}/start`,
        otherRiderToken,
        "POST",
      ),
      batchContext(batchId),
    );
    expect(detail.status).toBe(404);
    expect(start.status).toBe(404);
    await expect(
      prisma.deliveryBatch.findUniqueOrThrow({ where: { id: batchId } }),
    ).resolves.toMatchObject({ status: DeliveryBatchStatus.PENDING });
  });

  it("changes the delivery sequence before starting", async () => {
    const response = await reorderBatchRoute(
      request(
        `/api/delivery/batches/${batchId}/sequence`,
        riderToken,
        "PATCH",
        { orderIds: [secondOrderId, firstOrderId] },
      ),
      batchContext(batchId),
    );
    expect(response.status).toBe(200);
    const assignments = await prisma.deliveryBatchOrder.findMany({
      where: { batchId },
      orderBy: { sequence: "asc" },
    });
    expect(assignments).toMatchObject([
      { orderId: secondOrderId, sequence: 1 },
      { orderId: firstOrderId, sequence: 2 },
    ]);
  });

  it("starts the batch and moves every assigned order out for delivery", async () => {
    const response = await startBatchRoute(
      request(`/api/delivery/batches/${batchId}/start`, riderToken, "POST"),
      batchContext(batchId),
    );
    expect(response.status).toBe(200);
    const batch = await prisma.deliveryBatch.findUniqueOrThrow({
      where: { id: batchId },
    });
    expect(batch).toMatchObject({
      status: DeliveryBatchStatus.IN_PROGRESS,
      startedAt: expect.any(Date),
    });
    const orders = await prisma.order.findMany({
      where: { id: { in: [firstOrderId, secondOrderId] } },
      include: { statusHistory: true },
    });
    expect(
      orders.every(({ status }) => status === OrderStatus.OUT_FOR_DELIVERY),
    ).toBe(true);
    expect(
      orders.every(({ statusHistory }) =>
        statusHistory.some(
          ({ fromStatus, toStatus }) =>
            fromStatus === OrderStatus.ASSIGNED &&
            toStatus === OrderStatus.OUT_FOR_DELIVERY,
        ),
      ),
    ).toBe(true);
  });

  it("does not allow sequence changes after starting", async () => {
    const response = await reorderBatchRoute(
      request(
        `/api/delivery/batches/${batchId}/sequence`,
        riderToken,
        "PATCH",
        { orderIds: [firstOrderId, secondOrderId] },
      ),
      batchContext(batchId),
    );
    expect(response.status).toBe(409);
  });

  it("completes one order without completing the batch", async () => {
    const response = await finishOrderRoute(
      request(
        `/api/delivery/batches/${batchId}/orders/${secondOrderId}/status`,
        riderToken,
        "PATCH",
        { status: OrderStatus.DELIVERED },
      ),
      orderContext(batchId, secondOrderId),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: { status: OrderStatus.DELIVERED, batchCompleted: false },
    });
    await expect(
      prisma.deliveryBatch.findUniqueOrThrow({ where: { id: batchId } }),
    ).resolves.toMatchObject({
      status: DeliveryBatchStatus.IN_PROGRESS,
      completedAt: null,
    });
  });

  it("supports failed delivery and completes only after every order finishes", async () => {
    const response = await finishOrderRoute(
      request(
        `/api/delivery/batches/${batchId}/orders/${firstOrderId}/status`,
        riderToken,
        "PATCH",
        { status: OrderStatus.FAILED_DELIVERY, note: "Recipient unavailable" },
      ),
      orderContext(batchId, firstOrderId),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: {
        status: OrderStatus.FAILED_DELIVERY,
        batchCompleted: true,
        batchStatus: DeliveryBatchStatus.COMPLETED,
      },
    });
    const batch = await prisma.deliveryBatch.findUniqueOrThrow({
      where: { id: batchId },
    });
    expect(batch).toMatchObject({
      status: DeliveryBatchStatus.COMPLETED,
      completedAt: expect.any(Date),
    });
    await expect(
      prisma.orderStatusHistory.findFirstOrThrow({
        where: {
          orderId: firstOrderId,
          toStatus: OrderStatus.FAILED_DELIVERY,
        },
      }),
    ).resolves.toMatchObject({ note: "Recipient unavailable" });
  });

  it("keeps the other rider's batch active", async () => {
    await expect(
      prisma.deliveryBatch.findUniqueOrThrow({ where: { id: foreignBatchId } }),
    ).resolves.toMatchObject({ status: DeliveryBatchStatus.PENDING });
  });
});
