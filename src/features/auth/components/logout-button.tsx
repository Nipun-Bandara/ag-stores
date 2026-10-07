"use client";

import { useState } from "react";

import { useRouter } from "next/navigation";

export function LogoutButton({
  loginPath = "/login",
  label = "Sign out",
  pendingLabel = "Signing out…",
}: {
  loginPath?: string;
  label?: string;
  pendingLabel?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace(loginPath);
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      className="rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
