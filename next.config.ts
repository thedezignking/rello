import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_BUILD_DIR ?? ".next",
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  poweredByHeader: false,
  async headers() {
    const origin = (value: string | undefined) => {
      try {
        return new URL(value ?? "").origin;
      } catch {
        return "";
      }
    };
    const supabase = origin(process.env.NEXT_PUBLIC_SUPABASE_URL);
    const sentry = origin(process.env.NEXT_PUBLIC_SENTRY_DSN);
    const policy = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self'",
      `connect-src 'self' ${supabase} ${supabase.replace(/^https:/, "wss:")} ${sentry}`,
      "worker-src 'self' blob:",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
    ].join("; ");
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: policy },
          ...(process.env.NODE_ENV === "production"
            ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }]
            : []),
        ],
      },
    ];
  },
  // Headless Chrome for PDF export must load from node_modules, not the bundle.
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium", "unpdf", "mammoth"],
  // The Chromium package resolves its compressed binaries at runtime. Next's
  // file tracer cannot infer that dynamic lookup, so include them explicitly
  // in the serverless function that renders PDFs.
  outputFileTracingIncludes: {
    "/api/import": [
      "./scripts/parse-document.cjs",
      "./node_modules/unpdf/**/*",
      "./node_modules/mammoth/**/*",
    ],
    "/api/pdf": ["./node_modules/@sparticuz/chromium/bin/**/*"],
  },
  turbopack: {
    // There's a stray package-lock.json in the home directory; pin the root
    // to this project so Next doesn't try to use it.
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
