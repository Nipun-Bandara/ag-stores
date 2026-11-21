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
  getMobileTabs,
  getNavItemsForRole,
  ICONS_MAP,
  type NavItem,
} from "@/lib/navigation";

/**
 * Sidebar destinations that have no bottom tab of their own (orders,
 * addresses, profile, security, notifications) plus sign-out, listed on the
 * Account tab for phones. Hidden from md upwards, where the sidebar shows them.
 */
export function customerAccountMenuItems(): NavItem[] {
  const tabHrefs = new Set(getMobileTabs("CUSTOMER").map((tab) => tab.href));
  return getNavItemsForRole("CUSTOMER").filter(
    (item) => !tabHrefs.has(item.href),
  );
}

export function MobileAccountMenu({
  locale,
  localizedRoute,
}: {
  locale: Locale;
  localizedRoute: boolean;
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
      data-testid="mobile-account-menu"
      className="md:hidden"
    >
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {customerAccountMenuItems().map((item) => {
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
