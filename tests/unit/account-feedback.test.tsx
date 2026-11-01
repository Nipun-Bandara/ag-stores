import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AddressManager } from "@/features/account/components/address-manager";
import { ProfileForm } from "@/features/account/components/profile-form";
import type { CustomerAddressView } from "@/services/customer-address.service";
import type { AuthenticatedUser } from "@/types/auth";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: mocks }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock("@/features/maps/components/location-picker", async (original) => ({
  ...(await original<
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
        onClick={() => onChange({ latitude: 6.9, longitude: 79.8 })}
      >
        Choose test location
      </button>
    </>
  ),
}));
const address: CustomerAddressView = {
  id: "home",
  label: "Home",
  address: "1 Main Street",
  latitude: "6.9",
  longitude: "79.8",
  isDefault: false,
};
const user: AuthenticatedUser = {
  id: "customer",
  name: "Customer",
  email: "customer@example.com",
  phone: null,
  role: "CUSTOMER",
  preferredLanguage: "EN",
  status: "ACTIVE",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mocks.fetch);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it.each([false, true])(
  "confirms address saving with a toast (editing: %s)",
  async (editing) => {
    mocks.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: address }),
    });
    const { container } = render(
      <AddressManager initialAddresses={editing ? [address] : []} />,
    );
    if (editing)
      fireEvent.click(screen.getByRole("button", { name: "Edit Home" }));
    else
      fireEvent.click(
        screen.getByRole("button", { name: "Choose test location" }),
      );
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() =>
      expect(mocks.success).toHaveBeenCalledWith(
        editing ? "Address updated." : "Address added.",
      ),
    );
    expect(screen.getByRole("heading", { name: "Home" })).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  },
);

it("rejects an incomplete save response without clearing entered address details", async () => {
  mocks.fetch.mockResolvedValue({ ok: true, json: async () => null });
  const { container } = render(<AddressManager initialAddresses={[]} />);
  fireEvent.change(screen.getByLabelText("Label"), {
    target: { value: "Office" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Choose test location" }));
  fireEvent.submit(container.querySelector("form")!);
  await waitFor(() =>
    expect(mocks.error).toHaveBeenCalledWith("Unable to save this address."),
  );
  expect(screen.getByLabelText("Label")).toHaveValue("Office");
  expect(mocks.success).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Add address" })).toBeEnabled();
});

it("reports missing location before requesting an address save", () => {
  const { container } = render(<AddressManager initialAddresses={[]} />);
  fireEvent.submit(container.querySelector("form")!);
  expect(mocks.error).toHaveBeenCalledWith("Choose a location before saving.");
  expect(mocks.fetch).not.toHaveBeenCalled();
});

it.each(["default", "delete"])(
  "confirms the %s address action and updates the saved cards",
  async (action) => {
    mocks.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { ...address, isDefault: true } }),
    });
    render(<AddressManager initialAddresses={[address]} />);
    fireEvent.click(
      screen.getByRole("button", {
        name: action === "default" ? "Make Home default" : "Delete Home",
      }),
    );
    await waitFor(() =>
      expect(mocks.success).toHaveBeenCalledWith(
        action === "default" ? "Default address updated." : "Address deleted.",
      ),
    );
    if (action === "default")
      expect(screen.getByText("Default", { exact: true })).toBeVisible();
    else
      expect(
        screen.queryByRole("heading", { name: "Home" }),
      ).not.toBeInTheDocument();
  },
);

it.each(["default", "delete"])(
  "reports a failed %s action and preserves the address",
  async (action) => {
    mocks.fetch.mockRejectedValue(new Error("Network failure"));
    render(<AddressManager initialAddresses={[address]} />);
    const button = screen.getByRole("button", {
      name: action === "default" ? "Make Home default" : "Delete Home",
    });
    fireEvent.click(button);
    await waitFor(() =>
      expect(mocks.error).toHaveBeenCalledWith(
        action === "default"
          ? "Unable to set the default address."
          : "Unable to delete this address.",
      ),
    );
    expect(screen.getByRole("heading", { name: "Home" })).toBeVisible();
    expect(button).toBeEnabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  },
);

it("confirms a profile save and refreshes the profile without an inline banner", async () => {
  mocks.fetch.mockResolvedValue({ ok: true });
  const { container } = render(<ProfileForm user={user} />);
  fireEvent.submit(container.querySelector("form")!);
  await waitFor(() =>
    expect(mocks.success).toHaveBeenCalledWith("Profile updated."),
  );
  expect(mocks.refresh).toHaveBeenCalledOnce();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

it.each(["server", "network"])(
  "reports profile %s failures, preserving values and enabling retry",
  async (failure) => {
    if (failure === "server")
      mocks.fetch.mockResolvedValue({
        ok: false,
        json: async () => ({
          error: { message: "Profile details are invalid." },
        }),
      });
    else mocks.fetch.mockRejectedValue(new Error("Network failure"));
    const { container } = render(<ProfileForm user={user} />);
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Changed name" },
    });
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() =>
      expect(mocks.error).toHaveBeenCalledWith(
        failure === "server"
          ? "Profile details are invalid."
          : "Unable to update your profile.",
      ),
    );
    expect(screen.getByLabelText("Name")).toHaveValue("Changed name");
    expect(screen.getByRole("button", { name: "Save profile" })).toBeEnabled();
    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  },
);
