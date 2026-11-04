import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ShopSettingsForm } from "@/features/owner/components/shop-settings-form";
import type { ShopSettingsView } from "@/services/shop-settings.service";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: mocks }));
vi.mock("@/features/maps/components/location-picker", async (original) => ({
  ...(await original<
    typeof import("@/features/maps/components/location-picker")
  >()),
  LocationPicker: ({
    value,
  }: {
    value: { latitude: number; longitude: number } | null;
  }) => (
    <>
      <input type="hidden" name="latitude" value={value?.latitude ?? ""} />
      <input type="hidden" name="longitude" value={value?.longitude ?? ""} />
    </>
  ),
}));
const shop: ShopSettingsView = {
  id: "shop-id",
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
  weightDifferenceAllowancePct: "10.00",
  updatedAt: "2026-11-01T00:00:00Z",
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mocks.fetch);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("confirms successful settings saves using a toast", async () => {
  mocks.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ data: shop }),
  });
  const { container } = render(<ShopSettingsForm initial={shop} />);
  fireEvent.submit(container.querySelector("form")!);
  await waitFor(() =>
    expect(mocks.success).toHaveBeenCalledWith("Shop settings saved."),
  );
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save settings" })).toBeEnabled();
});

it("reports server errors without duplicating banners or clearing inputs", async () => {
  mocks.fetch.mockResolvedValue({
    ok: false,
    json: async () => ({ error: { message: "Unable to save shop settings." } }),
  });
  const { container } = render(<ShopSettingsForm initial={shop} />);
  fireEvent.change(screen.getByLabelText("Shop name"), {
    target: { value: "Updated Shop" },
  });
  fireEvent.submit(container.querySelector("form")!);
  await waitFor(() =>
    expect(mocks.error).toHaveBeenCalledWith("Unable to save shop settings."),
  );
  expect(screen.getByLabelText("Shop name")).toHaveValue("Updated Shop");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("handles network failures and enables retry", async () => {
  mocks.fetch.mockRejectedValue(new Error("Network unavailable"));
  const { container } = render(<ShopSettingsForm initial={shop} />);
  fireEvent.submit(container.querySelector("form")!);
  await waitFor(() =>
    expect(mocks.error).toHaveBeenCalledWith("Unable to save shop settings."),
  );
  expect(screen.getByRole("button", { name: "Save settings" })).toBeEnabled();
});

it("reports a missing location before making a request", () => {
  const { container } = render(
    <ShopSettingsForm initial={{ ...shop, latitude: "invalid" }} />,
  );
  fireEvent.submit(container.querySelector("form")!);
  expect(mocks.error).toHaveBeenCalledWith("Choose a location before saving.");
  expect(mocks.fetch).not.toHaveBeenCalled();
});
