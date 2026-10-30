"use client";
import { useText } from "@/features/i18n/components/locale-provider";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import { Loader } from "@/components/Loader";
import { ThemeToggle } from "@/components/ThemeToggle";
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
import { canAccessWorkspace } from "@/lib/navigation";

export function AuthenticatedShell({
  children,
  locale,
  localizedRoute,
}: {
  children: ReactNode;
  locale: Locale;
  localizedRoute: boolean;
}) {
  const t = useText();
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const allowed = Boolean(
    user && user.status === "ACTIVE" && canAccessWorkspace(user.role, pathname),
  );

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      const returnTo = `${pathname}${window.location.search}`;
      router.replace(
        `${routePath("/auth", locale, localizedRoute)}?returnTo=${encodeURIComponent(returnTo)}`,
      );
    } else if (!allowed) {
      router.replace(routePath("/forbidden", locale, localizedRoute));
    }
  }, [user, isLoading, allowed, pathname, router, locale, localizedRoute]);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center min-h-screen">
        <Loader />
      </div>
    );
  }
  if (!allowed) return null;

  return (
    <TooltipProvider>
      <LocaleDocument locale={locale} />
      <SidebarProvider>
        <AppSidebar locale={locale} localizedRoute={localizedRoute} />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b border-sidebar-border">
            <div className="flex min-w-0 w-full items-center gap-2 px-4 lg:px-6">
              <SidebarTrigger className="-ml-1" />
              <div className="ml-auto flex items-center gap-3">
                <LanguageSwitcher
                  locale={locale}
                  label={locale === "si" ? "භාෂාව" : t("Language")}
                />
                <ThemeToggle />
              </div>
            </div>
          </header>
          {/* Page gutters live here; child pages only manage their internal spacing. */}
          <div className="flex min-w-0 w-full flex-1 flex-col gap-4 bg-background p-4 text-foreground lg:gap-6 lg:p-6">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
