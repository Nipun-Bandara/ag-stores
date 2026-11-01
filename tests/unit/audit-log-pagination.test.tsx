import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AuditLogPagination } from "@/features/admin/components/audit-log-pagination";
import { TooltipProvider } from "@/components/ui/tooltip";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/si/admin/audit-logs",
  useSearchParams: () =>
    new URLSearchParams("entityType=SHOP&page=2&pageSize=25"),
}));
beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

it("shows icon-only controls, preserves query parameters and navigates to the next page", () => {
  render(
    <TooltipProvider>
      <AuditLogPagination
        page={2}
        pageSize={25}
        recordCount={25}
        hasPrevious
        hasNext
      />
    </TooltipProvider>,
  );
  const next = screen.getByRole("link", { name: "Next page" });
  expect(next).toHaveTextContent("");
  expect(next.querySelector("svg")).toBeInTheDocument();
  expect(screen.getByText("Showing 26–50")).toBeVisible();
  fireEvent.click(next);
  expect(push).toHaveBeenCalledWith(
    "/si/admin/audit-logs?entityType=SHOP&page=3&pageSize=25",
    { scroll: false },
  );
});

it("resets to the first page when changing rows per page", async () => {
  render(
    <TooltipProvider>
      <AuditLogPagination
        page={2}
        pageSize={25}
        recordCount={25}
        hasPrevious
        hasNext
      />
    </TooltipProvider>,
  );
  fireEvent.click(screen.getByRole("combobox", { name: "Rows per page" }));
  const option = await screen.findByRole("option", { name: "50" });
  fireEvent.pointerDown(option, { pointerType: "mouse" });
  fireEvent.click(option);
  await waitFor(() =>
    expect(push).toHaveBeenCalledWith(
      "/si/admin/audit-logs?entityType=SHOP&page=1&pageSize=50",
      { scroll: false },
    ),
  );
});

it("does not navigate past either end of an empty first page", () => {
  render(
    <TooltipProvider>
      <AuditLogPagination
        page={1}
        pageSize={25}
        recordCount={0}
        hasPrevious={false}
        hasNext={false}
      />
    </TooltipProvider>,
  );
  for (const label of ["Previous page", "Next page"]) {
    const control = screen.getByLabelText(label);
    expect(control).toHaveAttribute("aria-disabled", "true");
    expect(control).not.toHaveAttribute("href");
    fireEvent.click(control);
  }
  expect(push).not.toHaveBeenCalled();
  expect(screen.getByText("No records on this page")).toBeVisible();
});
