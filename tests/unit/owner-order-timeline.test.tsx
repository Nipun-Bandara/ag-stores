import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { OwnerOrderTimeline } from "@/features/owner/components/owner-order-timeline";

afterEach(cleanup);

it("shows saved transitions chronologically with their actor, date and note", () => {
  const { container } = render(
    <OwnerOrderTimeline
      history={[
        {
          id: "second",
          fromStatus: "CONFIRMED",
          toStatus: "PREPARING",
          createdAt: "2026-10-31T10:00:00Z",
          note: "Packing now",
          changedBy: { name: "Shop Owner", role: "SHOP_OWNER" },
        },
        {
          id: "first",
          fromStatus: "PLACED",
          toStatus: "CONFIRMED",
          createdAt: "2026-10-31T09:00:00Z",
          note: null,
          changedBy: { name: "Administrator", role: "ADMIN" },
        },
      ]}
    />,
  );
  const items = screen.getAllByRole("listitem");
  expect(items).toHaveLength(2);
  expect(
    within(items[0]!).getByText("Administrator", { exact: false }),
  ).toBeVisible();
  expect(within(items[1]!).getByText("Packing now")).toBeVisible();
  expect(container.querySelector("time")).toHaveAttribute(
    "dateTime",
    "2026-10-31T09:00:00Z",
  );
  expect(screen.queryByText("Delivered")).not.toBeInTheDocument();
});

it("shows the shared empty state when there are no saved changes", () => {
  render(<OwnerOrderTimeline history={[]} />);
  expect(screen.getByText("No status changes yet.")).toBeVisible();
  expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
});
