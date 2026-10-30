"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { useLocale, useText } from "@/features/i18n/components/locale-provider";

function parseDate(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(
    Number(value.slice(0, 4)),
    Number(value.slice(5, 7)) - 1,
    Number(value.slice(8, 10)),
  );
  return formatDate(date) === value ? date : undefined;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function OrderDateFilter({ initialDate = "" }: { initialDate?: string }) {
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
      <Label htmlFor="order-date-picker">{t("Date")}</Label>
      <Input type="hidden" name="date" value={date} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button
              id="order-date-picker"
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
            <DialogTitle>{t("Date")}</DialogTitle>
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
            className="mx-auto"
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
