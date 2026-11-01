"use client";
import { useText } from "@/features/i18n/components/locale-provider";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CircleCheck, CircleX } from "lucide-react";
import { toast } from "sonner";

import type { UserStatus } from "@/generated/prisma/client";
import { IconActionButton } from "@/components/ui/icon-action-button";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StatusResponse {
  data?: { status?: UserStatus };
  error?: { message?: string };
}

export function UserStatusControl({
  userId,
  userName,
  initialStatus,
}: {
  userId: string;
  userName: string;
  initialStatus: UserStatus;
}) {
  const t = useText();
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [open, setOpen] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const nextStatus: UserStatus = status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
  const action = nextStatus === "ACTIVE" ? t("Activate") : t("Deactivate");

  async function changeStatus() {
    setPending(true);
    setError(undefined);
    const response = await fetch(`/api/admin/users/${userId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    }).catch(() => null);
    const payload = response
      ? ((await response.json().catch(() => ({}))) as StatusResponse)
      : {};

    if (!response?.ok || !payload.data?.status) {
      const message = t(
        payload.error?.message ?? "Unable to update account status.",
      );
      setError(message);
      toast.error(message);
    } else {
      setStatus(payload.data.status);
      setOpen(false);
      toast.success(
        t(
          payload.data.status === "ACTIVE"
            ? "{name} was activated."
            : "{name} was deactivated.",
          { name: userName },
        ),
      );
      router.refresh();
    }
    setPending(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!pending) setOpen(nextOpen);
      }}
    >
      <IconActionButton
        label={pending ? t("Updating…") : `${action} ${userName}`}
        variant={nextStatus === "ACTIVE" ? "success" : "destructive"}
        className="text-white"
        type="button"
        disabled={pending}
        onClick={() => {
          setError(undefined);
          setOpen(true);
        }}
      >
        {nextStatus === "ACTIVE" ? (
          <CircleCheck aria-hidden="true" />
        ) : (
          <CircleX aria-hidden="true" className="stroke-white" />
        )}
      </IconActionButton>
      <DialogContent className="max-w-md" initialFocus={cancelRef}>
        <DialogHeader>
          <DialogTitle>
            {t(nextStatus === "ACTIVE" ? "Activate user" : "Deactivate user")}
          </DialogTitle>
          <DialogDescription className="break-words">
            {t(
              nextStatus === "ACTIVE"
                ? "Activate {name} to allow them to sign in again?"
                : "Deactivate {name}? They will not be able to sign in until their account is activated again.",
              { name: userName },
            )}
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert variant="destructive" role="alert" className="mt-4">
            {error}
          </Alert>
        ) : null}
        <DialogFooter>
          <Button
            ref={cancelRef}
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => setOpen(false)}
          >
            {t("Cancel")}
          </Button>
          <Button
            type="button"
            variant={nextStatus === "ACTIVE" ? "success" : "destructive"}
            disabled={pending}
            onClick={changeStatus}
          >
            {pending ? t("Updating…") : action}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
