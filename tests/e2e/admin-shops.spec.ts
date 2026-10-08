import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { expect, test, type Page } from "@playwright/test";

import { PrismaClient, UserRole } from "../../src/generated/prisma/client";
import { hashPassword } from "../../src/lib/auth/password";

const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5432/ag_stores_test";
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});
const suffix = randomUUID();
const digits = suffix.replace(/\D/g, "").padEnd(8, "7").slice(0, 8);
const initialName = `Admin E2E Shop ${suffix.slice(0, 8)}`;
const updatedName = `Updated Admin Shop ${suffix.slice(0, 8)}`;
let firstOwnerId = "";
let secondOwnerId = "";
let shopId = "";

async function signIn(page: Page, email: string, destination: string) {
  await page.goto("/login");
  await page.getByLabel("Email or phone").fill(email);
  await page.getByLabel("Password").fill("ChangeMe123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(new RegExp(`${destination}$`));
}

test.describe.serial("admin shop management", () => {
  test.beforeAll(async () => {
    const passwordHash = await hashPassword("ChangeMe123!");
    const [firstOwner, secondOwner] = await Promise.all([
      prisma.user.create({
        data: {
          name: `Admin E2E Owner One ${suffix.slice(0, 6)}`,
          email: `admin-shop-owner-one-${suffix}@example.test`,
          passwordHash,
          role: UserRole.SHOP_OWNER,
        },
      }),
      prisma.user.create({
        data: {
          name: `Admin E2E Owner Two ${suffix.slice(0, 6)}`,
          email: `admin-shop-owner-two-${suffix}@example.test`,
          passwordHash,
          role: UserRole.SHOP_OWNER,
        },
      }),
    ]);
    firstOwnerId = firstOwner.id;
    secondOwnerId = secondOwner.id;
  });

  test.afterAll(async () => {
    if (shopId) await prisma.shop.deleteMany({ where: { id: shopId } });
    const ownerIds = [firstOwnerId, secondOwnerId].filter(Boolean);
    await prisma.authSession.deleteMany({
      where: { userId: { in: ownerIds } },
    });
    await prisma.user.deleteMany({ where: { id: { in: ownerIds } } });
    await prisma.$disconnect();
  });

  test("administrator creates, assigns, edits, and deactivates a shop", async ({
    page,
  }) => {
    await signIn(page, "admin@agstores.local", "/admin");
    await page.goto("/admin/shops");
    await expect(
      page.getByRole("heading", { name: "Shop management" }),
    ).toBeVisible();

    await page.getByLabel("Shop owner").selectOption(firstOwnerId);
    await page.getByLabel("Shop name").fill(initialName);
    await page.getByLabel("Address").fill("10 Admin E2E Road, Colombo");
    await page.getByLabel("Phone").fill(`+9416${digits}`);
    await page.getByLabel("Latitude").fill("6.927079");
    await page.getByLabel("Longitude").fill("79.861244");
    await page.getByLabel("Open for customer orders").check();
    await page.getByLabel("Minimum order amount (LKR)").fill("250.00");
    await page.getByLabel("Delivery fee (LKR)").fill("100.00");
    await page.getByLabel("Maximum delivery radius (km)").fill("25.00");
    await page.getByRole("button", { name: "Create shop" }).click();

    await expect(page).toHaveURL(/\/admin\/shops\/[0-9a-f-]+$/);
    shopId = page.url().split("/").at(-1) ?? "";
    await expect(
      page.getByRole("heading", { name: initialName, level: 1 }),
    ).toBeVisible();

    await page.getByLabel("Shop owner").selectOption(secondOwnerId);
    await page.getByLabel("Shop name").fill(updatedName);
    await page.getByRole("button", { name: "Save shop" }).click();
    await expect(page.getByRole("status")).toHaveText("Shop details saved.");

    const saved = await prisma.shop.findUniqueOrThrow({
      where: { id: shopId },
    });
    expect(saved).toMatchObject({ name: updatedName, ownerId: secondOwnerId });

    await page
      .getByRole("button", { name: `Deactivate ${updatedName}` })
      .click();
    await expect(
      page.getByRole("button", { name: `Activate ${updatedName}` }),
    ).toBeVisible();
    await expect(
      prisma.shop.findUniqueOrThrow({ where: { id: shopId } }),
    ).resolves.toMatchObject({ isActive: false, isOpen: false });
  });

  test("customer cannot access shop administration", async ({ page }) => {
    await signIn(page, "customer@agstores.local", "/account");
    await page.goto("/admin/shops");
    await expect(page).toHaveURL(/\/forbidden$/);
  });
});
