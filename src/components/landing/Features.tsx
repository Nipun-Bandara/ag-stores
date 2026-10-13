import type { Dictionary } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

export const Features = ({ copy }: { copy: Dictionary["landing"] }) => {
  const features = [
    {
      title: copy.farmerTitle,
      description: copy.farmerDescription,
      icon: (
        <span className="material-symbols-outlined text-4xl" data-icon="wallet">
          wallet
        </span>
      ),
    },
    {
      title: copy.officerTitle,
      description: copy.officerDescription,
      icon: (
        <span className="material-symbols-outlined text-4xl" data-icon="route">
          route
        </span>
      ),
    },
    {
      title: copy.governmentTitle,
      description: copy.governmentDescription,
      icon: (
        <span
          className="material-symbols-outlined text-4xl"
          data-icon="balance"
        >
          balance
        </span>
      ),
    },
    {
      title: copy.systemTitle,
      description: copy.systemDescription,
      icon: (
        <span
          className="material-symbols-outlined text-4xl"
          data-icon="enhanced_encryption"
        >
          enhanced_encryption
        </span>
      ),
    },
    {
      title: copy.dealerTitle,
      description: copy.dealerDescription,
      icon: (
        <span
          className="material-symbols-outlined text-4xl"
          data-icon="storefront"
        >
          storefront
        </span>
      ),
    },
    {
      title: copy.producerTitle,
      description: copy.producerDescription,
      icon: (
        <span
          className="material-symbols-outlined text-4xl"
          data-icon="account_balance"
        >
          account_balance
        </span>
      ),
    },
    {
      title: copy.marketTitle,
      description: copy.marketDescription,
      icon: (
        <span className="material-symbols-outlined text-4xl" data-icon="eco">
          eco
        </span>
      ),
    },
    {
      title: copy.languageTitle,
      description: copy.languageDescription,
      icon: (
        <span className="material-symbols-outlined text-4xl" data-icon="sms">
          sms
        </span>
      ),
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

      <div className="grid grid-cols-1 min-[450px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 relative z-10 soft-bloom rounded-3xl overflow-hidden bg-background border border-border">
        {features.map((feature, index) => (
          <Feature key={feature.title} {...feature} index={index} />
        ))}
      </div>
    </div>
  );
};

const Feature = ({
  title,
  description,
  icon,
  index,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  index: number;
}) => {
  return (
    <div
      className={cn(
        "flex flex-col lg:border-r py-5 relative group/feature border-border",
        (index === 0 || index === 4) && "lg:border-l border-border",
        index < 4 && "lg:border-b border-border",
      )}
    >
      {index < 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-muted pointer-events-none" />
      )}
      {index >= 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-muted pointer-events-none" />
      )}
      <div className="mb-4 relative z-10 px-10 text-primary">{icon}</div>
      <div className="font-title-lg text-title-lg mb-2 relative z-10 px-10">
        <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-muted group-hover/feature:bg-primary transition-all duration-200 origin-center" />
        <span className="group-hover/feature:translate-x-2 transition duration-200 inline-block text-foreground">
          {title}
        </span>
      </div>
      <p className="font-body-md text-body-md text-muted-foreground max-w-xs relative z-10 px-10">
        {description}
      </p>
    </div>
  );
};
