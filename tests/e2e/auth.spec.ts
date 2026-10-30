import { expect, test } from "@playwright/test";

test.describe.serial("customer authentication", () => {
  const email = `e2e-${Date.now()}@example.test`;
  const password = "SecurePassword123!";

  test("registers, signs in, accesses the account, and signs out", async ({
    page,
  }) => {
    await page.goto("/auth?mode=register");
    await page.getByLabel("Name").fill("E2E Customer");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page
      .locator("form:visible")
      .getByRole("button", { name: "Register", exact: true })
      .click();

    await expect(page).toHaveURL(/\/account$/);
    await expect(
      page.getByRole("heading", { name: "Your account" }),
    ).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();

    await page
      .locator('[data-slot="sidebar-footer"] [data-slot="sidebar-menu-button"]')
      .click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/auth$/);

    await page.getByLabel("Email or phone").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/account$/);
    await expect(
      page.getByRole("heading", { name: "Your account" }),
    ).toBeVisible();

    await page
      .locator('[data-slot="sidebar-footer"] [data-slot="sidebar-menu-button"]')
      .click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await page.goto("/account");
    await expect(page).toHaveURL(/\/auth\?returnTo=%2Faccount$/);
  });
});
