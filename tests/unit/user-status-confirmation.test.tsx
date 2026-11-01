import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { toast } from "sonner";

import { TooltipProvider } from "@/components/ui/tooltip";
import { UserStatusControl } from "@/features/admin/components/user-status-control";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const fetchMock = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it.each([
  { status: "ACTIVE" as const, action: "Deactivate", next: "INACTIVE" },
  { status: "INACTIVE" as const, action: "Activate", next: "ACTIVE" },
])(
  "requires confirmation to $action a user",
  async ({ status, action, next }) => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { status: next } }),
    });
    render(
      <TooltipProvider>
        <UserStatusControl
          userId="user-id"
          userName="Test user"
          initialStatus={status}
        />
      </TooltipProvider>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: `${action} Test user` }),
    );
    let dialog = await screen.findByRole("dialog", { name: `${action} user` });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(toast.success).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: `${action} Test user` }),
    );
    dialog = await screen.findByRole("dialog", { name: `${action} user` });
    fireEvent.click(within(dialog).getByRole("button", { name: action }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/users/user-id/status",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      }),
    );
    expect(toast.success).toHaveBeenCalledWith(
      next === "ACTIVE"
        ? "Test user was activated."
        : "Test user was deactivated.",
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  },
);

it("keeps a rejected change in the dialog so it can be retried", async () => {
  fetchMock.mockResolvedValue({
    ok: false,
    json: async () => ({
      error: {
        message: "The final active administrator cannot be deactivated.",
      },
    }),
  });
  render(
    <TooltipProvider>
      <UserStatusControl
        userId="admin-id"
        userName="Admin"
        initialStatus="ACTIVE"
      />
    </TooltipProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Deactivate Admin" }));
  const dialog = await screen.findByRole("dialog", { name: "Deactivate user" });
  fireEvent.click(within(dialog).getByRole("button", { name: "Deactivate" }));
  expect(await within(dialog).findByRole("alert")).toHaveTextContent(
    "The final active administrator cannot be deactivated.",
  );
  expect(toast.error).toHaveBeenCalledWith(
    "The final active administrator cannot be deactivated.",
  );
  expect(toast.success).not.toHaveBeenCalled();
  expect(
    within(dialog).getByRole("button", { name: "Deactivate" }),
  ).toBeEnabled();
});
