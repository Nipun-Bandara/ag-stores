import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ReportExportButton } from "@/features/owner/components/report-export-button";
import { ownerReport } from "../fixtures/owner-report";

const mocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  excel: vi.fn(),
  csv: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: mocks }));
vi.mock("@/features/owner/lib/report-export", async (original) => ({
  ...(await original<typeof import("@/features/owner/lib/report-export")>()),
  reportExcel: mocks.excel,
  reportCsv: mocks.csv,
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    "URL",
    Object.assign(URL, {
      createObjectURL: vi.fn().mockReturnValue("blob:report"),
      revokeObjectURL: vi.fn(),
    }),
  );
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("offers Excel, CSV and PDF while exporting the currently displayed report", async () => {
  mocks.csv.mockReturnValue("report CSV");
  render(<ReportExportButton report={ownerReport} />);
  fireEvent.click(screen.getByRole("button", { name: "Export report" }));
  fireEvent.click(screen.getByRole("combobox", { name: "File format" }));
  expect(
    await screen.findByRole("option", { name: "Excel (.xlsx)" }),
  ).toBeVisible();
  expect(
    screen.getByRole("option", { name: "Print / Save as PDF" }),
  ).toBeVisible();
  const csv = screen.getByRole("option", { name: "CSV (.csv)" });
  fireEvent.pointerDown(csv, { pointerType: "mouse" });
  fireEvent.click(csv);
  fireEvent.click(screen.getByRole("button", { name: "Download" }));
  await waitFor(() =>
    expect(mocks.success).toHaveBeenCalledWith("Report download started."),
  );
  expect(mocks.csv).toHaveBeenCalledWith(ownerReport, expect.any(Function));
});

it("reports workbook failures and keeps the export dialog open for retry", async () => {
  mocks.excel.mockRejectedValue(new Error("Export failed"));
  render(<ReportExportButton report={ownerReport} />);
  fireEvent.click(screen.getByRole("button", { name: "Export report" }));
  fireEvent.click(screen.getByRole("button", { name: "Download" }));
  await waitFor(() =>
    expect(mocks.error).toHaveBeenCalledWith(
      "Unable to export the report. Please try again.",
    ),
  );
  expect(screen.getByRole("dialog")).toBeVisible();
  expect(screen.getByRole("button", { name: "Download" })).toBeEnabled();
});
