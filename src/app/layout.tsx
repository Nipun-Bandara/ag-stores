import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "AG Stores",
  description: "Retail ordering and delivery management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
