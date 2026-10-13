"use client";

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
  return (
    <div className={className} role="status" aria-label="Loading">
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
