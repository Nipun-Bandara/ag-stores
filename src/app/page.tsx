import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="max-w-xl text-center">
        <p className="mb-3 text-sm font-medium tracking-widest text-neutral-500 uppercase">
          Foundation ready
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          AG Stores
        </h1>
        <p className="mt-4 text-pretty text-neutral-600">
          Retail ordering and delivery management, built for customers, shops,
          delivery teams, and administrators.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <Link
            className="rounded-md bg-neutral-950 px-4 py-2 text-sm text-white"
            href="/login"
          >
            Sign in
          </Link>
          <Link
            className="rounded-md border px-4 py-2 text-sm"
            href="/register"
          >
            Register
          </Link>
        </div>
      </section>
    </main>
  );
}
