import type { Dictionary } from "@/lib/i18n/config";
import { BellRing, PackageCheck, ShoppingCart, Truck } from "lucide-react";

import { Card } from "@/components/ui/card";

export function OrderFlow({ copy }: { copy: Dictionary["landing"] }) {
  const steps = [
    {
      title: copy.flowBrowseTitle,
      description: copy.flowBrowseDescription,
      icon: ShoppingCart,
    },
    {
      title: copy.flowPrepareTitle,
      description: copy.flowPrepareDescription,
      icon: PackageCheck,
    },
    {
      title: copy.flowDeliverTitle,
      description: copy.flowDeliverDescription,
      icon: Truck,
    },
    {
      title: copy.flowTrackTitle,
      description: copy.flowTrackDescription,
      icon: BellRing,
    },
  ];

  return (
    <div className="py-stack-lg px-margin-mobile md:px-margin-desktop w-full max-w-container-max mx-auto">
      <div className="mb-8 max-w-2xl">
        <h2 className="font-headline-lg text-headline-lg md:text-display-lg font-bold text-foreground mb-stack-md">
          {copy.flowTitle}
        </h2>
        <p className="font-body-lg text-body-lg text-muted-foreground">
          {copy.flowDescription}
        </p>
      </div>
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(({ title, description, icon: Icon }, index) => (
          <li key={title}>
            <Card
              as="article"
              className="h-full gap-0 bg-background p-6 soft-bloom"
            >
              <div className="flex items-center justify-between text-foreground">
                <Icon aria-hidden="true" className="size-6" />
                <span
                  className="text-sm text-muted-foreground"
                  aria-hidden="true"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="font-title-lg text-title-lg text-foreground mt-5">
                {title}
              </h3>
              <p className="font-body-md text-body-md text-muted-foreground mt-2">
                {description}
              </p>
            </Card>
          </li>
        ))}
      </ol>
    </div>
  );
}
