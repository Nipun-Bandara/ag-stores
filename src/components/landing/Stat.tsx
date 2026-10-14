import type { Dictionary } from "@/lib/i18n/config";
import {
  Banknote,
  Languages,
  LayoutDashboard,
  ShoppingBasket,
} from "lucide-react";

import { Card } from "@/components/ui/card";

export function Stat({ copy }: { copy: Dictionary["landing"] }) {
  const highlights = [
    {
      title: copy.overviewStorefrontTitle,
      description: copy.overviewStorefrontDescription,
      icon: ShoppingBasket,
    },
    {
      title: copy.overviewRolesTitle,
      description: copy.overviewRolesDescription,
      icon: LayoutDashboard,
    },
    {
      title: copy.overviewLanguagesTitle,
      description: copy.overviewLanguagesDescription,
      icon: Languages,
    },
    {
      title: copy.overviewPaymentTitle,
      description: copy.overviewPaymentDescription,
      icon: Banknote,
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="mb-8 text-center">
        <h2 className="font-headline-lg text-headline-lg text-foreground">
          {copy.overviewTitle}
        </h2>
        <p className="font-body-lg text-body-lg text-muted-foreground mt-3 max-w-2xl mx-auto">
          {copy.overviewDescription}
        </p>
      </div>
      <div className="grid grid-cols-1 min-[450px]:grid-cols-2 lg:grid-cols-4 gap-4 pb-12 pt-0 px-4 sm:px-6 md:px-12 w-full">
        {highlights.map(({ title, description, icon: Icon }) => (
          <Card
            key={title}
            as="article"
            className="gap-0 relative flex flex-col bg-card p-5 overflow-hidden soft-bloom"
          >
            <h3 className="relative z-10 flex items-center gap-3 font-title-lg text-title-lg text-foreground">
              <Icon aria-hidden="true" className="size-6 shrink-0" />
              <span className="min-w-0 break-words">{title}</span>
            </h3>
            <p className="text-muted-foreground mt-3 text-sm relative z-10">
              {description}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
