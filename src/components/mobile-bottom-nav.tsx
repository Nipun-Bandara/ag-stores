"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, ShoppingCart, Store, UserRound } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

import { useCart } from "@/features/cart/cart-store";
import { routePath, type Locale } from "@/lib/i18n/config";
import { translate } from "@/lib/i18n/text";
import { isMobileTabActive, type MobileTab } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const TAB_ICONS: Record<
  MobileTab["id"],
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  home: House,
  shop: Store,
  cart: ShoppingCart,
  account: UserRound,
};

function CartBadge({ locale }: { locale: Locale }) {
  const { items } = useCart();
  // Count product lines, matching the storefront cart summary badge.
  const count = items.length;
  if (count === 0) return null;
  return (
    <span
      className="absolute -right-2.5 -top-1.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-4 text-white"
      aria-label={translate(locale, "{count} items in cart", { count })}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

/**
 * App-style tab bar for phone-sized screens. Hidden from md upwards, where the
 * sidebar takes over. Pads for the iPhone home indicator via safe-area insets.
 */
export function MobileBottomNav({
  tabs,
  locale,
  localizedRoute,
}: {
  tabs: MobileTab[];
  locale: Locale;
  localizedRoute: boolean;
}) {
  const pathname = usePathname();
  return (
    <nav
      aria-label={translate(locale, "Main navigation")}
      data-testid="mobile-bottom-nav"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
    >
      <ul
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))`,
        }}
      >
        {tabs.map((tab) => {
          const Icon = TAB_ICONS[tab.id];
          const active = isMobileTabActive(pathname, tab);
          return (
            <li key={tab.id}>
              <Link
                href={routePath(tab.href, locale, localizedRoute)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium no-underline transition-colors",
                  // The dark theme's primary is too dim for text; use a lighter tint.
                  active
                    ? "text-primary dark:text-indigo-300"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="relative">
                  <Icon
                    className="size-5"
                    strokeWidth={active ? 2.4 : 2}
                    aria-hidden
                  />
                  {tab.id === "cart" ? <CartBadge locale={locale} /> : null}
                </span>
                <span className="max-w-full truncate">
                  {translate(locale, tab.label)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
