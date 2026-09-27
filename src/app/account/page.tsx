import type { Metadata } from "next";

import { LogoutButton } from "@/features/auth/components/logout-button";
import { requireAuthenticatedUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Account | AG Stores" };

export default async function AccountPage() {
  const user = await requireAuthenticatedUser();

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16">
      <div className="flex items-start justify-between gap-6 border-b pb-6">
        <div>
          <p className="text-sm font-medium tracking-widest text-neutral-500 uppercase">
            AG Stores
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Your account
          </h1>
        </div>
        <LogoutButton />
      </div>
      <section className="mt-8 rounded-xl border p-6">
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
      </section>
    </main>
  );
}
