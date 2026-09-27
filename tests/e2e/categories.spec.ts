import { expect, test } from "@playwright/test";

test("shop owner creates, edits, and deactivates a category", async ({
  page,
}) => {
  const suffix = Date.now().toString();
  const originalName = `E2E Category ${suffix}`;
  const updatedName = `Updated E2E Category ${suffix}`;

  await page.goto("/login");
  await page.getByLabel("Email or phone").fill("owner@agstores.local");
  await page.getByLabel("Password").fill("ChangeMe123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/owner$/);

  await page.getByRole("link", { name: "Categories" }).click();
  await expect(
    page.getByRole("heading", { name: "Product categories" }),
  ).toBeVisible();

  await page.getByLabel("English name").fill(originalName);
  await page.getByLabel("Sinhala name").fill("පරීක්ෂණ කාණ්ඩය");
  await page.getByRole("button", { name: "Create category" }).click();

  const originalCategory = page
    .getByRole("article")
    .filter({ hasText: originalName });
  await expect(originalCategory.getByText("Active")).toBeVisible();

  await originalCategory
    .getByRole("button", { name: `Edit ${originalName}` })
    .click();
  await page.getByLabel("English name").fill(updatedName);
  await page.getByRole("button", { name: "Save category" }).click();

  const updatedCategory = page
    .getByRole("article")
    .filter({ hasText: updatedName });
  await expect(updatedCategory).toBeVisible();
  await updatedCategory
    .getByRole("button", { name: `Deactivate ${updatedName}` })
    .click();
  await expect(updatedCategory.getByText("Inactive")).toBeVisible();
});
