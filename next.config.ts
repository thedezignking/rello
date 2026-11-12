import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  // Headless Chrome for PDF export must load from node_modules, not the bundle.
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
  // The Chromium package resolves its compressed binaries at runtime. Next's
  // file tracer cannot infer that dynamic lookup, so include them explicitly
  // in the serverless function that renders PDFs.
  outputFileTracingIncludes: {
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
