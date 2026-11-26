import {
  act,
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
  createUrl: vi.fn(),
  revokeUrl: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: mocks }));
const options = {
  shops: [{ id: "shop", name: "Shop" }],
  categories: [
    {
      id: "category",
      shopId: "shop",
      nameEn: "Groceries",
      nameSi: null,
      status: "ACTIVE" as const,
    },
  ],
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.createUrl.mockReturnValue("blob:product-preview");
  vi.stubGlobal(
    "URL",
    Object.assign(class extends URL {}, {
      createObjectURL: mocks.createUrl,
      revokeObjectURL: mocks.revokeUrl,
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function renderProductForm() {
  const rendered = render(<ProductForm options={options} />);
  fireEvent.change(screen.getByLabelText("English name"), {
    target: { value: "Rice" },
  });
  fireEvent.change(screen.getByLabelText("Item code"), {
    target: { value: "RICE-001" },
  });
  return rendered;
}
function selectPhoto(label = "Choose photo") {
  const file = new File(["image"], "rice.png", { type: "image/png" });
  fireEvent.change(
    screen.getByLabelText(label, { selector: 'input[type="file"]' }),
    { target: { files: [file] } },
  );
  return file;
}
it("shows a selected file in Attachment and removes it without losing form details", () => {
  const { container } = renderProductForm();
  fireEvent.change(screen.getByLabelText("English name"), {
    target: { value: "Rice" },
  });
  const file = selectPhoto();
  expect(mocks.createUrl).toHaveBeenCalledWith(file);
  expect(
    screen.getByRole("img", { name: "Product photo preview" }),
  ).toHaveAttribute("src", "blob:product-preview");
  expect(
    container.querySelector('[data-slot="attachment-title"]'),
  ).toHaveTextContent("rice.png");
  fireEvent.click(screen.getByRole("button", { name: "Remove photo" }));
  expect(mocks.revokeUrl).toHaveBeenCalledWith("blob:product-preview");
  expect(
    screen.queryByRole("img", { name: "Product photo preview" }),
  ).not.toBeInTheDocument();
  expect(screen.getByLabelText("English name")).toHaveValue("Rice");
});
it("supports a photo returned by the native device camera", () => {
  renderProductForm();
  expect(
    screen.getByLabelText("Take photo", { selector: 'input[type="file"]' }),
  ).toHaveAttribute("capture", "environment");
  selectPhoto("Take photo");
  expect(
    screen.getByRole("img", { name: "Product photo preview" }),
  ).toBeVisible();
});
it("shows upload progress and links the uploaded photo to the product", async () => {
  let complete!: (response: unknown) => void;
  mocks.fetch
    .mockReturnValueOnce(
      new Promise((resolve) => {
        complete = resolve;
      }),
    )
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: "product" } }),
    });
  const { container } = renderProductForm();
  selectPhoto();
  fireEvent.submit(container.querySelector("form")!);
  await waitFor(() =>
    expect(container.querySelector('[data-slot="attachment"]')).toHaveAttribute(
      "data-state",
      "uploading",
    ),
  );
  await act(async () => {
    complete({ ok: true, json: async () => ({ data: { id: "upload" } }) });
  });
  await waitFor(() =>
    expect(mocks.success).toHaveBeenCalledWith("Product created successfully."),
  );
  expect(mocks.fetch.mock.calls[0]![0]).toBe(
    "/api/owner/products/photo?shopId=shop",
  );
  expect(JSON.parse(mocks.fetch.mock.calls[1]![1].body)).toMatchObject({
    imageUploadId: "upload",
  });
});
it("preserves the preview and lets customers retry a failed photo upload", async () => {
  mocks.fetch
    .mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: { message: "Photo upload failed. Please try saving again." },
      }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: "upload" } }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: "product" } }),
    });
  const { container } = renderProductForm();
  selectPhoto();
  fireEvent.submit(container.querySelector("form")!);
  await waitFor(() => expect(mocks.error).toHaveBeenCalled());
  expect(
    screen.getByRole("img", { name: "Product photo preview" }),
  ).toBeVisible();
  fireEvent.submit(container.querySelector("form")!);
  await waitFor(() =>
    expect(mocks.success).toHaveBeenCalledWith("Product created successfully."),
  );
});
