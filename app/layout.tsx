import type { Metadata } from "next";
// import { Roboto, Geist_Mono, Outfit } from "next/font/google";
import "./globals.css";

/*
const roboto = Roboto({
  variable: "--font-roboto",
  weight: ["100", "300", "400", "500", "700", "900"],
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});
*/

export const metadata: Metadata = {
  title: "Wheel of Comfort",
  description: "Global Real Estate Marketplace",
};

import RestrictedBanner from "@/components/layout/RestrictedBanner";
import RestrictedGuard from "@/components/auth/RestrictedGuard";
import PublicLayoutWrapper from "@/components/layout/PublicLayoutWrapper";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`antialiased`}
      >
        <RestrictedBanner />
        <RestrictedGuard>
          <PublicLayoutWrapper>
            {children}
          </PublicLayoutWrapper>
        </RestrictedGuard>
      </body>
    </html>
  );
}
