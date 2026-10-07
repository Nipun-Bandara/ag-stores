import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { expect, test, type Page } from "@playwright/test";

import {
  OrderStatus,
  PrismaClient,
  UserRole,
} from "../../src/generated/prisma/client";

const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5432/ag_stores_test";
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});
const suffix = randomUUID();
const orderIds: string[] = [];
const addressIds: string[] = [];
let customerId = "";
let otherOwnerId = "";
let otherShopId = "";
let batchId = "";
let nearOrderId = "";
let nearbyOrderId = "";
let farOrderId = "";
let preparingOrderId = "";
let assignedOrderId = "";
let otherShopOrderId = "";

async function signIn(page: Page, email: string, destination: string) {
  await page.goto("/login");
  await page.getByLabel("Email or phone").fill(email);
  await page.getByLabel("Password").fill("ChangeMe123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(new RegExp(`${destination}$`));
}

test.describe.serial("available delivery orders", () => {
  test.beforeAll(async () => {
    const deliveryPerson = await prisma.user.findUniqueOrThrow({
      where: { email: "delivery@agstores.local" },
    });
    const shop = await prisma.shop.findUniqueOrThrow({
      where: { id: deliveryPerson.assignedShopId ?? "" },
    });
    const products = await prisma.product.findMany({
      where: {
        shopId: shop.id,
        nameEn: { in: ["Ceylon Tea", "Red Rice 1kg"] },
      },
      orderBy: { nameEn: "asc" },
    });
    if (products.length < 2)
      throw new Error("Two seeded products are required.");

    const digits = suffix.replace(/\D/g, "").padEnd(8, "8").slice(0, 8);
    const customer = await prisma.user.create({
      data: {
        name: `Private E2E Customer ${suffix}`,
        email: `private-delivery-orders-${suffix}@example.test`,
        phone: `+9468${digits}`,
        passwordHash: "e2e-only-not-used",
        role: UserRole.CUSTOMER,
      },
    });
    customerId = customer.id;
    const otherOwner = await prisma.user.create({
      data: {
        name: "Other E2E Shop Owner",
        email: `other-delivery-orders-${suffix}@example.test`,
        phone: `+9469${digits}`,
        passwordHash: "e2e-only-not-used",
        role: UserRole.SHOP_OWNER,
      },
    });
    otherOwnerId = otherOwner.id;
    const otherShop = await prisma.shop.create({
      data: {
        ownerId: otherOwner.id,
        name: `Other Delivery Orders Shop ${suffix}`,
        address: "200 Other Shop Road",
        latitude: "7.200000",
        longitude: "80.200000",
        phone: `+9413${digits}`,
      },
    });
    otherShopId = otherShop.id;

    const [nearAddress, nearbyAddress, farAddress] = await Promise.all([
      prisma.customerAddress.create({
        data: {
          customerId: customer.id,
          label: "Private Residence",
          address: "71 Secret Street, Colombo 05, Colombo",
          latitude: "6.910000",
          longitude: "79.855000",
        },
      }),
      prisma.customerAddress.create({
        data: {
          customerId: customer.id,
          label: "Nearby Destination",
          address: "72 Nearby Street, Narahenpita, Colombo",
          latitude: "6.912000",
          longitude: "79.857000",
        },
      }),
      prisma.customerAddress.create({
        data: {
          customerId: customer.id,
          label: "Confidential Office",
          address: "88 Confidential Avenue, Kaduwela, Colombo",
          latitude: "7.000000",
          longitude: "80.000000",
        },
      }),
    ]);
    addressIds.push(nearAddress.id, nearbyAddress.id, farAddress.id);

    const base = {
      customerId: customer.id,
      subtotal: "200.00",
      deliveryFee: "50.00",
      total: "250.00",
      customerNote: "Private note should never render",
    };
    const [near, nearby, far, preparing, assigned, other] = await Promise.all([
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
          deliveryAddressId: nearbyAddress.id,
          status: OrderStatus.READY_FOR_DELIVERY,
          createdAt: new Date("2026-10-04T08:00:00.000Z"),
          items: {
            create: {
              productId: products[0]!.id,
              quantity: 1,
              unitPrice: "100",
            },
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
    nearbyOrderId = nearby.id;
    farOrderId = far.id;
    preparingOrderId = preparing.id;
    assignedOrderId = assigned.id;
    otherShopOrderId = other.id;
    orderIds.push(
      near.id,
      nearby.id,
      far.id,
      preparing.id,
      assigned.id,
      other.id,
    );

    const batch = await prisma.deliveryBatch.create({
      data: { deliveryPersonId: deliveryPerson.id },
    });
    batchId = batch.id;
    await prisma.deliveryBatchOrder.create({
      data: { batchId, orderId: assigned.id, sequence: 1 },
    });
  });

  test.afterAll(async () => {
    await prisma.orderStatusHistory.deleteMany({
      where: { orderId: { in: orderIds } },
    });
    const assignments = await prisma.deliveryBatchOrder.findMany({
      where: { orderId: { in: orderIds } },
      select: { batchId: true },
    });
    const batchIds = [
      ...new Set([...assignments.map(({ batchId }) => batchId), batchId]),
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
    if (customerId) await prisma.user.deleteMany({ where: { id: customerId } });
    if (otherShopId) {
      await prisma.shop.deleteMany({ where: { id: otherShopId } });
    }
    if (otherOwnerId) {
      await prisma.user.deleteMany({ where: { id: otherOwnerId } });
    }
    await prisma.$disconnect();
  });

  test("delivery person sees only safe, ready, unassigned shop orders", async ({
    page,
  }) => {
    await signIn(page, "delivery@agstores.local", "/delivery");
    await page.goto("/delivery/orders");

    await expect(
      page.getByRole("heading", { name: "Available orders" }),
    ).toBeVisible();
    await expect(page.getByText(nearOrderId, { exact: true })).toBeVisible();
    await expect(page.getByText(nearbyOrderId, { exact: true })).toBeVisible();
    await expect(page.getByText(farOrderId, { exact: true })).toBeVisible();
    await expect(page.getByText(preparingOrderId)).toHaveCount(0);
    await expect(page.getByText(assignedOrderId)).toHaveCount(0);
    await expect(page.getByText(otherShopOrderId)).toHaveCount(0);
    await expect(
      page.getByText("Colombo 05, Colombo", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("71 Secret Street", { exact: false }),
    ).toHaveCount(0);
    await expect(page.getByText(`Private E2E Customer ${suffix}`)).toHaveCount(
      0,
    );
    await expect(
      page.getByText("Private note should never render"),
    ).toHaveCount(0);
    await expect(
      page.getByTestId("available-order-card").filter({ hasText: nearOrderId }),
    ).toContainText("2 items");
    await expect(
      page.getByTestId("available-order-card").filter({ hasText: nearOrderId }),
    ).toContainText("Approximate straight-line distance:");
  });

  test("suggests nearby orders but leaves selection to the rider", async ({
    page,
  }) => {
    await signIn(page, "delivery@agstores.local", "/delivery");
    await page.goto("/delivery/orders");

    const suggestion = page.getByTestId("suggested-delivery-group").first();
    await expect(suggestion).toContainText(nearOrderId);
    await expect(suggestion).toContainText(nearbyOrderId);
    await expect(suggestion).not.toContainText(farOrderId);
    await expect(page.getByText("0 orders selected")).toBeVisible();
    await suggestion
      .getByRole("button", { name: /Select suggested group/ })
      .click();
    await expect(page.getByText("2 orders selected")).toBeVisible();
  });

  test("filters by distance and sorts by creation time", async ({ page }) => {
    await signIn(page, "delivery@agstores.local", "/delivery");
    await page.goto("/delivery/orders");
    await page.getByLabel("Maximum approximate distance").fill("5");
    await page.getByLabel("Sort by").selectOption("distance");
    await page.getByLabel("Direction").selectOption("asc");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText(nearOrderId, { exact: true })).toBeVisible();
    await expect(page.getByText(farOrderId)).toHaveCount(0);

    await page.getByRole("link", { name: "Clear" }).click();
    await page.getByLabel("Sort by").selectOption("createdAt");
    await page.getByLabel("Direction").selectOption("asc");
    await page.getByRole("button", { name: "Apply" }).click();
    const cards = page.getByTestId("available-order-card");
    await expect(cards.first()).toContainText(nearOrderId);
    await expect(cards.nth(1)).toContainText(farOrderId);
  });

  test("selects multiple ready orders and creates a delivery batch", async ({
    page,
  }) => {
    await signIn(page, "delivery@agstores.local", "/delivery");
    await page.goto("/delivery/orders");
    await page.getByLabel(`Select order ${nearOrderId}`).check();
    await page.getByLabel(`Select order ${farOrderId}`).check();
    await expect(page.getByText("2 orders selected")).toBeVisible();
    await page.getByRole("button", { name: "Create delivery batch" }).click();

    await expect(page.getByText(nearOrderId)).toHaveCount(0);
    await expect(page.getByText(farOrderId)).toHaveCount(0);
    const assignments = await prisma.deliveryBatchOrder.findMany({
      where: { orderId: { in: [nearOrderId, farOrderId] } },
      orderBy: { sequence: "asc" },
      include: { order: true },
    });
    expect(assignments).toHaveLength(2);
    expect(new Set(assignments.map(({ batchId }) => batchId)).size).toBe(1);
    expect(assignments.map(({ sequence }) => sequence)).toEqual([1, 2]);
    expect(
      assignments.every(({ order }) => order.status === OrderStatus.ASSIGNED),
    ).toBe(true);
  });

  test("customer cannot access the delivery orders page or API", async ({
    page,
  }) => {
    await signIn(page, "customer@agstores.local", "/account");
    const apiStatus = await page.evaluate(async () =>
      fetch("/api/delivery/orders").then((response) => response.status),
    );
    expect(apiStatus).toBe(403);

    await page.goto("/delivery/orders");
    await expect(page).toHaveURL(/\/forbidden$/);
  });
});
