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

const baseUrl = process.env.APP_URL || 'http://127.0.0.1:5173/';
const viewports = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
  { width: 360, height: 640 },
];
const protectedMoments = ['hero', 'cashback', 'cards', 'security', 'final'];
const progressPoints = [0, 0.21, 0.72, 1, 1.05, 1.12, 1.2, 1.43, 1.6, 1.78, 1.85, 1.94, 2.01, 2.2];

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
  await page.waitForTimeout(120);
  return page.evaluate(() => ({
    scene: window.__sceneInfo,
    overflow: document.documentElement.scrollWidth > innerWidth,
    accountStage: Number(getComputedStyle(document.querySelector('.account-product-stage')).opacity),
    pixStage: Number(getComputedStyle(document.querySelector('.pix-product-stage')).opacity),
  }));
}

async function imageDifference(page, first, second) {
  return page.evaluate(async ({ first, second }) => {
    const load = async (src) => {
      const image = new Image();
      image.src = src;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height - 3;
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0);
      return { width: canvas.width, height: canvas.height, data: context.getImageData(0, 0, canvas.width, canvas.height).data };
    };
    const [a, b] = await Promise.all([load(first), load(second)]);
    if (a.width !== b.width || a.height !== b.height) throw new Error(`Image sizes differ: ${first} / ${second}`);
    let changed = 0;
    for (let index = 0; index < a.data.length; index += 4) {
      const delta = Math.abs(a.data[index] - b.data[index])
        + Math.abs(a.data[index + 1] - b.data[index + 1])
        + Math.abs(a.data[index + 2] - b.data[index + 2]);
      if (delta > 30) changed++;
    }
    return changed / (a.width * a.height);
  }, { first, second });
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const report = [];
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
      await page.waitForFunction(() => window.__sceneInfo?.ambientTime >= 4, null, { timeout: 90_000 });

      const forward = new Map();
      for (const progress of progressPoints) {
        const state = await seek(page, progress);
        if (state.overflow) throw new Error(`Horizontal overflow at ${viewport.width} / ${progress}`);
        if (progress === 0 && (state.accountStage !== 0 || state.pixStage !== 0)) throw new Error('Hero contains an internal product stage');
        if (progress === 1 && (state.accountStage < 0.99 || state.pixStage !== 0)) throw new Error('Account stage ownership failed');
        if (progress === 1.2 && (state.accountStage !== 0 || state.pixStage < 0.99)) throw new Error('Account to Pix handoff failed');
        if (progress >= 2.2 && (state.accountStage !== 0 || state.pixStage !== 0)) throw new Error('Product stage leaked into protected chapters');
        forward.set(progress, state);
      }
      for (const progress of [...progressPoints].reverse()) {
        const current = await seek(page, progress);
        const expected = forward.get(progress);
        const poseDiff = current.scene.card.some((value, index) => Math.abs(value - expected.scene.card[index]) > 0.01)
          || current.scene.phone.some((value, index) => Math.abs(value - expected.scene.phone[index]) > 0.01);
        if (poseDiff || Math.abs(current.scene.transfer.travel - expected.scene.transfer.travel) > 0.001) {
          throw new Error(`Reverse mismatch at ${viewport.width} / ${progress}`);
        }
      }

      const pixelDiffs = {};
      for (const moment of protectedMoments) {
        const before = `/output/playwright/account-pix-before-${viewport.width}-${moment}.png`;
        const after = `/output/playwright/account-pix-after-${viewport.width}-${moment}.png`;
        pixelDiffs[moment] = await imageDifference(page, before, after);
        if (pixelDiffs[moment] > 0.001) throw new Error(`Protected frame changed at ${viewport.width} / ${moment}: ${pixelDiffs[moment]}`);
      }
      const accountDiff = await imageDifference(
        page,
        `/output/playwright/account-pix-before-${viewport.width}-account.png`,
        `/output/playwright/account-pix-after-${viewport.width}-account.png`,
      );
      const pixDiff = await imageDifference(
        page,
        `/output/playwright/account-pix-before-${viewport.width}-pix-transfer.png`,
        `/output/playwright/account-pix-after-${viewport.width}-pix-transfer.png`,
      );
      if (accountDiff < 0.05 || pixDiff < 0.05) throw new Error(`Redesign is not visually material at ${viewport.width}`);
      if (errors.length) throw new Error(`Console errors at ${viewport.width}: ${errors.join('; ')}`);
      report.push({ viewport, protected: pixelDiffs, accountDiff, pixDiff, reverse: 'passed' });
      await context.close();
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join('output', 'playwright', 'account-pix-verification.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
