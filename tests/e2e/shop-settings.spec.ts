import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { expect, test } from "@playwright/test";

import { PrismaClient, UserRole } from "../../src/generated/prisma/client";
import { hashPassword } from "../../src/lib/auth/password";

const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5432/ag_stores_test";
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});
const suffix = randomUUID();
const email = `shop-settings-${suffix}@example.test`;
let ownerId = "";
let shopId = "";

test.describe("owner shop settings", () => {
  test.beforeAll(async () => {
    const owner = await prisma.user.create({
      data: {
        name: "Shop Settings Owner",
        email,
        passwordHash: await hashPassword("ChangeMe123!"),
        role: UserRole.SHOP_OWNER,
      },
    });
    ownerId = owner.id;
    shopId = (
      await prisma.shop.create({
        data: {
          ownerId,
          name: "E2E Settings Shop",
          address: "10 Original Road, Colombo",
          phone: "+94112345671",
          latitude: "6.927079",
          longitude: "79.861244",
          isOpen: true,
        },
      })
    ).id;
  });

  test.afterAll(async () => {
    if (shopId) await prisma.shop.deleteMany({ where: { id: shopId } });
    if (ownerId) {
      await prisma.authSession.deleteMany({ where: { userId: ownerId } });
      await prisma.user.deleteMany({ where: { id: ownerId } });
    }
    await prisma.$disconnect();
  });

  test("owner updates checkout and location settings", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email or phone").fill(email);
    await page.getByLabel("Password").fill("ChangeMe123!");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/owner$/);

    await page.goto("/owner/settings");
    await expect(
      page.getByRole("heading", { name: "Shop settings" }),
    ).toBeVisible();
    await page.getByLabel("Shop name").fill("Updated E2E Settings Shop");
    await page.getByLabel("Address").fill("25 Updated Road, Colombo");
    await page.getByLabel("Phone").fill("+94112345672");
    await page.getByLabel("Latitude").fill("6.930000");
    await page.getByLabel("Longitude").fill("79.870000");
    await page.getByLabel("Open for customer orders").uncheck();
    await page.getByLabel("Minimum order amount (LKR)").fill("600.00");
    await page.getByLabel("Delivery fee (LKR)").fill("80.50");
    await page.getByLabel("Maximum delivery radius (km)").fill("15.25");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByRole("status")).toHaveText("Shop settings saved.");

    const shop = await prisma.shop.findUniqueOrThrow({ where: { id: shopId } });
    expect(shop.name).toBe("Updated E2E Settings Shop");
    expect(shop.isOpen).toBe(false);
    expect(shop.minimumOrderAmount.toFixed(2)).toBe("600.00");
    expect(shop.deliveryFee.toFixed(2)).toBe("80.50");
    expect(shop.maximumDeliveryRadiusKm.toFixed(2)).toBe("15.25");
  });
});
