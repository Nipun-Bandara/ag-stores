"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";

export function ImageWithFallback({
  src,
  alt,
  fallback,
  className,
  sizes = "(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw",
}: {
  src: string | null | undefined;
  alt: string;
  fallback: string;
  className?: string;
  sizes?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const imageSrc = src?.trim() || null;
  const showImage = imageSrc && imageSrc !== failedSrc;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-muted text-sm font-medium text-muted-foreground",
        className,
      )}
    >
      {showImage ? (
        <Image
          src={imageSrc}
          alt={alt}
          fill
          sizes={sizes}
          unoptimized
          className="object-cover"
          onError={() => setFailedSrc(imageSrc)}
        />
      ) : (
        <span>{fallback}</span>
      )}
    </div>
  );
}
