import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { OwnerOrderReceipt } from "@/features/owner/components/owner-order-receipt";
import { receiptOrder } from "../fixtures/owner-receipt";

const feedback = vi.hoisted(() => ({ error: vi.fn() }));
vi.mock("sonner", () => ({ toast: feedback }));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

async function openPreview() {
  render(<OwnerOrderReceipt order={receiptOrder} cashier="Owner" />);
  fireEvent.click(
    screen.getByRole("button", { name: "Preview and print bill" }),
  );
  const frame = screen.getByTitle("Bill preview") as HTMLIFrameElement;
  const preview = frame.contentWindow!;
  Object.defineProperty(preview.document, "fonts", {
    configurable: true,
    value: { ready: Promise.resolve() },
  });
  const print = vi.spyOn(preview, "print").mockImplementation(() => {});
  vi.spyOn(preview, "focus").mockImplementation(() => {});
  fireEvent.load(frame);
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Print bill" })).toBeEnabled(),
  );
  return { frame, preview, print };
}

it("defaults to 80 mm and prints on Enter in the dialog and inside the receipt", async () => {
  const { frame, preview, print } = await openPreview();
  expect(screen.getByRole("dialog")).toHaveAccessibleName("Bill preview");
  expect(
    screen.getByRole("combobox", { name: "Paper size" }),
  ).toHaveTextContent("80 mm");
  expect(
    screen.queryByText(/Choose matching paper size/),
  ).not.toBeInTheDocument();
  expect(frame.srcdoc).not.toContain("ඇණවුම් අංකය");
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "Bill preview" })).toHaveFocus(),
  );
  fireEvent.keyDown(document.activeElement!, { key: "Enter" });
  await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
  fireEvent.keyDown(preview.document, { key: "Enter" });
  await waitFor(() => expect(print).toHaveBeenCalledTimes(2));
  fireEvent.keyDown(preview.document, { key: "Enter", repeat: true });
  expect(print).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getAllByRole("button", { name: "Close" })[0]!);
  fireEvent.keyDown(window, { key: "Enter" });
  expect(print).toHaveBeenCalledTimes(2);
});

it("keeps Enter available to the paper selector and reports print failures", async () => {
  const { print } = await openPreview();
  fireEvent.keyDown(screen.getByRole("combobox", { name: "Paper size" }), {
    key: "Enter",
  });
  expect(print).not.toHaveBeenCalled();
  fireEvent.keyDown(window, { key: "Escape" });
  print.mockImplementation(() => {
    throw new Error("Printer unavailable");
  });
  fireEvent.click(screen.getByRole("button", { name: "Print bill" }));
  await waitFor(() =>
    expect(feedback.error).toHaveBeenCalledWith(
      "Unable to open the print dialog. Please try again.",
    ),
  );
});
