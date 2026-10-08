import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    useTypeScriptCli: false,
  },
  async headers() {
    const headers = [
      {
        key: "Content-Security-Policy",
        value:
          "object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
      },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=()",
      },
    ];

    if (process.env.NODE_ENV === "production") {
      headers.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }

    return [{ source: "/:path*", headers }];
  },
};

export default nextConfig;
