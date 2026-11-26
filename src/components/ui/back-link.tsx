import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ComponentProps } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BackLink({
  className,
  children,
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      className={cn(
        buttonVariants({ variant: "ghost" }),
        "m-0 flex h-auto min-h-9 w-fit min-w-0 max-w-full justify-start whitespace-normal p-0 text-left text-foreground no-underline hover:bg-transparent hover:text-primary",
        className,
      )}
    >
      <ArrowLeft aria-hidden="true" className="size-4 shrink-0" />
      {children}
    </Link>
  );
}
