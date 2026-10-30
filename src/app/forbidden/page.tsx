import { Text } from "@/features/i18n/components/text";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="max-w-md text-center">
        <p className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
          403
        </p>
        <h1 className="mt-3 text-3xl font-semibold">
          <Text value={"Access denied"} />
        </h1>
        <p className="mt-3 text-muted-foreground">
          <Text
            value={"Your account does not have permission to open that page. "}
          />
        </p>
        <Link
          className={buttonVariants({
            variant: "outline",
            className: "mt-6 inline-block",
          })}
          href="/"
        >
          <Text value={"Return home "} />
        </Link>
      </section>
    </main>
  );
}
