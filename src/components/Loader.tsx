"use client";
import { useText } from "@/features/i18n/components/locale-provider";

import { Spinner } from "@/components/ui/spinner";

type LoaderProps = {
  size?: number;
  stroke?: number;
  speed?: number;
  color?: string;
  className?: string;
};

export function Loader({
  size = 40,
  stroke = 5,
  speed = 2,
  color = "var(--primary)",
  className,
}: LoaderProps) {
  const t = useText();
  return (
    <div className={className} role="status" aria-label={t("Loading")}>
      <Spinner
        style={{
          width: size,
          height: size,
          animationDuration: `${speed}s`,
          color,
        }}
        strokeWidth={stroke}
        aria-hidden="true"
      />
    </div>
  );
}

export default Loader;
