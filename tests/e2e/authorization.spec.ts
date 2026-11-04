import { mobileForTestAccount } from "./helpers/accounts";
import { expect, test, type Page } from "@playwright/test";

const password = "ChangeMe123!";

async function signIn(page: Page, email: string, expectedPath: string) {
  await page.goto("/en/auth");
  await page
    .locator("#login-identifier")
    .fill(await mobileForTestAccount(email));
  await page
    .locator("form:visible")
    .getByLabel("Password", { exact: true })
    .fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(new RegExp(`${expectedPath}$`));
}

test.describe.serial("role-based page authorization", () => {
  test("every role has the shared My profile page", async ({ page }) => {
    for (const [email, path] of [
      ["customer@agstores.local", "/account"],
      ["owner@agstores.local", "/owner"],
      ["delivery@agstores.local", "/delivery"],
      ["admin@agstores.local", "/admin"],
    ]) {
      await page.context().clearCookies();
      await signIn(page, email!, path!);
      await expect(
        page
          .locator('[data-slot="sidebar-content"]')
          .getByRole("link", { name: "My profile", exact: true }),
      ).toBeVisible();
      await page.goto("/en/profile");
      await expect(
        page.getByRole("heading", { name: "My profile", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByLabel("First name", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByLabel("Mobile number", { exact: true }),
      ).toHaveValue(await mobileForTestAccount(email!));
      await expect(
        page.locator('input[name="role"],select[name="role"]'),
      ).toHaveCount(0);
    }
  });
  test("anonymous users are redirected from every protected dashboard", async ({
    page,
  }) => {
    for (const path of ["/account", "/owner", "/delivery", "/admin"]) {
      await page.goto(path);
      await expect(page).toHaveURL(
        new RegExp(`/auth\\?returnTo=${encodeURIComponent(path)}$`),
      );
    }
  });

  test("customer accesses account but not owner or admin", async ({ page }) => {
    await signIn(page, "customer@agstores.local", "/account");
    await expect(
      page.getByRole("heading", { name: "Your account" }),
    ).toBeVisible();

    await page.goto("/owner");
    await expect(page).toHaveURL(/\/forbidden$/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/forbidden$/);
  });

  test("delivery person accesses delivery but not owner", async ({ page }) => {
    await page.context().clearCookies();
    await signIn(page, "delivery@agstores.local", "/delivery");
    await expect(
      page.getByRole("heading", { name: "Delivery dashboard" }),
    ).toBeVisible();

    await page.goto("/owner");
    await expect(page).toHaveURL(/\/forbidden$/);
  });

  test("owner accesses owner but not admin", async ({ page }) => {
    await page.context().clearCookies();
    await signIn(page, "owner@agstores.local", "/owner");
    await expect(
      page.getByRole("heading", { name: "Shop owner dashboard" }),
    ).toBeVisible();

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/forbidden$/);
  });

  test("admin accesses the admin dashboard", async ({ page }) => {
    await page.context().clearCookies();
    await signIn(page, "admin@agstores.local", "/admin");
    await expect(
      page.getByRole("heading", { name: "Administration dashboard" }),
    ).toBeVisible();
  });
});
