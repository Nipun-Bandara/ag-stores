import { expect, test } from "@playwright/test";

test("landing language picker switches between English and Sinhala", async ({
  page,
}) => {
  await page.goto("/en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Shop locally. Follow every order.",
  );

  await page.getByRole("combobox", { name: "Language" }).first().click();
  await page.getByRole("option", { name: "සිංහල" }).click();

  await expect(page).toHaveURL(/\/si$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "si");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "දේශීයව මිලදී ගන්න. සෑම ඇණවුමක්ම නිරීක්ෂණය කරන්න.",
  );
});

test("auth page uses the selected locale and keeps its own language picker", async ({
  page,
}) => {
  await page.goto("/si/auth");
  await expect(page.locator("html")).toHaveAttribute("lang", "si");
  await expect(page.getByRole("combobox", { name: "භාෂාව" })).toBeVisible();
  await expect(
    page.getByText("නැවත සාදරයෙන් පිළිගනිමු", { exact: true }),
  ).toBeVisible();

  await page.goto("/si/auth?mode=register");
  await expect(
    page.getByRole("combobox", { name: "කැමති භාෂාව" }),
  ).toContainText("සිංහල");
});

test("small-screen landing menu can switch languages", async ({ page }) => {
  for (const width of [390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/en");
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("combobox", { name: "Language" }).click();
    await page.getByRole("option", { name: "සිංහල" }).click();
    await expect(page).toHaveURL(/\/si$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "දේශීයව මිලදී ගන්න. සෑම ඇණවුමක්ම නිරීක්ෂණය කරන්න.",
    );
  }
});
