import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  trailingSlash: true,
  // Samodzielny serwer (server.js) – do wdrożenia na hostingu Node.js (np. cyber_Folks)
  output: "standalone",
  poweredByHeader: false,
  images: { formats: ["image/avif", "image/webp"] },
  experimental: {
    serverActions: { bodySizeLimit: "26mb" },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
