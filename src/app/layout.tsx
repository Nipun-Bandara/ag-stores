import type { Metadata } from "next";

import { getCurrentLocale } from "@/lib/i18n/server";

import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "AG Stores",
  description: "Retail ordering and delivery management",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getCurrentLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
