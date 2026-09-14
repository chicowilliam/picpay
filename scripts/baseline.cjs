async (page) => {
  const context = await page.context().browser().newContext();
  const test = await context.newPage();
  const results = [];
  for (const size of [{width:1440,height:900},{width:390,height:844},{width:360,height:640}]) {
    await test.setViewportSize(size);
    await test.goto('http://127.0.0.1:5173/');
    await test.waitForSelector('.scene-ready');
    await test.getByRole('button', {name:'Pausar movimento ambiente'}).click();
    for (const p of [0,.32,.52,.82,1]) {
      await test.evaluate(p => scrollTo(0,(document.documentElement.scrollHeight-innerHeight)*p),p);
      await test.waitForTimeout(1000);
      results.push({size,p,scene:await test.evaluate(()=>window.__sceneInfo)});
      await test.screenshot({path:`output/playwright/baseline-${size.width}-${p}.png`});
    }
  }
  await context.close();
  return results;
}
