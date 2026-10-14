import type { Dictionary } from "@/lib/i18n/config";
import type { LucideIcon } from "lucide-react";
import {
  BellRing,
  ClipboardList,
  ListOrdered,
  PackageSearch,
  Route,
  ShieldCheck,
  ShoppingBasket,
  Store,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export const Features = ({ copy }: { copy: Dictionary["landing"] }) => {
  const features = [
    {
      title: copy.customerTitle,
      description: copy.customerDescription,
      icon: ShoppingBasket,
    },
    {
      title: copy.ownerTitle,
      description: copy.ownerDescription,
      icon: Store,
    },
    {
      title: copy.deliveryTitle,
      description: copy.deliveryDescription,
      icon: Route,
    },
    {
      title: copy.adminTitle,
      description: copy.adminDescription,
      icon: ShieldCheck,
    },
    {
      title: copy.catalogTitle,
      description: copy.catalogDescription,
      icon: PackageSearch,
    },
    {
      title: copy.ordersTitle,
      description: copy.ordersDescription,
      icon: ClipboardList,
    },
    {
      title: copy.batchesTitle,
      description: copy.batchesDescription,
      icon: ListOrdered,
    },
    {
      title: copy.notificationsTitle,
      description: copy.notificationsDescription,
      icon: BellRing,
    },
  ];

  return (
    <div className="pt-2 px-margin-mobile md:px-margin-desktop w-full max-w-container-max mx-auto">
      <div className="text-center mb-16">
        <h2 className="font-headline-lg text-headline-lg md:text-display-lg text-foreground mb-4">
          {copy.featuresTitle}
        </h2>
        <p className="font-body-lg text-body-lg text-muted-foreground max-w-2xl mx-auto">
          {copy.featuresDescription}
        </p>
      </div>

      <Card className="gap-0 py-0 grid grid-cols-1 min-[450px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 relative z-10 soft-bloom overflow-hidden bg-background">
        {features.map((feature, index) => (
          <Feature key={feature.title} {...feature} index={index} />
        ))}
      </Card>
    </div>
  );
};

function Feature({
  title,
  description,
  icon: Icon,
  index,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  index: number;
}) {
  return (
    <div
      className={cn(
        "flex flex-col lg:border-r py-5 relative group/feature border-border",
        (index === 0 || index === 4) && "lg:border-l border-border",
        index < 4 && "lg:border-b border-border",
      )}
    >
      <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-muted pointer-events-none" />
      <h3 className="font-title-lg text-title-lg mb-2 relative z-10 min-w-0 px-5 text-foreground sm:px-10">
        <span className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-muted group-hover/feature:bg-primary transition-all duration-200 origin-center" />
        <span className="group-hover/feature:translate-x-2 transition duration-200 flex items-center gap-3">
          <Icon aria-hidden="true" className="size-6 shrink-0" />
          <span className="min-w-0 break-words">{title}</span>
        </span>
      </h3>
      <p className="font-body-md text-body-md text-muted-foreground max-w-xs relative z-10 px-5 sm:px-10">
        {description}
      </p>
    </div>
  );
}
