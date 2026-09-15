async (page) => {
  const results = [];
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('.scene-ready', { timeout: 60000 });
  const size = page.viewportSize();
  const prefix = size.width < 760 ? 'mobile' : 'desktop';
  const check = (value, message) => { if (!value) throw new Error(message); };
  const maxScroll = await page.evaluate(() => (document.documentElement.scrollHeight - innerHeight) / Number(document.querySelector('.story').dataset.storyEnd));
  for (const progress of [0, .32, .52, .82, 1]) {
    await page.evaluate(y => window.scrollTo(0, y), maxScroll * progress);
    await page.waitForFunction(p => Math.abs((window.__sceneInfo?.progress ?? -1) - p) < .01, progress, { timeout: 15000 });
    await page.waitForTimeout(250);
    const state = await page.evaluate(() => ({ scene: window.__sceneInfo, overflow: document.documentElement.scrollWidth > innerWidth, unofficial: getComputedStyle(document.querySelector('.concept-label')).opacity, forms: document.querySelectorAll('form,input').length }));
    check(!state.overflow, 'Horizontal overflow');
    check(state.forms === 0, 'Unexpected data collection control');
    check(Math.abs(state.scene.progress - progress) < .025, 'Scroll and scene are not synchronized');
    await page.screenshot({ path: `output/playwright/${prefix}-${Math.round(progress * 100)}.png` });
    results.push({ progress, ...state });
  }
  const screenshot = await page.locator('canvas').screenshot();
  const greenPixels = await page.evaluate(async data => {
    const img = new Image(); img.src = `data:image/png;base64,${data}`; await img.decode();
    const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
    const pixels = ctx.getImageData(0, 0, img.width, img.height).data;
    let green = 0;
    for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 1] > 60 && pixels[i + 1] - pixels[i] > 15 && pixels[i + 1] - pixels[i + 2] > 10) green++;
    return green;
  }, screenshot.toString('base64'));
  check(greenPixels > 500, 'Canvas is blank or green product is missing');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(850);
  const reverse = await page.evaluate(() => window.__sceneInfo.progress);
  check(reverse < .01, 'Reverse scroll did not restore hero');
  check(errors.length === 0, `Console errors: ${errors.join('; ')}`);
  return { viewport: size, greenPixels, errors, results };
}
