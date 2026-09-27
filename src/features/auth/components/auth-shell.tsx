import type { ReactNode } from "react";

import Link from "next/link";

interface AuthShellProps {
  title: string;
  description: string;
  alternateText: string;
  alternateHref: string;
  alternateLabel: string;
  children: ReactNode;
}

export function AuthShell({
  title,
  description,
  alternateText,
  alternateHref,
  alternateLabel,
  children,
}: AuthShellProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
      <section className="w-full max-w-md rounded-xl border bg-white p-7 shadow-sm">
        <Link href="/" className="text-sm font-semibold tracking-wide">
          AG Stores
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-neutral-600">{description}</p>
        <div className="mt-7">{children}</div>
        <p className="mt-6 text-center text-sm text-neutral-600">
          {alternateText}{" "}
          <Link
            className="font-medium text-neutral-950 underline"
            href={alternateHref}
          >
            {alternateLabel}
          </Link>
        </p>
      </section>
    </main>
  );
}
