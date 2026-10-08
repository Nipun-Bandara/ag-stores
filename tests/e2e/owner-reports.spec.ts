import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { expect, test, type Page } from "@playwright/test";

import {
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
const email = `report-owner-e2e-${suffix}@example.test`;
const password = "ReportOwner123!";
let ownerId = "";
let customerId = "";
let shopId = "";
let addressId = "";
let orderId = "";

async function signIn(
  page: Page,
  identifier: string,
  secret: string,
  destination: string,
) {
  await page.goto("/login");
  await page.getByLabel("Email or phone").fill(identifier);
  await page.getByLabel("Password").fill(secret);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(new RegExp(`${destination}$`));
}

test.describe.serial("owner reports", () => {
  test.beforeAll(async () => {
    const passwordHash = await hashPassword(password);
    const [owner, customer] = await Promise.all([
      prisma.user.create({
        data: {
          name: "E2E Reporting Owner",
          email,
          passwordHash,
          role: UserRole.SHOP_OWNER,
        },
      }),
      prisma.user.create({
        data: {
          name: "E2E Reporting Customer",
          email: `report-customer-e2e-${suffix}@example.test`,
          passwordHash,
          role: UserRole.CUSTOMER,
        },
      }),
    ]);
    ownerId = owner.id;
    customerId = customer.id;
    const shop = await prisma.shop.create({
      data: {
        ownerId: owner.id,
        name: `E2E Reporting Shop ${suffix}`,
        address: "1 Browser Report Road",
        latitude: "6.927079",
        longitude: "79.861244",
        phone: `+943${Date.now().toString().slice(-8)}`,
      },
    });
    shopId = shop.id;
    const address = await prisma.customerAddress.create({
      data: {
        customerId: customer.id,
        label: "Report address",
        address: "2 Browser Report Road",
        latitude: "6.930000",
        longitude: "79.860000",
      },
    });
    addressId = address.id;
    orderId = (
      await prisma.order.create({
        data: {
          customerId: customer.id,
          shopId: shop.id,
          deliveryAddressId: address.id,
          status: OrderStatus.DELIVERED,
          subtotal: "400.00",
          deliveryFee: "50.00",
          total: "450.00",
          createdAt: new Date("2026-10-08T05:00:00.000Z"),
        },
      })
    ).id;
  });

  test.afterAll(async () => {
    await prisma.authSession.deleteMany({
      where: { userId: { in: [ownerId, customerId] } },
    });
    await prisma.order.deleteMany({ where: { id: orderId } });
    await prisma.customerAddress.deleteMany({ where: { id: addressId } });
    await prisma.shop.deleteMany({ where: { id: shopId } });
    await prisma.user.deleteMany({
      where: { id: { in: [ownerId, customerId] } },
    });
    await prisma.$disconnect();
  });

  test("owner filters and views shop-isolated reporting summaries", async ({
    page,
  }) => {
    await signIn(page, email, password, "/owner");
    await page.goto(
      `/owner/reports?from=2026-10-08&to=2026-10-08&status=${OrderStatus.DELIVERED}`,
    );

    await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
    await expect(page.getByTestId("owner-report-orders")).toContainText("1");
    await expect(page.getByTestId("owner-report-revenue")).toContainText(
      "LKR 450.00",
    );
    await expect(page.getByTestId("daily-report-row")).toContainText(
      "2026-10-08",
    );

    await page.getByLabel("Status").selectOption(OrderStatus.FAILED_DELIVERY);
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page.getByTestId("owner-report-orders")).toContainText("0");
    await expect(
      page.getByText("No orders were found for this period."),
    ).toBeVisible();
  });

  test("customer cannot access owner reports", async ({ page }) => {
    await page.context().clearCookies();
    await signIn(page, "customer@agstores.local", "ChangeMe123!", "/account");
    await page.goto("/owner/reports");
    await expect(page).toHaveURL(/\/forbidden$/);
  });
});
