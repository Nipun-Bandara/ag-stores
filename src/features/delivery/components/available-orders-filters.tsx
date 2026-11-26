"use client";

import { useState } from "react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { DatePickerInput } from "@/features/shared/components/date-picker-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useText } from "@/features/i18n/components/locale-provider";

type SortBy = "createdAt" | "distance";
type Direction = "asc" | "desc";

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
  const [sortBy, setSortBy] = useState<SortBy>(initialSortBy);
  const [direction, setDirection] = useState<Direction>(initialDirection);
  const [resetKey, setResetKey] = useState(0);

  return (
    <form
      method="get"
      className="grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto]"
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
          defaultValue={resetKey === 0 ? (initialMaxDistanceKm ?? "") : ""}
          placeholder={t("Kilometres")}
          className="mt-1.5 h-10 w-full"
        />
      </div>
      <DatePickerInput
        key={resetKey}
        initialDate={resetKey === 0 ? initialCreatedAfter ?? "" : ""}
        name="createdAfter"
        id="createdAfter"
        label={t("Created after")}
        showHint={false}
      />
      <div className="min-w-0">
        <Label htmlFor="sortBy" className="text-sm font-medium">
          {t("Sort by")}
        </Label>
        <Select
          items={[
            { value: "createdAt", label: t("Creation time") },
            { value: "distance", label: t("Approximate distance") },
          ]}
          name="sortBy"
          value={sortBy}
          onValueChange={(value) => {
            if (value === "createdAt" || value === "distance") setSortBy(value);
          }}
        >
          <SelectTrigger
            id="sortBy"
            className="mt-1.5 h-10 w-full data-[size=default]:h-10"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} className="min-w-0">
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
          items={[
            { value: "asc", label: t("Ascending") },
            { value: "desc", label: t("Descending") },
          ]}
          name="direction"
          value={direction}
          onValueChange={(value) => {
            if (value === "asc" || value === "desc") setDirection(value);
          }}
        >
          <SelectTrigger
            id="direction"
            className="mt-1.5 h-10 w-full data-[size=default]:h-10"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} className="min-w-0">
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
