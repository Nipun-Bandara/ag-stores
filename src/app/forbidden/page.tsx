import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="max-w-md text-center">
        <p className="text-sm font-medium tracking-widest text-neutral-500 uppercase">
          403
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Access denied</h1>
        <p className="mt-3 text-neutral-600">
          Your account does not have permission to open that page.
        </p>
        <Link
          className="mt-6 inline-block rounded-md border px-4 py-2 text-sm"
          href="/"
        >
          Return home
        </Link>
      </section>
    </main>
  );
}
