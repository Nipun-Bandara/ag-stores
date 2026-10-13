import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AddressManager } from "@/features/account/components/address-manager";
import { CheckoutView } from "@/features/checkout/components/checkout-view";
import { ProfileForm } from "@/features/account/components/profile-form";
import { AvailableOrderBatchSelector } from "@/features/delivery/components/available-order-batch-selector";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const state = vi.hoisted(() => ({
  refresh: vi.fn(),
  push: vi.fn(),
  clear: vi.fn(),
  items: [
    {
      id: "product-1",
      name: "Rice",
      price: "200.00",
      stockQuantity: 5,
      quantity: 1,
      imageUrl: null,
    },
  ],
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: state.refresh, push: state.push }),
}));
vi.mock("@/features/cart/cart-store", () => ({
  useCart: () => ({
    items: state.items,
    subtotal: "200.00",
    clear: state.clear,
  }),
}));

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("shared UI form workflows", () => {
  it("keeps native GET filter names, values, and reset behavior", () => {
    const { container } = render(
      <form method="get">
        <Input name="search" defaultValue="rice" />
        <NativeSelect name="status" defaultValue="ACTIVE" aria-label="Status">
          <NativeSelectOption value="">All statuses</NativeSelectOption>
          <NativeSelectOption value="ACTIVE">Active</NativeSelectOption>
        </NativeSelect>
        <Button type="reset">Reset</Button>
      </form>,
    );
    const form = container.querySelector("form")!;
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "" } });
    expect(new FormData(form).get("status")).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(Object.fromEntries(new FormData(form))).toEqual({
      search: "rice",
      status: "ACTIVE",
    });
  });

  it("submits a checked default-address checkbox as the existing API boolean", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({
        ok: false,
        json: async () => ({ error: { message: "Test validation response" } }),
      });
    vi.stubGlobal("fetch", fetcher);
    render(<AddressManager initialAddresses={[]} />);
    fireEvent.change(screen.getByLabelText("Label"), {
      target: { value: "Home" },
    });
    fireEvent.change(screen.getByLabelText("Address"), {
      target: { value: "12 Main Road" },
    });
    fireEvent.change(screen.getByLabelText("Latitude"), {
      target: { value: "6.9" },
    });
    fireEvent.change(screen.getByLabelText("Longitude"), {
      target: { value: "79.8" },
    });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Add address" }));
    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    expect(JSON.parse(fetcher.mock.calls[0]![1].body)).toMatchObject({
      label: "Home",
      isDefault: true,
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Test validation response",
    );
  });

  it("preserves profile values and the selected language on submission", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetcher);
    render(
      <ProfileForm
        user={{
          id: "customer-1",
          name: "Customer",
          email: "customer@example.test",
          phone: null,
          role: "CUSTOMER",
          status: "ACTIVE",
          preferredLanguage: "EN",
        }}
      />,
    );
    fireEvent.change(screen.getByLabelText("Preferred language"), {
      target: { value: "SI" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    expect(JSON.parse(fetcher.mock.calls[0]![1].body)).toMatchObject({
      name: "Customer",
      preferredLanguage: "SI",
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Profile updated.",
    );
  });

  it("submits only the selected checkout address and retains delivery notes", async () => {
    const fetcher = vi
      .fn()
      .mockImplementation(async (url: string) =>
        url.endsWith("validate")
          ? {
              ok: true,
              json: async () => ({
                data: { subtotal: "200.00", deliveryFee: "50.00" },
              }),
            }
          : { ok: true, json: async () => ({ data: { id: "order-1" } }) },
      );
    vi.stubGlobal("fetch", fetcher);
    render(
      <CheckoutView
        addresses={[
          {
            id: "home",
            label: "Home",
            address: "12 Main Road",
            latitude: "6.9",
            longitude: "79.8",
            isDefault: true,
          },
          {
            id: "office",
            label: "Office",
            address: "24 Main Road",
            latitude: "6.9",
            longitude: "79.8",
            isDefault: false,
          },
        ]}
      />,
    );
    await screen.findByText("LKR 250.00");
    fireEvent.click(screen.getByRole("radio", { name: /Office/ }));
    expect(screen.getByRole("radio", { name: /Home/ })).not.toBeChecked();
    fireEvent.change(screen.getByLabelText(/Delivery instructions/), {
      target: { value: "Call at the gate" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm Cash on Delivery order" }),
    );
    await waitFor(() =>
      expect(state.push).toHaveBeenCalledWith("/orders/order-1"),
    );
    const request = fetcher.mock.calls.find(
      ([url]) => url === "/api/checkout",
    )!;
    expect(JSON.parse(request[1].body)).toMatchObject({
      deliveryAddressId: "office",
      deliveryInstructions: "Call at the gate",
      items: [{ productId: "product-1", quantity: 1 }],
    });
    expect(state.clear).toHaveBeenCalledOnce();
  });

  it("updates delivery batch selection through the shared checkbox", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            id: "batch-1",
            orders: [{ orderId: "order-1", sequence: 1 }],
          },
        }),
      });
    vi.stubGlobal("fetch", fetcher);
    render(
      <AvailableOrderBatchSelector
        suggestedGroups={[]}
        orders={[
          {
            id: "order-1",
            deliveryArea: "Colombo",
            distanceKm: 1,
            itemCount: 2,
            total: "250.00",
            createdAt: "2026-10-13T00:00:00.000Z",
          },
        ]}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Create delivery batch" }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Select order order-1" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Create delivery batch" }),
    );
    await waitFor(() => expect(fetcher).toHaveBeenCalled());
    expect(JSON.parse(fetcher.mock.calls[0]![1].body)).toEqual({
      orderIds: ["order-1"],
    });
  });
});
