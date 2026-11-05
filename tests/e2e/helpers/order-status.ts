import type { Page } from "@playwright/test";

export async function updateOwnerOrderStatus(page: Page, label: string) {
  await page.getByRole("combobox", { name: "Update order status" }).click();
  await page.getByRole("option", { name: label, exact: true }).click();
  await page
    .getByRole("button", { name: "Update status", exact: true })
    .click();
}
