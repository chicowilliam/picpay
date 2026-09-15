async (page) => {
  const check = (value, message) => { if (!value) throw new Error(message); };
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await page.waitForSelector('.static-mode');
  check(await page.locator('canvas').count() === 0, 'Reduced motion loaded a WebGL canvas');
  check(await page.locator('.static-chapters section').count() === 2, 'Reduced motion lost Pix/Cashback');
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Reduced motion overflow');
  await page.screenshot({ path: 'output/playwright/reduced-motion.png', fullPage: true });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) { return type === 'webgl2' || type === 'webgl' ? null : original.call(this, type, ...args); };
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.static-mode');
  check(await page.locator('canvas').count() === 0, 'WebGL unavailable fallback failed');
  check(await page.locator('.static-chapters section').count() === 2, 'WebGL fallback lost Pix/Cashback');
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'WebGL fallback overflow');
  await page.screenshot({ path: 'output/playwright/no-webgl.png', fullPage: true });
  const links = await page.locator('a[href^="https:"]').evaluateAll(anchors => anchors.map(anchor => anchor.href));
  check(links.every(link => link === 'https://picpay.com/pt-br/pf'), 'Unexpected external destination');
  return { reducedMotion: 'passed', unavailableWebGL: 'passed', links };
}
