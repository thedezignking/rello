import "server-only";
import { existsSync } from "node:fs";
import puppeteer, { type Browser } from "puppeteer-core";
import type { PrintPayload } from "./print-view";

// One browser per server process, reused across exports. A fresh page per
// export keeps them isolated.
let browser: Promise<Browser> | null = null;

const LOCAL_BROWSERS = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
];

async function launch() {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const chromium = (await import("@sparticuz/chromium")).default;
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }
  const executablePath = LOCAL_BROWSERS.find((p) => p && existsSync(p));
  if (!executablePath) throw new Error("No Chrome found. Set CHROME_PATH in .env.local.");
  return puppeteer.launch({ executablePath, headless: true });
}

function getBrowser() {
  if (!browser) {
    browser = launch().then((b) => {
      b.on("disconnected", () => {
        browser = null;
      });
      return b;
    });
    browser.catch(() => {
      browser = null;
    });
  }
  return browser;
}

/** Draws the resume on the /print page and returns a PDF. */
export async function renderPdf(origin: string, payload: PrintPayload) {
  const page = await (await getBrowser()).newPage();
  try {
    await page.goto(`${origin}/print`, { waitUntil: "networkidle0", timeout: 30_000 });
    await page.waitForFunction(
      () => document.documentElement.dataset.printReady === "true" && typeof window.__relloRender === "function",
      { timeout: 15_000 },
    );
    await page.evaluate((p) => window.__relloRender!(p), payload);
    return await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      tagged: true,
    });
  } finally {
    await page.close().catch(() => {});
  }
}
