async (page) => {
  const results = [], errors = [];
  for (const [mode, size] of [
    ['reduced', {width:390,height:844}], ['reduced', {width:360,height:640}],
    ['webgl', {width:390,height:844}], ['webgl', {width:360,height:640}],
    ['landscape', {width:844,height:390}],
  ]) {
    const context = await page.context().browser().newContext({viewport:size,reducedMotion:mode==='reduced'?'reduce':'no-preference'});
    try {
      const test = await context.newPage();
      test.on('pageerror',e=>errors.push(e.message));
      test.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
      if(mode==='webgl')await test.addInitScript(()=>{
        const original=HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:original.call(this,type,...args);};
      });
      await test.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded',timeout:120000});
      await test.waitForSelector('.static-mode');await test.evaluate(()=>document.fonts.ready);
      const boxes=await test.evaluate(()=>{
        const box=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,height:r.height};};
        return {cards:[...document.querySelectorAll('.fallback-hero .static-card')].map(box),cta:box(document.querySelector('.hero-copy .primary-cta')),overflow:document.documentElement.scrollWidth>innerWidth};
      });
      if(boxes.overflow||await test.locator('canvas,.motion-toggle').count())throw Error('Fallback regression');
      for(const card of boxes.cards){
        if(card.x<6||card.right>size.width-6||card.y<0)throw Error(`Clipped fallback card: ${JSON.stringify({size,card})}`);
        if(card.x<boxes.cta.right&&card.right>boxes.cta.x&&card.y<boxes.cta.bottom+6&&card.bottom>boxes.cta.y)throw Error(`Fallback card/CTA overlap: ${JSON.stringify({size,card,cta:boxes.cta})}`);
      }
      if(boxes.cta.height<44||boxes.cta.bottom>size.height)throw Error('Fallback CTA inaccessible');
      await test.screenshot({path:`output/playwright/hero-stack-fallback-${mode}-${size.width}.png`});
      results.push({mode,size,boxes,status:'passed'});
    } finally {await context.close();}
  }
  if(errors.length)throw Error(errors.join('; '));
  return {results,errors};
}
