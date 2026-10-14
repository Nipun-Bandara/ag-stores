"use client";

import { useLocale } from "@/features/i18n/components/locale-provider";
import { formatLocaleDate } from "@/lib/i18n/text";

export function DateText({ value }: { value: Date | string }) {
  const locale = useLocale();
  return formatLocaleDate(locale, value);
}
