import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { expect, test, type Page } from "@playwright/test";

import {
  PrismaClient,
  UserRole,
  UserStatus,
} from "../../src/generated/prisma/client";
import { hashPassword } from "../../src/lib/auth/password";

const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5432/ag_stores_test";
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});
const suffix = randomUUID();
const name = `Admin UI Customer ${suffix.slice(0, 8)}`;
const email = `admin-ui-${suffix}@example.test`;
let userId = "";

async function signIn(page: Page, emailAddress: string, destination: string) {
  await page.goto("/login");
  await page.getByLabel("Email or phone").fill(emailAddress);
  await page.getByLabel("Password").fill("ChangeMe123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(new RegExp(`${destination}$`));
}

test.describe.serial("admin user management", () => {
  test.beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone: `+9479${suffix.replace(/\D/g, "").padEnd(8, "5").slice(0, 8)}`,
        passwordHash: await hashPassword("ChangeMe123!"),
        role: UserRole.CUSTOMER,
      },
    });
    userId = user.id;
  });

  test.afterAll(async () => {
    if (userId) {
      await prisma.authSession.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    await prisma.$disconnect();
  });

  test("administrator searches, filters, views, and updates an account", async ({
    page,
  }) => {
    await signIn(page, "admin@agstores.local", "/admin");
    await page.goto("/admin/users");
    await expect(
      page.getByRole("heading", { name: "User management" }),
    ).toBeVisible();

    await page.getByLabel("Search users").fill(name);
    await page.getByLabel("Role").selectOption(UserRole.CUSTOMER);
    await page.getByLabel("Status").selectOption(UserStatus.ACTIVE);
    await page.getByRole("button", { name: "Apply filters" }).click();

    const row = page.getByTestId("admin-user-row").filter({ hasText: name });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText("Customer");
    await expect(row).toContainText("Active");

    await row.getByRole("link", { name }).click();
    await expect(page).toHaveURL(`/admin/users/${userId}`);
    await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
    await expect(page.getByText("passwordHash")).toHaveCount(0);

    await page.getByRole("button", { name: `Deactivate ${name}` }).click();
    await expect(
      page.getByRole("button", { name: `Activate ${name}` }),
    ).toBeVisible();

    await page.getByRole("button", { name: `Activate ${name}` }).click();
    await expect(
      page.getByRole("button", { name: `Deactivate ${name}` }),
    ).toBeVisible();
  });

  test("customer cannot access admin user management", async ({ page }) => {
    await signIn(page, "customer@agstores.local", "/account");
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/forbidden$/);
  });
});
