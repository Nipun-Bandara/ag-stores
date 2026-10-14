"use client";
import { useText } from "@/features/i18n/components/locale-provider";
import { Text } from "@/features/i18n/components/text";

import * as React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  LogOut,
  SquareTerminal,
  User,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/context/AuthContext";
import {
  getNavGroupsForRole,
  ICONS_MAP,
  isNavItemActive,
} from "@/lib/navigation";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import logo from "@/app/public/logo.svg";
import { routePath, type Locale } from "@/lib/i18n/config";
import { Alert } from "@/components/ui/alert";
import { translate } from "@/lib/i18n/text";

function AppLogo() {
  const t = useText();
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className="hover:bg-transparent pointer-events-none data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-transparent">
            <Image
              src={logo}
              alt={t("AG Stores")}
              className="size-full object-contain"
              priority
            />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-bold text-lg text-sidebar-foreground">
              AG Stores
            </span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

interface NavMenuItem {
  title: string;
  url: string;
  icon?: React.ElementType;
  isActive: boolean;
}

interface NavMenuGroup {
  id: string;
  label: string;
  items: NavMenuItem[];
}

/**
 * One SidebarGroup per functional section. The headings collapse away on their
 * own in icon mode (SidebarGroupLabel fades and pulls itself up), so grouping
 * costs nothing when the sidebar is narrowed.
 */
function NavMain({ groups }: { groups: NavMenuGroup[] }) {
  const { setOpenMobile } = useSidebar();
  return (
    <>
      {groups.map((group) => (
        <SidebarGroup key={group.id}>
          <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
          <SidebarMenu>
            {group.items.map((item) => (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton
                  isActive={item.isActive}
                  aria-current={item.isActive ? "page" : undefined}
                  onClick={() => setOpenMobile(false)}
                  tooltip={item.title}
                  render={
                    <Link href={item.url} className="flex items-center gap-2" />
                  }
                >
                  {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  );
}

function NavUser({
  user,
  profileHref,
  notificationsHref,
}: {
  profileHref: string;
  notificationsHref: string;
  user: {
    name: string;
    email: string;
  };
}) {
  const t = useText();
  const { isMobile, setOpenMobile } = useSidebar();
  const router = useRouter();
  const { logout } = useAuth();
  const [logoutError, setLogoutError] = React.useState<string | null>(null);
  const [signingOut, setSigningOut] = React.useState(false);
  async function handleLogout() {
    setSigningOut(true);
    setLogoutError(null);
    try {
      await logout();
    } catch {
      setLogoutError(t("Unable to sign out. Please try again."));
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              />
            }
          >
            <Avatar>
              <AvatarFallback>
                <User className="size-4" />
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs">{user.email}</span>
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar>
                    <AvatarFallback>
                      <User className="size-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => {
                  setOpenMobile(false);
                  router.push(profileHref);
                }}
                className="cursor-pointer"
              >
                <BadgeCheck className="mr-2 h-4 w-4" />
                <Text value={"Profile "} />
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setOpenMobile(false);
                  router.push(notificationsHref);
                }}
              >
                <Bell className="mr-2 h-4 w-4" />
                <Text value={"Notifications "} />
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                disabled={signingOut}
                onClick={() => void handleLogout()}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {signingOut ? t("Signing out…") : t("Sign out")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        {logoutError && (
          <Alert variant="destructive" role="alert" className="">
            {logoutError}
          </Alert>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function AppSidebar({
  locale,
  localizedRoute,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  locale: Locale;
  localizedRoute: boolean;
}) {
  const { user } = useAuth();
  const pathname = usePathname();

  const navGroups = getNavGroupsForRole(user?.role).map((group) => ({
    id: group.id,
    label: translate(locale, group.label),
    items: group.items.map((item) => ({
      title: translate(locale, item.label),
      url: routePath(item.href, locale, localizedRoute),
      icon: ICONS_MAP[item.id] ?? SquareTerminal,
      // Matching on a bare `startsWith` lit up every item whose href is a
      // prefix of another's — /officer-distribution stayed highlighted while
      // /officer-distribution-history was open. Requiring the trailing slash
      // keeps a nested route active without bleeding across sibling routes.
      isActive: isNavItemActive(pathname, item.href, item.exact),
    })),
  }));

  if (!user) return null;
  const navUser = {
    name: user.name,
    email: user.email ?? user.phone ?? "",
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <AppLogo />
      </SidebarHeader>
      <SidebarContent>
        <NavMain groups={navGroups} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          notificationsHref={routePath(
            "/notifications",
            locale,
            localizedRoute,
          )}
          user={navUser}
          profileHref={routePath(
            user.role === "CUSTOMER" ? "/account/profile" : "/profile",
            locale,
            localizedRoute,
          )}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
