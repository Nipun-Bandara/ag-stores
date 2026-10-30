"use client";

import { useLocale } from "@/features/i18n/components/locale-provider";
import { translate } from "@/lib/i18n/text";

export function CountNoun({
  count,
  singular,
  plural,
}: {
  count: number;
  singular: string;
  plural: string;
}) {
  const locale = useLocale();
  return translate(locale, count === 1 ? singular : plural);
}
