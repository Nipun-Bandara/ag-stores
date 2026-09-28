import { expect, test } from "@playwright/test";

test("shop owner creates, views, edits, stocks, and disables a product", async ({
  page,
}) => {
  const suffix = Date.now().toString();
  const originalName = `E2E Product ${suffix}`;
  const updatedName = `Updated E2E Product ${suffix}`;

  await page.goto("/login");
  await page.getByLabel("Email or phone").fill("owner@agstores.local");
  await page.getByLabel("Password").fill("ChangeMe123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/owner$/);

  await page.getByRole("link", { name: "Products" }).click();
  await page.getByRole("link", { name: "Add product" }).click();
  await expect(page).toHaveURL(/\/owner\/products\/new$/);

  await page.getByLabel("Category").selectOption({ label: "Groceries" });
  await page.getByLabel("English name").fill(originalName);
  await page.getByLabel("Sinhala name").fill("පරීක්ෂණ නිෂ්පාදනය");
  await page.getByLabel("English description").fill(`Search ${suffix}`);
  await page.getByLabel("Price").fill("250.75");
  await page.getByLabel("Stock quantity").fill("8");
  await page
    .getByLabel("Image URL")
    .fill("https://example.test/product-image.jpg");
  await page.getByRole("button", { name: "Create product" }).click();
  await expect(page).toHaveURL(/\/owner\/products$/);

  let product = page.getByRole("article").filter({ hasText: originalName });
  await expect(product.getByText("250.75")).toBeVisible();
  await product.getByRole("link", { name: `Edit ${originalName}` }).click();

  await page.getByLabel("English name").fill(updatedName);
  await page.getByLabel("Price").fill("275.50");
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page).toHaveURL(/\/owner\/products$/);

  product = page.getByRole("article").filter({ hasText: updatedName });
  await expect(product.getByText("275.50")).toBeVisible();
  await product.getByLabel("Stock").fill("15");
  await product.getByRole("button", { name: "Update stock" }).click();
  await expect(product.getByText("15", { exact: true })).toBeVisible();

  await product.getByRole("button", { name: "Mark unavailable" }).click();
  await expect(product.getByText("Unavailable")).toBeVisible();

  await page.getByLabel("Search").fill(updatedName);
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(product).toBeVisible();
});
