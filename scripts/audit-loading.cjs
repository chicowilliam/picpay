async (page) => {
  const browser = page.context().browser();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const test = await context.newPage();
  const errors = [];
  test.on('pageerror', error => errors.push(error.message));
  test.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const cdp = await context.newCDPSession(test);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: 1_600_000 / 8,
    uploadThroughput: 750_000 / 8,
    connectionType: 'cellular4g',
  });
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await test.addInitScript(() => {
    window.__loadingAudit = { cls: 0 };
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__loadingAudit.cls += entry.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });
  try {
    await test.goto('http://127.0.0.1:5174/', { waitUntil: 'domcontentloaded', timeout: 120000 });
    const shell = await test.evaluate(() => ({
      now: performance.now(),
      heroText: document.querySelector('.hero-copy h1')?.textContent,
      heroVisible: getComputedStyle(document.querySelector('.hero-copy')).visibility !== 'hidden',
      posterOpacity: getComputedStyle(document.querySelector('.fallback-hero')).opacity,
      canvas: document.querySelectorAll('canvas').length,
      heroBox: document.querySelector('.hero-copy').getBoundingClientRect().toJSON(),
    }));
    await test.screenshot({ path: 'output/playwright/loading-slow-shell.png' });
    const loadingScrollStart = await test.evaluate(() => scrollY);
    await test.mouse.wheel(0, 500);
    await test.waitForTimeout(150);
    const loadingScroll = await test.evaluate(start => {
      const account = document.querySelector('.account-copy');
      return {
        delta: scrollY - start,
        canvas: document.querySelectorAll('canvas').length,
        posterOpacity: getComputedStyle(document.querySelector('.fallback-hero')).opacity,
        heroOpacity: Number(getComputedStyle(document.querySelector('.hero-copy')).opacity),
        accountOpacity: Number(getComputedStyle(account).opacity),
      };
    }, loadingScrollStart);
    await test.screenshot({ path: 'output/playwright/loading-slow-first-scroll.png' });
    await test.evaluate(() => scrollTo(0, 0));
    await test.waitForTimeout(1000);
    const oneSecond = await test.evaluate(() => ({
      now: performance.now(),
      posterOpacity: getComputedStyle(document.querySelector('.fallback-hero')).opacity,
      canvas: document.querySelectorAll('canvas').length,
      cls: window.__loadingAudit.cls,
    }));
    await test.screenshot({ path: 'output/playwright/loading-slow-poster.png' });
    await test.waitForSelector('.scene-ready', { timeout: 120000 });
    const ready = await test.evaluate(() => ({
      now: performance.now(),
      posterOpacity: getComputedStyle(document.querySelector('.fallback-hero')).opacity,
      canvas: document.querySelectorAll('canvas').length,
      cls: window.__loadingAudit.cls,
      resources: performance.getEntriesByType('resource').map(entry => ({ name: entry.name.split('/').pop(), duration: entry.duration, bytes: entry.transferSize })),
    }));
    await test.screenshot({ path: 'output/playwright/loading-slow-webgl.png' });
    const beforeScroll = await test.evaluate(() => scrollY);
    await test.mouse.wheel(0, 500);
    await test.waitForTimeout(150);
    const afterScroll = await test.evaluate(() => scrollY);
    return { profile: 'emulated constrained 4G, not a physical device', shell, loadingScroll, oneSecond, ready, firstScrollDelta: afterScroll - beforeScroll, errors };
  } finally {
    await context.close();
  }
}
