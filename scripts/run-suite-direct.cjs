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

const scripts = [
  ['visual-1440', 'verify-visual.cjs', { width: 1440, height: 900 }],
  ['visual-390', 'verify-visual.cjs', { width: 390, height: 844 }],
  ['final', 'verify-final.cjs'],
  ['polish', 'verify-polish.cjs'],
  ['extension', 'verify-extension.cjs'],
  ['cardsSecurity', 'verify-cards-security.cjs'],
  ['closing', 'verify-closing.cjs'],
  ['evolution', 'verify-evolution.cjs'],
  ['fallback', 'verify-fallback.cjs'],
];

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const results = {};

  try {
    for (const [label, filename, viewport] of scripts) {
      if (viewport) await page.setViewportSize(viewport);
      const source = fs.readFileSync(path.join(__dirname, filename), 'utf8');
      const execute = new Function(`return (${source})`)();
      results[label] = await execute(page);
      console.log(`PASS ${label}`);
    }
  } finally {
    await context.close();
    await browser.close();
  }

  console.log(JSON.stringify(results, null, 2));
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
