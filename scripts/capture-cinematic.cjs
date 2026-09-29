async (page) => {
  const browser = page.context().browser();
  const context = await browser.newContext({ viewport: { width: 390, height: 693 } });
  const test = await context.newPage();
  const moments = [
    { name: 'hero', progress: 0, selector: '.hero-copy' },
    { name: 'pix', progress: 1.6, selector: '.pix-copy' },
    { name: 'cashback', progress: 2.65, selector: '.cashback-copy' },
    { name: 'cards', progress: 3.85, selector: '.cards-copy' },
    { name: 'final', progress: 6, selector: '.closing-copy' },
  ];
  try {
    await test.goto('http://127.0.0.1:5174/', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await test.waitForSelector('.scene-ready', { timeout: 120000 });
    const max = await test.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    const results = [];
    for (const moment of moments) {
      await test.evaluate(y => scrollTo(0, y), max * moment.progress / 6);
      await test.waitForTimeout(1000);
      await test.screenshot({ path: `output/playwright/cinematic-9x16-${moment.name}.png` });
      results.push(await test.evaluate(({ moment }) => {
        const element = document.querySelector(moment.selector);
        const box = element.getBoundingClientRect();
        const cta = element.querySelector('.primary-cta')?.getBoundingClientRect();
        return {
          name: moment.name,
          progress: moment.progress,
          opacity: Number(getComputedStyle(element).opacity),
          box: box.toJSON(),
          cta: cta?.toJSON() || null,
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      }, { moment }));
    }
    return { viewport: { width: 390, height: 693 }, note: '9:16 browser emulation, not a physical device', results };
  } finally {
    await context.close();
  }
}
