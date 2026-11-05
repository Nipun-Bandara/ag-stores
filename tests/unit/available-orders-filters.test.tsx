import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AvailableOrdersFilters } from "@/features/delivery/components/available-orders-filters";

afterEach(cleanup);

describe("available delivery order filters", () => {
  it("shows readable sort values and submits the selected filter values", () => {
    const { container } = render(
      <AvailableOrdersFilters
        initialMaxDistanceKm={5}
        initialCreatedAfter="2026-10-08"
        initialSortBy="distance"
        initialDirection="asc"
      />,
    );

    expect(screen.getByLabelText("Created after")).toHaveValue(
      new Intl.DateTimeFormat("en-LK", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(new Date(2026, 9, 8)),
    );
    expect(screen.getByRole("combobox", { name: "Sort by" })).toHaveTextContent(
      "Approximate distance",
    );
    expect(
      screen.getByRole("combobox", { name: "Direction" }),
    ).toHaveTextContent("Ascending");

    const values = new FormData(container.querySelector("form")!);
    expect(values.get("maxDistanceKm")).toBe("5");
    expect(values.get("createdAfter")).toBe("2026-10-08");
    expect(values.get("sortBy")).toBe("distance");
    expect(values.get("direction")).toBe("asc");

    fireEvent.click(screen.getByRole("button", { name: "Select date" }));
    expect(
      screen.getByRole("dialog", { name: "Created after" }),
    ).toBeInTheDocument();
  });
});
