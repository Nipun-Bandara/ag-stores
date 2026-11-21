"use client";

import Link from "next/link";
import { ChevronRight, LogOut, SquareTerminal } from "lucide-react";
import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { useAuth } from "@/context/AuthContext";
import { useText } from "@/features/i18n/components/locale-provider";
import { routePath, type Locale } from "@/lib/i18n/config";
import { translate } from "@/lib/i18n/text";
import {
  getRoleMenuItems,
  ICONS_MAP,
  type NavItem,
  type Role,
} from "@/lib/navigation";

/** Customer destinations without a tab, listed on the phone Account tab. */
export function customerAccountMenuItems(): NavItem[] {
  return getRoleMenuItems("CUSTOMER");
}

/**
 * Every destination the bottom tabs leave out, plus sign-out. Staff roles see
 * it on /menu (their More/Account tab); customers see it at the top of
 * /account on phones only (`className="md:hidden"`).
 */
export function RoleMenu({
  role,
  locale,
  localizedRoute,
  className,
}: {
  role: Role;
  locale: Locale;
  localizedRoute: boolean;
  className?: string;
}) {
  const t = useText();
  const { logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    setSigningOut(true);
    setError(null);
    try {
      await logout();
    } catch {
      setError(t("Unable to sign out. Please try again."));
      setSigningOut(false);
    }
  }

  return (
    <nav
      aria-label={translate(locale, "Account")}
      data-testid="role-menu"
      className={className}
    >
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {getRoleMenuItems(role).map((item) => {
          const Icon = ICONS_MAP[item.id] ?? SquareTerminal;
          return (
            <li key={item.id}>
              <Link
                href={routePath(item.href, locale, localizedRoute)}
                className="flex min-h-12 items-center gap-3 px-4 text-sm font-medium text-foreground no-underline active:bg-muted"
              >
                <Icon aria-hidden className="size-4 text-muted-foreground" />
                <span className="flex-1">{translate(locale, item.label)}</span>
                <ChevronRight
                  aria-hidden
                  className="size-4 text-muted-foreground"
                />
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={() => void signOut()}
            disabled={signingOut}
            className="flex min-h-12 w-full items-center gap-3 px-4 text-left text-sm font-medium text-destructive disabled:opacity-60"
          >
            <LogOut aria-hidden className="size-4" />
            {signingOut ? t("Signing out…") : t("Sign out")}
          </button>
        </li>
      </ul>
      {error ? (
        <Alert variant="destructive" className="mt-3">
          {error}
        </Alert>
      ) : null}
    </nav>
  );
}

export function MobileAccountMenu({
  locale,
  localizedRoute,
}: {
  locale: Locale;
  localizedRoute: boolean;
}) {
  return (
    <RoleMenu
      role="CUSTOMER"
      locale={locale}
      localizedRoute={localizedRoute}
      className="md:hidden"
    />
  );
}
