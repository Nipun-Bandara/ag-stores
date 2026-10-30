"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OrderStatus } from "@/generated/prisma/client";
import { useLocale, useText } from "@/features/i18n/components/locale-provider";
import { orderStatusLabels } from "@/features/orders/order-presentation";

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(
    Number(value.slice(0, 4)),
    Number(value.slice(5, 7)) - 1,
    Number(value.slice(8, 10)),
  );
  return formatDate(date) === value ? date : undefined;
}

function ReportDateFilter({
  name,
  label,
  initialDate,
}: {
  name: "from" | "to";
  label: string;
  initialDate: string;
}) {
  const t = useText();
  const locale = useLocale();
  const [date, setDate] = useState(initialDate);
  const [open, setOpen] = useState(false);
  const selected = parseDate(date);
  const displayDate = selected
    ? new Intl.DateTimeFormat(locale === "si" ? "si-LK" : "en-LK", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(selected)
    : t("Select date");

  return (
    <div className="min-w-0">
      <Label htmlFor={`report-${name}`} className="text-sm font-medium">
        {label}
      </Label>
      <Input type="hidden" name={name} value={date} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button
              id={`report-${name}`}
              type="button"
              variant="outline"
              className="mt-1.5 h-10 w-full justify-between gap-2 px-3 font-normal"
            >
              <span className="truncate">{displayDate}</span>
              <CalendarDays aria-hidden="true" />
            </Button>
          }
        />
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-sm overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
          </DialogHeader>
          <Calendar
            mode="single"
            selected={selected}
            {...(selected ? { defaultMonth: selected } : {})}
            onSelect={(day) => {
              if (!day) return;
              setDate(formatDate(day));
              setOpen(false);
            }}
            className="mx-auto [--cell-size:clamp(1.75rem,8vw,2.5rem)]"
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDate("");
                setOpen(false);
              }}
            >
              {t("Clear date")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ReportFilters({
  from,
  to,
  initialStatus,
}: {
  from: string;
  to: string;
  initialStatus: OrderStatus | null;
}) {
  const t = useText();
  const [status, setStatus] = useState(initialStatus ?? "");
  const [resetKey, setResetKey] = useState(0);

  return (
    <form
      method="get"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,1fr))_auto]"
    >
      <ReportDateFilter
        key={`from-${resetKey}`}
        name="from"
        label={t("From")}
        initialDate={from}
      />
      <ReportDateFilter
        key={`to-${resetKey}`}
        name="to"
        label={t("To")}
        initialDate={to}
      />
      <div className="min-w-0">
        <Label htmlFor="report-status" className="text-sm font-medium">
          {t("Status")}
        </Label>
        <Select
          name="status"
          value={status}
          onValueChange={(value) => setStatus(value ?? "")}
        >
          <SelectTrigger id="report-status" className="mt-1.5 h-10 w-full">
            <SelectValue>
              {(value) =>
                value && value in orderStatusLabels
                  ? t(orderStatusLabels[value as OrderStatus])
                  : t("All statuses")
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t("All statuses")}</SelectItem>
            {(Object.keys(orderStatusLabels) as OrderStatus[]).map((value) => (
              <SelectItem key={value} value={value}>
                {t(orderStatusLabels[value])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-end gap-2 sm:col-span-2 xl:col-span-1">
        <Button type="submit" className="h-10">
          {t("Apply filters")}
        </Button>
        <Link
          href="/owner/reports"
          onClick={() => {
            setStatus("");
            setResetKey((current) => current + 1);
          }}
          className={buttonVariants({
            variant: "outline",
            className: "inline-flex h-10 items-center",
          })}
        >
          {t("Reset")}
        </Link>
      </div>
    </form>
  );
}
