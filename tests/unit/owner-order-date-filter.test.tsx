import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { OrderDateFilter } from "@/features/owner/components/order-date-filter";
import { LocaleProvider } from "@/features/i18n/components/locale-provider";

afterEach(cleanup);

it("displays a readable date while submitting the original calendar day", () => {
  const { container } = render(
    <form>
      <OrderDateFilter initialDate="2026-10-31" />
    </form>,
  );
  expect(screen.getByRole("textbox", { name: "Date" })).toHaveValue(
    "October 31, 2026",
  );
  expect(new FormData(container.querySelector("form")!).get("date")).toBe(
    "2026-10-31",
  );
});

it("accepts typed dates and blocks invalid dates instead of silently clearing the filter", () => {
  const { container } = render(
    <form>
      <OrderDateFilter />
    </form>,
  );
  const input = screen.getByRole("textbox", { name: "Date" });
  fireEvent.change(input, { target: { value: "June 01, 2025" } });
  expect(new FormData(container.querySelector("form")!).get("date")).toBe(
    "2025-06-01",
  );
  fireEvent.change(input, { target: { value: "2026-02-31" } });
  expect(input).toHaveAttribute("aria-invalid", "true");
  expect(container.querySelector("form")!.checkValidity()).toBe(false);
  fireEvent.change(input, { target: { value: "" } });
  expect(container.querySelector("form")!.checkValidity()).toBe(true);
  expect(new FormData(container.querySelector("form")!).get("date")).toBe("");
});

it("updates the input from the calendar and supports clearing the date", async () => {
  const { container } = render(
    <form>
      <OrderDateFilter initialDate="2026-10-31" />
    </form>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Select date" }));
  const popup = await screen.findByRole("dialog", { name: "Date" });
  const day = popup.querySelector<HTMLButtonElement>(
    `button[data-day="${new Date(2026, 9, 15).toLocaleDateString()}"]`,
  )!;
  expect(day).not.toBeNull();
  fireEvent.click(day);
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(screen.getByRole("textbox", { name: "Date" })).toHaveValue(
    "October 15, 2026",
  );
  expect(new FormData(container.querySelector("form")!).get("date")).toBe(
    "2026-10-15",
  );
  fireEvent.keyDown(screen.getByRole("textbox", { name: "Date" }), {
    key: "ArrowDown",
  });
  const reopened = await screen.findByRole("dialog", { name: "Date" });
  expect(
    screen.queryByRole("button", { name: "Clear date" }),
  ).not.toBeInTheDocument();
  fireEvent.keyDown(reopened, { key: "Escape" });
  fireEvent.change(screen.getByRole("textbox", { name: "Date" }), {
    target: { value: "" },
  });
  expect(screen.getByRole("textbox", { name: "Date" })).toHaveValue("");
});

it("preserves the submitted day when using Sinhala date labels", () => {
  const { container } = render(
    <LocaleProvider locale="si">
      <form>
        <OrderDateFilter initialDate="2026-10-31" />
      </form>
    </LocaleProvider>,
  );
  expect(new FormData(container.querySelector("form")!).get("date")).toBe(
    "2026-10-31",
  );
  const input = screen.getByRole("textbox");
  fireEvent.change(input, { target: { value: "2026-11-01" } });
  fireEvent.blur(input);
  expect(input).not.toHaveValue("2026-11-01");
  expect(new FormData(container.querySelector("form")!).get("date")).toBe(
    "2026-11-01",
  );
  fireEvent.change(input, {
    target: { value: `${(input as HTMLInputElement).value} ` },
  });
  expect(container.querySelector("form")!.checkValidity()).toBe(true);
  expect(new FormData(container.querySelector("form")!).get("date")).toBe(
    "2026-11-01",
  );
});
