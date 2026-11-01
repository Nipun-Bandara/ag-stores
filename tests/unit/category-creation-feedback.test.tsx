import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CategoryManager } from "@/features/owner/components/category-manager";

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: mocks }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mocks.fetch);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function submitCategory() {
  const result = render(
    <TooltipProvider>
      <CategoryManager
        initialData={{
          shops: [{ id: "shop-id", name: "Test Shop" }],
          categories: [],
        }}
      />
    </TooltipProvider>,
  );
  fireEvent.change(screen.getByLabelText("English name"), {
    target: { value: "Beverages" },
  });
  fireEvent.submit(result.container.querySelector("form")!);
}

it("confirms creation and displays the created category", async () => {
  mocks.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      data: {
        id: "category-id",
        nameEn: "Beverages",
        nameSi: null,
        shopId: "shop-id",
        shopName: "Test Shop",
        status: "ACTIVE",
      },
    }),
  });
  submitCategory();
  await waitFor(() =>
    expect(mocks.success).toHaveBeenCalledWith(
      "Category created successfully.",
    ),
  );
  expect(screen.getByRole("heading", { name: "Beverages" })).toBeVisible();
  expect(screen.getByLabelText("English name")).toHaveValue("");
});

it("shows the server error and retains the category input", async () => {
  mocks.fetch.mockResolvedValue({
    ok: false,
    json: async () => ({ error: { message: "Unable to save this category." } }),
  });
  submitCategory();
  await waitFor(() =>
    expect(mocks.error).toHaveBeenCalledWith("Unable to save this category."),
  );
  expect(screen.getByLabelText("English name")).toHaveValue("Beverages");
  expect(mocks.success).not.toHaveBeenCalled();
});

it("reports network failures", async () => {
  mocks.fetch.mockRejectedValue(new Error("Network unavailable"));
  submitCategory();
  await waitFor(() =>
    expect(mocks.error).toHaveBeenCalledWith("Unable to save this category."),
  );
  expect(mocks.success).not.toHaveBeenCalled();
});
