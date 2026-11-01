"use client";

import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function InputGroup({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      role="group"
      data-slot="input-group"
      className={cn(
        "group/input-group relative flex h-9 w-full min-w-0 items-center rounded-lg border border-input bg-transparent transition-colors outline-none has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-3 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50 has-[[data-slot=input-group-control][aria-invalid=true]]:border-destructive has-[[data-slot=input-group-control][aria-invalid=true]]:ring-3 has-[[data-slot=input-group-control][aria-invalid=true]]:ring-destructive/20 dark:bg-input/30",
        className,
      )}
      {...props}
    />
  );
}

const addonVariants = cva(
  "flex shrink-0 items-center justify-center gap-2 py-1.5 text-sm font-medium text-muted-foreground [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      align: {
        "inline-start": "order-first pl-2.5",
        "inline-end": "order-last pr-2.5",
        "block-start":
          "order-first w-full justify-start px-3 pt-3 group-has-[&]/input-group:h-auto group-has-[&]/input-group:flex-wrap",
        "block-end":
          "order-last w-full justify-start px-3 pb-3 group-has-[&]/input-group:h-auto group-has-[&]/input-group:flex-wrap",
      },
    },
    defaultVariants: { align: "inline-start" },
  },
);

function InputGroupAddon({
  className,
  align = "inline-start",
  onClick,
  ...props
}: ComponentProps<"div"> & VariantProps<typeof addonVariants>) {
  return (
    <div
      data-slot="input-group-addon"
      data-align={align}
      className={cn(addonVariants({ align }), className)}
      onClick={(event) => {
        onClick?.(event);
        if (
          !event.defaultPrevented &&
          !(event.target as HTMLElement).closest("button")
        )
          event.currentTarget.parentElement?.querySelector("input")?.focus();
      }}
      {...props}
    />
  );
}

const buttonSizes = cva("flex items-center gap-2 shadow-none", {
  variants: {
    size: {
      xs: "h-6 rounded-sm px-2 text-xs [&>svg]:size-3.5",
      sm: "h-8 rounded-md px-2.5",
      "icon-xs": "size-6 rounded-sm p-0 [&>svg]:size-3.5",
      "icon-sm": "size-8 rounded-md p-0",
    },
  },
  defaultVariants: { size: "xs" },
});

function InputGroupButton({
  className,
  type = "button",
  variant = "ghost",
  size = "xs",
  ...props
}: Omit<ComponentProps<typeof Button>, "size"> &
  VariantProps<typeof buttonSizes>) {
  return (
    <Button
      data-slot="input-group-button"
      type={type}
      variant={variant}
      size="sm"
      className={cn(buttonSizes({ size }), className)}
      {...props}
    />
  );
}

function InputGroupInput({
  className,
  ...props
}: ComponentProps<typeof Input>) {
  return (
    <Input
      data-slot="input-group-control"
      className={cn(
        "h-full min-w-0 flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:border-transparent focus-visible:ring-0 aria-invalid:border-transparent aria-invalid:ring-0 dark:bg-transparent",
        className,
      )}
      {...props}
    />
  );
}

export { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput };
