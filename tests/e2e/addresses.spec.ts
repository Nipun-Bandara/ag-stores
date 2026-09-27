import { expect, test } from "@playwright/test";

test("customer creates, edits, defaults, and deletes delivery addresses", async ({
  page,
}) => {
  const email = `address-e2e-${Date.now()}@example.test`;

  await page.goto("/register");
  await page.getByLabel("Name").fill("Address E2E Customer");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("SecurePassword123!");
  await page.getByRole("button", { name: "Create customer account" }).click();
  await expect(page).toHaveURL(/\/account$/);

  await page.getByRole("link", { name: "Addresses", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Delivery addresses" }),
  ).toBeVisible();

  await page.getByLabel("Label").fill("Home");
  await page.getByLabel("Address", { exact: true }).fill("1 Main Street");
  await page.getByLabel("Latitude").fill("6.927079");
  await page.getByLabel("Longitude").fill("79.861244");
  await page.getByRole("button", { name: "Add address" }).click();

  const home = page.getByRole("article").filter({ hasText: "Home" });
  await expect(home.getByText("Default")).toBeVisible();

  await page.getByLabel("Label").fill("Office");
  await page.getByLabel("Address", { exact: true }).fill("2 Work Road");
  await page.getByLabel("Latitude").fill("6.901234");
  await page.getByLabel("Longitude").fill("79.876543");
  await page.getByRole("button", { name: "Add address" }).click();

  const office = page.getByRole("article").filter({ hasText: "Office" });
  await office.getByRole("button", { name: "Make Office default" }).click();
  await expect(office.getByText("Default")).toBeVisible();

  await office.getByRole("button", { name: "Edit Office" }).click();
  await page
    .getByLabel("Address", { exact: true })
    .fill("20 Updated Work Road");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(office.getByText("20 Updated Work Road")).toBeVisible();

  await home.getByRole("button", { name: "Delete Home" }).click();
  await expect(home).toHaveCount(0);
});
