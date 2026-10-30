// @vitest-environment node

import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { POST as loginRoute } from "@/app/api/auth/login/route";
import { POST as createBatchRoute } from "@/app/api/delivery/batches/route";
import {
  DeliveryBatchStatus,
  OrderStatus,
  PrismaClient,
  UserRole,
} from "@/generated/prisma/client";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { hashPassword } from "@/lib/auth/password";
import { hashSessionToken } from "@/lib/auth/session-token";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

function batchRequest(token: string, orderIds: string[]) {
  return new NextRequest("http://localhost/api/delivery/batches", {
    method: "POST",
    headers: {
      Cookie: `${SESSION_COOKIE_NAME}=${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ orderIds }),
  });
}

async function login(email: string, password: string) {
  const response = await loginRoute(
    new NextRequest("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: email, password }),
    }),
  );
  return response.cookies.get(SESSION_COOKIE_NAME)?.value ?? "";
}

describeWithDatabase("delivery batch creation API", () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString:
        databaseUrl ?? "postgresql://unused:unused@127.0.0.1:1/unused",
    }),
  });
  const suffix = randomUUID();
  const password = "BatchPassword123!";
  const orderIds: string[] = [];
  const userIds: string[] = [];
  const shopIds: string[] = [];
  const addressIds: string[] = [];
  const sessionTokens: string[] = [];
  let firstDeliveryToken = "";
  let secondDeliveryToken = "";
  let customerToken = "";
  let firstDeliveryId = "";
  let secondDeliveryId = "";
  let singleOrderId = "";
  let multiFirstOrderId = "";
  let multiSecondOrderId = "";
  let nonReadyOrderId = "";
  let foreignOrderId = "";
  let duplicateOrderId = "";
  let concurrentOrderId = "";
  let rollbackReadyOrderId = "";
  let alreadyAssignedOrderId = "";
  let setupBatchId = "";

  beforeAll(async () => {
    const passwordHash = await hashPassword(password);
    const digits = suffix.replace(/\D/g, "").padEnd(8, "7").slice(0, 8);
    const owner = await prisma.user.create({
      data: {
        name: "Batch Test Owner",
        email: `batch-owner-${suffix}@example.test`,
        phone: `+9470${digits}`,
        passwordHash,
        role: UserRole.SHOP_OWNER,
      },
    });
    const foreignOwner = await prisma.user.create({
      data: {
        name: "Foreign Batch Owner",
        email: `batch-foreign-owner-${suffix}@example.test`,
        phone: `+9471${digits}`,
        passwordHash,
        role: UserRole.SHOP_OWNER,
      },
    });
    userIds.push(owner.id, foreignOwner.id);

    const shop = await prisma.shop.create({
      data: {
        ownerId: owner.id,
        name: `Batch Test Shop ${suffix}`,
        address: "10 Batch Street",
        latitude: "6.927079",
        longitude: "79.861244",
        phone: `+9411${digits}`,
      },
    });
    const foreignShop = await prisma.shop.create({
      data: {
        ownerId: foreignOwner.id,
        name: `Foreign Batch Shop ${suffix}`,
        address: "20 Foreign Street",
        latitude: "7.290572",
        longitude: "80.633728",
        phone: `+9412${digits}`,
      },
    });
    shopIds.push(shop.id, foreignShop.id);

    const [firstDelivery, secondDelivery, customer] = await Promise.all([
      prisma.user.create({
        data: {
          assignedShopId: shop.id,
          name: "First Batch Driver",
          email: `batch-driver-one-${suffix}@example.test`,
          phone: `+9472${digits}`,
          passwordHash,
          role: UserRole.DELIVERY_PERSON,
        },
      }),
      prisma.user.create({
        data: {
          assignedShopId: shop.id,
          name: "Second Batch Driver",
          email: `batch-driver-two-${suffix}@example.test`,
          phone: `+9473${digits}`,
          passwordHash,
          role: UserRole.DELIVERY_PERSON,
        },
      }),
      prisma.user.create({
        data: {
          name: "Batch Test Customer",
          email: `batch-customer-${suffix}@example.test`,
          phone: `+9474${digits}`,
          passwordHash,
          role: UserRole.CUSTOMER,
        },
      }),
    ]);
    firstDeliveryId = firstDelivery.id;
    secondDeliveryId = secondDelivery.id;
    userIds.push(firstDelivery.id, secondDelivery.id, customer.id);

    const address = await prisma.customerAddress.create({
      data: {
        customerId: customer.id,
        label: "Batch Home",
        address: "30 Customer Road",
        latitude: "6.900000",
        longitude: "79.850000",
      },
    });
    addressIds.push(address.id);

    const orderData = (shopId: string, status: OrderStatus) => ({
      customerId: customer.id,
      shopId,
      deliveryAddressId: address.id,
      status,
      subtotal: "100.00",
      deliveryFee: "25.00",
      total: "125.00",
    });
    const createdOrders = await Promise.all([
      prisma.order.create({
        data: orderData(shop.id, OrderStatus.READY_FOR_DELIVERY),
      }),
      prisma.order.create({
        data: orderData(shop.id, OrderStatus.READY_FOR_DELIVERY),
      }),
      prisma.order.create({
        data: orderData(shop.id, OrderStatus.READY_FOR_DELIVERY),
      }),
      prisma.order.create({
        data: orderData(shop.id, OrderStatus.PREPARING),
      }),
      prisma.order.create({
        data: orderData(foreignShop.id, OrderStatus.READY_FOR_DELIVERY),
      }),
      prisma.order.create({
        data: orderData(shop.id, OrderStatus.READY_FOR_DELIVERY),
      }),
      prisma.order.create({
        data: orderData(shop.id, OrderStatus.READY_FOR_DELIVERY),
      }),
      prisma.order.create({
        data: orderData(shop.id, OrderStatus.READY_FOR_DELIVERY),
      }),
      prisma.order.create({
        data: orderData(shop.id, OrderStatus.ASSIGNED),
      }),
    ]);
    singleOrderId = createdOrders[0]!.id;
    multiFirstOrderId = createdOrders[1]!.id;
    multiSecondOrderId = createdOrders[2]!.id;
    nonReadyOrderId = createdOrders[3]!.id;
    foreignOrderId = createdOrders[4]!.id;
    duplicateOrderId = createdOrders[5]!.id;
    concurrentOrderId = createdOrders[6]!.id;
    rollbackReadyOrderId = createdOrders[7]!.id;
    alreadyAssignedOrderId = createdOrders[8]!.id;
    orderIds.push(...createdOrders.map((order) => order.id));

    const setupBatch = await prisma.deliveryBatch.create({
      data: { deliveryPersonId: firstDelivery.id },
    });
    setupBatchId = setupBatch.id;
    await prisma.deliveryBatchOrder.create({
      data: {
        batchId: setupBatch.id,
        orderId: alreadyAssignedOrderId,
        sequence: 1,
      },
    });

    [firstDeliveryToken, secondDeliveryToken, customerToken] =
      await Promise.all([
        login(firstDelivery.email!, password),
        login(secondDelivery.email!, password),
        login(customer.email!, password),
      ]);
    sessionTokens.push(firstDeliveryToken, secondDeliveryToken, customerToken);
  });

  afterAll(async () => {
    await prisma.orderStatusHistory.deleteMany({
      where: { orderId: { in: orderIds } },
    });
    const assignments = await prisma.deliveryBatchOrder.findMany({
      where: { orderId: { in: orderIds } },
      select: { batchId: true },
    });
    const batchIds = [
      ...new Set([...assignments.map(({ batchId }) => batchId), setupBatchId]),
    ].filter(Boolean);
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
      where: {
        tokenHash: {
          in: sessionTokens.filter(Boolean).map(hashSessionToken),
        },
      },
    });
    await prisma.user.deleteMany({ where: { id: { in: userIds.slice(2) } } });
    await prisma.shop.deleteMany({ where: { id: { in: shopIds } } });
    await prisma.user.deleteMany({
      where: { id: { in: userIds.slice(0, 2) } },
    });
    await prisma.$disconnect();
  });

  it("creates a single-order batch and assigns the order", async () => {
    const response = await createBatchRoute(
      batchRequest(firstDeliveryToken, [singleOrderId]),
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.data).toMatchObject({
      deliveryPersonId: firstDeliveryId,
      status: DeliveryBatchStatus.PENDING,
      orders: [{ orderId: singleOrderId, sequence: 1 }],
    });
    expect(payload.data.createdAt).toEqual(expect.any(String));
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: singleOrderId },
      include: { batchAssignment: true, statusHistory: true },
    });
    expect(order.status).toBe(OrderStatus.ASSIGNED);
    expect(order.batchAssignment?.batchId).toBe(payload.data.id);
    expect(order.statusHistory.at(-1)).toMatchObject({
      fromStatus: OrderStatus.READY_FOR_DELIVERY,
      toStatus: OrderStatus.ASSIGNED,
      changedById: firstDeliveryId,
    });
  });

  it("creates a multiple-order batch with stable sequence relationships", async () => {
    const response = await createBatchRoute(
      batchRequest(firstDeliveryToken, [multiSecondOrderId, multiFirstOrderId]),
    );
    const payload = await response.json();

    expect(response.status).toBe(201);
    const batch = await prisma.deliveryBatch.findUniqueOrThrow({
      where: { id: payload.data.id },
      include: { orders: { orderBy: { sequence: "asc" } } },
    });
    expect(batch.orders).toMatchObject([
      { orderId: multiSecondOrderId, sequence: 1 },
      { orderId: multiFirstOrderId, sequence: 2 },
    ]);
    const orders = await prisma.order.findMany({
      where: { id: { in: [multiFirstOrderId, multiSecondOrderId] } },
    });
    expect(orders.every(({ status }) => status === OrderStatus.ASSIGNED)).toBe(
      true,
    );
  });

  it("rejects a non-ready order without creating a batch", async () => {
    const before = await prisma.deliveryBatch.count();
    const response = await createBatchRoute(
      batchRequest(firstDeliveryToken, [nonReadyOrderId]),
    );
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "ORDER_NOT_READY" },
    });
    expect(await prisma.deliveryBatch.count()).toBe(before);
  });

  it("rejects an order from another shop", async () => {
    const response = await createBatchRoute(
      batchRequest(firstDeliveryToken, [foreignOrderId]),
    );
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "ORDER_WRONG_SHOP" },
    });
  });

  it("does not assign the same order twice", async () => {
    const first = await createBatchRoute(
      batchRequest(firstDeliveryToken, [duplicateOrderId]),
    );
    expect(first.status).toBe(201);
    const second = await createBatchRoute(
      batchRequest(secondDeliveryToken, [duplicateOrderId]),
    );
    expect(second.status).toBe(409);
    expect(
      await prisma.deliveryBatchOrder.count({
        where: { orderId: duplicateOrderId },
      }),
    ).toBe(1);
  });

  it("rolls back the entire transaction when one selected order is assigned", async () => {
    const before = await prisma.deliveryBatch.count();
    const response = await createBatchRoute(
      batchRequest(firstDeliveryToken, [
        rollbackReadyOrderId,
        alreadyAssignedOrderId,
      ]),
    );
    expect(response.status).toBe(409);
    expect(await prisma.deliveryBatch.count()).toBe(before);
    await expect(
      prisma.order.findUniqueOrThrow({ where: { id: rollbackReadyOrderId } }),
    ).resolves.toMatchObject({ status: OrderStatus.READY_FOR_DELIVERY });
    expect(
      await prisma.deliveryBatchOrder.count({
        where: { orderId: rollbackReadyOrderId },
      }),
    ).toBe(0);
  });

  it("allows only one of two concurrent delivery personnel to claim an order", async () => {
    const responses = await Promise.all([
      createBatchRoute(batchRequest(firstDeliveryToken, [concurrentOrderId])),
      createBatchRoute(batchRequest(secondDeliveryToken, [concurrentOrderId])),
    ]);

    expect(responses.map(({ status }) => status).sort()).toEqual([201, 409]);
    expect(
      await prisma.deliveryBatchOrder.count({
        where: { orderId: concurrentOrderId },
      }),
    ).toBe(1);
    const assignment = await prisma.deliveryBatchOrder.findUniqueOrThrow({
      where: { orderId: concurrentOrderId },
      include: { batch: true, order: true },
    });
    expect(assignment.order.status).toBe(OrderStatus.ASSIGNED);
    expect([firstDeliveryId, secondDeliveryId]).toContain(
      assignment.batch.deliveryPersonId,
    );
  });

  it("rejects unauthorized roles at the API boundary", async () => {
    const response = await createBatchRoute(
      batchRequest(customerToken, [nonReadyOrderId]),
    );
    expect(response.status).toBe(403);
  });
});
