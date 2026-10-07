import { PrismaPg } from "@prisma/adapter-pg";
import { expect, test } from "@playwright/test";

import { PrismaClient } from "../../src/generated/prisma/client";

const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5432/ag_stores_test";
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});
const fallbackName = `English Fallback ${Date.now()}`;
let fallbackProductId = "";
const customerIds: string[] = [];

test.beforeAll(async () => {
  const category = await prisma.category.findFirstOrThrow({
    where: { nameEn: "Groceries" },
  });
  fallbackProductId = (
    await prisma.product.create({
      data: {
        shopId: category.shopId,
        categoryId: category.id,
        nameEn: fallbackName,
        nameSi: null,
        descriptionEn: "English fallback description",
        descriptionSi: null,
        price: "125.00",
        stockQuantity: 5,
        isAvailable: true,
      },
    })
  ).id;
});

test.afterAll(async () => {
  if (fallbackProductId) {
    await prisma.product.delete({ where: { id: fallbackProductId } });
  }
  if (customerIds.length) {
    await prisma.authSession.deleteMany({
      where: { userId: { in: customerIds } },
    });
    await prisma.user.deleteMany({ where: { id: { in: customerIds } } });
  }
  await prisma.$disconnect();
});

test("English route renders English navigation and storefront text", async ({
  page,
}) => {
  await page.goto("/en");

  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Your neighborhood market, delivered.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Products", exact: true }),
  ).toBeVisible();
});

test("Sinhala route renders Sinhala text and translated product fields", async ({
  page,
}) => {
  await page.goto("/si");

  await expect(page.locator("html")).toHaveAttribute("lang", "si");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "ඔබේ අසල්වැසි වෙළඳපොළ, නිවසටම.",
    }),
  ).toBeVisible();
  await expect(page.getByText("ලංකා තේ", { exact: true })).toBeVisible();
  await expect(page.getByText("Ceylon Tea", { exact: true })).toHaveCount(0);
});

test("language switcher changes the locale route", async ({ page }) => {
  await page.goto("/en/products");
  await page.getByLabel("Language").selectOption("si");

  await expect(page).toHaveURL(/\/si\/products$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "සියලු නිෂ්පාදන" }),
  ).toBeVisible();
});

test("signed-in customer language preference is remembered", async ({
  page,
}) => {
  const email = `localized-e2e-${Date.now()}@example.test`;
  const password = "SecurePassword123!";
  const registration = await page.request.post("/api/auth/register", {
    data: {
      name: "Localized E2E Customer",
      email,
      phone: "",
      password,
      preferredLanguage: "EN",
    },
  });
  customerIds.push((await registration.json()).data.id);

  await page.goto("/en/account");
  await page.getByLabel("Language").selectOption("si");
  await expect(page).toHaveURL(/\/si\/account$/);
  await expect(page.getByRole("heading", { name: "ඔබේ ගිණුම" })).toBeVisible();

  await page.getByRole("button", { name: "ඉවත් වන්න" }).click();
  await page.context().clearCookies({ name: "ag_stores_locale" });
  await page.goto("/login");
  await page.getByLabel("Email or phone").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { name: "ඔබේ ගිණුම" })).toBeVisible();
  await expect
    .poll(async () => {
      const customer = await prisma.user.findUniqueOrThrow({
        where: { email },
      });
      return customer.preferredLanguage;
    })
    .toBe("SI");
});

test("Sinhala storefront falls back to English for missing product text", async ({
  page,
}) => {
  await page.goto(`/si/products?search=${encodeURIComponent(fallbackName)}`);

  await expect(
    page.getByRole("heading", { level: 3, name: fallbackName }),
  ).toBeVisible();
});
