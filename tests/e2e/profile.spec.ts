import { expect, test } from "@playwright/test";

test("customer manages profile and changes password", async ({ page }) => {
  const email = `profile-e2e-${Date.now()}@example.test`;
  const phone = `+94${Date.now().toString().slice(-9)}`;
  const currentPassword = "CurrentPassword123!";
  const newPassword = "NewSecurePassword123!";

  await page.goto("/register");
  await page.getByLabel("Name").fill("Profile E2E Customer");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(currentPassword);
  await page.getByRole("button", { name: "Create customer account" }).click();
  await expect(page).toHaveURL(/\/account$/);

  await page.goto("/account/profile");
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveValue(email);
  await page.getByLabel("Name").fill("Updated E2E Customer");
  await page.getByLabel("Phone").fill(phone);
  await page.getByLabel("Preferred language").selectOption("SI");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status")).toHaveText("Profile updated.");

  await page.getByRole("link", { name: "Security" }).click();
  await page.getByLabel("Current password").fill(currentPassword);
  await page.getByLabel("New password", { exact: true }).fill(newPassword);
  await page.getByLabel("Confirm new password").fill(newPassword);
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Password changed successfully.",
  );

  await page.getByRole("button", { name: "Sign out" }).click();
  await page.getByLabel("Email or phone").fill(email);
  await page.getByLabel("Password").fill(newPassword);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByText("Updated E2E Customer")).toBeVisible();
});
