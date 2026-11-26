import { expect, test } from "@playwright/test";

test("everyone starts at the store Home and can find Log in", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/home$/);

  await page.getByTestId("header-login").click();
  await expect(page).toHaveURL(/\/auth$/);
  await expect(page.getByText("Welcome back", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Back to Home" }).click();
  await expect(page).toHaveURL(/\/home$/);
});

test("the disabled landing page sends visitors to Home", async ({ page }) => {
  await page.goto("/landing");
  await expect(page).toHaveURL(/\/home$/);
});

test("health endpoint returns success", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toMatchObject({
    success: true,
    data: { status: "ok", service: "ag-stores" },
  });
});
