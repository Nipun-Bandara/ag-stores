import { expect, test, type Page } from "@playwright/test";

const password = "ChangeMe123!";

async function signIn(page: Page, email: string, expectedPath: string) {
  await page.goto("/login");
  await page.getByLabel("Email or phone").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(new RegExp(`${expectedPath}$`));
}

test.describe.serial("role-based page authorization", () => {
  test("anonymous users are redirected from every protected dashboard", async ({
    page,
  }) => {
    for (const path of ["/account", "/owner", "/delivery", "/admin"]) {
      await page.goto(path);
      await expect(page).toHaveURL(
        new RegExp(`/login\\?returnTo=${encodeURIComponent(path)}$`),
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
