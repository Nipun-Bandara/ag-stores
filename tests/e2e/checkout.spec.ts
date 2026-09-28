import { expect, test } from "@playwright/test";

test("customer places a Cash on Delivery order", async ({ page }) => {
  const email = `checkout-e2e-${Date.now()}@example.test`;

  await page.goto("/register");
  await page.getByLabel("Name").fill("Checkout E2E Customer");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("SecurePassword123!");
  await page.getByRole("button", { name: "Create customer account" }).click();
  await expect(page).toHaveURL(/\/account$/);

  await page.goto("/account/addresses");
  await page.getByLabel("Label").fill("Home");
  await page.getByLabel("Address", { exact: true }).fill("10 Checkout Lane");
  await page.getByLabel("Latitude").fill("6.927079");
  await page.getByLabel("Longitude").fill("79.861244");
  await page.getByRole("button", { name: "Add address" }).click();
  await expect(
    page.getByRole("article").filter({ hasText: "10 Checkout Lane" }),
  ).toBeVisible();

  await page.goto("/products");
  const rice = page
    .getByTestId("product-card")
    .filter({ hasText: "Red Rice 1kg" });
  await rice.getByRole("button", { name: "Add Red Rice 1kg to cart" }).click();
  await page.goto("/cart");
  await page.getByRole("link", { name: "Proceed to checkout" }).click();

  await expect(page.getByRole("heading", { name: "Checkout" })).toBeVisible();
  await expect(page.getByText("10 Checkout Lane")).toBeVisible();
  await expect(page.getByTestId("checkout-item")).toContainText("Red Rice 1kg");
  await expect(page.getByTestId("checkout-subtotal")).toHaveText("LKR 420.00");
  await expect(page.getByTestId("checkout-delivery-fee")).toHaveText(
    "LKR 250.00",
  );
  await expect(page.getByTestId("checkout-total")).toHaveText("LKR 670.00");
  await page
    .getByLabel("Delivery instructions (optional)")
    .fill("Please call at the gate");
  await page
    .getByRole("button", { name: "Confirm Cash on Delivery order" })
    .click();

  await expect(page).toHaveURL(/\/orders\/[0-9a-f-]+$/);
  await expect(
    page.getByRole("heading", { name: "Thank you for your order" }),
  ).toBeVisible();
  await expect(page.getByText("Cash on Delivery")).toBeVisible();
  await expect(page.getByTestId("confirmed-total")).toHaveText("LKR 670.00");
  await expect(page.getByText("Please call at the gate")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Cart with 0 items" }),
  ).toBeVisible();
});

test("anonymous customer cannot open checkout", async ({ page }) => {
  await page.goto("/checkout");
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fcheckout$/);
});
