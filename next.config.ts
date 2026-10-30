import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  // Headless Chrome for PDF export must load from node_modules, not the bundle.
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
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
