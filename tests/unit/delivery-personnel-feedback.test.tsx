import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DeliveryPersonnelManager } from "@/features/delivery/components/delivery-personnel-manager";
import type { DeliveryPersonnelView } from "@/services/delivery-personnel.service";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: mocks }));
const person: DeliveryPersonnelView = {
  id: "person-id",
  name: "Test Courier",
  email: "courier@example.com",
  phone: "+94771234567",
  role: "DELIVERY_PERSON",
  status: "ACTIVE",
  assignedShopId: "shop-id",
  assignedShopName: "Colombo Shop",
  createdAt: "2026-10-31T00:00:00Z",
  updatedAt: "2026-10-31T00:00:00Z",
};
function renderManager(status: DeliveryPersonnelView["status"] = "ACTIVE") {
  return render(
    <TooltipProvider>
      <DeliveryPersonnelManager
        initialData={{
          shops: [{ id: "shop-id", name: "Colombo Shop" }],
          personnel: [{ ...person, status }],
        }}
      />
    </TooltipProvider>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mocks.fetch);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("shows readable initial selections and reports account creation", async () => {
  mocks.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      data: { personnel: person, temporaryPassword: "temporary-secret" },
    }),
  });
  const { container } = renderManager();
  expect(
    screen.getByRole("combobox", { name: "Assigned shop" }),
  ).toHaveTextContent("Colombo Shop");
  expect(screen.getByRole("combobox", { name: "Status" })).toHaveTextContent(
    "Active",
  );
  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: person.name },
  });
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: person.email },
  });
  fireEvent.change(screen.getByLabelText("Phone"), {
    target: { value: person.phone },
  });
  fireEvent.submit(container.querySelector("form")!);
  await waitFor(() =>
    expect(mocks.success).toHaveBeenCalledWith(
      "Delivery account created successfully.",
    ),
  );
  expect(screen.getByText("temporary-secret")).toBeVisible();
  expect(JSON.parse(mocks.fetch.mock.calls[0]?.[1].body)).toMatchObject({
    assignedShopId: "shop-id",
    status: "ACTIVE",
  });
});

it("reports saved edits and updates the personnel card", async () => {
  mocks.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ data: { ...person, name: "Updated Courier" } }),
  });
  const { container } = renderManager();
  fireEvent.click(screen.getByRole("button", { name: "Edit Test Courier" }));
  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: "Updated Courier" },
  });
  fireEvent.submit(container.querySelector("form")!);
  await waitFor(() =>
    expect(mocks.success).toHaveBeenCalledWith(
      "Delivery personnel details saved.",
    ),
  );
  expect(
    screen.getByRole("heading", { name: "Updated Courier" }),
  ).toBeVisible();
});

it.each([false, true])(
  "reports failed form submissions (editing: %s)",
  async (editing) => {
    mocks.fetch.mockRejectedValue(new Error("Network unavailable"));
    const { container } = renderManager();
    if (editing)
      fireEvent.click(
        screen.getByRole("button", { name: "Edit Test Courier" }),
      );
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() =>
      expect(mocks.error).toHaveBeenCalledWith(
        "Unable to save delivery personnel.",
      ),
    );
    expect(mocks.success).not.toHaveBeenCalled();
  },
);

it.each(["ACTIVE", "INACTIVE"] as const)(
  "reports successful status changes from %s",
  async (status) => {
    const nextStatus = status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    mocks.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { ...person, status: nextStatus } }),
    });
    renderManager(status);
    fireEvent.click(
      screen.getByRole("button", {
        name: `${status === "ACTIVE" ? "Deactivate" : "Activate"} Test Courier`,
      }),
    );
    await waitFor(() =>
      expect(mocks.success).toHaveBeenCalledWith(
        `Test Courier was ${nextStatus === "ACTIVE" ? "activated" : "deactivated"}.`,
      ),
    );
    expect(
      screen.getByRole("button", {
        name: `${nextStatus === "ACTIVE" ? "Deactivate" : "Activate"} Test Courier`,
      }),
    ).toBeEnabled();
  },
);

it("reports status failures and retains the saved account status", async () => {
  mocks.fetch.mockResolvedValue({
    ok: false,
    json: async () => ({
      error: { message: "Unable to update account status." },
    }),
  });
  renderManager();
  fireEvent.click(
    screen.getByRole("button", { name: "Deactivate Test Courier" }),
  );
  await waitFor(() =>
    expect(mocks.error).toHaveBeenCalledWith(
      "Unable to update account status.",
    ),
  );
  expect(
    screen.getByRole("button", { name: "Deactivate Test Courier" }),
  ).toBeEnabled();
  expect(mocks.success).not.toHaveBeenCalled();
});
