// @vitest-environment node

import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  DeliveryBatchStatus,
  OrderStatus,
  PrismaClient,
  UserRole,
} from "@/generated/prisma/client";

const databaseUrl = process.env.TEST_DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

describeWithDatabase("PostgreSQL schema", () => {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString:
        databaseUrl ?? "postgresql://unused:unused@127.0.0.1:1/unused",
    }),
  });

  let addressId: string;
  let orderId: string;
  let orderItemId: string;
  let batchId: string;
  let shopId: string;
  let productId: string;
  let constraintProductId: string;
  let customerId: string;

  beforeAll(async () => {
    const customer = await prisma.user.findUniqueOrThrow({
      where: { email: "customer@agstores.local" },
    });
    const deliveryPerson = await prisma.user.findUniqueOrThrow({
      where: { email: "delivery@agstores.local" },
    });
    const product = await prisma.product.findFirstOrThrow({
      where: { nameEn: "Red Rice 1kg" },
      include: { shop: true },
    });

    customerId = customer.id;
    shopId = product.shopId;
    productId = product.id;
    constraintProductId = (
      await prisma.product.findFirstOrThrow({
        where: { nameEn: "Ceylon Tea", shopId: product.shopId },
      })
    ).id;

    const address = await prisma.customerAddress.create({
      data: {
        customerId,
        label: `Database test ${randomUUID()}`,
        address: "1 Integration Test Lane, Colombo",
        latitude: "6.927079",
        longitude: "79.861244",
      },
    });
    addressId = address.id;

    const order = await prisma.order.create({
      data: {
        customerId,
        shopId,
        deliveryAddressId: addressId,
        status: OrderStatus.OUT_FOR_DELIVERY,
        subtotal: "840.00",
        deliveryFee: "150.00",
        total: "990.00",
        items: {
          create: {
            productId,
            quantity: 2,
            unitPrice: "420.00",
          },
        },
      },
      include: { items: true },
    });
    orderId = order.id;
    orderItemId = order.items[0]!.id;

    const batch = await prisma.deliveryBatch.create({
      data: {
        deliveryPersonId: deliveryPerson.id,
        status: DeliveryBatchStatus.IN_PROGRESS,
        startedAt: new Date(),
        orders: {
          create: { orderId, sequence: 1 },
        },
      },
    });
    batchId = batch.id;
  });

  afterAll(async () => {
    if (orderId) {
      await prisma.deliveryBatchOrder.deleteMany({ where: { orderId } });
      await prisma.orderItem.deleteMany({ where: { orderId } });
      await prisma.order.deleteMany({ where: { id: orderId } });
    }
    if (batchId) {
      await prisma.deliveryBatch.deleteMany({ where: { id: batchId } });
    }
    if (addressId) {
      await prisma.customerAddress.deleteMany({ where: { id: addressId } });
    }
    await prisma.$disconnect();
  });

  it("contains the complete idempotent seed data", async () => {
    const seededRoles = await prisma.user.findMany({
      where: {
        email: {
          in: [
            "admin@agstores.local",
            "owner@agstores.local",
            "delivery@agstores.local",
            "customer@agstores.local",
          ],
        },
      },
      select: { role: true },
    });

    expect(new Set(seededRoles.map(({ role }) => role))).toEqual(
      new Set([
        UserRole.ADMIN,
        UserRole.SHOP_OWNER,
        UserRole.DELIVERY_PERSON,
        UserRole.CUSTOMER,
      ]),
    );
    expect(
      await prisma.category.count({ where: { shopId } }),
    ).toBeGreaterThanOrEqual(2);
    expect(
      await prisma.product.count({ where: { shopId } }),
    ).toBeGreaterThanOrEqual(2);
  });

  it("loads the key order and delivery relations", async () => {
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        customer: true,
        shop: { include: { owner: true } },
        deliveryAddress: true,
        items: { include: { product: { include: { category: true } } } },
        batchAssignment: {
          include: { batch: { include: { deliveryPerson: true } } },
        },
      },
    });

    expect(order.customer.role).toBe(UserRole.CUSTOMER);
    expect(order.deliveryAddress.customerId).toBe(order.customerId);
    expect(order.shop.owner.role).toBe(UserRole.SHOP_OWNER);
    expect(order.items[0]!.product.category.shopId).toBe(order.shopId);
    expect(order.batchAssignment?.batch.deliveryPerson.role).toBe(
      UserRole.DELIVERY_PERSON,
    );
  });

  it("enforces unique user emails", async () => {
    await expect(
      prisma.user.create({
        data: {
          name: "Duplicate Admin",
          email: "admin@agstores.local",
          phone: `+94${Date.now()}`,
          passwordHash: "not-a-real-hash",
          role: UserRole.ADMIN,
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("enforces PostgreSQL enum values", async () => {
    await expect(
      prisma.$executeRawUnsafe(
        `INSERT INTO "users"
          ("id", "name", "email", "phone", "passwordHash", "role", "updatedAt")
         VALUES ($1::uuid, $2, $3, $4, $5, $6::"UserRole", NOW())`,
        randomUUID(),
        "Invalid Role",
        `invalid-role-${randomUUID()}@example.test`,
        `+94${Date.now()}`,
        "not-a-real-hash",
        "STORE_MANAGER",
      ),
    ).rejects.toBeDefined();
  });

  it("enforces numeric domain constraints", async () => {
    await expect(
      prisma.orderItem.create({
        data: {
          orderId,
          productId: constraintProductId,
          quantity: 0,
          unitPrice: "420.00",
        },
      }),
    ).rejects.toBeDefined();
    await expect(
      prisma.product.update({
        where: { id: constraintProductId },
        data: { stockQuantity: -1 },
      }),
    ).rejects.toBeDefined();
    await expect(
      prisma.product.update({
        where: { id: constraintProductId },
        data: { lowStockThreshold: -1 },
      }),
    ).rejects.toBeDefined();
  });

  it("prevents critical historical records from being deleted", async () => {
    await expect(
      prisma.product.delete({ where: { id: productId } }),
    ).rejects.toMatchObject({ code: "P2003" });
    await expect(
      prisma.order.delete({ where: { id: orderId } }),
    ).rejects.toMatchObject({
      code: "P2003",
    });
    await expect(
      prisma.user.delete({ where: { id: customerId } }),
    ).rejects.toMatchObject({
      code: "P2003",
    });

    expect(
      await prisma.orderItem.findUnique({ where: { id: orderItemId } }),
    ).not.toBeNull();
  });
});
