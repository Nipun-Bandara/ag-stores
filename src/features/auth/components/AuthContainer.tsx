"use client";
import { useLocale, useText } from "@/features/i18n/components/locale-provider";
import { LanguageSwitcher } from "@/features/i18n/components/language-switcher";
import { Text } from "@/features/i18n/components/text";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useTheme } from "next-themes";
import Login from "./Login";
import Register from "./Register";
import { Button, buttonVariants } from "@/components/ui/button";
import DotGrid from "@/components/DotGrid";

const subscribeToMount = () => () => {};

interface AuthContainerProps {
  initialMode: "login" | "register";
  homeHref: string;
  returnTo: string;
}

export default function AuthContainer({
  initialMode,
  homeHref,
  returnTo,
}: AuthContainerProps) {
  const t = useText();
  const locale = useLocale();
  const [isSignup, setIsSignup] = useState(initialMode === "register");
  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribeToMount,
    () => true,
    () => false,
  );

  const dotGridBaseColor =
    mounted && resolvedTheme === "dark" ? "#2F293A" : "#ebeef0ff";

  return (
    <div className="w-full min-h-screen bg-background flex flex-col lg:flex-row relative text-foreground">
      <Link
        href={homeHref}
        className={buttonVariants({
          variant: null,
          className: "absolute top-4 left-4 z-50",
        })}
      >
        <ArrowLeft className="w-4 h-4" />
        <Text value={"Back to Home "} />
      </Link>
      <div className="absolute top-4 right-4 z-50">
        <LanguageSwitcher
          locale={locale}
          label={t("Language")}
          alignItemWithTrigger={false}
        />
      </div>
      {/* Form Container - Scrolls with page */}
      <div
        className={`w-full lg:w-1/2 flex-1 flex items-center justify-center px-8 pt-20 pb-8 lg:p-16 bg-background transition-transform duration-700 ease-in-out z-10 ${
          isSignup ? "lg:translate-x-full" : "lg:translate-x-0"
        }`}
      >
        <div className="w-full max-w-md my-auto">
          {/* We use opacity/display to swap forms smoothly */}
          <div className={`${isSignup ? "block animate-fadeIn" : "hidden"}`}>
            <Register
              returnTo={returnTo}
              onSwitchToLogin={() => setIsSignup(false)}
            />
          </div>
          <div className={`${!isSignup ? "block animate-fadeIn" : "hidden"}`}>
            <Login
              returnTo={returnTo}
              onSwitchToSignup={() => setIsSignup(true)}
            />
          </div>
        </div>
      </div>

      {/* /Overlay Container - Sticky */}
      <div
        className={`hidden lg:flex w-1/2 sticky top-0 h-screen bg-muted/30 items-center justify-center overflow-hidden flex-col transition-transform duration-700 ease-in-out z-20 ${
          isSignup ? "lg:-translate-x-full" : "lg:translate-x-0"
        }`}
      >
        {/* Background Grid/Pattern */}
        <div className="absolute inset-0 opacity-50 pointer-events-none">
          <DotGrid
            style={{ position: "absolute" }}
            dotSize={5}
            gap={15}
            baseColor={dotGridBaseColor}
            activeColor="#155dfb"
            proximity={120}
            shockRadius={250}
            shockStrength={5}
            resistance={750}
            returnDuration={1.5}
          />
        </div>

        <div className="relative z-10 text-center mt-8 space-y-6">
          <h2 className="text-2xl font-bold text-foreground">
            {isSignup ? t("Already registered?") : t("New to the AG Stores?")}
          </h2>
          <p className="text-muted-foreground max-w-sm px-8">
            {isSignup
              ? t(
                  "If you already have a AG Stores account, sign in to continue to your dashboard.",
                )
              : t(
                  "Create your AG Stores account to browse products, place orders, and track deliveries.",
                )}
          </p>
          <Button
            onClick={() => setIsSignup(!isSignup)}
            className="border-2 rounded-lg"
          >
            {isSignup ? t("Sign In") : t("Register")}
          </Button>
        </div>
      </div>

      <style jsx>{`
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
