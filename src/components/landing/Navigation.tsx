"use client";
import { useText } from "@/features/i18n/components/locale-provider";

import type { Dictionary, Locale } from "@/lib/i18n/config";

import { useLocaleChange } from "@/features/i18n/components/language-switcher";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Menu, X } from "lucide-react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
// import logo from "@/app/public/logo.svg";

function LandingLanguageSelect({
  locale,
  label,
}: {
  locale: Locale;
  label: string;
}) {
  const t = useText();
  const { pending, changeLocale } = useLocaleChange(locale);
  return (
    <Select
      value={locale}
      disabled={pending}
      onValueChange={(value) => {
        if (value === "en" || value === "si") void changeLocale(value);
      }}
    >
      <SelectTrigger aria-label={label} className="min-w-28">
        <SelectValue>{locale === "si" ? t("සිංහල") : t("English")}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">English</SelectItem>
        <SelectItem value="si">සිංහල</SelectItem>
      </SelectContent>
    </Select>
  );
}

export const Navigation = ({
  copy,
  authHref,
  productsHref,
  homeHref,
  locale,
  languageLabel,
}: {
  copy: Dictionary["landing"];
  authHref: string;
  productsHref: string;
  homeHref: string;
  locale: Locale;
  languageLabel: string;
}) => {
  const navItems = [
    { name: copy.about, href: "#about" },
    { name: copy.features, href: "#features" },
    { name: copy.howItWorks, href: "#workflow" },
    { name: copy.shopNav, href: productsHref },
  ];
  const [isScrolled, setIsScrolled] = useState(false);
  const router = useRouter(); // Initialize router
  const { scrollY } = useScroll();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) setMobileMenuOpen(false);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useMotionValueEvent(scrollY, "change", (latest) => {
    if (latest > 50) {
      setIsScrolled(true);
    } else {
      setIsScrolled(false);
    }
  });

  const getLinkHref = (item: { name: string; href: string }) => {
    return item.href;
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isScrolled ? 1 : 0 }}
        transition={{
          duration: 0.5,
          ease: "easeInOut",
        }}
        className="pointer-events-none fixed justify-center top-0 left-0 right-0 h-6 bg-gradient-to-b from-background to-transparent z-40"
      />
      <header className="pointer-events-none fixed top-0 left-0 right-0 z-40 w-full px-0 py-4 flex justify-center">
        <motion.nav
          layout
          initial={{
            width: "800px",
            backgroundColor: "rgba(0, 0, 0, 0)",
          }}
          animate={
            isMobile
              ? { backgroundColor: "rgba(0, 0, 0, 0)", width: "95%" }
              : {
                  width: isScrolled ? "fit-content" : "1000px",
                  backgroundColor: isScrolled
                    ? "var(--background)"
                    : "rgba(0, 0, 0, 0)",
                }
          }
          transition={{
            duration: 0.5,
            ease: "easeInOut",
          }}
          className="relative max-screen sm:backdrop-blur-md pointer-events-auto flex w-full items-center justify-between gap-6 rounded-full px-4 py-1 transition-colors sm:px-6 sm:pr-4"
        >
          <Link
            href={homeHref}
            className="text-title-lg font-title-lg font-bold flex items-center gap-2"
          >
            {/* <Image src={logo} alt={copy.logoAlt} width={32} height={32} /> */}
            {copy.brand}
          </Link>
          <ul className="hidden font-body-md gap-6 text-sm lg:flex whitespace-nowrap px-16">
            {navItems.map((item) => {
              const href = getLinkHref(item);
              const isActive = pathname === href;
              return (
                <li
                  key={item.name}
                  className="group relative flex items-center"
                >
                  {isActive && (
                    <motion.span
                      layoutId="activeNav"
                      className="absolute -left-3 h-1.5 w-1.5 rounded-full bg-primary"
                      transition={{ duration: 0.3 }}
                    />
                  )}
                  <Link
                    className={`text-foreground hover:text-primary transition-colors ${
                      isActive ? "font-bold" : ""
                    }`}
                    href={href}
                  >
                    <span className="relative inline-flex overflow-hidden">
                      <div className="translate-y-0 skew-y-0 transform-gpu transition-transform duration-500 group-hover:-translate-y-[150%] group-hover:skew-y-12">
                        {item.name}
                      </div>
                      <div className="absolute translate-y-[150%] skew-y-12 transform-gpu transition-transform duration-500 group-hover:translate-y-0 group-hover:skew-y-0">
                        {item.name}
                      </div>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-center gap-4">
            <ThemeToggle label={copy.toggleTheme} />
            <div className="hidden lg:flex gap-4">
              <LandingLanguageSelect locale={locale} label={languageLabel} />
              <Button onClick={() => router.push(authHref)}>
                {copy.launchApp}
              </Button>
            </div>
            <Button
              variant="ghost"
              aria-label={copy.openMenu}
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2"
            >
              <Menu size={24} />
            </Button>
          </div>
        </motion.nav>
      </header>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="right" showCloseButton={false} className="w-72 p-6">
          <SheetTitle className="sr-only">{copy.brand}</SheetTitle>
          <SheetDescription className="sr-only">
            {copy.openMenu}
          </SheetDescription>
          <div className="flex items-center justify-between">
            <Link
              href={homeHref}
              className="text-title-lg font-title-lg font-bold text-primary flex items-center gap-2"
            >
              {/* <Image src={logo} alt={copy.logoAlt} width={32} height={32} /> */}
              {copy.brand}
            </Link>
            <Button
              variant="ghost"
              aria-label={copy.closeMenu}
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 text-foreground"
            >
              <X size={24} />
            </Button>
          </div>

          <ul className="flex flex-col gap-4">
            {navItems.map((item) => {
              const href = getLinkHref(item);
              return (
                <li key={item.name}>
                  <Link
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block text-md ${
                      pathname === href
                        ? "text-primary font-bold"
                        : "text-foreground hover:text-primary"
                    }`}
                  >
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="mt-6 flex flex-col gap-4">
            <LandingLanguageSelect locale={locale} label={languageLabel} />
            <Button
              className="w-full flex justify-center bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => router.push(authHref)}
            >
              {copy.launchApp}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
