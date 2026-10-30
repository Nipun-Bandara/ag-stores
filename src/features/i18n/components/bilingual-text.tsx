"use client";

import { useLocale } from "@/features/i18n/components/locale-provider";
import { localizeBilingual } from "@/lib/i18n/config";

export function BilingualText({
  english,
  sinhala,
}: {
  english: string;
  sinhala: string | null;
}) {
  const locale = useLocale();
  return localizeBilingual(english, sinhala, locale);
}
