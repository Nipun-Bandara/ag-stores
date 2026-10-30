import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * The pill used for every status in the app.
 *
 * `success` and `warning` carry explicit light/dark pairs because the design
 * system has no semantic token for either — the palette stops at primary,
 * secondary, muted, accent and destructive. Keeping them here means one file to
 * change if those tokens ever land, instead of the eight components that each
 * used to hand-roll the same classes.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap [&>svg]:size-3.5 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary",
        secondary: "bg-secondary text-secondary-foreground",
        muted: "bg-muted text-muted-foreground",
        outline: "border border-border text-foreground",
        destructive:
          "bg-red-100 text-red-900 dark:bg-destructive/20 dark:text-red-400",
        success:
          "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-400",
        warning:
          "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-400",
        info: "bg-sky-100 text-sky-900 dark:bg-sky-500/20 dark:text-sky-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
