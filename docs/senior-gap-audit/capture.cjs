/* eslint-disable @typescript-eslint/no-require-imports -- Read-only browser audit harness. */
// Audit evidence only: isolated browser, public pages, no form submissions.
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');
const directory = __dirname;
const origin = process.argv[2] ?? 'http://localhost:3000';
if (!['http://localhost:3000', 'https://userello.vercel.app'].includes(origin)) throw new Error('Only the Rello audit origins are allowed');
const routes = [['landing', '/?home'], ['resumes-empty', '/resumes'], ['billing-guest', '/settings/billing'], ['privacy', '/privacy'], ['terms', '/terms'], ['guide', '/guide']];
(async () => {
  const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
  if (!executablePath) throw new Error('No local browser executable found');
  const browser = await puppeteer.launch({ executablePath, headless: true });
  const context = await browser.createBrowserContext();
  const results = [];
  try {
    for (const [device, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
      const page = await context.newPage();
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      await page.setRequestInterception(true);
      let blockedWrites = 0;
      page.on('request', request => {
        if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) { blockedWrites++; return request.abort(); }
        return request.continue();
      });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      for (const [name, route] of routes) {
        try {
          errors.length = 0;
          const response = await page.goto(origin + route, { waitUntil: 'domcontentloaded', timeout: 45000 });
          await page.waitForNetworkIdle({ idleTime: 500, timeout: 12000 }).catch(() => {});
          if (name === 'landing') await page.waitForFunction(() => [...document.querySelectorAll('.stage-document [data-preview]')].some(element => getComputedStyle(element).visibility === 'visible'), { timeout: 15000 });
          if (name === 'resumes-empty') await page.waitForFunction(() => /No resumes|Your first|Start with|couldn.t load/i.test(document.body.innerText) || document.querySelector('[data-slot="empty"]'), { timeout: 15000 }).catch(() => {});
          if (name === 'billing-guest') await page.waitForSelector('main h1', { timeout: 15000 });
          await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
          if (name === 'landing') {
            await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight) { scrollTo(0, y); await new Promise(resolve => setTimeout(resolve, 120)); } scrollTo(0, 0); });
          }
          await page.screenshot({ path: path.join(directory, `${name}-${device}.png`), fullPage: true });
          const measurement = await page.evaluate(() => ({
            viewport: innerWidth,
            documentWidth: document.documentElement.scrollWidth,
            theme: document.documentElement.dataset.theme,
            heading: document.querySelector('h1')?.textContent,
            matchFonts: [...document.querySelectorAll('.match-demo-header,.match-demo-row,.match-demo-status')].map(element => ({ text: element.textContent.trim(), size: getComputedStyle(element).fontSize })),
            inputsWithoutLabel: [...document.querySelectorAll('input:not([type=hidden]),textarea,select')].filter(element => getComputedStyle(element).display !== 'none' && element.getAttribute('aria-hidden') !== 'true' && !element.labels?.length && !element.getAttribute('aria-label') && !element.getAttribute('aria-labelledby')).map(element => element.id || element.name),
            text: document.body.innerText.slice(0, 16000),
          }));
          results.push({ page: name, device, route, status: response.status(), blockedWrites, errors: [...errors], ...measurement });
          if (name === 'landing') {
            await page.screenshot({ path: path.join(directory, `landing-fold-${device}.png`) });
            const match = await page.$('.match-stage');
            if (match) {
              await match.scrollIntoView();
              await page.waitForFunction(() => [...document.querySelectorAll('.match-demo-row')].every(element => Number(getComputedStyle(element).opacity) >= 0.99 && ['none', 'blur(0px)'].includes(getComputedStyle(element).filter)), { timeout: 5000 }).catch(() => {});
              await match.screenshot({ path: path.join(directory, `match-demo-${device}.png`) });
            }
          }
          console.log(JSON.stringify({ page: name, device, status: response.status(), width: measurement.documentWidth, viewport: measurement.viewport }));
        } catch (error) { results.push({ page: name, device, error: error.message }); console.log(name, device, error.message); }
      }
      await page.close();
    }
  } finally {
    fs.writeFileSync(path.join(directory, 'browser-evidence.json'), JSON.stringify(results, null, 2));
    await context.close();
    await browser.close();
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
