"use client";

import { useState } from "react";
import { DatePickerInput } from "@/features/shared/components/date-picker-input";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OrderStatus } from "@/generated/prisma/client";
import { useText } from "@/features/i18n/components/locale-provider";
import { orderStatusLabels } from "@/features/orders/order-presentation";

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
      className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,1fr))_auto]"
    >
      <DatePickerInput
        key={`from-${resetKey}`}
        name="from"
        id="report-from"
        label={t("From")}
        initialDate={from}
      />
      <DatePickerInput
        key={`to-${resetKey}`}
        name="to"
        id="report-to"
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
          <SelectTrigger
            id="report-status"
            className="mt-1.5 h-10 w-full data-[size=default]:h-10"
          >
            <SelectValue>
              {(value) =>
                value && value in orderStatusLabels
                  ? t(orderStatusLabels[value as OrderStatus])
                  : t("All statuses")
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} className="min-w-0">
            <SelectItem value="">{t("All statuses")}</SelectItem>
            {(Object.keys(orderStatusLabels) as OrderStatus[]).map((value) => (
              <SelectItem key={value} value={value}>
                {t(orderStatusLabels[value])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-end gap-2 sm:col-span-2 xl:col-span-1 xl:pt-6.5">
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
