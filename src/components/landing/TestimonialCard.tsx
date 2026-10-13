import React from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { motion } from "motion/react";
import { Card } from "@/components/ui/card";

interface TestimonialCardProps {
  name: string;
  role: string;
  image: string;
  testimonial: string;
  duration?: number;
  onComplete?: () => void;
}

export function TestimonialCard({
  name,
  role,
  image,
  testimonial,
  duration = 30,
  onComplete,
}: TestimonialCardProps) {
  return (
    <Card className="gap-0 bg-background p-8 max-w-xl soft-bloom">
      <div className="flex items-center gap-4 mb-6">
        <div className="relative w-16 h-16 flex-shrink-0">
          {/* Circular Progress Timer */}
          <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
            <circle
              className="text-muted"
              strokeWidth="4"
              stroke="currentColor"
              fill="transparent"
              r="30"
              cx="32"
              cy="32"
            />
            <motion.circle
              className="text-primary"
              strokeWidth="4"
              stroke="currentColor"
              fill="transparent"
              r="30"
              cx="32"
              cy="32"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: duration, ease: "linear" }}
              {...(onComplete ? { onAnimationComplete: onComplete } : {})}
            />
          </svg>

          <Avatar className="absolute inset-1 size-14">
            <AvatarImage src={image} alt={name} />
            <AvatarFallback>{name.charAt(0)}</AvatarFallback>
          </Avatar>
        </div>

        <div>
          <h3 className="font-title-lg text-title-lg text-foreground">
            {name}
          </h3>
          <p className="font-caption text-caption text-muted-foreground">
            {role}
          </p>
        </div>
      </div>

      <p className="font-body-md text-body-md text-muted-foreground leading-relaxed">
        &quot;{testimonial}&quot;
      </p>
    </Card>
  );
}
