import Link from "next/link";

import { UserRole } from "@/generated/prisma/client";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { LanguageSwitcher } from "@/features/i18n/components/language-switcher";
import { LocaleDocument } from "@/features/i18n/components/locale-document";
import { getDictionary, routePath } from "@/lib/i18n/config";
import { getLocaleContext } from "@/lib/i18n/server";
import { getUnreadNotificationCount } from "@/services/notification.service";
import type { AuthenticatedUser } from "@/types/auth";

const dashboardByRole: Record<UserRole, string> = {
  CUSTOMER: "/account",
  SHOP_OWNER: "/owner",
  DELIVERY_PERSON: "/delivery",
  ADMIN: "/admin",
};

export async function RoleAwareNavigation({
  user,
}: {
  user: AuthenticatedUser;
}) {
  const { locale, localizedRoute } = await getLocaleContext();
  const unreadNotifications = await getUnreadNotificationCount(user);
  const copy = getDictionary(locale).common;
  const href = (path: string) => routePath(path, locale, localizedRoute);
  const dashboardLabel: Record<UserRole, string> = {
    CUSTOMER: copy.account,
    SHOP_OWNER: copy.ownerDashboard,
    DELIVERY_PERSON: copy.deliveryDashboard,
    ADMIN: copy.adminDashboard,
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-5 border-b pb-6">
      <LocaleDocument locale={locale} />
      <div>
        <Link
          href={href("/")}
          className="text-sm font-medium tracking-widest text-neutral-500 uppercase"
        >
          {copy.brand}
        </Link>
        <nav
          aria-label="Account navigation"
          className="mt-3 flex flex-wrap gap-4 text-sm font-medium"
        >
          <Link href={href(dashboardByRole[user.role])}>
            {dashboardLabel[user.role]}
          </Link>
          <Link href={href("/notifications")}>
            Notifications
            {unreadNotifications > 0 ? ` (${unreadNotifications})` : ""}
          </Link>
          {user.role === UserRole.CUSTOMER ? (
            <>
              <Link href={href("/account/profile")}>{copy.profile}</Link>
              <Link href={href("/account/addresses")}>{copy.addresses}</Link>
              <Link href={href("/account/security")}>{copy.security}</Link>
              <Link href={href("/account/orders")}>{copy.orders}</Link>
              <Link href={href("/cart")}>{copy.cart}</Link>
            </>
          ) : null}
          {user.role === UserRole.SHOP_OWNER ? (
            <>
              <Link href={href("/owner/orders")}>{copy.orders}</Link>
              <Link href={href("/owner/categories")}>{copy.categories}</Link>
              <Link href={href("/owner/products")}>{copy.products}</Link>
              <Link href={href("/owner/delivery-personnel")}>
                {copy.deliveryPersonnel}
              </Link>
              <Link href={href("/owner/settings")}>{copy.shopSettings}</Link>
            </>
          ) : null}
          {user.role === UserRole.ADMIN ? (
            <>
              <Link href={href("/admin/users")}>Users</Link>
              <Link href={href("/admin/shops")}>Shops</Link>
              <Link href={href("/admin/delivery-personnel")}>
                {copy.deliveryPersonnel}
              </Link>
            </>
          ) : null}
          {user.role === UserRole.DELIVERY_PERSON ? (
            <>
              <Link href={href("/delivery/orders")}>
                {copy.availableOrders}
              </Link>
              <Link href={href("/delivery/batches")}>{copy.activeBatches}</Link>
            </>
          ) : null}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <LanguageSwitcher locale={locale} label={copy.language} />
        <LogoutButton
          loginPath={href("/login")}
          label={copy.signOut}
          pendingLabel={copy.signingOut}
        />
      </div>
    </header>
  );
}
