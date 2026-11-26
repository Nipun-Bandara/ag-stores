import { expect, test } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
const phone = `+9478${String(Math.floor(Math.random() * 10000000)).padStart(7, "0")}`;
const localPhone = `0${phone.slice(3)}`;
const password = "SecurePassword123!";
const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString:
      process.env.TEST_DATABASE_URL ??
      "postgresql://postgres:postgres@127.0.0.1:5432/ag_stores_test",
  }),
});
test.afterAll(async () => {
  const user = await prisma.user.findUnique({ where: { phone } });
  if (user) {
    await prisma.authSession.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
  await prisma.$disconnect();
});

test("registers without email, signs in by local mobile and signs out", async ({
  page,
}) => {
  await page.goto("/auth?mode=register");
  await page.locator("#register-firstName").fill("Browser");
  await page.locator("#register-lastName").fill("Customer");
  await page.locator("#register-phone").fill(localPhone);
  await page.locator("#register-password").fill(password);
  await page
    .locator("form:visible")
    .getByRole("button", { name: "Register", exact: true })
    .click();
  await expect(page).toHaveURL(/\/products$/);
  expect(await prisma.user.findUnique({ where: { phone } })).toMatchObject({
    email: null,
    firstName: "Browser",
    lastName: "Customer",
  });
  await page.locator('[data-slot="sidebar-footer"] button').click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/auth(?:\?|$)/);
  await page.goto("/auth");
  await page.locator("#login-identifier").fill(localPhone);
  await page.locator("#login-password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/products$/);
  await expect(
    page.getByRole("heading", { name: "All products" }),
  ).toBeVisible();
});
