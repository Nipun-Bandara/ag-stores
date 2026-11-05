import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { DeliveryStopsTimeline } from "@/features/delivery/components/delivery-stops-timeline";
import type { getDeliveryBatch } from "@/services/delivery-batch-management.service";

type Batch = Awaited<ReturnType<typeof getDeliveryBatch>>;
const batch: Batch = {
  id: "batch",
  status: "IN_PROGRESS",
  createdAt: "2026-11-05T09:00:00Z",
  startedAt: "2026-11-05T10:00:00Z",
  completedAt: null,
  shopLocation: {
    id: "shop",
    name: "Fresh Market",
    latitude: "6.9",
    longitude: "79.8",
  },
  orders: [
    { sequence: 3, status: "DELIVERED" as const },
    { sequence: 1, status: "OUT_FOR_DELIVERY" as const },
    { sequence: 2, status: "FAILED_DELIVERY" as const },
  ].map(({ sequence, status }) => ({
    id: `order-${sequence}`,
    sequence,
    customerFirstName: `Nimal ${sequence}`,
    status,
    total: "100.00",
    customerNote: "Call on arrival",
    createdAt: "2026-11-05T09:00:00Z",
    itemCount: 2,
    deliveryLocation: {
      label: `Home ${sequence}`,
      address: `${sequence} Test Road`,
      latitude: "6.91",
      longitude: "79.81",
    },
  })),
};
afterEach(cleanup);
it("starts at the shop, sorts the saved sequence, and shows each stop's real outcome", () => {
  render(<DeliveryStopsTimeline batch={batch} />);
  const stops = screen.getAllByRole("listitem");
  expect(stops).toHaveLength(4);
  expect(within(stops[0]!).getByRole("heading")).toHaveTextContent(
    "Shop · Fresh Market",
  );
  expect(stops[0]!.querySelector("time")).toHaveAttribute(
    "datetime",
    batch.startedAt,
  );
  for (let i = 1; i <= 3; i++) {
    expect(within(stops[i]!).getByRole("heading")).toHaveTextContent(
      `Stop ${i} · Nimal ${i}`,
    );
    expect(within(stops[i]!).getByText(`${i} Test Road`)).toBeVisible();
  }
  expect(stops[1]).toHaveAttribute("aria-current", "step");
  expect(within(stops[2]!).getByText("Failed delivery")).toBeVisible();
  expect(within(stops[3]!).getByText("Delivered")).toBeVisible();
  expect(stops[2]).not.toHaveAttribute("data-completed");
  expect(stops[3]).not.toHaveAttribute("aria-current");
});
it("marks the shop as the starting point for a pending batch without inventing a departure time", () => {
  render(
    <DeliveryStopsTimeline
      batch={{
        ...batch,
        status: "PENDING",
        startedAt: null,
        orders: batch.orders.map((order) => ({
          ...order,
          status: "READY_FOR_DELIVERY",
        })),
      }}
    />,
  );
  const origin = screen.getAllByRole("listitem")[0]!;
  expect(origin).toHaveAttribute("aria-current", "step");
  expect(screen.getByText("Starting point")).toBeVisible();
  expect(origin.querySelector("time")).toBeNull();
});
