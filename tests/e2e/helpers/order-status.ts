import type { Page } from "@playwright/test";

export async function updateOwnerOrderStatus(page: Page, label: string) {
  await page.getByRole("combobox", { name: "Update order status" }).click();
  await page.getByRole("option", { name: label, exact: true }).click();
  await page
    .getByRole("button", { name: "Update status", exact: true })
    .click();
  if (label === "Rejected") {
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Reject order", exact: true })
      .click();
  }
}
