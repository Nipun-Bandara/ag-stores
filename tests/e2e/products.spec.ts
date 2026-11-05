import { mobileForTestAccount } from "./helpers/accounts";
import { expect, test } from "@playwright/test";

test("shop owner creates, views, edits, stocks, and disables a product", async ({
  page,
}) => {
  const suffix = Date.now().toString();
  const originalName = `E2E Product ${suffix}`;
  const updatedName = `Updated E2E Product ${suffix}`;

  await page.goto("/auth");
  await page
    .locator("#login-identifier")
    .fill(await mobileForTestAccount("owner@agstores.local"));
  await page
    .locator("form:visible")
    .getByLabel("Password", { exact: true })
    .fill("ChangeMe123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/owner$/);

  await page.getByRole("link", { name: "Products" }).click();
  await page.getByRole("link", { name: "Add product" }).click();
  await expect(page).toHaveURL(/\/owner\/products\/new$/);

  await page.getByRole("combobox", { name: "Shop" }).click();
  await page.getByRole("option", { name: "Colombo Fresh Market" }).click();
  await page.getByRole("combobox", { name: "Category" }).click();
  await page.getByRole("option", { name: "Groceries" }).click();
  await page.getByLabel("English name").fill(originalName);
  await page.getByLabel("Item code").fill(`E2E-${suffix}`);
  await page.getByLabel("Sinhala name").fill("පරීක්ෂණ නිෂ්පාදනය");
  await page.getByLabel("English description").fill(`Search ${suffix}`);
  await page.getByLabel("Regular price").fill("250.75");
  await page.getByLabel("Stock quantity").fill("8");
  await page.getByLabel("Choose photo").setInputFiles({
    name: "preview.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z7b4AAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(
    page.getByRole("img", { name: "Product photo preview" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Remove photo" }).click();
  await expect(page.getByLabel("English name")).toHaveValue(originalName);
  await page.getByRole("button", { name: "Create product" }).click();
  await expect(page).toHaveURL(/\/owner\/products$/);

  let product = page.getByRole("article").filter({ hasText: originalName });
  await expect(product.getByText(/Our price: LKR 250\.75/)).toBeVisible();
  await product.getByRole("link", { name: `Edit ${originalName}` }).click();

  await page.getByLabel("English name").fill(updatedName);
  await page.getByLabel("Regular price").fill("275.50");
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page).toHaveURL(/\/owner\/products$/);

  product = page.getByRole("article").filter({ hasText: updatedName });
  await expect(product.getByText(/Our price: LKR 275\.50/)).toBeVisible();
  await product.getByRole("spinbutton", { name: "Stock (units)" }).fill("15");
  await product.getByLabel("Low-stock threshold").fill("20");
  await product.getByRole("button", { name: "Update stock" }).click();
  await expect(
    product.getByRole("spinbutton", { name: "Stock (units)" }),
  ).toHaveValue("15");
  await expect(product.getByTestId("inventory-status")).toHaveText("Low stock");

  await page.getByRole("combobox", { name: "Inventory" }).click();
  await page.getByRole("option", { name: "Low stock" }).click();
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(product).toBeVisible();

  await product
    .getByRole("button", { name: `Mark unavailable ${updatedName}` })
    .click();
  await expect(product.getByText("Unavailable")).toBeVisible();

  await page.getByLabel("Search").fill(updatedName);
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(product).toBeVisible();
});
