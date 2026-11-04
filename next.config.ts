import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Content-Security-Policy: zasoby tylko z własnej domeny + Cloudflare Turnstile (captcha).
 * 'unsafe-inline' dla skryptów jest potrzebne, bo strony publiczne są generowane statycznie (bez nonce);
 * zewnętrzne skrypty, ramki, wtyczki i wysyłanie formularzy na obce adresy są zablokowane.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"} https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self' https://challenges.cloudflare.com${isProd ? "" : " ws:"}`,
  "frame-src https://challenges.cloudflare.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ");

// Wersja tymczasowa / podgląd: SITE_NOINDEX=1 – wyszukiwarki nie indeksują żadnej strony
const noindex = process.env.SITE_NOINDEX === "1" ? [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] : [];

const securityHeaders = [
  ...noindex,
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // HSTS: przeglądarka przez 2 lata łączy się wyłącznie przez HTTPS (tylko w produkcji)
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
];

// Strony prywatne nie trafiają do pamięci podręcznej pośredników
const privateHeaders = [{ key: "Cache-Control", value: "private, no-store" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }];

const nextConfig: NextConfig = {
  trailingSlash: true,
  // Samodzielny serwer (server.js) – do wdrożenia na hostingu Node.js (np. cyber_Folks); Vercel buduje po swojemu
  output: process.env.VERCEL ? undefined : "standalone",
  poweredByHeader: false,
  images: { formats: ["image/avif", "image/webp"] },
  experimental: {
    serverActions: { bodySizeLimit: "26mb" },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/portal/:path*", headers: privateHeaders },
      { source: "/admin/:path*", headers: privateHeaders },
    ];
  },
};

export default nextConfig;
