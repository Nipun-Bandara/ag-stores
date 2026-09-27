import Link from "next/link";

import { LogoutButton } from "@/features/auth/components/logout-button";

export function AccountHeader() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-5 border-b pb-6">
      <div>
        <Link
          href="/"
          className="text-sm font-medium tracking-widest text-neutral-500 uppercase"
        >
          AG Stores
        </Link>
        <nav className="mt-3 flex gap-4 text-sm font-medium">
          <Link href="/account">Account</Link>
          <Link href="/account/profile">Profile</Link>
          <Link href="/account/security">Security</Link>
        </nav>
      </div>
      <LogoutButton />
    </header>
  );
}
