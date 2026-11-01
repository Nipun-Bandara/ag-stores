import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";

import { CustomerOrderTimeline } from "@/features/account/components/customer-order-timeline";

afterEach(cleanup);

it("shows only recorded statuses in chronological order and identifies the latest event", () => {
  render(
    <CustomerOrderTimeline
      events={[
        { status: "CANCELLED", createdAt: "2026-11-01T11:00:00Z" },
        { status: "PLACED", createdAt: "2026-11-01T10:00:00Z" },
      ]}
    />,
  );

  const events = screen.getAllByRole("listitem");
  expect(events).toHaveLength(2);
  expect(within(events[0]!).getByRole("heading")).toHaveTextContent("Placed");
  expect(within(events[1]!).getByRole("heading")).toHaveTextContent(
    "Cancelled",
  );
  expect(events[1]).toHaveAttribute("aria-current", "step");
  expect(events[0]!.querySelector("time")).toHaveAttribute(
    "dateTime",
    "2026-11-01T10:00:00Z",
  );
  expect(screen.queryByText("Delivered")).not.toBeInTheDocument();
});

it("uses the shared empty state when tracking events are unavailable", () => {
  render(<CustomerOrderTimeline events={[]} />);
  expect(screen.getByText("No status changes yet.")).toBeVisible();
  expect(screen.queryByRole("list")).not.toBeInTheDocument();
});
