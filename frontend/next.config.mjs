import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Memoizes components and callbacks automatically, so a toast or Bloomie
  // celebration in the page no longer re-renders every screen and SVG layer.
  reactCompiler: true,
  // Enables `use cache` (cached user lookups in app/api/service.ts).
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Native Rust compiler inside Turbopack; no Babel plugin needed.
    turbopackRustReactCompiler: true,
  },
  turbopack: {
    root: __dirname,
  },
  // Tabs used to be `/?tab=…`; installed PWAs and old links still use those
  // URLs (the query, e.g. `sos=1`, is kept on the redirect).
  async redirects() {
    return ["ground", "wins", "journal", "anchor"].map((tab) => ({
      source: "/",
      has: [{ type: "query", key: "tab", value: tab }],
      destination: `/${tab}`,
      permanent: false,
    }));
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
