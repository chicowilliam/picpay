async (page) => {
  const phase = page.url().includes('after') ? 'after' : 'before';
  const prefix = page.url().includes('panel') ? 'hero-panel' : page.url().includes('stack') ? 'hero-stack' : page.url().includes('digital') ? 'hero-digital' : 'hero';
  const context = await page.context().browser().newContext();
  const test = await context.newPage();
  const errors = [], results = [];
  test.on('pageerror', error => errors.push(error.message));
  try {
    for (const size of [{width:1440,height:900},{width:1920,height:1080},{width:390,height:844},{width:360,height:640}]) {
      await test.setViewportSize(size);
      await test.goto('http://127.0.0.1:5173/', {waitUntil:'domcontentloaded',timeout:120000});
      await test.waitForSelector('.scene-ready', {timeout:120000});
      const pause = test.getByRole('button', {name:'Pausar movimento ambiente'});
      if (await pause.count()) await pause.click();
      else await test.waitForTimeout(6500);
      await test.mouse.move(size.width / 2, size.height / 2);
      await test.waitForTimeout(500);
      await test.screenshot({path:`output/playwright/${prefix}-${phase}-${size.width}.png`});
      results.push({size, info:await test.evaluate(() => window.__sceneInfo)});
      await test.evaluate(() => scrollTo(0,(document.documentElement.scrollHeight-innerHeight)/6));
      await test.waitForFunction(() => Math.abs(window.__sceneInfo.progress-1)<.001);
      await test.screenshot({path:`output/playwright/${prefix}-${phase}-${size.width}-account.png`});
    }
    return {phase,results,errors};
  } finally {await context.close();}
}
