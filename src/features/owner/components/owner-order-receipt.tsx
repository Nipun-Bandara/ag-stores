"use client";

import { useMemo, useRef, useState } from "react";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useText } from "@/features/i18n/components/locale-provider";
import {
  buildOrderReceipt,
  type ReceiptOrder,
  type ReceiptPaper,
} from "@/features/owner/lib/order-receipt";

export function OwnerOrderReceipt({
  order,
  cashier,
}: {
  order: ReceiptOrder;
  cashier: string;
}) {
  const t = useText();
  const frame = useRef<HTMLIFrameElement>(null);
  const [paper, setPaper] = useState<ReceiptPaper>("80mm");
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const html = useMemo(
    () => buildOrderReceipt(order, cashier, paper),
    [order, cashier, paper],
  );

  async function print() {
    try {
      const preview = frame.current?.contentWindow;
      if (!ready || !preview) return;
      await preview.document.fonts.ready;
      preview.focus();
      preview.print();
    } catch {
      toast.error(t("Unable to open the print dialog. Please try again."));
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setReady(false);
        setOpen(next);
      }}
    >
      <DialogTrigger
        render={
          <Button type="button" variant="outline">
            <Printer aria-hidden="true" />
            {t("Preview and print bill")}
          </Button>
        }
      />
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-2xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{t("Sinhala bill preview")}</DialogTitle>
          <DialogDescription>
            {t(
              "The bill is always printed in Sinhala. Choose matching paper size in your printer settings.",
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-3">
          <Label htmlFor="receipt-paper">{t("Paper size")}</Label>
          <Select
            value={paper}
            items={[
              { value: "80mm", label: "80 mm" },
              { value: "58mm", label: "58 mm" },
              { value: "A4", label: "A4" },
            ]}
            onValueChange={(value) => {
              if (value === "80mm" || value === "58mm" || value === "A4") {
                setReady(false);
                setPaper(value);
              }
            }}
          >
            <SelectTrigger
              id="receipt-paper"
              className="h-10 w-32 data-[size=default]:h-10"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} className="min-w-0">
              <SelectItem value="80mm">80 mm</SelectItem>
              <SelectItem value="58mm">58 mm</SelectItem>
              <SelectItem value="A4">A4</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div
          className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-border bg-white"
          aria-busy={!ready}
        >
          {!ready ? (
            <div
              className="absolute inset-0 space-y-3 bg-background p-6"
              aria-hidden="true"
            >
              <Skeleton className="mx-auto h-8 w-40" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : null}
          <iframe
            ref={frame}
            title={t("Sinhala bill preview")}
            srcDoc={html}
            sandbox="allow-same-origin allow-modals"
            className="h-[55dvh] min-h-48 w-full"
            onLoad={async (event) => {
              const current = event.currentTarget;
              const document = current.contentDocument;
              try {
                await document?.fonts.ready;
                if (
                  frame.current === current &&
                  current.contentDocument === document
                )
                  setReady(true);
              } catch {
                toast.error(t("Unable to load the bill preview."));
              }
            }}
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setOpen(false);
              setReady(false);
            }}
          >
            {t("Close")}
          </Button>
          <Button
            type="button"
            variant="success"
            disabled={!ready}
            onClick={print}
          >
            <Printer aria-hidden="true" />
            {t("Print bill")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
