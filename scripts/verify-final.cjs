async (page) => {
  const context = await page.context().browser().newContext();
  const test = await context.newPage();
  const errors = [];
  test.on('pageerror', error => errors.push(error.message));
  try {
    await test.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await test.waitForSelector('.scene-ready', { timeout: 60000 });
    const results = [];
    for (const size of [{ width: 360, height: 640 }, { width: 390, height: 844 }, { width: 1440, height: 900 }]) {
      await test.setViewportSize(size);
      await test.waitForTimeout(300);
      for (const progress of [0, 1]) {
        await test.evaluate(p => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * p), progress);
        await test.waitForFunction(p => Math.abs((window.__sceneInfo?.progress ?? -1) - p) < .01, progress);
        const label = await test.locator('.concept-label').boundingBox();
        if (label.y + label.height > size.height) throw new Error('Concept label outside viewport');
        if (await test.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('Horizontal overflow');
        await test.screenshot({ path: `output/playwright/final-${size.width}-${progress ? 'account' : 'hero'}.png` });
        results.push({ size, progress, label });
      }
    }
    if (errors.length) throw new Error(errors.join('; '));
    return { errors, results };
  } finally { await context.close(); }
}
