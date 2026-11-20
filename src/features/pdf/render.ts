import { currentBudget } from "@/lib/request-budget";
import { existsSync } from "node:fs";
import puppeteer, { type Browser } from "puppeteer-core";
import "server-only";
import type { PrintPayload } from "./print-view";

// One browser per server process, reused across exports. A fresh page per
// export keeps them isolated.
let browser: Promise<Browser> | null = null;
let active = 0;

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
      // @sparticuz/chromium ships Chrome's headless shell, which needs the
      // shell-specific Puppeteer defaults rather than the regular headless
      // browser launch configuration.
      args: await puppeteer.defaultArgs({ args: chromium.args, headless: "shell" }),
      executablePath: await chromium.executablePath(),
      headless: "shell",
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
  if (active >= 2) throw new Error("PDF capacity reached");
  active++;
  let page: Awaited<ReturnType<Browser["newPage"]>> | undefined;
  const signal = AbortSignal.any([
    AbortSignal.timeout(45000),
    ...(currentBudget() ? [currentBudget()!.signal] : []),
  ]);
  const close = () => {
    void page?.close().catch(() => {});
  };
  signal.addEventListener("abort", close, { once: true });
  try {
    page = await (await getBrowser()).newPage();
    if (signal.aborted) throw new Error("PDF cancelled");
    // Next can keep development and platform connections open after the page
    // is usable, so `networkidle0` may never arrive. The print page exposes an
    // explicit readiness signal below; only wait for its document to load here.
    await page.goto(`${origin}/print`, { waitUntil: "domcontentloaded", timeout: 15_000 });
    await page.waitForFunction(
      () =>
        document.documentElement.dataset.printReady === "true" && typeof window.__relloRender === "function",
      { timeout: 15_000 },
    );
    await page.evaluate((p) => window.__relloRender!(p), payload);
    const pages = await page.evaluate(() =>
      Math.ceil(document.querySelector(".print-root")!.scrollHeight / 1016),
    );
    if (pages > 20) throw new Error("Resume exceeds 20 pages");
    return await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      tagged: true,
      timeout: 15000,
    });
  } finally {
    signal.removeEventListener("abort", close);
    await page?.close().catch(() => {});
    active--;
  }
}
