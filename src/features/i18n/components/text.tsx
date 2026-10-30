"use client";

import { useLocale } from "@/features/i18n/components/locale-provider";
import { translate } from "@/lib/i18n/text";

export function Text({ value }: { value: string }) {
  const locale = useLocale();
  return translate(locale, value);
}
