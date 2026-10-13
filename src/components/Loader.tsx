"use client";

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
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="animate-spin motion-reduce:animate-none"
        style={{ animationDuration: `${speed}s`, color }}
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - stroke) / 2}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          pathLength="100"
          strokeDasharray="75 25"
        />
      </svg>
    </div>
  );
}

export default Loader;
