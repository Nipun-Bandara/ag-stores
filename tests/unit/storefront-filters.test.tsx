import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { StorefrontFilters } from "@/features/storefront/components/storefront-filters";
const nav = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => nav,
  usePathname: () => "/si/products",
}));
const props = {
  categoryOptions: [
    { value: "", label: "All categories" },
    { value: "beverages-id", label: "Beverages · Test Shop" },
  ],
  initialSearch: "",
  initialCategoryId: "",
  copy: {
    searchProducts: "Search products",
    searchPlaceholder: "Search by name",
    category: "Category",
    allCategories: "All categories",
  },
};
beforeEach(() => {
  vi.useFakeTimers();
  nav.replace.mockClear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
function tick() {
  act(() => vi.advanceTimersByTime(300));
}
function choose(label: string) {
  fireEvent.click(screen.getByRole("combobox", { name: "Category" }));
  const option = screen.getByRole("option", { name: label });
  fireEvent.pointerDown(option, { pointerType: "mouse" });
  fireEvent.click(option);
}
it("debounces typing, uses theme placeholders, and has no apply button", () => {
  render(<StorefrontFilters {...props} />);
  const search = screen.getByLabelText("Search products");
  fireEvent.change(search, { target: { value: "t" } });
  act(() => vi.advanceTimersByTime(200));
  fireEvent.change(search, { target: { value: "tea" } });
  expect(nav.replace).not.toHaveBeenCalled();
  tick();
  expect(nav.replace).toHaveBeenCalledExactlyOnceWith(
    "/si/products?search=tea",
    { scroll: false },
  );
  expect(
    screen.queryByRole("button", { name: /Apply/ }),
  ).not.toBeInTheDocument();
  expect(search).toHaveClass("placeholder:text-muted-foreground");
  expect(screen.getByRole("combobox")).toHaveClass(
    "text-muted-foreground",
    "data-[size=default]:h-10",
  );
});
it("changes category immediately, keeps readable labels, and combines unfinished search", () => {
  render(<StorefrontFilters {...props} />);
  fireEvent.change(screen.getByLabelText("Search products"), {
    target: { value: "tea" },
  });
  choose("Beverages · Test Shop");
  expect(nav.replace).toHaveBeenCalledExactlyOnceWith(
    "/si/products?search=tea&categoryId=beverages-id",
    { scroll: false },
  );
  tick();
  expect(nav.replace).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("combobox")).toHaveTextContent(
    "Beverages · Test Shop",
  );
  choose("All categories");
  expect(nav.replace).toHaveBeenLastCalledWith("/si/products?search=tea", {
    scroll: false,
  });
});
it("keeps newer text and focus when an earlier filter response arrives", () => {
  const view = render(<StorefrontFilters {...props} />);
  const input = screen.getByLabelText("Search products");
  input.focus();
  fireEvent.change(input, { target: { value: "tea" } });
  tick();
  fireEvent.change(input, { target: { value: "teapot" } });
  view.rerender(<StorefrontFilters {...props} initialSearch="tea" />);
  expect(input).toHaveValue("teapot");
  expect(input).toHaveFocus();
  tick();
  expect(nav.replace).toHaveBeenLastCalledWith("/si/products?search=teapot", {
    scroll: false,
  });
});
it("restores filters after external navigation and clears timers on unmount", () => {
  const view = render(<StorefrontFilters {...props} />);
  fireEvent.change(screen.getByLabelText("Search products"), {
    target: { value: "tea" },
  });
  view.rerender(
    <StorefrontFilters
      {...props}
      initialSearch="rice"
      initialCategoryId="beverages-id"
    />,
  );
  expect(screen.getByLabelText("Search products")).toHaveValue("rice");
  tick();
  expect(nav.replace).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Search products"), {
    target: { value: "milk" },
  });
  view.unmount();
  tick();
  expect(nav.replace).not.toHaveBeenCalled();
});
