import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminShopForm } from "@/features/admin/components/admin-shop-form";
import { AdminShopStatusControl } from "@/features/admin/components/admin-shop-status-control";
import type { AdminShopView } from "@/services/admin-shop.service";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  fetch: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => mocks }));
vi.mock("sonner", () => ({ toast: mocks }));
vi.mock(
  "@/features/maps/components/location-picker",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("@/features/maps/components/location-picker")
    >()),
    LocationPicker: ({
      value,
      onChange,
    }: {
      value: { latitude: number; longitude: number } | null;
      onChange: (value: { latitude: number; longitude: number }) => void;
    }) => (
      <>
        <input type="hidden" name="latitude" value={value?.latitude ?? ""} />
        <input type="hidden" name="longitude" value={value?.longitude ?? ""} />
        <button
          type="button"
          onClick={() => onChange({ latitude: 6.927079, longitude: 79.861244 })}
        >
          Choose test location
        </button>
      </>
    ),
  }),
);

const owner = {
  id: "owner-id",
  name: "Shop Owner",
  email: "owner@example.com",
};
const shop: AdminShopView = {
  id: "shop-id",
  ownerId: owner.id,
  owner: { ...owner, status: "ACTIVE" },
  name: "Test Shop",
  address: "1 Main Street",
  phone: "+94112345678",
  latitude: "6.927079",
  longitude: "79.861244",
  isActive: true,
  isOpen: true,
  minimumOrderAmount: "0.00",
  deliveryFee: "250.00",
  maximumDeliveryRadiusKm: "50.00",
  counts: { categories: 0, products: 0, orders: 0, deliveryPersonnel: 0 },
  createdAt: "2026-10-31T00:00:00Z",
  updatedAt: "2026-10-31T00:00:00Z",
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mocks.fetch);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("shows a readable owner and saves the controlled open-for-orders value", async () => {
  mocks.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ data: shop }),
  });
  const { container, rerender } = render(
    <AdminShopForm owners={[owner]} shop={shop} />,
  );
  expect(
    screen.getByRole("combobox", { name: "Shop owner" }),
  ).toHaveTextContent("Shop Owner (owner@example.com)");
  const checkbox = screen.getByRole("checkbox", {
    name: "Open for customer orders",
  });
  expect(checkbox).toBeChecked();
  fireEvent.click(checkbox);
  fireEvent.submit(container.querySelector("form")!);
  await waitFor(() =>
    expect(mocks.success).toHaveBeenCalledWith("Shop details saved."),
  );
  expect(JSON.parse(mocks.fetch.mock.calls[0]?.[1].body)).toMatchObject({
    ownerId: owner.id,
    isOpen: false,
  });
  rerender(
    <AdminShopForm
      key="updated-shop"
      owners={[owner]}
      shop={{ ...shop, isOpen: false }}
    />,
  );
  expect(
    screen.getByRole("checkbox", { name: "Open for customer orders" }),
  ).not.toBeChecked();
});

it("reports successful creation and opens the created shop", async () => {
  mocks.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ data: shop }),
  });
  const { container } = render(<AdminShopForm owners={[owner]} />);
  fireEvent.change(screen.getByRole("textbox", { name: "Shop name" }), {
    target: { value: shop.name },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "Address" }), {
    target: { value: shop.address },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "Phone" }), {
    target: { value: shop.phone },
  });
  fireEvent.click(screen.getByRole("button", { name: "Choose test location" }));
  fireEvent.submit(container.querySelector("form")!);
  await waitFor(() =>
    expect(mocks.success).toHaveBeenCalledWith("Shop created successfully."),
  );
  expect(mocks.push).toHaveBeenCalledWith("/admin/shops/shop-id");
});

it("reports save failures without navigating away", async () => {
  mocks.fetch.mockResolvedValue({
    ok: false,
    json: async () => ({ error: { message: "Unable to save the shop." } }),
  });
  const { container } = render(<AdminShopForm owners={[owner]} shop={shop} />);
  fireEvent.submit(container.querySelector("form")!);
  await waitFor(() =>
    expect(mocks.error).toHaveBeenCalledWith("Unable to save the shop."),
  );
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Unable to save the shop.",
  );
  expect(mocks.push).not.toHaveBeenCalled();
});

it.each([true, false])(
  "reports the saved shop activation state (initially %s)",
  async (initialIsActive) => {
    mocks.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { isActive: !initialIsActive } }),
    });
    render(
      <TooltipProvider>
        <AdminShopStatusControl
          shopId={shop.id}
          shopName={shop.name}
          initialIsActive={initialIsActive}
        />
      </TooltipProvider>,
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: `${initialIsActive ? "Deactivate" : "Activate"} Test Shop`,
      }),
    );
    await waitFor(() =>
      expect(mocks.success).toHaveBeenCalledWith(
        `Test Shop was ${initialIsActive ? "deactivated" : "activated"}.`,
      ),
    );
    expect(JSON.parse(mocks.fetch.mock.calls[0]?.[1].body)).toEqual({
      isActive: !initialIsActive,
    });
  },
);

it("reports status request failures and keeps the current action", async () => {
  mocks.fetch.mockRejectedValue(new Error("Network unavailable"));
  render(
    <TooltipProvider>
      <AdminShopStatusControl
        shopId={shop.id}
        shopName={shop.name}
        initialIsActive
      />
    </TooltipProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Deactivate Test Shop" }));
  await waitFor(() =>
    expect(mocks.error).toHaveBeenCalledWith("Unable to update shop status."),
  );
  expect(
    screen.getByRole("button", { name: "Deactivate Test Shop" }),
  ).toBeEnabled();
});
