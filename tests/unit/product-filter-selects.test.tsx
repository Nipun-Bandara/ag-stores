import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ProductFilterSelects } from "@/features/owner/components/product-filter-selects";

const categories = [
  {
    id: "beverages-id",
    shopId: "shop-id",
    nameEn: "Beverages",
    nameSi: "පාන වර්ග",
    status: "ACTIVE" as const,
  },
];

afterEach(cleanup);

describe("owner product filters", () => {
  it("shows readable defaults for empty filters", () => {
    render(
      <form>
        <ProductFilterSelects
          categories={categories}
          initialCategoryId=""
          initialInventoryStatus=""
        />
      </form>,
    );

    expect(screen.getByRole("combobox", { name: "Category" })).toHaveTextContent(
      "All categories",
    );
    expect(screen.getByRole("combobox", { name: "Inventory" })).toHaveTextContent(
      "All stock levels",
    );
  });

  it("shows labels while preserving filter values for submission", () => {
    const { container } = render(
      <form>
        <ProductFilterSelects
          categories={categories}
          initialCategoryId="beverages-id"
          initialInventoryStatus="LOW_STOCK"
        />
      </form>,
    );

    expect(screen.getByRole("combobox", { name: "Category" })).toHaveTextContent(
      "Beverages",
    );
    expect(screen.getByRole("combobox", { name: "Inventory" })).toHaveTextContent(
      "Low stock",
    );
    const values = new FormData(container.querySelector("form")!);
    expect(values.get("categoryId")).toBe("beverages-id");
    expect(values.get("inventoryStatus")).toBe("LOW_STOCK");
  });
});
