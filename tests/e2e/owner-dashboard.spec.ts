import { expect, test } from "@playwright/test";

test("owner dashboard displays useful shop summary cards", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email or phone").fill("owner@agstores.local");
  await page.getByLabel("Password").fill("ChangeMe123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/owner$/);

  for (const label of [
    "Orders today",
    "Pending orders",
    "Preparing",
    "Ready for delivery",
    "Out for delivery",
    "Delivered today",
    "Today's revenue",
    "Low-stock products",
  ]) {
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
  }
  await expect(
    page.getByTestId("owner-dashboard-metric-revenue-today"),
  ).toContainText(/^Today's revenueLKR \d+\.\d{2}$/);
  await expect(
    page.getByRole("heading", { name: "Low-stock products" }),
  ).toBeVisible();
});
