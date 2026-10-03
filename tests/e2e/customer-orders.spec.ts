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
let addressId: string;
let otherAddressId: string;
let otherCustomerId: string;
let activeOrderId: string;
let pastOrderId: string;
let otherOrderId: string;

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email or phone").fill("customer@agstores.local");
  await page.getByLabel("Password").fill("ChangeMe123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/account$/);
}

test.describe.serial("customer order history and tracking", () => {
  test.beforeAll(async () => {
    const customer = await prisma.user.findUniqueOrThrow({
      where: { email: "customer@agstores.local" },
    });
    const owner = await prisma.user.findUniqueOrThrow({
      where: { email: "owner@agstores.local" },
    });
    const shop = await prisma.shop.findFirstOrThrow({
      where: { ownerId: owner.id },
    });
    const product = await prisma.product.findFirstOrThrow({
      where: { shopId: shop.id, nameEn: "Red Rice 1kg" },
    });
    const address = await prisma.customerAddress.create({
      data: {
        customerId: customer.id,
        label: `Tracking E2E ${suffix}`,
        address: "88 Customer Tracking Road",
        latitude: "6.927079",
        longitude: "79.861244",
      },
    });
    addressId = address.id;

    const otherCustomer = await prisma.user.create({
      data: {
        name: "Private Order Customer",
        email: `private-order-${suffix}@example.test`,
        passwordHash: "e2e-only-not-used",
        role: UserRole.CUSTOMER,
      },
    });
    otherCustomerId = otherCustomer.id;
    const otherAddress = await prisma.customerAddress.create({
      data: {
        customerId: otherCustomer.id,
        label: "Private Home",
        address: "1 Private Customer Street",
        latitude: "6.900000",
        longitude: "79.800000",
      },
    });
    otherAddressId = otherAddress.id;

    const base = {
      shopId: shop.id,
      subtotal: "840.00",
      deliveryFee: "250.00",
      total: "1090.00",
    };
    const [activeOrder, pastOrder, otherOrder] = await Promise.all([
      prisma.order.create({
        data: {
          ...base,
          customerId: customer.id,
          deliveryAddressId: address.id,
          status: OrderStatus.PREPARING,
          customerNote: "Call on arrival",
          items: {
            create: {
              productId: product.id,
              quantity: 2,
              unitPrice: "420.00",
            },
          },
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

  test.afterAll(async () => {
    await prisma.orderStatusHistory.deleteMany({
      where: { orderId: { in: orderIds } },
    });
    await prisma.orderItem.deleteMany({
      where: { orderId: { in: orderIds } },
    });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.customerAddress.deleteMany({
      where: { id: { in: [addressId, otherAddressId].filter(Boolean) } },
    });
    if (otherCustomerId) {
      await prisma.user.deleteMany({ where: { id: otherCustomerId } });
    }
    await prisma.$disconnect();
  });

  test("customer sees active and past orders with accurate tracking details", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/account/orders");

    const activeSection = page.getByRole("region", { name: "Active orders" });
    const historySection = page.getByRole("region", { name: "Order history" });
    await expect(activeSection.getByText(activeOrderId)).toBeVisible();
    await expect(
      activeSection.getByText("Preparing", { exact: true }),
    ).toBeVisible();
    await expect(historySection.getByText(pastOrderId)).toBeVisible();
    await expect(
      historySection.getByText("Delivered", { exact: true }),
    ).toBeVisible();

    await activeSection
      .getByText(activeOrderId)
      .locator("xpath=ancestor::article")
      .getByRole("link", { name: "View order details" })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/account/orders/${activeOrderId}$`),
    );
    await expect(page.getByTestId("customer-order-status")).toHaveText(
      "Preparing",
    );
    await expect(page.getByTestId("customer-order-item")).toContainText(
      "2 × LKR 420.00",
    );
    await expect(page.getByTestId("customer-order-item")).toContainText(
      "LKR 840.00",
    );
    await expect(page.getByTestId("customer-order-subtotal")).toHaveText(
      "LKR 840.00",
    );
    await expect(page.getByTestId("customer-order-total")).toHaveText(
      "LKR 1090.00",
    );
    await expect(page.getByText("88 Customer Tracking Road")).toBeVisible();
    await expect(page.getByText("Call on arrival")).toBeVisible();
  });

  test("customer receives not found for another customer's order", async ({
    page,
  }) => {
    await signIn(page);
    const response = await page.goto(`/account/orders/${otherOrderId}`);
    expect(response?.status()).toBe(404);
    await expect(page.getByText("This page could not be found.")).toBeVisible();
  });
});
