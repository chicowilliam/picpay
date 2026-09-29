const path = require('node:path');
const { webkit } = require(path.join(process.env.APPDATA, 'npm', 'node_modules', '@playwright', 'cli', 'node_modules', 'playwright'));

const URL = 'http://127.0.0.1:5174/';
const sizes = [
  { width: 390, height: 844 },
  { width: 360, height: 640 },
  { width: 844, height: 390 },
];

const rounded = values => Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Math.round(value * 1000) / 1000]));

(async () => {
  const browser = await webkit.launch({ headless: true });
  const results = [];
  try {
    for (const size of sizes) {
      const context = await browser.newContext({ viewport: size });
      const page = await context.newPage();
      const errors = [];
      const warnings = [];
      const missing = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => {
        if (message.type() === 'error') errors.push(message.text());
        if (message.type() === 'warning') warnings.push(message.text());
      });
      page.on('response', response => {
        if (response.status() >= 400) missing.push({ url: response.url(), status: response.status() });
      });
      await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
      const immediate = await page.evaluate(() => ({
        hero: document.querySelector('.hero-copy')?.getBoundingClientRect().toJSON(),
        posterOpacity: getComputedStyle(document.querySelector('.fallback-hero')).opacity,
        canvas: document.querySelectorAll('canvas').length,
        overflow: document.documentElement.scrollWidth > innerWidth,
      }));
      await page.waitForSelector('.scene-ready, .static-mode', { timeout: 120000 });
      const mode = await page.evaluate(() => document.querySelector('.experience').classList.contains('scene-ready') ? 'webgl' : 'fallback');
      const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      const selectors = ['.hero-copy', '.account-copy', '.pix-copy', '.cashback-copy', '.cards-copy', '.security-copy', '.closing-copy'];
      const seek = async progress => {
        await page.evaluate(({ y }) => scrollTo(0, y), { y: max * progress / 6 });
        await page.waitForTimeout(900);
        return page.evaluate(selectors => {
          const states = {};
          for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (!element) continue;
            const style = getComputedStyle(element);
            const box = element.getBoundingClientRect();
            states[selector] = {
              opacity: Number(style.opacity),
              visibility: style.visibility,
              x: box.x,
              y: box.y,
              right: box.right,
              bottom: box.bottom,
            };
          }
          return {
            y: scrollY,
            overflow: document.documentElement.scrollWidth > innerWidth,
            canvas: document.querySelectorAll('canvas').length,
            states,
          };
        }, selectors);
      };
      const forward = new Map();
      for (const progress of [0, 1, 1.6, 2.65, 3.85, 4.95, 6]) {
        const state = await seek(progress);
        forward.set(progress, state);
        if ([0, 1.6, 2.65, 3.85, 6].includes(progress)) {
          await page.screenshot({ path: `output/playwright/webkit-${size.width}x${size.height}-p${progress}.png` });
        }
      }
      const reverse = [];
      for (const progress of [6, 4.95, 3.85, 2.65, 1.6, 1, 0]) {
        const state = await seek(progress);
        const expected = forward.get(progress);
        let maxOpacityDelta = 0;
        for (const selector of selectors) {
          if (!state.states[selector] || !expected?.states[selector]) continue;
          maxOpacityDelta = Math.max(maxOpacityDelta, Math.abs(state.states[selector].opacity - expected.states[selector].opacity));
        }
        reverse.push({ progress, maxOpacityDelta, y: state.y });
      }
      const final = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        canvas: document.querySelectorAll('canvas').length,
        unofficial: document.querySelector('.concept-label')?.textContent,
        cta: document.querySelector('.closing-copy .primary-cta')?.getAttribute('href'),
      }));
      results.push({ size, mode, immediate, reverse, final, errors, warnings, missing });
      await context.close();
    }

    for (const [name, options] of [
      ['reduced', { viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' }],
      ['no-webgl', { viewport: { width: 390, height: 844 }, noWebGL: true }],
    ]) {
      const context = await browser.newContext({ viewport: options.viewport, reducedMotion: options.reducedMotion || 'no-preference' });
      const page = await context.newPage();
      if (options.noWebGL) {
        await page.addInitScript(() => {
          const getContext = HTMLCanvasElement.prototype.getContext;
          HTMLCanvasElement.prototype.getContext = function(type, ...args) {
            return String(type).startsWith('webgl') ? null : getContext.call(this, type, ...args);
          };
        });
      }
      await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForSelector('.static-mode', { timeout: 120000 });
      results.push({
        name,
        mode: 'fallback',
        canvas: await page.locator('canvas').count(),
        overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        cta: await page.locator('.hero-copy .primary-cta').getAttribute('href'),
      });
      await context.close();
    }
  } finally {
    await browser.close();
  }
  console.log(JSON.stringify({ engine: 'Playwright WebKit emulation', results }, null, 2));
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
