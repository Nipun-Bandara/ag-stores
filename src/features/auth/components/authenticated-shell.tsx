"use client";
import { useText } from "@/features/i18n/components/locale-provider";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { Loader } from "@/components/Loader";
import { ThemeToggle } from "@/components/ThemeToggle";
import { buttonVariants } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { routePath, type Locale } from "@/lib/i18n/config";
import { LocaleDocument } from "@/features/i18n/components/locale-document";
import { LanguageSwitcher } from "@/features/i18n/components/language-switcher";
import Link from "next/link";

import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import {
  DASHBOARD_BY_ROLE,
  canAccessWorkspace,
  getMobileTabs,
  isPublicStorefrontPath,
} from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function AuthenticatedShell({
  children,
  locale,
  localizedRoute,
  allowGuests = false,
}: {
  children: ReactNode;
  locale: Locale;
  localizedRoute: boolean;
  /** Public storefront pages render for visitors who have not signed in. */
  allowGuests?: boolean;
}) {
  const t = useText();
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const guestView = allowGuests && !user && isPublicStorefrontPath(pathname);
  const allowed =
    guestView ||
    Boolean(
      user &&
      user.status === "ACTIVE" &&
      canAccessWorkspace(user.role, pathname),
    );

  useEffect(() => {
    if (isLoading) return;
    if (guestView) return;
    if (!user) {
      const returnTo = `${pathname}${window.location.search}`;
      router.replace(
        `${routePath("/auth", locale, localizedRoute)}?returnTo=${encodeURIComponent(returnTo)}`,
      );
    } else if (!allowed) {
      // Owners and staff who open the storefront go to their own workspace.
      router.replace(
        routePath(
          allowGuests && isPublicStorefrontPath(pathname)
            ? DASHBOARD_BY_ROLE[user.role]
            : "/forbidden",
          locale,
          localizedRoute,
        ),
      );
    }
  }, [
    user,
    isLoading,
    allowed,
    allowGuests,
    guestView,
    pathname,
    router,
    locale,
    localizedRoute,
  ]);

  // Public pages render straight away (server-rendered for guests and search
  // engines); the sidebar switches to the signed-in menu once the session loads.
  if (isLoading && !allowGuests) {
    return (
      <div className="flex h-full w-full items-center justify-center min-h-screen">
        <Loader />
      </div>
    );
  }
  if (!allowed) return null;

  // Phones get bottom tabs instead of the sidebar where a role has them.
  const mobileTabs = getMobileTabs(user?.role ?? null, { guest: guestView });
  const hasMobileTabs = mobileTabs.length > 0;

  return (
    <TooltipProvider>
      <LocaleDocument locale={locale} />
      <SidebarProvider>
        <AppSidebar locale={locale} localizedRoute={localizedRoute} />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b border-sidebar-border">
            <div className="flex min-w-0 w-full items-center gap-2 px-4 lg:px-6">
              <SidebarTrigger
                className={cn("-ml-1", hasMobileTabs && "max-md:hidden")}
              />
              {hasMobileTabs ? (
                <Link
                  href={routePath(
                    user && user.role !== "CUSTOMER"
                      ? DASHBOARD_BY_ROLE[user.role]
                      : "/home",
                    locale,
                    localizedRoute,
                  )}
                  data-testid="mobile-brand"
                  aria-label="AG Stores"
                  className="flex shrink-0 items-center gap-2 whitespace-nowrap font-bold text-foreground no-underline md:hidden"
                >
                  <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-[11px] text-primary-foreground">
                    AG
                  </span>
                  AG Stores
                </Link>
              ) : null}
              <div className="ml-auto flex items-center gap-2 sm:gap-3">
                {/* Signed-out visitors on tablet and desktop see how to sign in;
                    phones use the Account tab. Hidden while the session loads
                    so signed-in users never see it flash. */}
                {!isLoading && !user ? (
                  <Link
                    href={routePath("/auth", locale, localizedRoute)}
                    className={buttonVariants({
                      size: "sm",
                      className: "max-md:hidden",
                    })}
                    data-testid="header-login"
                  >
                    <LogIn aria-hidden />
                    {t("Log in")}
                  </Link>
                ) : null}
                <LanguageSwitcher
                  locale={locale}
                  label={locale === "si" ? "භාෂාව" : t("Language")}
                />
                <ThemeToggle />
              </div>
            </div>
          </header>
          {/* Page gutters live here; child pages only manage their internal spacing. */}
          <div
            className={cn(
              "flex min-w-0 w-full flex-1 flex-col gap-4 bg-background p-4 text-foreground lg:gap-6 lg:p-6",
              // Keep the last content clear of the fixed tab bar and home indicator.
              hasMobileTabs &&
                "max-md:pb-[calc(5rem+env(safe-area-inset-bottom))]",
            )}
          >
            {children}
          </div>
        </SidebarInset>
        {hasMobileTabs ? (
          <MobileBottomNav
            tabs={mobileTabs}
            locale={locale}
            localizedRoute={localizedRoute}
          />
        ) : null}
      </SidebarProvider>
    </TooltipProvider>
  );
}
