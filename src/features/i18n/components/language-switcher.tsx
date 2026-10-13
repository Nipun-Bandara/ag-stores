"use client";

import { useState } from "react";

import { usePathname } from "next/navigation";

import { localizedPath, type Locale } from "@/lib/i18n/config";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LanguageSwitcher({
  locale,
  label,
}: {
  locale: Locale;
  label: string;
}) {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);

  async function changeLocale(nextLocale: Locale) {
    if (nextLocale === locale) return;
    setPending(true);
    await fetch("/api/locale", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: nextLocale }),
    }).catch(() => null);
    const query = window.location.search;
    // A locale URL rewrites to the same App Router tree. A full navigation is
    // required so every server component is re-rendered with the new locale.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`${localizedPath(pathname, nextLocale)}${query}`);
  }

  return (
    <Select
      value={locale}
      disabled={pending}
      onValueChange={(value) => {
        if (value === "en" || value === "si") void changeLocale(value);
      }}
    >
      <SelectTrigger aria-label={label} className="min-w-28">
        <SelectValue>{locale === "si" ? "සිංහල" : "English"}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">English</SelectItem>
        <SelectItem value="si">සිංහල</SelectItem>
      </SelectContent>
    </Select>
  );
}
