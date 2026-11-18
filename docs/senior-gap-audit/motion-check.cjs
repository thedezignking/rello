/* eslint-disable @typescript-eslint/no-require-imports -- Isolated public-page audit probe. */
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const results = [];
  try {
    for (const preference of ['no-preference', 'reduce']) {
      const context = await browser.createBrowserContext();
      const page = await context.newPage();
      await page.setViewport({ width: 390, height: 844 });
      await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: preference }]);
      await page.setRequestInterception(true);
      page.on('request', request => ['GET', 'HEAD', 'OPTIONS'].includes(request.method()) ? request.continue() : request.abort());
      const errors = [], failed = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('requestfailed', request => failed.push({ url: new URL(request.url()).pathname, error: request.failure()?.errorText }));
      await page.goto('https://userello.vercel.app/?home', { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForFunction(() => document.querySelector('.stage-document [data-preview]')?.style.visibility === 'visible', { timeout: 12000 }).catch(() => {});
      const state = await page.evaluate(() => ({ ready: document.readyState, previews: [...document.querySelectorAll('.stage-document [data-preview]')].map(element => ({ style: element.getAttribute('style'), frameWidth: element.parentElement.clientWidth, textLength: element.innerText.length })) }));
      results.push({ preference, errors, failed, ...state });
      await page.screenshot({ path: path.join(__dirname, `motion-${preference}-mobile.png`) });
      console.log(JSON.stringify(results.at(-1)));
      await context.close();
    }
  } finally { fs.writeFileSync(path.join(__dirname, 'motion-check.json'), JSON.stringify(results, null, 2)); await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
