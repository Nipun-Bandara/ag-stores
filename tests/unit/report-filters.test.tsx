import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ReportFilters } from "@/features/owner/components/report-filters";
import { OrderStatus } from "@/generated/prisma/client";

afterEach(cleanup);

describe("owner report filters", () => {
  it("shows readable dates and status while preserving query values", () => {
    const { container } = render(
      <ReportFilters
        from="2026-10-01"
        to="2026-10-08"
        initialStatus={OrderStatus.DELIVERED}
      />,
    );

    expect(screen.getByLabelText("From")).toHaveTextContent("Oct 1, 2026");
    expect(screen.getByLabelText("To")).toHaveTextContent("Oct 8, 2026");
    expect(screen.getByRole("combobox", { name: "Status" })).toHaveTextContent(
      "Delivered",
    );

    const values = new FormData(container.querySelector("form")!);
    expect(values.get("from")).toBe("2026-10-01");
    expect(values.get("to")).toBe("2026-10-08");
    expect(values.get("status")).toBe(OrderStatus.DELIVERED);

    fireEvent.click(screen.getByLabelText("From"));
    expect(screen.getByRole("dialog", { name: "From" })).toBeInTheDocument();
  });
});
