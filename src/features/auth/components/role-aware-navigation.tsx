import Link from "next/link";

import { UserRole } from "@/generated/prisma/client";
import { LogoutButton } from "@/features/auth/components/logout-button";
import type { AuthenticatedUser } from "@/types/auth";

const dashboardByRole: Record<UserRole, { href: string; label: string }> = {
  CUSTOMER: { href: "/account", label: "Account" },
  SHOP_OWNER: { href: "/owner", label: "Owner dashboard" },
  DELIVERY_PERSON: { href: "/delivery", label: "Delivery dashboard" },
  ADMIN: { href: "/admin", label: "Admin dashboard" },
};

export function RoleAwareNavigation({ user }: { user: AuthenticatedUser }) {
  const dashboard = dashboardByRole[user.role];

  return (
    <header className="flex flex-wrap items-center justify-between gap-5 border-b pb-6">
      <div>
        <Link
          href="/"
          className="text-sm font-medium tracking-widest text-neutral-500 uppercase"
        >
          AG Stores
        </Link>
        <nav
          aria-label="Account navigation"
          className="mt-3 flex flex-wrap gap-4 text-sm font-medium"
        >
          <Link href={dashboard.href}>{dashboard.label}</Link>
          {user.role === UserRole.CUSTOMER ? (
            <>
              <Link href="/account/profile">Profile</Link>
              <Link href="/account/addresses">Addresses</Link>
              <Link href="/account/security">Security</Link>
              <Link href="/orders">Orders</Link>
              <Link href="/cart">Cart</Link>
            </>
          ) : null}
          {user.role === UserRole.SHOP_OWNER ? (
            <Link href="/owner/categories">Categories</Link>
          ) : null}
        </nav>
      </div>
      <LogoutButton />
    </header>
  );
}
