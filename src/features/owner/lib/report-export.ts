import type { OwnerReportsView } from "@/services/owner-report.service";
import { orderStatusLabels } from "@/features/orders/order-presentation";

type Cell = string | number;
type Translate = (value: string) => string;
export interface ReportSection {
  name: string;
  title: string;
  columns: string[];
  rows: Cell[][];
}

export function reportSections(
  report: OwnerReportsView,
  t: Translate,
): ReportSection[] {
  const revenue = new Map(
    report.dailyRevenue.map((row) => [row.date, row.revenue]),
  );
  const dates = [
    ...new Set([
      ...report.dailyOrders.map((row) => row.date),
      ...report.dailyRevenue.map((row) => row.date),
    ]),
  ].sort();
  const orders = new Map(
    report.dailyOrders.map((row) => [row.date, row.orders]),
  );
  return [
    {
      name: "Summary",
      title: t("Summary"),
      columns: [t("Metric"), t("Value")],
      rows: [
        [t("From"), report.filters.from],
        [t("To"), report.filters.to],
        [
          t("Status"),
          report.filters.status
            ? t(orderStatusLabels[report.filters.status])
            : t("All statuses"),
        ],
        [t("Total orders"), report.summary.totalOrders],
        [t("Delivered revenue (LKR)"), report.summary.totalRevenue],
        [t("Completed deliveries"), report.summary.completedDeliveries],
        [t("Failed deliveries"), report.summary.failedDeliveries],
      ],
    },
    {
      name: "Daily totals",
      title: t("Daily orders and revenue"),
      columns: [t("Date"), t("Orders"), t("Revenue (LKR)")],
      rows: dates.map((date) => [
        date,
        orders.get(date) ?? 0,
        revenue.get(date) ?? "0.00",
      ]),
    },
    {
      name: "Order statuses",
      title: t("Orders by status"),
      columns: [t("Status"), t("Orders")],
      rows: report.ordersByStatus.map((row) => [
        t(orderStatusLabels[row.status]),
        row.orders,
      ]),
    },
    {
      name: "Best-selling products",
      title: t("Best-selling products"),
      columns: [
        t("English name"),
        t("Sinhala name"),
        t("Shop"),
        t("Quantity sold"),
      ],
      rows: report.bestSellingProducts.map((row) => [
        row.nameEn,
        row.nameSi ?? "",
        row.shopName,
        row.quantitySold,
      ]),
    },
    {
      name: "Current low stock",
      title: t("Low-stock products"),
      columns: [
        t("English name"),
        t("Sinhala name"),
        t("Shop"),
        t("Stock quantity"),
        t("Low-stock threshold"),
      ],
      rows: report.lowStockProducts.map((row) => [
        row.nameEn,
        row.nameSi ?? "",
        row.shopName,
        row.stockQuantity,
        row.lowStockThreshold,
      ]),
    },
  ];
}

export function reportFileName(report: OwnerReportsView) {
  return `ag-stores-report-${report.filters.from}-to-${report.filters.to}${report.filters.status ? `-${report.filters.status.toLowerCase().replaceAll("_", "-")}` : ""}`;
}

export const reportInventoryNote =
  "Inventory reflects current stock. Order metrics follow the applied dates and status.";

export function reportCsv(report: OwnerReportsView, t: Translate): string {
  const quote = (cell: Cell) => {
    // User-entered names must remain text when a spreadsheet opens the CSV.
    const safe =
      typeof cell === "string" && /^[\s]*[=+\-@\t\r]/.test(cell)
        ? `'${cell}`
        : String(cell);
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const rows: Cell[][] = [[t("Reports")], [t(reportInventoryNote)], []];
  for (const section of reportSections(report, t))
    rows.push([section.title], section.columns, ...section.rows, []);
  return "\uFEFF" + rows.map((row) => row.map(quote).join(",")).join("\r\n");
}

export async function reportExcel(
  report: OwnerReportsView,
  t: Translate,
): Promise<Uint8Array> {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AG Stores";
  for (const section of reportSections(report, t)) {
    const sheet = workbook.addWorksheet(section.name);
    sheet.addRow([section.title]);
    sheet.addRow([t(reportInventoryNote)]);
    sheet.addRow([]);
    const header = sheet.addRow(section.columns);
    header.font = { bold: true };
    sheet.addRows(section.rows);
    const currencyColumns =
      section.name === "Summary"
        ? [2]
        : section.name === "Daily totals"
          ? [3]
          : [];
    section.rows.forEach((values, index) => {
      if (
        section.name === "Summary" &&
        values[0] !== t("Delivered revenue (LKR)")
      )
        return;
      for (const column of currencyColumns) {
        const value = values[column - 1];
        const amount = Number(value);
        if (
          typeof value === "string" &&
          Number.isSafeInteger(Math.round(amount * 100)) &&
          amount.toFixed(2) === value
        ) {
          const cell = sheet.getCell(index + 5, column);
          cell.value = amount;
          cell.numFmt = "#,##0.00";
        }
      }
    });
    sheet.views = [{ state: "frozen", ySplit: 4 }];
    sheet.columns.forEach((column, index) => {
      column.width = index < 3 ? 30 : 20;
    });
    sheet.eachRow((row) => {
      row.alignment = { vertical: "top", wrapText: true };
    });
  }
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

export function reportPrintHtml(
  report: OwnerReportsView,
  t: Translate,
  locale: string,
): string {
  const escape = (value: Cell) =>
    String(value).replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[character]!,
    );
  const sections = reportSections(report, t)
    .map(
      (section) =>
        `<section><h2>${escape(section.title)}</h2><table><thead><tr>${section.columns.map((title) => `<th>${escape(title)}</th>`).join("")}</tr></thead><tbody>${section.rows.length ? section.rows.map((row) => `<tr>${row.map((cell) => `<td>${escape(cell)}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${section.columns.length}">${escape(t("No data available"))}</td></tr>`}</tbody></table></section>`,
    )
    .join("");
  return `<!doctype html><html lang="${locale === "si" ? "si" : "en"}"><head><meta charset="utf-8"><title>${escape(reportFileName(report))}</title><style>@page{size:A4 landscape;margin:14mm}body{font:11pt system-ui,"Noto Sans Sinhala",sans-serif;color:#111;background:white}h1{font-size:20pt}h2{font-size:13pt;break-after:avoid}section{margin-top:20px}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{text-align:left;vertical-align:top;padding:7px;border:1px solid #ddd;overflow-wrap:anywhere}th{background:#f4f4f4}thead{display:table-header-group}tr{break-inside:avoid}p{font-size:10pt;color:#444}</style></head><body><h1>AG Stores · ${escape(t("Reports"))}</h1><p>${escape(t(reportInventoryNote))}</p>${sections}</body></html>`;
}
