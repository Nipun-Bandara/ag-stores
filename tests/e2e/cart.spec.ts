import { expect, test } from "@playwright/test";

test("customer manages a cart and receives a server-verified subtotal", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto("/login");
  await page.getByLabel("Email or phone").fill("customer@agstores.local");
  await page.getByLabel("Password").fill("ChangeMe123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/account$/);

  await page.goto("/products");
  const rice = page
    .getByTestId("product-card")
    .filter({ hasText: "Red Rice 1kg" });
  await rice.getByRole("button", { name: "Add Red Rice 1kg to cart" }).click();
  await rice.getByRole("button", { name: "Add Red Rice 1kg to cart" }).click();
  await expect(
    page.getByRole("link", { name: "Cart with 2 items" }),
  ).toBeVisible();
  await page.goto("/cart", { timeout: 60_000 });

  await expect(page.getByTestId("cart-item")).toHaveCount(1);
  await expect(page.getByLabel("Quantity for Red Rice 1kg")).toHaveValue("2");
  await expect(page.getByTestId("cart-subtotal")).toHaveText("LKR 840.00");

  await page.getByLabel("Quantity for Red Rice 1kg").fill("3");
  await expect(page.getByTestId("cart-subtotal")).toHaveText("LKR 1260.00");

  await page
    .getByRole("button", { name: "Validate cart for checkout" })
    .click();
  await expect(page.getByRole("status")).toHaveText(
    "Current server-verified subtotal: LKR 1260.00",
    { timeout: 30_000 },
  );

  await page.getByRole("button", { name: "Remove Red Rice 1kg" }).click();
  await expect(page.getByText("Your cart is empty")).toBeVisible();

  await page.goto("/products");
  const tea = page
    .getByTestId("product-card")
    .filter({ hasText: "Ceylon Tea" });
  await tea.getByRole("button", { name: "Add Ceylon Tea to cart" }).click();
  await expect(
    page.getByRole("link", { name: "Cart with 1 item" }),
  ).toBeVisible();
  await page.goto("/cart", { timeout: 60_000 });
  await page.getByRole("button", { name: "Clear cart" }).click();
  await expect(page.getByText("Your cart is empty")).toBeVisible();
});

test("zero-stock products cannot be added", async ({ page }) => {
  await page.goto("/products");
  const product = page
    .getByTestId("product-card")
    .filter({ hasText: "Coconut Milk" });
  await expect(
    product.getByRole("button", { name: "Add Coconut Milk to cart" }),
  ).toBeDisabled();
});
