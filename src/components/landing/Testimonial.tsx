"use client";

import type { Dictionary } from "@/lib/i18n/config";

import React, { useState } from "react";
import { TestimonialCard } from "./TestimonialCard";

export function Testimonial({ copy }: { copy: Dictionary["landing"] }) {
  const testimonials = [
    {
      name: copy.farmerName,
      role: copy.farmerRole,
      image:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&auto=format&fit=crop&w=256&q=80",
      testimonial: copy.farmerQuote,
    },
    {
      name: copy.dealerName,
      role: copy.dealerRole,
      image:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=256&q=80",
      testimonial: copy.dealerQuote,
    },
    {
      name: copy.officerName,
      role: copy.officerRole,
      image:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=256&q=80",
      testimonial: copy.officerQuote,
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const handlePrev = () => {
    setCurrentIndex(
      (prev) => (prev - 1 + testimonials.length) % testimonials.length,
    );
  };

  return (
    <div className="py-stack-lg px-margin-mobile md:px-margin-desktop w-full max-w-container-max mx-auto overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-gutter items-center">
        <div>
          <h2 className="font-headline-lg text-headline-lg md:text-display-lg font-bold text-foreground mb-stack-md">
            {copy.testimonialsTitle}
          </h2>
          <p className="font-body-lg text-body-lg text-muted-foreground mb-0 max-w-lg">
            {copy.testimonialsDescription}
          </p>
        </div>

        <div className="flex flex-col items-center lg:items-start">
          <TestimonialCard
            key={currentIndex}
            {...testimonials[currentIndex % testimonials.length]!}
            onComplete={handleNext}
            duration={30}
          />

          <div className="flex gap-4 mt-8">
            <button
              onClick={handlePrev}
              className="p-3 rounded-full bg-background border border-border hover:bg-muted transition-colors text-foreground flex items-center justify-center soft-bloom"
              aria-label={copy.previousTestimonial}
            >
              <span
                className="material-symbols-outlined"
                data-icon="arrow_back"
              >
                arrow_back
              </span>
            </button>
            <button
              onClick={handleNext}
              className="p-3 rounded-full bg-background border border-border hover:bg-muted transition-colors text-foreground flex items-center justify-center soft-bloom"
              aria-label={copy.nextTestimonial}
            >
              <span
                className="material-symbols-outlined"
                data-icon="arrow_forward"
              >
                arrow_forward
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
