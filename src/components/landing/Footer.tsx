import type { Dictionary } from "@/lib/i18n/config";
import Image from "next/image";
import Link from "next/link";
import logo from "@/app/public/logo.svg";

export const Footer = ({
  copy,
  authHref,
  homeHref,
}: {
  copy: Dictionary["landing"];
  authHref: string;
  homeHref: string;
}) => {
  return (
    <footer className="w-full py-stack-lg bg-surface-container-low border-t border-outline-variant mt-auto">
      <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter mb-stack-md">
          <div className="flex flex-col gap-2">
            <Link
              href={homeHref}
              className="text-title-lg font-title-lg font-bold text-primary flex items-center gap-2 mb-2"
            >
              <Image src={logo} alt={copy.logoAlt} width={32} height={32} />
              {copy.brand}
            </Link>
            <p className="font-caption text-caption text-on-surface-variant">
              © {new Date().getFullYear()} {copy.copyright}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <h4 className="font-label-md text-label-md text-on-surface font-semibold mb-2">
              {copy.platform}
            </h4>
            <Link
              href={"#features"}
              className="font-caption text-caption text-on-surface-variant hover:text-primary underline transition-all duration-200"
            >
              {copy.features}
            </Link>
            <Link
              href={"#about"}
              className="font-caption text-caption text-on-surface-variant hover:text-primary underline transition-all duration-200"
            >
              {copy.about}
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <h4 className="font-label-md text-label-md text-on-surface font-semibold mb-2">
              {copy.resources}
            </h4>
            <Link
              href={"#features"}
              className="font-caption text-caption text-on-surface-variant hover:text-primary underline transition-all duration-200"
            >
              {copy.roleGuide}
            </Link>
            <Link
              href={"#market"}
              className="font-caption text-caption text-on-surface-variant hover:text-primary underline transition-all duration-200"
            >
              {copy.community}
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            <h4 className="font-label-md text-label-md text-on-surface font-semibold mb-2">
              {copy.access}
            </h4>
            <Link
              href={authHref}
              className="font-caption text-caption text-on-surface-variant hover:text-primary underline transition-all duration-200"
            >
              {copy.getStarted}
            </Link>
            <Link
              href={"#about"}
              className="font-caption text-caption text-on-surface-variant hover:text-primary underline transition-all duration-200"
            >
              {copy.learnMore}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
