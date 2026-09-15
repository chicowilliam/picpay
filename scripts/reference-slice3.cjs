async (page) => {
 const context=await page.context().browser().newContext();const p=await context.newPage();const results=[];
 try {
  for(const size of [{width:1440,height:900},{width:1920,height:1080},{width:390,height:844},{width:360,height:640}]) {
   await p.setViewportSize(size);await p.goto('http://127.0.0.1:5174/');await p.waitForSelector('.scene-ready',{timeout:60000});
   if(await p.locator('#cards-title').count())throw Error('Reference must be the previous slice-2 production build');
   await p.getByRole('button',{name:'Pausar movimento ambiente'}).click();
   for(const progress of [0,1,1.6,2.65,3]) {
    await p.evaluate(v=>scrollTo(0,(document.documentElement.scrollHeight-innerHeight)*v/3),progress);
    await p.waitForTimeout(1800);
    // Demand-rendered child layers require a settled frame in the old build.
    for(let i=0;i<12;i++){await p.mouse.move(size.width/2+i%2,size.height/2);await p.waitForTimeout(40);}
    await p.screenshot({path:`output/playwright/reference3-${size.width}-${progress}.png`});
    results.push({size,progress});
   }
  }
  return results;
 }finally{await context.close();}
}
