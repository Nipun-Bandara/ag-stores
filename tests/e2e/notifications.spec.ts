import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { expect, test } from "@playwright/test";

import {
  NotificationType,
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
const email = `notifications-e2e-${suffix}@example.test`;
let customerId = "";
let addressId = "";
let orderId = "";

test.describe.serial("notification center", () => {
  test.beforeAll(async () => {
    const shop = await prisma.shop.findFirstOrThrow({
      where: { isActive: true },
    });
    const customer = await prisma.user.create({
      data: {
        name: "Notification E2E Customer",
        email,
        passwordHash: await hashPassword("ChangeMe123!"),
        role: UserRole.CUSTOMER,
      },
    });
    customerId = customer.id;
    addressId = (
      await prisma.customerAddress.create({
        data: {
          customerId,
          label: "Home",
          address: "10 Notification E2E Road, Colombo",
          latitude: "6.927079",
          longitude: "79.861244",
        },
      })
    ).id;
    orderId = (
      await prisma.order.create({
        data: {
          customerId,
          shopId: shop.id,
          deliveryAddressId: addressId,
          subtotal: "100.00",
          deliveryFee: "50.00",
          total: "150.00",
        },
      })
    ).id;
    await prisma.notification.createMany({
      data: [
        {
          userId: customerId,
          orderId,
          type: NotificationType.ORDER_PLACED,
          title: "Order placed",
          message: "Your order has been placed.",
        },
        {
          userId: customerId,
          orderId,
          type: NotificationType.ORDER_CONFIRMED,
          title: "Order confirmed",
          message: "Your order has been confirmed.",
        },
      ],
    });
  });

  test.afterAll(async () => {
    if (orderId) await prisma.order.deleteMany({ where: { id: orderId } });
    if (addressId)
      await prisma.customerAddress.deleteMany({ where: { id: addressId } });
    if (customerId) {
      await prisma.authSession.deleteMany({ where: { userId: customerId } });
      await prisma.user.deleteMany({ where: { id: customerId } });
    }
    await prisma.$disconnect();
  });

  test("customer views unread notifications and marks them read", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email or phone").fill(email);
    await page.getByLabel("Password").fill("ChangeMe123!");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/account$/);
    await expect(
      page.getByRole("link", { name: "Notifications (2)" }),
    ).toBeVisible();

    await page.goto("/notifications");
    await expect(
      page.getByRole("heading", { name: "Notifications", level: 1 }),
    ).toBeVisible();
    await expect(page.getByTestId("notification-unread-count")).toHaveText(
      "2 unread",
    );
    await page.getByRole("button", { name: "Mark as read" }).first().click();
    await expect(page.getByTestId("notification-unread-count")).toHaveText(
      "1 unread",
    );
    await page.getByRole("button", { name: "Mark all as read" }).click();
    await expect(page.getByTestId("notification-unread-count")).toHaveText(
      "0 unread",
    );
    await expect(page.getByText("Unread", { exact: true })).toHaveCount(0);
  });

  test("anonymous user is redirected from notifications", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/notifications");
    await expect(page).toHaveURL(/\/login\?returnTo=%2Fnotifications$/);
  });
});
