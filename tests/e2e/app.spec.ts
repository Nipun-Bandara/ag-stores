import { expect, test } from "@playwright/test";

test("application loads successfully", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/auth$/);
  await expect(page.getByText("Welcome back", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Back to Home" }).click();
  await expect(page).toHaveURL(/\/landing$/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Shop locally. Follow every order.",
    }),
  ).toBeVisible();
});

test("health endpoint returns success", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toMatchObject({
    success: true,
    data: { status: "ok", service: "ag-stores" },
  });
});
