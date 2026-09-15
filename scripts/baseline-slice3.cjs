async (page) => {
  const context=await page.context().browser().newContext(); const test=await context.newPage();
  const results=[];
  try {
    for(const size of [{width:1440,height:900},{width:1920,height:1080},{width:390,height:844},{width:360,height:640}]) {
      await test.setViewportSize(size); await test.goto('http://127.0.0.1:5173/'); await test.waitForSelector('.scene-ready',{timeout:60000});
      await test.getByRole('button',{name:'Pausar movimento ambiente'}).click();
      for(const p of [0,1,1.6,2.65,3]) {
        await test.evaluate(p=>scrollTo(0,(document.documentElement.scrollHeight-innerHeight)*p/Number(document.querySelector('.story').dataset.storyEnd)),p);
        await test.waitForFunction(p=>Math.abs((window.__sceneInfo?.progress??-1)-p)<.001,p);
        await test.waitForTimeout(250);
        await test.screenshot({path:`output/playwright/pre-slice3-${size.width}-${p}.png`});
        results.push({size,p,scene:await test.evaluate(()=>window.__sceneInfo)});
      }
    }
    return results;
  } finally {await context.close();}
}
