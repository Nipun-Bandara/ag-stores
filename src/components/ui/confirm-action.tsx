"use client";

import { useRef, useState, type ReactElement } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { useText } from "@/features/i18n/components/locale-provider";

/** Return false from onConfirm to keep a failed action open for retry. */
export function ConfirmAction({
  children,
  title,
  description,
  confirmLabel,
  variant = "destructive",
  onConfirm,
}: {
  children: ReactElement;
  title: string;
  description: string;
  confirmLabel: string;
  variant?: "destructive" | "success";
  onConfirm: () => void | boolean | Promise<void | boolean>;
}) {
  const t = useText();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const running = useRef(false);

  async function confirm() {
    if (running.current) return;
    running.current = true;
    setPending(true);
    try {
      if ((await onConfirm()) !== false) setOpen(false);
    } catch {
      toast.error(t("Unable to complete this action. Please try again."));
    } finally {
      running.current = false;
      setPending(false);
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!running.current) setOpen(next);
      }}
    >
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent
        className="w-[calc(100%-2rem)] max-w-md rounded-lg border-border"
        aria-busy={pending}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="break-words">{title}</AlertDialogTitle>
          <AlertDialogDescription className="break-words">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel type="button" disabled={pending}>
            {t("Cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            type="button"
            className={buttonVariants({ variant })}
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              void confirm();
            }}
          >
            {pending ? t("Updating…") : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
