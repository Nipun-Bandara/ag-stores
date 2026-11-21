import type { Metadata } from "next";
import { headers } from "next/headers";

import { getCurrentLocale } from "@/lib/i18n/server";
import { translate } from "@/lib/i18n/text";

import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import { LocaleProvider } from "@/features/i18n/components/locale-provider";
import { NONCE_HEADER_NAME } from "@/lib/security/content-security-policy";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale();
  return {
    title: "AG Stores",
    description: translate(locale, "Retail ordering and delivery management"),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [locale, requestHeaders] = await Promise.all([
    getCurrentLocale(),
    headers(),
  ]);
  const nonce = requestHeaders.get(NONCE_HEADER_NAME);
  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          {...(nonce ? { nonce } : {})}
        >
          <LocaleProvider locale={locale}>
            <AuthProvider>{children}</AuthProvider>
          </LocaleProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
