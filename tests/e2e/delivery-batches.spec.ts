import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { expect, test, type Page } from "@playwright/test";

import {
  DeliveryBatchStatus,
  OrderStatus,
  PrismaClient,
  UserRole,
} from "../../src/generated/prisma/client";
import { hashPassword } from "../../src/lib/auth/password";

const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5432/ag_stores_test";
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});
const suffix = randomUUID();
const orderIds: string[] = [];
const batchIds: string[] = [];
let customerId = "";
let addressId = "";
let otherRiderId = "";
let batchId = "";
let foreignBatchId = "";
let firstOrderId = "";
let secondOrderId = "";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email or phone").fill(email);
  await page.getByLabel("Password").fill("ChangeMe123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/delivery$/);
}

test.describe.serial("active delivery batch", () => {
  test.beforeAll(async () => {
    const rider = await prisma.user.findUniqueOrThrow({
      where: { email: "delivery@agstores.local" },
    });
    const shopId = rider.assignedShopId;
    if (!shopId) throw new Error("Seeded rider must have an assigned shop.");
    const digits = suffix.replace(/\D/g, "").padEnd(8, "5").slice(0, 8);
    const [customer, otherRider] = await Promise.all([
      prisma.user.create({
        data: {
          name: "Batch E2E Customer",
          email: `batch-e2e-customer-${suffix}@example.test`,
          phone: `+9450${digits}`,
          passwordHash: "e2e-only-not-used",
          role: UserRole.CUSTOMER,
        },
      }),
      prisma.user.create({
        data: {
          assignedShopId: shopId,
          name: "Other Batch E2E Rider",
          email: `batch-e2e-rider-${suffix}@example.test`,
          phone: `+9451${digits}`,
          passwordHash: await hashPassword("ChangeMe123!"),
          role: UserRole.DELIVERY_PERSON,
        },
      }),
    ]);
    customerId = customer.id;
    otherRiderId = otherRider.id;
    const address = await prisma.customerAddress.create({
      data: {
        customerId: customer.id,
        label: "E2E delivery home",
        address: "55 Batch Route, Colombo",
        latitude: "6.920000",
        longitude: "79.860000",
      },
    });
    addressId = address.id;
    const orderData = {
      customerId: customer.id,
      shopId,
      deliveryAddressId: address.id,
      status: OrderStatus.ASSIGNED,
      subtotal: "500.00",
      deliveryFee: "100.00",
      total: "600.00",
    };
    const [first, second, foreign] = await Promise.all([
      prisma.order.create({ data: orderData }),
      prisma.order.create({ data: orderData }),
      prisma.order.create({ data: orderData }),
    ]);
    firstOrderId = first.id;
    secondOrderId = second.id;
    orderIds.push(first.id, second.id, foreign.id);
    const [batch, foreignBatch] = await Promise.all([
      prisma.deliveryBatch.create({
        data: {
          deliveryPersonId: rider.id,
          orders: {
            create: [
              { orderId: first.id, sequence: 1 },
              { orderId: second.id, sequence: 2 },
            ],
          },
        },
      }),
      prisma.deliveryBatch.create({
        data: {
          deliveryPersonId: otherRider.id,
          orders: { create: { orderId: foreign.id, sequence: 1 } },
        },
      }),
    ]);
    batchId = batch.id;
    foreignBatchId = foreignBatch.id;
    batchIds.push(batch.id, foreignBatch.id);
  });

  test.afterAll(async () => {
    await prisma.orderStatusHistory.deleteMany({
      where: { orderId: { in: orderIds } },
    });
    await prisma.deliveryBatchOrder.deleteMany({
      where: { orderId: { in: orderIds } },
    });
    await prisma.deliveryBatch.deleteMany({ where: { id: { in: batchIds } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    if (addressId) {
      await prisma.customerAddress.deleteMany({ where: { id: addressId } });
    }
    if (otherRiderId) {
      await prisma.authSession.deleteMany({ where: { userId: otherRiderId } });
      await prisma.user.deleteMany({ where: { id: otherRiderId } });
    }
    if (customerId) {
      await prisma.user.deleteMany({ where: { id: customerId } });
    }
    await prisma.$disconnect();
  });

  test("rider cannot open another rider's batch", async ({ page }) => {
    await signIn(page, "delivery@agstores.local");
    const response = await page.goto(`/delivery/batches/${foreignBatchId}`);
    expect(response?.status()).toBe(404);
  });

  test("rider reorders, starts, and finishes every delivery", async ({
    page,
  }) => {
    await signIn(page, "delivery@agstores.local");
    await page.goto("/delivery/batches");
    await expect(page.getByText(batchId, { exact: true })).toBeVisible();
    await page.getByText(batchId, { exact: true }).click();
    await expect(
      page.getByText("55 Batch Route, Colombo").first(),
    ).toBeVisible();

    await page.getByLabel(`Move order ${secondOrderId} up`).click();
    await page.getByRole("button", { name: "Save sequence" }).click();
    await expect(page.getByRole("status")).toContainText(
      "Delivery sequence saved",
    );
    const reordered = await prisma.deliveryBatchOrder.findMany({
      where: { batchId },
      orderBy: { sequence: "asc" },
    });
    expect(reordered.map(({ orderId }) => orderId)).toEqual([
      secondOrderId,
      firstOrderId,
    ]);

    await page.getByRole("button", { name: "Start delivery" }).click();
    await expect(page.getByText("IN PROGRESS", { exact: true })).toBeVisible();
    expect(
      await prisma.order.count({
        where: {
          id: { in: [firstOrderId, secondOrderId] },
          status: OrderStatus.OUT_FOR_DELIVERY,
        },
      }),
    ).toBe(2);

    await page.getByRole("button", { name: "Mark delivered" }).first().click();
    await expect(page.getByText("Delivered", { exact: true })).toBeVisible();
    await expect(page.getByText("IN PROGRESS", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Mark failed" }).click();
    await expect(page.getByText("COMPLETED", { exact: true })).toBeVisible();
    const batch = await prisma.deliveryBatch.findUniqueOrThrow({
      where: { id: batchId },
    });
    expect(batch).toMatchObject({
      status: DeliveryBatchStatus.COMPLETED,
      completedAt: expect.any(Date),
    });
    const statuses = await prisma.order.findMany({
      where: { id: { in: [firstOrderId, secondOrderId] } },
      select: { status: true },
    });
    expect(new Set(statuses.map(({ status }) => status))).toEqual(
      new Set([OrderStatus.DELIVERED, OrderStatus.FAILED_DELIVERY]),
    );
  });
});
