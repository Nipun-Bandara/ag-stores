import type { Metadata } from "next";

import Link from "next/link";

import { UserRole } from "@/generated/prisma/client";
import { AccountHeader } from "@/features/account/components/account-header";
import { requireRole } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Account | AG Stores" };

export default async function AccountPage() {
  const user = await requireRole(UserRole.CUSTOMER, "/account");

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16">
      <AccountHeader user={user} />
      <section className="mt-8 rounded-xl border p-6">
        <h1 className="text-2xl font-semibold tracking-tight">Your account</h1>
        <h2 className="text-xl font-semibold">{user.name}</h2>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-neutral-500">Contact</dt>
            <dd className="mt-1 font-medium">{user.email ?? user.phone}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Account type</dt>
            <dd className="mt-1 font-medium">
              {user.role.replaceAll("_", " ")}
            </dd>
          </div>
          <div>
            <dt className="text-neutral-500">Preferred language</dt>
            <dd className="mt-1 font-medium">
              {user.preferredLanguage === "SI" ? "සිංහල" : "English"}
            </dd>
          </div>
        </dl>
        <div className="mt-6 flex gap-3 border-t pt-5 text-sm font-medium">
          <Link className="underline" href="/account/profile">
            Edit profile
          </Link>
          <Link className="underline" href="/account/addresses">
            Delivery addresses
          </Link>
          <Link className="underline" href="/account/security">
            Change password
          </Link>
        </div>
      </section>
    </main>
  );
}
