async (page) => {
  const context=await page.context().browser().newContext(),test=await context.newPage(),errors=[],warnings=[],results=[];
  test.on('pageerror',e=>errors.push(e.message));test.on('console',e=>{if(e.type()==='error')errors.push(e.text());if(e.type()==='warning')warnings.push(e.text());});
  const inspect=()=>test.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,canvas:!!document.querySelector('canvas'),static:!!document.querySelector('.static-mode'),width:innerWidth,height:innerHeight}));
  try {
    for(const size of [{width:390,height:844},{width:360,height:640},{width:844,height:390}]){
      await test.setViewportSize(size);await test.goto('http://127.0.0.1:5174/');await test.waitForSelector('.scene-ready,.static-mode',{timeout:90000});
      const initial=await inspect();if(initial.overflow)throw Error('WebKit overflow');
      if(initial.canvas){
        await test.getByRole('button',{name:'Pausar movimento ambiente'}).click();
        for(const p of [0,1,2,3,3.85,5,6,5,3.85,3,2,1,0]){
          await test.evaluate(p=>scrollTo(0,(document.documentElement.scrollHeight-innerHeight)*p/6),p);await test.waitForTimeout(900);
          if((await inspect()).overflow)throw Error('WebKit scroll overflow');
          if(p===6||p===5)await test.screenshot({path:`output/playwright/rc-webkit-${size.width}-${p}.png`});
        }
        await test.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await test.waitForTimeout(900);
      }else await test.locator('.static-closing').scrollIntoViewIfNeeded();
      const link=test.locator('.closing-copy .primary-cta');if(await link.getAttribute('href')!=='https://picpay.com/pt-br/pf')throw Error('WebKit CTA');
      const box=await link.boundingBox();if(!box||box.width<44||box.height<44)throw Error('WebKit CTA size');
      results.push({size,...initial});
    }
    await test.setViewportSize({width:390,height:844});await test.emulateMedia({reducedMotion:'reduce'});await test.goto('http://127.0.0.1:5174/');await test.waitForSelector('.static-mode');
    if(await test.locator('canvas').count())throw Error('Reduced motion canvas');
    await test.screenshot({path:'output/playwright/rc-webkit-reduced.png',fullPage:true});
    await test.emulateMedia({reducedMotion:'no-preference'});
    await test.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:original.call(this,type,...args);};});
    await test.reload();await test.waitForSelector('.static-mode');if(await test.locator('canvas').count())throw Error('Unavailable WebGL canvas');
    await test.locator('.static-closing').scrollIntoViewIfNeeded();await test.screenshot({path:'output/playwright/rc-webkit-fallback.png'});
    if(errors.length)throw Error(errors.join('; '));return {results,errors,warnings,reduced:'passed',unavailableWebGL:'passed',engine:'Playwright WebKit, Windows; not a physical iPhone'};
  }finally{await context.close();}
}
