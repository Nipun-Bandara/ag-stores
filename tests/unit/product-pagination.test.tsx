import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ProductPagination } from "@/features/products/components/product-pagination";
const nav = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => nav,
  usePathname: () => "/si/products",
  useSearchParams: () =>
    new URLSearchParams("search=tea&categoryId=beverages&page=3&pageSize=24"),
}));
beforeEach(() => nav.push.mockClear());
afterEach(cleanup);
it("keeps filters and locale when paging, and resets page after choosing a page size", () => {
  render(
    <ProductPagination page={3} pageSize={24} total={8000} pageCount={334} />,
  );
  expect(screen.getByRole("status")).toHaveTextContent("Showing 49–72 of 8000");
  fireEvent.click(screen.getByRole("link", { name: "Next page" }));
  expect(nav.push).toHaveBeenLastCalledWith(
    "/si/products?search=tea&categoryId=beverages&page=4&pageSize=24",
    { scroll: true },
  );
  fireEvent.click(screen.getByRole("combobox", { name: "Products per page" }));
  const option = screen.getByRole("option", { name: "48" });
  fireEvent.pointerDown(option, { pointerType: "mouse" });
  fireEvent.click(option);
  expect(nav.push).toHaveBeenLastCalledWith(
    "/si/products?search=tea&categoryId=beverages&page=1&pageSize=48",
    { scroll: true },
  );
});
it("disables navigation for an empty result and does not render another size selector in the footer", () => {
  render(
    <ProductPagination
      page={1}
      pageSize={24}
      total={0}
      pageCount={1}
      compact
    />,
  );
  expect(screen.getByLabelText("Previous page")).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  fireEvent.click(screen.getByLabelText("Next page"));
  expect(nav.push).not.toHaveBeenCalled();
  expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
});
