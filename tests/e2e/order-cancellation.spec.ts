import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { expect, test, type Page } from "@playwright/test";

import {
  CatalogStatus,
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
let shopId = "";
let categoryId = "";
let productId = "";
let addressId = "";
let otherAddressId = "";
let otherCustomerId = "";
let placedOrderId = "";
let confirmedOrderId = "";
let preparingOrderId = "";
let deliveredOrderId = "";
let otherOrderId = "";

async function signIn(page: Page, email: string, destination: string) {
  await page.goto("/login");
  await page.getByLabel("Email or phone").fill(email);
  await page.getByLabel("Password").fill("ChangeMe123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(new RegExp(`${destination}$`));
}

test.describe.serial("customer order cancellation", () => {
  test.beforeAll(async () => {
    const customer = await prisma.user.findUniqueOrThrow({
      where: { email: "customer@agstores.local" },
    });
    const owner = await prisma.user.findUniqueOrThrow({
      where: { email: "owner@agstores.local" },
    });
    const otherCustomer = await prisma.user.create({
      data: {
        name: "Cancellation Private Customer",
        email: `cancellation-private-${suffix}@example.test`,
        passwordHash: "e2e-only-not-used",
        role: UserRole.CUSTOMER,
      },
    });
    otherCustomerId = otherCustomer.id;

    const shop = await prisma.shop.create({
      data: {
        ownerId: owner.id,
        name: `Cancellation Shop ${suffix}`,
        address: "1 Cancellation Market",
        latitude: "6.927079",
        longitude: "79.861244",
        phone: "+94110000000",
        isOpen: true,
      },
    });
    shopId = shop.id;
    const category = await prisma.category.create({
      data: {
        shopId,
        nameEn: `Cancellation Category ${suffix}`,
        status: CatalogStatus.ACTIVE,
      },
    });
    categoryId = category.id;
    const product = await prisma.product.create({
      data: {
        shopId,
        categoryId,
        nameEn: `Cancellation Product ${suffix}`,
        price: "100.00",
        stockQuantity: 8,
        isAvailable: true,
      },
    });
    productId = product.id;

    const [address, otherAddress] = await Promise.all([
      prisma.customerAddress.create({
        data: {
          customerId: customer.id,
          label: `Cancel E2E ${suffix}`,
          address: "14 Cancellation Road",
          latitude: "6.927079",
          longitude: "79.861244",
        },
      }),
      prisma.customerAddress.create({
        data: {
          customerId: otherCustomer.id,
          label: "Private Home",
          address: "15 Private Road",
          latitude: "6.900000",
          longitude: "79.800000",
        },
      }),
    ]);
    addressId = address.id;
    otherAddressId = otherAddress.id;

    const base = {
      shopId,
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
            create: { productId, quantity: 2, unitPrice: "100.00" },
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
    otherOrderId = other.id;
    orderIds.push(
      placed.id,
      confirmed.id,
      preparing.id,
      delivered.id,
      other.id,
    );
  });

  test.afterAll(async () => {
    await prisma.orderStatusHistory.deleteMany({
      where: { orderId: { in: orderIds } },
    });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.customerAddress.deleteMany({
      where: { id: { in: [addressId, otherAddressId].filter(Boolean) } },
    });
    if (productId) await prisma.product.delete({ where: { id: productId } });
    if (categoryId) await prisma.category.delete({ where: { id: categoryId } });
    if (shopId) await prisma.shop.delete({ where: { id: shopId } });
    if (otherCustomerId) {
      await prisma.user.delete({ where: { id: otherCustomerId } });
    }
    await prisma.$disconnect();
  });

  test("customer cancels a placed order with an optional reason", async ({
    page,
  }) => {
    await signIn(page, "customer@agstores.local", "/account");
    await page.goto(`/account/orders/${placedOrderId}`);
    await page
      .getByLabel("Cancellation reason (optional)")
      .fill("Plans changed");
    await page.getByRole("button", { name: "Cancel order" }).click();

    await expect(page.getByTestId("customer-order-status")).toHaveText(
      "Cancelled",
    );
    await expect(
      page.getByRole("heading", { name: "Order cancelled" }),
    ).toBeVisible();
    await expect(page.getByText("Reason: Plans changed")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Cancel order" }),
    ).toHaveCount(0);
  });

  test("server rejects ineligible and another customer's orders", async ({
    page,
  }) => {
    await signIn(page, "customer@agstores.local", "/account");
    for (const orderId of [
      confirmedOrderId,
      preparingOrderId,
      deliveredOrderId,
    ]) {
      const status = await page.evaluate(async (id) => {
        const response = await fetch(`/api/account/orders/${id}/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        return response.status;
      }, orderId);
      expect(status).toBe(409);
    }

    const otherStatus = await page.evaluate(async (id) => {
      const response = await fetch(`/api/account/orders/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      return response.status;
    }, otherOrderId);
    expect(otherStatus).toBe(403);
  });

  test("shop owner sees the customer cancellation", async ({ page }) => {
    await signIn(page, "owner@agstores.local", "/owner");
    await page.goto(`/owner/orders/${placedOrderId}`);
    await expect(
      page.getByRole("heading", { name: "Customer cancellation" }),
    ).toBeVisible();
    await expect(page.getByText("Reason: Plans changed")).toBeVisible();
  });

  test("administrator sees the customer cancellation", async ({ page }) => {
    await signIn(page, "admin@agstores.local", "/admin");
    await expect(page.getByText(placedOrderId)).toBeVisible();
    await expect(page.getByText("Reason: Plans changed")).toBeVisible();
  });
});
