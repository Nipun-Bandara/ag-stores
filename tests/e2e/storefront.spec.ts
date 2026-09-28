import { expect, test } from "@playwright/test";

test("storefront renders active categories and available products", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByTestId("category-card").first()).toBeVisible();
  await expect(
    page
      .getByTestId("category-card")
      .filter({ hasText: "Groceries" })
      .getByRole("heading", { name: "Groceries" }),
  ).toBeVisible();
  await expect(page.getByText("Seasonal", { exact: true })).toHaveCount(0);
  await expect(
    page
      .getByTestId("product-card")
      .filter({ hasText: "Ceylon Tea" })
      .getByRole("heading", { name: "Ceylon Tea" }),
  ).toBeVisible();
  await expect(page.getByText("Unavailable Sample")).toHaveCount(0);
  await expect(page.getByText("Inactive Category Sample")).toHaveCount(0);

  const zeroStockProduct = page
    .getByTestId("product-card")
    .filter({ hasText: "Coconut Milk" });
  await expect(zeroStockProduct.getByText("Out of Stock")).toBeVisible();
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

test("customer views category and product details", async ({ page }) => {
  await page.goto("/");
  await page
    .getByTestId("category-card")
    .filter({ hasText: "Beverages" })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Beverages" }),
  ).toBeVisible();

  const tea = page
    .getByTestId("product-card")
    .filter({ hasText: "Ceylon Tea" });
  await tea.getByRole("link", { name: "View product" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Ceylon Tea" }),
  ).toBeVisible();
  await expect(page.getByText("LKR 680.00")).toBeVisible();
  await expect(page.getByText("30 in stock")).toBeVisible();
});

test("storefront pages render without horizontal overflow on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });

  for (const path of ["/", "/products"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }

  const firstProduct = page.getByTestId("product-card").first();
  await firstProduct.getByRole("link", { name: "View product" }).click();
  await expect(page.locator("main")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
