"use client";

import { DatePickerInput } from "@/features/shared/components/date-picker-input";
import { useText } from "@/features/i18n/components/locale-provider";

export function OrderDateFilter({
  initialDate = "",
}: {
  initialDate?: string;
}) {
  const t = useText();
  return (
    <DatePickerInput
      initialDate={initialDate}
      name="date"
      label={t("Date")}
      id="order-date"
    />
  );
}
