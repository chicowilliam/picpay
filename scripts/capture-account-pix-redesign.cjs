const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(path.join(
  process.env.APPDATA,
  'npm',
  'node_modules',
  '@playwright',
  'cli',
  'node_modules',
  'playwright',
));

const phase = process.argv[2] === 'after' ? 'after' : 'before';
const baseUrl = process.env.APP_URL || 'http://127.0.0.1:5173/';
const requestedWidths = new Set((process.env.CAPTURE_WIDTHS || '').split(',').filter(Boolean).map(Number));
const requestedMoments = new Set((process.env.CAPTURE_MOMENTS || '').split(',').filter(Boolean));
const viewports = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
  { width: 360, height: 640 },
].filter(({ width }) => requestedWidths.size === 0 || requestedWidths.has(width));
const moments = [
  ['hero', 0],
  ['account-entry', 0.72],
  ['account', 1],
  ['account-pix', 1.2],
  ['pix-transfer', 1.6],
  ['pix-confirmed', 1.85],
  ['cashback', 2.65],
  ['cards', 3.85],
  ['security', 4.95],
  ['final', 6],
].filter(([name]) => requestedMoments.size === 0 || requestedMoments.has(name));

async function seek(page, progress) {
  const target = await page.evaluate((value) => {
    const end = Number(document.querySelector('.story').dataset.storyEnd);
    const distance = document.documentElement.scrollHeight - innerHeight;
    scrollTo(0, distance * value / end);
    return scrollY / distance * end;
  }, progress);
  await page.waitForFunction(
    (value) => Math.abs((window.__sceneInfo?.progress ?? -1) - value) < 0.001,
    target,
    { timeout: 30_000 },
  );
  await page.waitForTimeout(180);
  return page.evaluate(() => window.__sceneInfo);
}

(async () => {
  fs.mkdirSync(path.join('output', 'playwright'), { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const results = [];
  try {
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
      await page.waitForSelector('.scene-ready', { timeout: 120_000 });
      await page.mouse.move(viewport.width / 2, viewport.height / 2);
      await page.waitForFunction(() => window.__sceneInfo?.ambientTime >= 4, null, { timeout: 90_000 });

      for (const [name, progress] of moments) {
        const scene = await seek(page, progress);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
        if (overflow) throw new Error(`Horizontal overflow at ${viewport.width} / ${name}`);
        await page.screenshot({
          path: path.join('output', 'playwright', `account-pix-${phase}-${viewport.width}-${name}.png`),
        });
        results.push({ viewport, name, progress: scene.progress, calls: scene.calls, triangles: scene.triangles });
      }
      if (errors.length) throw new Error(`Console errors at ${viewport.width}: ${errors.join('; ')}`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(
    path.join('output', 'playwright', `account-pix-${phase}-metrics.json`),
    JSON.stringify(results, null, 2),
  );
  console.log(JSON.stringify({ phase, captures: results.length, results }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
