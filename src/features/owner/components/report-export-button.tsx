"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocale, useText } from "@/features/i18n/components/locale-provider";
import type { OwnerReportsView } from "@/services/owner-report.service";
import { orderStatusLabels } from "@/features/orders/order-presentation";
import {
  reportCsv,
  reportExcel,
  reportFileName,
  reportInventoryNote,
  reportPrintHtml,
} from "@/features/owner/lib/report-export";

export function ReportExportButton({ report }: { report: OwnerReportsView }) {
  const t = useText();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState("xlsx");
  const [pending, setPending] = useState(false);
  const formats = [
    { value: "xlsx", label: t("Excel (.xlsx)") },
    { value: "csv", label: "CSV (.csv)" },
    { value: "pdf", label: t("Print / Save as PDF") },
  ];
  async function exportReport() {
    setPending(true);
    try {
      if (format === "pdf") {
        const frame = document.createElement("iframe");
        frame.title = t("Report preview");
        frame.style.cssText =
          "position:fixed;left:-10000px;width:1100px;height:800px;border:0";
        frame.onload = async () => {
          try {
            await frame.contentDocument?.fonts.ready;
            const preview = frame.contentWindow;
            if (!preview) throw new Error("Print preview unavailable");
            preview.addEventListener("afterprint", () => frame.remove(), {
              once: true,
            });
            preview.focus();
            preview.print();
            toast.info(
              t("Print dialog opened. Choose Save as PDF to save a copy."),
            );
            setOpen(false);
          } catch {
            frame.remove();
            toast.error(t("Unable to export the report. Please try again."));
          } finally {
            setPending(false);
          }
        };
        frame.srcdoc = reportPrintHtml(report, t, locale);
        document.body.appendChild(frame);
        return;
      }
      const contents =
        format === "csv"
          ? reportCsv(report, t)
          : (await reportExcel(report, t)).slice().buffer;
      const blob = new Blob([contents], {
        type:
          format === "csv"
            ? "text/csv;charset=utf-8"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${reportFileName(report)}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success(t("Report download started."));
      setOpen(false);
    } catch {
      toast.error(t("Unable to export the report. Please try again."));
    }
    setPending(false);
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) setOpen(next);
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" className="h-10 shrink-0">
            <Download aria-hidden="true" />
            {t("Export report")}
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Export report")}</DialogTitle>
          <DialogDescription>
            {t(
              "Export the report currently displayed, including all summary and detail sections.",
            )}
          </DialogDescription>
        </DialogHeader>
        <p className="mt-4 text-sm text-muted-foreground">
          {report.filters.from} – {report.filters.to} ·{" "}
          {report.filters.status
            ? t(orderStatusLabels[report.filters.status])
            : t("All statuses")}
        </p>
        <div className="mt-4">
          <Label htmlFor="report-export-format">{t("File format")}</Label>
          <Select
            value={format}
            onValueChange={(value) => {
              if (value) setFormat(value);
            }}
            items={formats}
            disabled={pending}
          >
            <SelectTrigger
              id="report-export-format"
              className="mt-1.5 h-10 w-full data-[size=default]:h-10"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} className="min-w-0">
              {formats.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {t(reportInventoryNote)}
        </p>
        <DialogFooter>
          <Button type="button" disabled={pending} onClick={exportReport}>
            {pending
              ? t("Exporting…")
              : format === "pdf"
                ? t("Print / Save as PDF")
                : t("Download")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
