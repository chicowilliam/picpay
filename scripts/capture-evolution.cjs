async (page) => {
  const phase = page.url().includes('after') ? 'after' : 'before';
  const context = await page.context().browser().newContext();
  const test = await context.newPage(), results = [], errors = [];
  test.on('pageerror', e => errors.push(e.message));
  test.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
  try {
    for (const [width,height] of [[1440,900],[1920,1080],[390,844],[360,640]]) {
      await test.setViewportSize({width,height});
      await test.goto('http://127.0.0.1:5173/', {timeout:120000});
      await test.waitForSelector('.scene-ready', {timeout:120000});
      await test.mouse.move(width/2,height/2);
      await test.waitForFunction(() => window.__sceneInfo.ambientTime >= 4, null, {timeout:90000});
      for (const [name,p] of [['hero',0],['exit',.2],['conta',1],['handoff-pix',1.2],['pix',1.6],['pix-done',1.85],['handoff-cashback',2.12],['cashback',2.65],['cards',3.85],['handoff-security',4.3],['seguranca',5],['handoff-final',5.35],['final',6]]) {
        await test.evaluate(p => scrollTo(0,(document.documentElement.scrollHeight-innerHeight)*p/6),p);
        await test.waitForFunction(p => Math.abs(window.__sceneInfo.progress-p)<.001,p);
        await test.waitForTimeout(220);
        await test.screenshot({path:`output/playwright/evolution-${phase}-${width}-${name}.png`});
        results.push({width,name,...await test.evaluate(() => ({scene:window.__sceneInfo,overflow:document.documentElement.scrollWidth>innerWidth}))});
      }
    }
    return {phase,results,errors};
  } finally { await context.close(); }
}
