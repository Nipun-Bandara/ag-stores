import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { AuditLogDetails } from "@/features/admin/components/audit-log-details";
import { presentAuditLog } from "@/features/admin/lib/audit-log-presentation";
import { TooltipProvider } from "@/components/ui/tooltip";
import { translate } from "@/lib/i18n/text";
import type { AuditLogView } from "@/services/audit-log.service";

const log: AuditLogView = {
  id: "audit-id",
  actorId: "actor-id",
  actorName: "Nimal Perera",
  entityId: "shop-id",
  entityName: "Colombo Shop",
  entityType: "SHOP",
  action: "SHOP_UPDATED",
  metadata: {
    changedFields: [
      "latitude",
      "longitude",
      "deliveryFee",
      "maximumDeliveryRadiusKm",
    ],
  },
  createdAt: "2026-10-31T10:40:00Z",
};
const english = (value: string) => value;
afterEach(cleanup);

it("uses names and combines coordinate changes into a readable location label", () => {
  expect(presentAuditLog(log, english)).toMatchObject({
    actor: "Nimal Perera",
    entity: "Colombo Shop",
    action: "Shop details updated",
    entityHref: "/admin/shops/shop-id",
    summary:
      "Updated fields: Map location, Delivery fee (LKR), Maximum delivery radius (km)",
  });
});

it.each([
  "SHOP_STATUS_UPDATED",
  "USER_STATUS_UPDATED",
  "ORDER_STATUS_CHANGED",
] as const)("formats %s status transitions", (action) => {
  expect(
    presentAuditLog(
      {
        ...log,
        action,
        metadata: { previousStatus: "ACTIVE", newStatus: "INACTIVE" },
      },
      english,
    ).summary,
  ).toBe("Status: Active → Inactive");
});

it("formats recorded price and stock values without inventing missing values", () => {
  expect(
    presentAuditLog(
      {
        ...log,
        action: "PRODUCT_PRICE_UPDATED",
        metadata: { previousPrice: "10.00", newPrice: "12.00" },
      },
      english,
    ).summary,
  ).toBe("Price: LKR 10.00 → LKR 12.00");
  expect(
    presentAuditLog(
      {
        ...log,
        action: "PRODUCT_STOCK_UPDATED",
        metadata: { previousQuantity: 5, newQuantity: 0 },
      },
      english,
    ).summary,
  ).toBe("Stock quantity: 5 → 0");
  expect(
    presentAuditLog(
      { ...log, action: "PRODUCT_PRICE_UPDATED", metadata: null },
      english,
    ).summary,
  ).toBe("Price: Not recorded → Not recorded");
});

it("handles unavailable records without pretending their IDs are names or linking deleted shops", () => {
  expect(
    presentAuditLog({ ...log, actorName: null, entityName: null }, english),
  ).toMatchObject({
    actor: "Unavailable account",
    entity: "Unavailable record",
    entityHref: null,
  });
  expect(
    presentAuditLog(
      {
        ...log,
        entityName: null,
        action: "SHOP_CREATED",
        metadata: { name: "Original Shop" },
      },
      english,
    ),
  ).toMatchObject({ entity: "Original Shop", entityHref: null });
});

it("localizes audit summaries in Sinhala", () => {
  const view = presentAuditLog(log, (value) => translate("si", value));
  expect(view.actor).toBe("Nimal Perera");
  expect(view.action).toBe("වෙළඳසැලේ විස්තර යාවත්කාලීන කරන ලදී");
  expect(view.summary).toContain("සිතියම් ස්ථානය");
  expect(view.summary).not.toContain("deliveryFee");
});

it("keeps original IDs and metadata available in a details dialog", async () => {
  render(
    <TooltipProvider>
      <AuditLogDetails log={log} />
    </TooltipProvider>,
  );
  expect(screen.queryByText("actor-id")).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", {
      name: "View audit details: Shop details updated",
    }),
  );
  expect(await screen.findByRole("dialog")).toBeVisible();
  expect(screen.getByText("actor-id")).toBeVisible();
  expect(screen.getByText("SHOP_UPDATED")).toBeVisible();
  expect(screen.getByText(/"changedFields"/)).toHaveTextContent(
    '"deliveryFee"',
  );
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
