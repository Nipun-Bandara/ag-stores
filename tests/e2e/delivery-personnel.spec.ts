import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { expect, test, type Page } from "@playwright/test";

import { PrismaClient } from "../../src/generated/prisma/client";

const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5432/ag_stores_test";
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});
const suffix = randomUUID();
const email = `delivery-management-${suffix}@example.test`;
const initialName = `Delivery Person ${suffix.slice(0, 8)}`;
const updatedName = `Updated Delivery ${suffix.slice(0, 8)}`;
const digits = suffix.replace(/\D/g, "").padEnd(8, "7").slice(0, 8);
let temporaryPassword = "";

async function signIn(page: Page, identifier: string, destination: string) {
  await page.goto("/login");
  await page.getByLabel("Email or phone").fill(identifier);
  await page.getByLabel("Password").fill("ChangeMe123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(new RegExp(`${destination}$`));
}

test.describe.serial("delivery personnel management", () => {
  test.afterAll(async () => {
    const person = await prisma.user.findUnique({ where: { email } });
    if (person) {
      await prisma.authSession.deleteMany({ where: { userId: person.id } });
      await prisma.user.delete({ where: { id: person.id } });
    }
    await prisma.$disconnect();
  });

  test("owner creates, edits, and deactivates a delivery account", async ({
    page,
  }) => {
    await signIn(page, "owner@agstores.local", "/owner");
    await page.goto("/owner/delivery-personnel");
    await expect(
      page.getByRole("heading", {
        name: "Delivery personnel",
        exact: true,
        level: 1,
      }),
    ).toBeVisible();

    await page.getByLabel("Name").fill(initialName);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Phone").fill(`+9476${digits}`);
    await page.getByRole("button", { name: "Create delivery account" }).click();

    const card = page
      .getByTestId("delivery-person-card")
      .filter({ hasText: initialName });
    await expect(card).toBeVisible();
    await expect(card).toContainText("Active");
    temporaryPassword =
      (await page
        .getByRole("region", { name: "Temporary password" })
        .locator("code")
        .textContent()) ?? "";
    expect(temporaryPassword.length).toBeGreaterThanOrEqual(12);

    await card.getByRole("button", { name: `Edit ${initialName}` }).click();
    await page.getByLabel("Name").fill(updatedName);
    await page.getByLabel("Phone").fill(`+9477${digits}`);
    await page.getByRole("button", { name: "Save delivery person" }).click();

    const updatedCard = page
      .getByTestId("delivery-person-card")
      .filter({ hasText: updatedName });
    await expect(updatedCard).toContainText(`+9477${digits}`);
    await updatedCard
      .getByRole("button", { name: `Deactivate ${updatedName}` })
      .click();
    await expect(updatedCard).toContainText("Inactive");
  });

  test("inactive delivery personnel cannot log in", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email or phone").fill(email);
    await page.getByLabel("Password").fill(temporaryPassword);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByText("Invalid email/phone or password.", { exact: true }),
    ).toBeVisible();
  });

  test("administrator views and reactivates the delivery account", async ({
    page,
  }) => {
    await signIn(page, "admin@agstores.local", "/admin");
    await page.goto("/admin/delivery-personnel");
    await expect(
      page.getByRole("heading", {
        name: "Delivery personnel administration",
      }),
    ).toBeVisible();

    const card = page
      .getByTestId("delivery-person-card")
      .filter({ hasText: updatedName });
    await expect(card).toContainText("Inactive");
    await card.getByRole("button", { name: `Activate ${updatedName}` }).click();
    await expect(card).toContainText("Active");
  });
});
