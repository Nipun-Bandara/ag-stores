"use client";

import { useState } from "react";

import { usePathname } from "next/navigation";

import { localizedPath, type Locale } from "@/lib/i18n/config";

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
    <label className="inline-flex items-center gap-2 text-sm font-semibold">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={locale}
        disabled={pending}
        onChange={(event) => void changeLocale(event.target.value as Locale)}
        className="rounded-full border border-current/15 bg-white px-3 py-2 text-sm text-emerald-950 disabled:opacity-60"
      >
        <option value="en">English</option>
        <option value="si">සිංහල</option>
      </select>
    </label>
  );
}
