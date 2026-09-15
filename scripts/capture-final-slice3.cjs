async (page) => {
  const context=await page.context().browser().newContext();const test=await context.newPage();const results=[];const errors=[];
  test.on('pageerror',e=>errors.push(e.message));test.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
  try {
    for(const size of [{width:1440,height:900},{width:390,height:844}]) {
      await test.setViewportSize(size);await test.goto('http://127.0.0.1:5173/');await test.waitForSelector('.scene-ready',{timeout:60000});
      await test.getByRole('button',{name:'Pausar movimento ambiente'}).click();
      for(const [p,name] of [[3.85,'cards'],[4.95,'security']]) {
        await test.evaluate(p=>scrollTo(0,(document.documentElement.scrollHeight-innerHeight)*p/Number(document.querySelector('.story').dataset.storyEnd)),p);
        await test.waitForFunction(p=>Math.abs((window.__sceneInfo?.progress??-1)-p)<.01,p,{timeout:30000});await test.waitForTimeout(500);
        if(await test.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Horizontal overflow');
        await test.screenshot({path:`output/playwright/final-${size.width}-${name}.png`});results.push({size,name,scene:await test.evaluate(()=>window.__sceneInfo)});
      }
    }
    return {errors,results};
  }finally{await context.close();}
}
