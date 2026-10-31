import { PrismaPg } from "@prisma/adapter-pg";
import { expect, test, type Page } from "@playwright/test";

import {
  AuditAction,
  AuditEntityType,
  PrismaClient,
} from "../../src/generated/prisma/client";

const databaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5432/ag_stores_test";
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});
let auditLogId = "";
let shopName = "";
let administratorName = "";

async function signIn(page: Page, email: string, destination: string) {
  await page.goto("/auth");
  await page.getByLabel("Email or phone").fill(email);
  await page.getByLabel("Password").fill("ChangeMe123!");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(new RegExp(`${destination}$`));
}

test.describe.serial("admin audit logs", () => {
  test.beforeAll(async () => {
    const [administrator, shop] = await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { email: "admin@agstores.local" },
      }),
      prisma.shop.findFirstOrThrow(),
    ]);
    shopName = shop.name;
    administratorName = administrator.name;
    auditLogId = (
      await prisma.auditLog.create({
        data: {
          actorId: administrator.id,
          action: AuditAction.SHOP_UPDATED,
          entityType: AuditEntityType.SHOP,
          entityId: shop.id,
          metadata: { changedFields: ["deliveryFee"] },
        },
      })
    ).id;
  });

  test.afterAll(async () => {
    if (auditLogId) {
      await prisma.auditLog.deleteMany({ where: { id: auditLogId } });
    }
    await prisma.$disconnect();
  });

  test("administrator views audit records", async ({ page }) => {
    await signIn(page, "admin@agstores.local", "/admin");
    await page.goto("/admin/audit-logs");

    await expect(
      page.getByRole("heading", { name: "Audit logs" }),
    ).toBeVisible();
    const row = page
      .getByTestId("audit-log-row")
      .filter({ hasText: "Updated fields: Delivery fee (LKR)" })
      .filter({ hasText: shopName })
      .first();
    await expect(row).toContainText("Shop details updated");
    await expect(row).toContainText(administratorName);
    await expect(row).not.toContainText("SHOP_UPDATED");
    await row
      .getByRole("button", { name: "View audit details: Shop details updated" })
      .click();
    const details = page.getByRole("dialog");
    await expect(details).toContainText("SHOP_UPDATED");
    await expect(details).toContainText('"deliveryFee"');
    await expect(details).toContainText(auditLogId);
    await expect(page.getByText(/passwordHash/i)).toHaveCount(0);
  });

  test("customer cannot access audit records", async ({ page }) => {
    await page.context().clearCookies();
    await signIn(page, "customer@agstores.local", "/account");
    await page.goto("/admin/audit-logs");
    await expect(page).toHaveURL(/\/forbidden$/);
  });
});
