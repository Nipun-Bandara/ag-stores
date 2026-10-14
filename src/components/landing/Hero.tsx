"use client";

import type { Dictionary } from "@/lib/i18n/config";

import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  PackageCheck,
  ShoppingBasket,
  Truck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Hero = ({
  copy,
  authHref,
  productsHref,
}: {
  copy: Dictionary["landing"];
  authHref: string;
  productsHref: string;
}) => {
  const router = useRouter();
  const previewSteps = [
    { label: copy.previewBrowse, icon: ShoppingBasket },
    { label: copy.previewCheckout, icon: CheckCircle2 },
    { label: copy.previewPrepare, icon: PackageCheck },
    { label: copy.previewDeliver, icon: Truck },
  ];

  return (
    <section className="w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg pt-20 md:pt-24">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-lg items-center">
        <div className="flex flex-col gap-stack-md">
          <h1 className="font-display-lg text-3xl sm:text-4xl md:text-display-lg text-on-surface break-words">
            {copy.heroTitle}
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-lg">
            {copy.heroDescription}
          </p>
          <div className="flex flex-wrap gap-stack-md mt-stack-md">
            <Button
              onClick={() => router.push(productsHref)}
              className="font-label-md text-label-md text-white w-full min-w-0 max-w-full whitespace-normal break-words text-center px-4 py-4 h-auto rounded-full soft-bloom sm:w-auto sm:px-8"
            >
              {copy.browseProducts}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(authHref)}
              className="font-label-md text-label-md w-full min-w-0 max-w-full whitespace-normal break-words text-center px-4 py-4 h-auto rounded-full soft-bloom sm:w-auto sm:px-8"
            >
              {copy.accessWorkspace}
            </Button>
          </div>
        </div>

        <div className="hidden sm:flex relative w-full items-center justify-center sm:max-w-[380px] sm:mx-auto md:max-w-full md:mx-0">
          <Card className="w-full max-w-md gap-0 rounded-3xl bg-card p-6 soft-bloom">
            <h2 className="font-title-lg text-title-lg text-foreground">
              {copy.heroPreviewTitle}
            </h2>
            <ol className="mt-5 space-y-3">
              {previewSteps.map(({ label, icon: Icon }, index) => (
                <li
                  key={label}
                  className="flex items-center gap-4 rounded-xl border border-border bg-background p-3"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1 font-medium text-foreground">
                    {label}
                  </span>
                  <span
                    className="text-sm text-muted-foreground"
                    aria-hidden="true"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </section>
  );
};
