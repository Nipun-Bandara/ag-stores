import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { StorefrontFilters } from "@/features/storefront/components/storefront-filters";

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => nav,
  usePathname: () => "/si/products",
}));
const props = {
  categoryOptions: [
    { value: "", label: "All categories" },
    { value: "beverages-id", label: "Beverages" },
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
  window.history.replaceState({}, "", "/?page=9&pageSize=48&loaded=3");
  vi.useFakeTimers();
  nav.push.mockClear();
  nav.replace.mockClear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
function choose(label: string) {
  fireEvent.click(screen.getByRole("combobox", { name: "Category" }));
  const option = screen.getByRole("option", { name: label });
  fireEvent.pointerDown(option, { pointerType: "mouse" });
  fireEvent.click(option);
}
function search() {
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
}

it("waits for the Search button instead of searching while typing", () => {
  render(<StorefrontFilters {...props} />);
  const input = screen.getByLabelText("Search products");
  fireEvent.change(input, { target: { value: "tea" } });
  act(() => vi.advanceTimersByTime(5000));
  expect(nav.push).not.toHaveBeenCalled();
  expect(nav.replace).not.toHaveBeenCalled();

  search();
  // A new search starts at the first page and drops scroll-loaded pages.
  expect(nav.push).toHaveBeenCalledExactlyOnceWith(
    "/si/products?pageSize=48&search=tea",
    { scroll: false },
  );
  expect(input).toHaveClass("placeholder:text-muted-foreground");
});

it("does not search when only a category is chosen, until Search is pressed", () => {
  render(<StorefrontFilters {...props} />);
  choose("Beverages");
  expect(nav.push).not.toHaveBeenCalled();
  expect(screen.getByRole("combobox")).toHaveTextContent("Beverages");

  search();
  expect(nav.push).toHaveBeenLastCalledWith(
    "/si/products?pageSize=48&categoryId=beverages-id",
    { scroll: false },
  );
});

it("combines a typed name and a category in one search, and submits on Enter", () => {
  render(<StorefrontFilters {...props} />);
  const input = screen.getByLabelText("Search products");
  fireEvent.change(input, { target: { value: "  green tea " } });
  choose("Beverages");
  fireEvent.submit(input.closest("form")!);
  expect(nav.push).toHaveBeenCalledExactlyOnceWith(
    "/si/products?pageSize=48&search=green+tea&categoryId=beverages-id",
    { scroll: false },
  );
});

it("shows the filters the page now uses after Back or a link", () => {
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
  expect(screen.getByRole("combobox")).toHaveTextContent("Beverages");
  expect(nav.push).not.toHaveBeenCalled();
});
