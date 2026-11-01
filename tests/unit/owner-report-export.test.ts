// @vitest-environment node
import { expect, it } from "vitest";
import { Workbook, ValueType } from "exceljs";
import {
  reportCsv,
  reportExcel,
  reportFileName,
  reportPrintHtml,
  reportSections,
} from "@/features/owner/lib/report-export";
import { ownerReport } from "../fixtures/owner-report";
import { translate } from "@/lib/i18n/text";
const t = (value: string) => value;

it("exports every displayed section and applied report scope with readable labels", () => {
  const sections = reportSections(ownerReport, t);
  expect(sections).toHaveLength(5);
  expect(sections[0]?.rows).toContainEqual(["From", "2026-10-01"]);
  expect(sections[0]?.rows).toContainEqual(["Status", "Delivered"]);
  expect(sections[1]?.rows).toContainEqual(["2026-10-01", 3, "1100.50"]);
  expect(reportFileName(ownerReport)).toBe(
    "ag-stores-report-2026-10-01-to-2026-10-08-delivered",
  );
});

it("quotes CSV delimiters, preserves Sinhala and keeps formula-looking names as text", () => {
  const csv = reportCsv(
    {
      ...ownerReport,
      bestSellingProducts: [
        ...ownerReport.bestSellingProducts,
        { ...ownerReport.bestSellingProducts[0]!, nameEn: "=1+1" },
      ],
    },
    t,
  );
  expect(csv.startsWith("\uFEFF")).toBe(true);
  expect(csv).toContain('"Tea, ""Premium"""');
  expect(csv).toContain('"තේ"');
  expect(csv).toContain('"\'=1+1"');
  expect(csv).not.toContain("product-id");
});

it("writes a genuine Excel workbook containing all sections and literal text cells", async () => {
  const bytes = await reportExcel(
    {
      ...ownerReport,
      bestSellingProducts: [
        { ...ownerReport.bestSellingProducts[0]!, nameEn: "=1+1" },
      ],
    },
    t,
  );
  const workbook = new Workbook();
  await workbook.xlsx.load(
    bytes as unknown as Parameters<typeof workbook.xlsx.load>[0],
  );
  expect(workbook.worksheets).toHaveLength(5);
  expect(workbook.getWorksheet("Daily totals")?.getCell("C5").value).toBe(
    1100.5,
  );
  expect(workbook.getWorksheet("Daily totals")?.getCell("C5").numFmt).toBe(
    "#,##0.00",
  );
  expect(workbook.getWorksheet("Summary")?.getCell("B5").value).toBe(
    "2026-10-01",
  );
  expect(
    workbook.getWorksheet("Best-selling products")?.getCell("A5").type,
  ).toBe(ValueType.String);
  expect(
    workbook.getWorksheet("Best-selling products")?.getCell("A5").value,
  ).toBe("=1+1");
  expect(
    workbook.getWorksheet("Best-selling products")?.getCell("B5").value,
  ).toBe("තේ");
});

it("escapes report content in the printable PDF view and includes the applied scope", () => {
  const html = reportPrintHtml(
    {
      ...ownerReport,
      bestSellingProducts: [
        {
          ...ownerReport.bestSellingProducts[0]!,
          nameEn: '<script>alert("x")</script>',
        },
      ],
    },
    t,
    "si",
  );
  expect(html).not.toContain("<script>alert");
  expect(html).toContain("&lt;script&gt;");
  expect(html).toContain("2026-10-01");
  expect(html).toContain('lang="si"');
});

it("handles empty data and localizes export headings", () => {
  const sections = reportSections(
    {
      ...ownerReport,
      dailyOrders: [],
      dailyRevenue: [],
      ordersByStatus: [],
      bestSellingProducts: [],
      lowStockProducts: [],
    },
    (value) => translate("si", value),
  );
  expect(sections).toHaveLength(5);
  expect(sections[1]?.rows).toEqual([]);
  expect(sections[1]?.title).not.toBe("Daily orders and revenue");
});
