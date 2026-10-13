import { getDictionary, routePath } from "@/lib/i18n/config";
import { getLocaleContext } from "@/lib/i18n/server";

import { Navigation } from "@/components/landing/Navigation";
import { Hero } from "@/components/landing/Hero";
import { Stat } from "@/components/landing/Stat";
import { Features } from "@/components/landing/Features";
import { Testimonial } from "@/components/landing/Testimonial";
import { Footer } from "@/components/landing/Footer";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { locale, localizedRoute } = await getLocaleContext();
  const dictionary = getDictionary(locale);
  const copy = dictionary.landing;
  const authHref = routePath("/auth", locale, localizedRoute);
  const homeHref = routePath("/", locale, localizedRoute);

  return (
    <div className="font-body-md min-h-screen flex flex-col">
      <Navigation
        copy={copy}
        locale={locale}
        languageLabel={dictionary.common.language}
        authHref={authHref}
        homeHref={homeHref}
      />

      <main className="flex-grow pb-stack-lg flex flex-col gap-stack-lg">
        <Hero copy={copy} authHref={authHref} />

        {/* Stats (About) */}
        <div
          id="about"
          className="w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop"
        >
          <Stat copy={copy} />
        </div>
        {/* Features Section */}
        <section id="features" className="w-full">
          <Features copy={copy} />
        </section>

        {/* Testimonials Section (Market) */}
        <section id="market" className="w-full">
          <Testimonial copy={copy} />
        </section>
      </main>

      <div id="contact">
        <Footer copy={copy} authHref={authHref} homeHref={homeHref} />
      </div>
    </div>
  );
}
