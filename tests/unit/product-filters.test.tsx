import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ProductFilters } from "@/features/owner/components/product-filters";
const mocks = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
  usePathname: () => "/en/owner/products",
}));
const props = {
  categories: [
    {
      id: "beverages-id",
      shopId: "shop-id",
      nameEn: "Beverages",
      nameSi: "පාන වර්ග",
      status: "ACTIVE" as const,
    },
  ],
  initialSearch: "",
  initialCategoryId: "",
  initialInventoryStatus: "",
};
beforeEach(() => {
  vi.useFakeTimers();
  mocks.replace.mockClear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
function tick() {
  act(() => vi.advanceTimersByTime(300));
}
function choose(name: string, optionName: string) {
  fireEvent.click(screen.getByRole("combobox", { name }));
  const option = screen.getByRole("option", { name: optionName });
  fireEvent.pointerDown(option, { pointerType: "mouse" });
  fireEvent.click(option);
}
function latestParams() {
  return new URL(mocks.replace.mock.lastCall![0], "http://localhost")
    .searchParams;
}

it("automatically searches after a short typing pause with no apply button", () => {
  render(<ProductFilters {...props} />);
  fireEvent.change(screen.getByLabelText("Search"), { target: { value: "t" } });
  act(() => vi.advanceTimersByTime(200));
  fireEvent.change(screen.getByLabelText("Search"), {
    target: { value: "tea leaf" },
  });
  expect(mocks.replace).not.toHaveBeenCalled();
  tick();
  expect(mocks.replace).toHaveBeenCalledTimes(1);
  expect(mocks.replace).toHaveBeenLastCalledWith(
    "/en/owner/products?search=tea+leaf",
    { scroll: false },
  );
  expect(
    screen.queryByRole("button", { name: /Apply/ }),
  ).not.toBeInTheDocument();
});

it("applies selects immediately, combines the current search draft, and cancels the pending search", () => {
  render(<ProductFilters {...props} />);
  fireEvent.change(screen.getByLabelText("Search"), {
    target: { value: "tea" },
  });
  choose("Category", "Beverages");
  expect(mocks.replace).toHaveBeenCalledTimes(1);
  expect(latestParams().get("search")).toBe("tea");
  expect(latestParams().get("categoryId")).toBe("beverages-id");
  tick();
  expect(mocks.replace).toHaveBeenCalledTimes(1);
  choose("Inventory", "Low stock");
  expect(mocks.replace).toHaveBeenCalledTimes(2);
  expect(latestParams().get("inventoryStatus")).toBe("LOW_STOCK");
  expect(latestParams().get("categoryId")).toBe("beverages-id");
  choose("Category", "All categories");
  expect(latestParams().has("categoryId")).toBe(false);
  expect(latestParams().get("inventoryStatus")).toBe("LOW_STOCK");
  expect(latestParams().get("search")).toBe("tea");
});

it("keeps newer typing and input focus when an earlier server response arrives", () => {
  const view = render(<ProductFilters {...props} />);
  const input = screen.getByLabelText("Search");
  input.focus();
  fireEvent.change(input, { target: { value: "tea" } });
  tick();
  fireEvent.change(input, { target: { value: "teapot" } });
  view.rerender(<ProductFilters {...props} initialSearch="tea" />);
  expect(input).toHaveValue("teapot");
  expect(input).toHaveFocus();
  tick();
  expect(mocks.replace).toHaveBeenCalledTimes(2);
  expect(latestParams().get("search")).toBe("teapot");
});

it("restores external navigation filters and cancels obsolete typing when leaving the page", () => {
  const view = render(<ProductFilters {...props} />);
  fireEvent.change(screen.getByLabelText("Search"), {
    target: { value: "tea" },
  });
  view.rerender(
    <ProductFilters
      {...props}
      initialCategoryId="beverages-id"
      initialInventoryStatus="AVAILABLE"
    />,
  );
  expect(screen.getByLabelText("Search")).toHaveValue("");
  expect(screen.getByRole("combobox", { name: "Category" })).toHaveTextContent(
    "Beverages",
  );
  tick();
  expect(mocks.replace).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Search"), {
    target: { value: "rice" },
  });
  view.unmount();
  tick();
  expect(mocks.replace).not.toHaveBeenCalled();
});
