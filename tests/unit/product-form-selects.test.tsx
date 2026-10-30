import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProductForm } from "@/features/owner/components/product-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const options = {
  shops: [
    { id: "shop-one", name: "Colombo Fresh Market" },
    { id: "shop-two", name: "Other Shop" },
  ],
  categories: [
    {
      id: "category-one",
      shopId: "shop-one",
      nameEn: "Groceries",
      nameSi: "සිල්ලර බඩු",
      status: "ACTIVE" as const,
    },
    {
      id: "category-two",
      shopId: "shop-two",
      nameEn: "Beverages",
      nameSi: "පාන වර්ග",
      status: "ACTIVE" as const,
    },
  ],
};

afterEach(cleanup);

describe("product form selects", () => {
  it("shows readable default shop and category labels", () => {
    const { container } = render(<ProductForm options={options} />);

    expect(screen.getByRole("combobox", { name: "Shop" })).toHaveTextContent(
      "Colombo Fresh Market",
    );
    expect(
      screen.getByRole("combobox", { name: "Category" }),
    ).toHaveTextContent("Groceries");
    const values = new FormData(container.querySelector("form")!);
    expect(values.get("shopId")).toBe("shop-one");
    expect(values.get("categoryId")).toBe("category-one");
  });

  it("updates the category when the shop changes", async () => {
    const { container } = render(<ProductForm options={options} />);

    fireEvent.click(screen.getByRole("combobox", { name: "Shop" }));
    const otherShop = await screen.findByRole("option", { name: "Other Shop" });
    fireEvent.pointerDown(otherShop, { pointerType: "mouse" });
    fireEvent.click(otherShop);

    expect(
      screen.getByRole("combobox", { name: "Category" }),
    ).toHaveTextContent("Beverages");
    const values = new FormData(container.querySelector("form")!);
    expect(values.get("shopId")).toBe("shop-two");
    expect(values.get("categoryId")).toBe("category-two");
  });
});
