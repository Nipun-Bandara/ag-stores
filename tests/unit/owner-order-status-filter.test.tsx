import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import OwnerOrdersPage from "@/app/(ui)/(shop-owner)/owner/orders/page";

vi.mock("@/lib/auth/server", () => ({
  requireRole: async () => ({ id: "owner" }),
}));
vi.mock("@/lib/i18n/server", () => ({
  getServerText: async () => (value: string) => value,
}));
vi.mock("@/services/owner-order.service", () => ({
  getOwnerOrderDashboard: async () => ({ summaries: [], orders: [] }),
}));
afterEach(cleanup);

it.each([
  ["", "All statuses"],
  ["READY_FOR_DELIVERY", "Ready for delivery"],
])("shows a readable initial status for %s", async (status, label) => {
  const { container } = render(
    await OwnerOrdersPage({
      searchParams: Promise.resolve({ status: status! }),
    }),
  );
  expect(screen.getByRole("combobox", { name: "Status" })).toHaveTextContent(
    label!,
  );
  expect(new FormData(container.querySelector("form")!).get("status")).toBe(
    status,
  );
});

it("submits the status code while showing its readable label", async () => {
  const { container } = render(
    await OwnerOrdersPage({ searchParams: Promise.resolve({}) }),
  );
  fireEvent.click(screen.getByRole("combobox", { name: "Status" }));
  const option = await screen.findByRole("option", {
    name: "Out for delivery",
  });
  fireEvent.pointerDown(option, { pointerType: "mouse" });
  fireEvent.click(option);
  expect(screen.getByRole("combobox", { name: "Status" })).toHaveTextContent(
    "Out for delivery",
  );
  expect(new FormData(container.querySelector("form")!).get("status")).toBe(
    "OUT_FOR_DELIVERY",
  );
});
