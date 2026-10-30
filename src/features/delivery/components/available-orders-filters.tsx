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
import { useLocale, useText } from "@/features/i18n/components/locale-provider";

type SortBy = "createdAt" | "distance";
type Direction = "asc" | "desc";

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

export function AvailableOrdersFilters({
  initialMaxDistanceKm,
  initialCreatedAfter,
  initialSortBy,
  initialDirection,
}: {
  initialMaxDistanceKm: number | undefined;
  initialCreatedAfter: string | undefined;
  initialSortBy: SortBy;
  initialDirection: Direction;
}) {
  const t = useText();
  const locale = useLocale();
  const [createdAfter, setCreatedAfter] = useState(initialCreatedAfter ?? "");
  const [sortBy, setSortBy] = useState<SortBy>(initialSortBy);
  const [direction, setDirection] = useState<Direction>(initialDirection);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const selectedDate = parseDate(createdAfter);
  const displayDate = selectedDate
    ? new Intl.DateTimeFormat(locale === "si" ? "si-LK" : "en-LK", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(selectedDate)
    : t("Select date");

  return (
    <form
      method="get"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]"
    >
      <div className="min-w-0">
        <Label htmlFor="maxDistanceKm" className="text-sm font-medium">
          {t("Maximum approximate distance")}
        </Label>
        <Input
          key={resetKey}
          id="maxDistanceKm"
          name="maxDistanceKm"
          type="number"
          min="0.1"
          max="500"
          step="0.1"
          defaultValue={initialMaxDistanceKm ?? ""}
          placeholder={t("Kilometres")}
          className="mt-1.5 h-10 w-full"
        />
      </div>
      <div className="min-w-0">
        <Label htmlFor="createdAfter" className="text-sm font-medium">
          {t("Created after")}
        </Label>
        <Input type="hidden" name="createdAfter" value={createdAfter} />
        <Dialog open={calendarOpen} onOpenChange={setCalendarOpen}>
          <DialogTrigger
            render={
              <Button
                id="createdAfter"
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
              <DialogTitle>{t("Created after")}</DialogTitle>
            </DialogHeader>
            <Calendar
              mode="single"
              selected={selectedDate}
              {...(selectedDate ? { defaultMonth: selectedDate } : {})}
              onSelect={(day) => {
                if (!day) return;
                setCreatedAfter(formatDate(day));
                setCalendarOpen(false);
              }}
              className="mx-auto [--cell-size:clamp(1.75rem,8vw,2.5rem)]"
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreatedAfter("");
                  setCalendarOpen(false);
                }}
              >
                {t("Clear date")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="min-w-0">
        <Label htmlFor="sortBy" className="text-sm font-medium">
          {t("Sort by")}
        </Label>
        <Select
          name="sortBy"
          value={sortBy}
          onValueChange={(value) => {
            if (value === "createdAt" || value === "distance") setSortBy(value);
          }}
        >
          <SelectTrigger id="sortBy" className="mt-1.5 h-10 w-full">
            <SelectValue>
              {(value) =>
                t(
                  value === "distance"
                    ? "Approximate distance"
                    : "Creation time",
                )
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">{t("Creation time")}</SelectItem>
            <SelectItem value="distance">
              {t("Approximate distance")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-0">
        <Label htmlFor="direction" className="text-sm font-medium">
          {t("Direction")}
        </Label>
        <Select
          name="direction"
          value={direction}
          onValueChange={(value) => {
            if (value === "asc" || value === "desc") setDirection(value);
          }}
        >
          <SelectTrigger id="direction" className="mt-1.5 h-10 w-full">
            <SelectValue>
              {(value) => t(value === "asc" ? "Ascending" : "Descending")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">{t("Ascending")}</SelectItem>
            <SelectItem value="desc">{t("Descending")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-end gap-2 sm:col-span-2 xl:col-span-1">
        <Button type="submit" className="h-10">
          {t("Apply")}
        </Button>
        <Link
          href="/delivery/orders"
          onClick={() => {
            setCreatedAfter("");
            setSortBy("createdAt");
            setDirection("desc");
            setResetKey((current) => current + 1);
          }}
          className={buttonVariants({
            variant: "outline",
            className: "inline-flex h-10 items-center",
          })}
        >
          {t("Clear")}
        </Link>
      </div>
    </form>
  );
}
