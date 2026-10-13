import type { Dictionary } from "@/lib/i18n/config";
import { useId } from "react";

import CountUp from "./CountUp";
import { Card } from "@/components/ui/card";

export function Stat({ copy }: { copy: Dictionary["landing"] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 md:gap-2 pb-12 pt-0 sm:pt-0 md:pt-4 lg:pt-12 px-4 sm:px-6 md:px-12 lg:px-12 w-full max-w-7xl mx-auto">
      {stats.map((feature, idx) => (
        <Card
          key={idx}
          className="gap-0 relative flex flex-col items-center justify-center bg-card p-3 sm:p-6 overflow-hidden soft-bloom"
        >
          <Grid size={20} />
          <div className="relative z-20 mb-4 text-primary">{feature.icon}</div>
          <div className="text-3xl font-bold text-foreground relative z-20 flex items-center">
            <CountUp
              from={0}
              to={feature.value}
              separator=","
              direction="up"
              duration={1}
              className="count-up-text"
            />
            {feature.suffix === "T" ? copy.tonUnit : feature.suffix}
          </div>
          <p className="text-muted-foreground mt-2 text-base font-normal relative z-20 text-center">
            {copy[feature.description]}
          </p>
        </Card>
      ))}
    </div>
  );
}

const stats = [
  {
    title: "9K+",
    value: 900,
    suffix: "+",
    description: "farmersRegistered",
    icon: (
      <span className="material-symbols-outlined text-4xl" data-icon="group">
        group
      </span>
    ),
  },
  {
    title: "850+",
    value: 850,
    suffix: "+",
    description: "verifiedDealers",
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
    title: "5k+",
    value: 500,
    suffix: "T",
    description: "tonsDistributed",
    icon: (
      <span
        className="material-symbols-outlined text-4xl"
        data-icon="local_shipping"
      >
        local_shipping
      </span>
    ),
  },
  {
    title: "100%",
    value: 100,
    suffix: "%",
    description: "blockchainVerified",
    icon: (
      <span
        className="material-symbols-outlined text-4xl"
        data-icon="verified_user"
      >
        verified_user
      </span>
    ),
  },
] satisfies {
  title: string;
  value: number;
  suffix: string;
  description: keyof Dictionary["landing"];
  icon: React.ReactNode;
}[];

const defaultGridPattern = [
  [7, 1],
  [8, 5],
  [9, 2],
  [10, 4],
  [7, 3],
];

export const Grid = ({
  pattern,
  size,
}: {
  pattern?: number[][];
  size?: number;
}) => {
  const p = pattern ?? defaultGridPattern;
  return (
    <div className="pointer-events-none absolute left-1/2 top-0  -ml-20 -mt-2 h-full w-full [mask-image:linear-gradient(white,transparent)]">
      <div className="absolute inset-0 bg-gradient-to-r [mask-image:radial-gradient(farthest-side_at_top,white,transparent)] dark:from-muted/20 from-transparent to-transparent dark:to-muted/20 opacity-100">
        <GridPattern
          width={size ?? 20}
          height={size ?? 20}
          x="-12"
          y="4"
          squares={p}
          className="absolute inset-0 h-full w-full"
          strokeClassName="stroke-border"
          fillClassName="fill-border/50"
        />
      </div>
    </div>
  );
};

export function GridPattern({
  width,
  height,
  x,
  y,
  squares,
  strokeClassName,
  fillClassName,
  ...props
}: React.ComponentProps<"svg"> & {
  width?: number;
  height?: number;
  x?: string | number;
  y?: string | number;
  squares?: number[][];
  strokeClassName?: string;
  fillClassName?: string;
}) {
  const patternId = useId();

  return (
    <svg aria-hidden="true" {...props}>
      <defs>
        <pattern
          id={patternId}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <path
            d={`M.5 ${height}V.5H${width}`}
            fill="none"
            strokeWidth="1"
            className={strokeClassName}
          />
        </pattern>
      </defs>
      <rect
        width="100%"
        height="100%"
        strokeWidth={0}
        fill={`url(#${patternId})`}
      />
      {squares && (
        <svg x={x} y={y} className="overflow-visible">
          {squares.map(([x = 0, y = 0]: number[], idx: number) => (
            <rect
              strokeWidth="0"
              className={fillClassName}
              key={`${x}-${y}-${idx}`}
              width={Number(width) + 1}
              height={Number(height) + 1}
              x={x * Number(width)}
              y={y * Number(height)}
            />
          ))}
        </svg>
      )}
    </svg>
  );
}
