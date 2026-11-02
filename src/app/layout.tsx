import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.brand} – prąd i gaz dla firm, doradztwo energetyczne`, template: `%s | ${SITE.brand}` },
  description: SITE.description,
  applicationName: SITE.brand,
  icons: { icon: "/brand/logo-biznes-symbol.png", apple: "/brand/logo-biznes-symbol.png" },
  openGraph: { siteName: SITE.brand, locale: "pl_PL", type: "website" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#faf7f0", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <head>
        <link rel="preload" href="/fonts/DejaVuSans-Bold.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/DejaVuSans.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
