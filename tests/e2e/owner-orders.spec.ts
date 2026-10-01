import { expect, test, type Page } from "@playwright/test";

const password = "ChangeMe123!";
let customerEmail: string;
let customerName: string;
let workflowOrderId: string;
let rejectedOrderId: string;

async function signIn(page: Page, email: string, expectedPath: string) {
  await page.goto("/login");
  await page.getByLabel("Email or phone").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(new RegExp(`${expectedPath}$`));
}

async function placeOrder(page: Page): Promise<string> {
  await page.goto("/products");
  const product = page
    .getByTestId("product-card")
    .filter({ hasText: "Red Rice 1kg" });
  await product
    .getByRole("button", { name: "Add Red Rice 1kg to cart" })
    .click();
  await page.goto("/cart");
  await page.getByRole("link", { name: "Proceed to checkout" }).click();
  await page
    .getByRole("button", { name: "Confirm Cash on Delivery order" })
    .click();
  await expect(page).toHaveURL(/\/orders\/[0-9a-f-]+$/);
  return page.url().split("/").at(-1) ?? "";
}

test.describe.serial("owner order management", () => {
  test("creates customer orders for owner management", async ({ page }) => {
    const suffix = Date.now().toString();
    customerEmail = `owner-orders-e2e-${suffix}@example.test`;
    customerName = `Owner Orders Customer ${suffix}`;

    await page.goto("/register");
    await page.getByLabel("Name").fill(customerName);
    await page.getByLabel("Email").fill(customerEmail);
    await page.getByLabel("Password").fill("SecurePassword123!");
    await page.getByRole("button", { name: "Create customer account" }).click();
    await expect(page).toHaveURL(/\/account$/);

    await page.goto("/account/addresses");
    await page.getByLabel("Label").fill("Owner Order E2E");
    await page
      .getByLabel("Address", { exact: true })
      .fill("70 Owner Order Lane");
    await page.getByLabel("Latitude").fill("6.927079");
    await page.getByLabel("Longitude").fill("79.861244");
    await page.getByRole("button", { name: "Add address" }).click();

    workflowOrderId = await placeOrder(page);
    rejectedOrderId = await placeOrder(page);
    expect(workflowOrderId).not.toBe(rejectedOrderId);
  });

  test("owner filters orders and completes the shop preparation workflow", async ({
    page,
  }) => {
    await page.context().clearCookies();
    await signIn(page, "owner@agstores.local", "/owner");
    await page.getByRole("link", { name: "Orders" }).click();

    await page.getByLabel("Customer").fill(customerName);
    await page.getByRole("button", { name: "Apply filters" }).click();
    const cards = page.getByTestId("owner-order-card");
    await expect(cards).toHaveCount(2);

    await page.getByLabel("Customer").fill("");
    await page.getByLabel("Order number").fill(workflowOrderId);
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText(workflowOrderId);
    await cards.first().getByRole("link", { name: "View order" }).click();

    await page.getByRole("button", { name: "Confirm order" }).click();
    await expect(
      page.getByText("Confirmed", { exact: true }).first(),
    ).toBeVisible();
    await page.getByRole("button", { name: "Mark preparing" }).click();
    await expect(
      page.getByText("Preparing", { exact: true }).first(),
    ).toBeVisible();
    await page.getByRole("button", { name: "Mark ready for delivery" }).click();
    await expect(
      page.getByText("Ready for delivery", { exact: true }).first(),
    ).toBeVisible();
  });

  test("owner rejects a placed order", async ({ page }) => {
    await signIn(page, "owner@agstores.local", "/owner");
    await page.goto(`/owner/orders/${rejectedOrderId}`);
    await page.getByRole("button", { name: "Reject order" }).click();
    await expect(
      page.getByText("Rejected", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Confirm order" }),
    ).toHaveCount(0);
  });

  test("customer cannot access owner pages or APIs", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByLabel("Email or phone").fill(customerEmail);
    await page.getByLabel("Password").fill("SecurePassword123!");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/account$/);

    const apiStatus = await page.evaluate(async () =>
      fetch("/api/owner/orders").then((response) => response.status),
    );
    expect(apiStatus).toBe(403);

    await page.goto("/owner/orders");
    await expect(page).toHaveURL(/\/forbidden$/);
  });
});
