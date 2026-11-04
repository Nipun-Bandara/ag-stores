import { expect, test } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
const initialPhone = `+9478${String(Math.floor(Math.random() * 10000000)).padStart(7, "0")}`;
const changedPhone = `+9476${String(Math.floor(Math.random() * 10000000)).padStart(7, "0")}`;
const email = `profile-browser-${Date.now()}@example.test`;
const currentPassword = "CurrentPassword123!",
  newPassword = "NewSecurePassword123!";
const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString:
      process.env.TEST_DATABASE_URL ??
      "postgresql://postgres:postgres@127.0.0.1:5432/ag_stores_test",
  }),
});
let userId = "";
test.afterAll(async () => {
  const users = await prisma.user.findMany({
    where: { OR: [{ phone: initialPhone }, { phone: changedPhone }] },
    select: { id: true },
  });
  const ids = users.map(({ id }) => id);
  await prisma.authSession.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
});

test("customer changes mobile and optional email without losing identity, then changes password", async ({
  page,
}) => {
  await page.goto("/auth?mode=register");
  await page.locator("#register-firstName").fill("Profile");
  await page.locator("#register-lastName").fill("Customer");
  await page.locator("#register-phone").fill(initialPhone);
  await page.locator("#register-email").fill(email);
  await page.locator("#register-password").fill(currentPassword);
  await page
    .locator("form:visible")
    .getByRole("button", { name: "Register", exact: true })
    .click();
  await expect(page).toHaveURL(/\/account$/);
  userId = (
    await prisma.user.findUniqueOrThrow({ where: { phone: initialPhone } })
  ).id;
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "My profile" })).toBeVisible();
  await page.getByLabel("First name", { exact: true }).fill("Updated");
  await page.getByLabel("Email (optional)", { exact: true }).fill("");
  await page
    .getByLabel("Mobile number", { exact: true })
    .fill(`0${changedPhone.slice(3)}`);
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(
    page.getByText(
      "Enter your current password to change your mobile number.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.locator("#profile-currentPassword").fill(currentPassword);
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(
    page.getByText("Profile updated.", { exact: true }),
  ).toBeVisible();
  await expect
    .poll(
      async () =>
        (await prisma.user.findUniqueOrThrow({ where: { id: userId } })).phone,
    )
    .toBe(changedPhone);
  expect(
    await prisma.user.findUniqueOrThrow({ where: { id: userId } }),
  ).toMatchObject({ email: null, name: "Updated Customer", role: "CUSTOMER" });
  const security = page.locator("#password");
  await security
    .getByLabel("Current password", { exact: true })
    .fill(currentPassword);
  await security.getByLabel("New password", { exact: true }).fill(newPassword);
  await security
    .getByLabel("Confirm new password", { exact: true })
    .fill(newPassword);
  await security
    .getByRole("button", { name: "Change password", exact: true })
    .click();
  await expect(
    page.getByText("Password changed successfully.", { exact: true }).first(),
  ).toBeVisible();
  await page.locator('[data-slot="sidebar-footer"] button').click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/auth(?:\?|$)/);
  await page.goto("/auth");
  await page.locator("#login-identifier").fill(changedPhone);
  await page.locator("#login-password").fill(newPassword);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(
    page.getByText("Updated Customer", { exact: true }).first(),
  ).toBeVisible();
});
