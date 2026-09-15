async (page) => {
  const context=await page.context().browser().newContext();const test=await context.newPage();
  try {
    for(const size of [{width:1440,height:900},{width:1920,height:1080},{width:390,height:844},{width:360,height:640}]) {
      await test.setViewportSize(size);await test.goto('http://127.0.0.1:5173/');await test.waitForSelector('.scene-ready',{timeout:60000});
      if(await test.locator('#closing-title').count())throw Error('Baseline must precede closing implementation');
      await test.getByRole('button',{name:'Pausar movimento ambiente'}).click();
      for(const p of [0,1,1.6,2.65,3,3.85,4.95,5]) {
        await test.evaluate(p=>scrollTo(0,(document.documentElement.scrollHeight-innerHeight)*p/5),p);
        await test.waitForFunction(p=>Math.abs((window.__sceneInfo?.progress??-1)-p)<.001,p);
        for(let i=0;i<10;i++){await test.mouse.move(size.width/2+i%2,size.height/2);await test.waitForTimeout(30);}
        await test.screenshot({path:`output/playwright/pre-closing-${size.width}-${p}.png`});
        if(p<=3)await test.screenshot({path:`output/playwright/reference3-${size.width}-${p}.png`});
      }
    }
    return 'Pre-closing baseline captured at four viewports. Existing historical screenshots retained.';
  }finally{await context.close();}
}
