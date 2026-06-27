import { execSync } from "child_process";
import os from "node:os";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Wires next-intl (single-locale, no i18n routing) — points at the request
// config that loads the message catalog. See src/i18n/request.ts.
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Every non-internal IPv4 of this machine, so a phone on the same Wi-Fi can hit
// the dev server (http://<lan-ip>:3000) without Next blocking it as a cross-origin
// request. Auto-detected → survives the LAN IP changing (just restart dev).
const lanDevOrigins = (): string[] => {
  const ips: string[] = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const net of list ?? []) {
      if (net.family === "IPv4" && !net.internal) ips.push(net.address);
    }
  }
  return ips;
};

const getCommitSha = () => {
  try {
    return (
      process.env.VERCEL_GIT_COMMIT_SHA ||
      execSync("git rev-parse HEAD").toString().trim()
    );
  } catch {
    return "";
  }
};

// Baseline security headers for every response. Deliberately conservative on CSP
// (only frame-ancestors/object-src/base-uri) so maplibre/recharts/inline styles
// keep working — a full script-src CSP would need a nonce pipeline (do later,
// report-only first). HSTS only takes effect over HTTPS (prod), harmless on http.
const SECURITY_HEADERS = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(self)",
  },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'",
  },
];

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || "0.1.0",
    NEXT_PUBLIC_COMMIT_SHA: getCommitSha(),
  },
  experimental: {
    // Slip uploads (submitSlipAction) accept up to 5MB; phone photos routinely
    // exceed Next's 1MB server-action default, which silently breaks uploads.
    serverActions: {
      bodySizeLimit: "6mb",
      // Let Server Actions fired from the LAN-IP dev URL pass the origin/host
      // CSRF check. Dev-only IPs — harmless in prod (requests never originate there).
      allowedOrigins: lanDevOrigins(),
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  // Allow the dev server's own assets/HMR to be requested from the phone's LAN URL.
  allowedDevOrigins: lanDevOrigins(),
};

export default withNextIntl(nextConfig);
