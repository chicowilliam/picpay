async (page) => {
  const context = await page.context().browser().newContext({ viewport: { width: 1440, height: 900 } });
  const test = await context.newPage();
  const errors = [];
  test.on('pageerror', error => errors.push(error.message));
  test.on('console', entry => { if (entry.type() === 'error') errors.push(entry.text()); });
  const check = (value, message) => { if (!value) throw new Error(message); };
  const scroll = async progress => {
    await test.evaluate(p => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * p / Number(document.querySelector('.story').dataset.storyEnd)), progress);
    await test.waitForFunction(p => Math.abs((window.__sceneInfo?.progress ?? -1) - p) < .01, progress);
    await test.waitForTimeout(250);
  };
  try {
    await test.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await test.waitForSelector('.scene-ready', { timeout: 60000 });
    await scroll(0);
    await test.mouse.move(720, 450);
    await test.waitForTimeout(400);
    const before = await test.evaluate(() => window.__sceneInfo.rotation[1]);
    await test.mouse.move(1250, 300);
    await test.waitForTimeout(450);
    const after = await test.evaluate(() => window.__sceneInfo.rotation[1]);
    check(Math.abs(after - before) > .005, 'Pointer tilt not responding');
    await test.getByRole('button', { name: 'Pausar movimento ambiente' }).click();
    check(await test.getByRole('button', { name: 'Retomar movimento ambiente' }).getAttribute('aria-pressed') === 'true', 'Pause state failed');
    await test.screenshot({ path: 'output/playwright/desktop-0.png' });
    await test.getByRole('link', { name: 'Conta digital', exact: true }).click();
    await test.waitForFunction(() => window.__sceneInfo.progress > .99);
    await test.screenshot({ path: 'output/playwright/desktop-100.png' });
    const desktop = await test.evaluate(() => window.__sceneInfo);
    await test.getByRole('link', { name: 'PicPay, início' }).click();
    await test.waitForFunction(() => window.__sceneInfo.progress < .01);
    for (const size of [{ width: 390, height: 844 }, { width: 360, height: 640 }, { width: 1920, height: 1080 }]) {
      await test.setViewportSize(size);
      await test.waitForTimeout(450);
      await scroll(0);
      await test.screenshot({ path: `output/playwright/final-${size.width}-hero.png` });
      await scroll(1);
      check(await test.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Overflow after resize');
      await test.screenshot({ path: `output/playwright/final-${size.width}-account.png` });
    }
    await test.setViewportSize({ width: 844, height: 390 });
    await test.waitForSelector('.static-mode');
    await test.evaluate(() => window.scrollTo(0, 0));
    await test.screenshot({ path: 'output/playwright/landscape.png', fullPage: true });
    check(errors.length === 0, `Console errors: ${errors.join('; ')}`);
    return { pointerTilt: after - before, pause: 'passed', anchorNavigation: 'passed', desktop, viewports: ['1440x900', '390x844', '360x640', '1920x1080', '844x390 static'], errors };
  } finally { await context.close(); }
}
