import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/auth");
  await page.getByLabel("Email or phone").fill("customer@agstores.local");
  await page.getByLabel("Password").fill("ChangeMe123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/account$/);
});

test("customer catalog uses the shared workspace and lists available products", async ({
  page,
}) => {
  await page.goto("/products");

  await expect(
    page.getByRole("link", { name: "Browse products" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "All products" }),
  ).toBeVisible();
  await expect(
    page.getByTestId("product-card").filter({ hasText: "Ceylon Tea" }),
  ).toBeVisible();
  await expect(page.getByText("Unavailable Sample")).toHaveCount(0);
});

test("customer searches products and filters by category", async ({ page }) => {
  await page.goto("/products");
  await page.getByLabel("Search products").fill("ceylon black");
  await page.getByRole("button", { name: "Apply filters" }).click();

  await expect(page.getByText("Ceylon Tea", { exact: true })).toBeVisible();
  await expect(page.getByText("Red Rice 1kg", { exact: true })).toHaveCount(0);

  await page.getByLabel("Search products").fill("");
  await page
    .getByLabel("Category")
    .selectOption({ label: "Groceries · Colombo Fresh Market" });
  await page.getByRole("button", { name: "Apply filters" }).click();

  await expect(page.getByText("Red Rice 1kg", { exact: true })).toBeVisible();
  await expect(page.getByText("Coconut Milk", { exact: true })).toBeVisible();
  await expect(page.getByText("Ceylon Tea", { exact: true })).toHaveCount(0);
});

test("product and category details keep the customer sidebar", async ({
  page,
}) => {
  await page.goto("/products");
  await page
    .getByTestId("product-card")
    .filter({ hasText: "Ceylon Tea" })
    .getByRole("link", { name: "View product" })
    .click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Ceylon Tea" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Browse products" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Beverages" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Beverages" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Browse products" }),
  ).toBeVisible();
});

test("catalog and detail pages fit a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/products");
  await expect(
    page.getByRole("heading", { name: "All products" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  await page
    .getByTestId("product-card")
    .first()
    .getByRole("link", { name: "View product" })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
