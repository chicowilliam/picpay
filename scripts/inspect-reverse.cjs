async (page) => {
  await page.setViewportSize({width:1440,height:900});
  await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForSelector('.scene-ready',{timeout:90000});
  const result=[];
  for(const p of [2.6,2.7,2.8,2.7]) {
    await page.evaluate(p=>scrollTo(0,(document.documentElement.scrollHeight-innerHeight)*p/6),p);
    await page.waitForFunction(p=>Math.abs(window.__sceneInfo.progress-p)<.001,p);
    await page.waitForTimeout(90);
    const early=await page.evaluate(()=>window.__sceneInfo);
    await page.waitForTimeout(700);
    result.push({p,early,settled:await page.evaluate(()=>window.__sceneInfo)});
  }
  return result;
}
