import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ProductForm } from "@/features/owner/components/product-form";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: mocks }));
vi.mock("next/navigation", () => ({ useRouter: () => mocks }));
const options = {
  shops: [{ id: "shop-id", name: "Test Shop" }],
  categories: [
    {
      id: "category-id",
      shopId: "shop-id",
      nameEn: "Groceries",
      nameSi: null,
      status: "ACTIVE" as const,
    },
  ],
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mocks.fetch);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function submitProduct() {
  const { container } = render(<ProductForm options={options} />);
  fireEvent.change(screen.getByLabelText("English name"), {
    target: { value: "Tea" },
  });
  fireEvent.change(screen.getByLabelText("Price"), {
    target: { value: "100.00" },
  });
  fireEvent.submit(container.querySelector("form")!);
}

it("confirms creation before navigating back to products", async () => {
  mocks.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ data: { id: "product-id" } }),
  });
  submitProduct();
  await waitFor(() =>
    expect(mocks.success).toHaveBeenCalledWith("Product created successfully."),
  );
  expect(mocks.push).toHaveBeenCalledWith("/owner/products");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("uses a single error toast and keeps the entered values on a server failure", async () => {
  mocks.fetch.mockResolvedValue({
    ok: false,
    json: async () => ({ error: { message: "Unable to save this product." } }),
  });
  submitProduct();
  await waitFor(() =>
    expect(mocks.error).toHaveBeenCalledExactlyOnceWith(
      "Unable to save this product.",
    ),
  );
  expect(screen.getByLabelText("English name")).toHaveValue("Tea");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(mocks.push).not.toHaveBeenCalled();
});

it("reports network failures without navigating", async () => {
  mocks.fetch.mockRejectedValue(new Error("Network unavailable"));
  submitProduct();
  await waitFor(() =>
    expect(mocks.error).toHaveBeenCalledWith("Unable to save this product."),
  );
  expect(mocks.push).not.toHaveBeenCalled();
});

it("does not report success for an invalid creation response", async () => {
  mocks.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
  submitProduct();
  await waitFor(() =>
    expect(mocks.error).toHaveBeenCalledWith("Unable to save this product."),
  );
  expect(mocks.success).not.toHaveBeenCalled();
  expect(mocks.push).not.toHaveBeenCalled();
});

it("keeps missing-category guidance visible without a competing alert", () => {
  render(<ProductForm options={{ ...options, categories: [] }} />);
  expect(
    screen.getByText("Create a category for this shop first."),
  ).toBeVisible();
  expect(screen.getByRole("button", { name: "Create product" })).toBeDisabled();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
