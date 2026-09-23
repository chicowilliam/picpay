async (page) => {
  const prefix = page.url().includes('stack') ? 'hero-stack' : page.url().includes('digital') ? 'hero-digital' : 'hero';
  const context = await page.context().browser().newContext();
  await context.addInitScript(() => {
    window.__heroEntrance = { min: Infinity, max: -Infinity, samples: 0 };
    const observe = () => {
      const scene = window.__sceneInfo, sample = window.__heroEntrance;
      if (scene?.progress === 0 && scene.card) {
        sample.min = Math.min(sample.min, scene.card[1]);
        sample.max = Math.max(sample.max, scene.card[1]);
        sample.samples++;
      }
      if (sample.samples < 600) requestAnimationFrame(observe);
    };
    requestAnimationFrame(observe);
  });
  const test = await context.newPage(), errors = [], results = [];
  test.on('pageerror', e => errors.push(e.message));
  test.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
  const scroll = async p => {
    await test.evaluate(p => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * p / 6), p);
    await test.waitForFunction(p => Math.abs(window.__sceneInfo.progress - p) < .001, p);
    await test.waitForTimeout(150);
    return test.evaluate(() => window.__sceneInfo);
  };
  try {
    for (const size of [{width:1440,height:900},{width:1920,height:1080},{width:390,height:844},{width:360,height:640}]) {
      await test.setViewportSize(size);
      await test.goto('http://127.0.0.1:5173/', {waitUntil:'domcontentloaded',timeout:120000});
      await test.waitForSelector('.scene-ready', {timeout:120000});
      if(await test.locator('.motion-toggle').count()) throw Error('Pause control still present');
      await test.waitForTimeout(6500);
      const entrance=await test.evaluate(()=>window.__heroEntrance);
      if(entrance.samples<2||entrance.max-entrance.min<.00001)throw Error('Ambient entrance inactive');
      await test.mouse.move(size.width / 2, size.height / 2);
      await test.waitForTimeout(500);
      const boxes = await test.evaluate(() => Object.fromEntries(['.hero-copy h1','.hero-copy .primary-cta','.wordmark','.hero-copy','.concept-label'].map(s => {
        const r = document.querySelector(s).getBoundingClientRect(); return [s,{x:r.x,y:r.y,right:r.right,bottom:r.bottom,height:r.height}];
      })));
      for (const [s,r] of Object.entries(boxes)) if(r.x<0||r.y<0||r.right>size.width+.5||r.bottom>size.height) throw Error(`Clipped ${s}/${size.width}`);
      const cta=boxes['.hero-copy .primary-cta'];
      if(cta.height<44||cta.y<boxes['.hero-copy h1'].bottom) throw Error('CTA overlap/touch target');
      if(Math.abs(boxes['.wordmark'].x-boxes['.hero-copy'].x)>.5) throw Error('Header grid alignment');
      const png=await test.locator('.webgl canvas').screenshot({style:'.hero-copy,.nav,.hero-bottom,.concept-label,.story-progress,.hero-atmosphere,.light-stage{visibility:hidden!important}'});
      const product=await test.evaluate(async src=>{
        const i=new Image();i.src=`data:image/png;base64,${src}`;await i.decode();
        const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const ctx=c.getContext('2d');ctx.drawImage(i,0,0);
        const data=ctx.getImageData(0,0,c.width,c.height).data;let count=0,x=c.width,y=c.height,right=0,bottom=0;
        for(let p=0;p<data.length;p+=4)if(data[p]+data[p+1]+data[p+2]>170){count++;const px=p/4%c.width,py=Math.floor(p/4/c.width);x=Math.min(x,px);right=Math.max(right,px);y=Math.min(y,py);bottom=Math.max(bottom,py);}
        return {count,x,y,right,bottom};
      },png.toString('base64'));
      if(product.count<2000||product.x<8||product.right>size.width-8) throw Error(`Product blank/clipped ${JSON.stringify({size,product})}`);
      if(size.width<760 ? product.y<cta.bottom+12 : product.x<cta.right+24) throw Error('Product competes with CTA');
      const poses=new Map();
      for(const p of [0,.03,.1,.18,.219,.22,.221,.48,.77,1,1.85,3,3.85,4.95,5.8,6]) {
        poses.set(p,await scroll(p));
        const scene=poses.get(p);
        if((p===0||p===3.85)&&scene.cards.count!==3)throw Error('Missing stack');
        if(p===.22&&scene.cards.count!==1)throw Error('Hero stack did not recompose');
        if(p===4.95&&!scene.protection.blocked)throw Error('Security regression');
        if(await test.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error(`Overflow ${size.width}/${p}`);
        if([.1,.22,.48,1].includes(p))await test.screenshot({path:`output/playwright/${prefix}-transition-${size.width}-${p}.png`});
      }
      const accountDiff=await test.evaluate(async ({width,prefix})=>{
        const imgs=await Promise.all(['before','after'].map(async phase=>{const i=new Image();i.src=`/output/playwright/${prefix}-${phase}-${width}-account.png`;await i.decode();return i;}));
        // Exclude the intentionally removed pause control and expanded disclaimer area.
        const c=document.createElement('canvas');c.width=imgs[0].width;c.height=imgs[0].height-80;const ctx=c.getContext('2d');
        const data=imgs.map(i=>{ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(i,0,0);return ctx.getImageData(0,0,c.width,c.height).data;});
        let diff=0;for(let i=0;i<data[0].length;i+=4)if(Math.abs(data[0][i]-data[1][i])+Math.abs(data[0][i+1]-data[1][i+1])+Math.abs(data[0][i+2]-data[1][i+2])>30)diff++;
        return diff/(c.width*c.height);
      },{width:size.width,prefix});
      if(accountDiff>.001)throw Error(`Account regression ${size.width}: ${accountDiff}`);
      for(const p of [5.8,4.95,3.85,3,1.85,1,.77,.48,.221,.22,.219,.18,.1,.03,0]) {
        const state=await scroll(p),prior=poses.get(p);
        if(state.card.some((v,i)=>Math.abs(v-prior.card[i])>.01)||Math.abs(state.scale-prior.scale)>.005)throw Error(`Reverse mismatch ${size.width}/${p}`);
        if(Math.abs(state.cards.heroSpread-prior.cards.heroSpread)>.01||state.cards.count!==prior.cards.count)throw Error('Stack reverse mismatch');
      }
      const link=test.locator('.hero-copy .primary-cta');
      if(await link.getAttribute('href')!=='https://picpay.com/pt-br/pf')throw Error('CTA destination');
      await test.keyboard.press('Tab');await link.focus();
      if(await link.evaluate(el=>getComputedStyle(el).outlineStyle)==='none')throw Error('Keyboard focus');
      if(size.width>=760){
        await link.hover();await test.waitForTimeout(250);
        if(await link.evaluate(el=>getComputedStyle(el).transform)==='none')throw Error('CTA hover feedback missing');
        if(size.width===1440)await test.screenshot({path:`output/playwright/${prefix}-cta-hover.png`});
        await test.mouse.move(size.width*.2,size.height*.3);await test.waitForTimeout(700);
        const first=await test.evaluate(()=>window.__sceneInfo.rotation[1]);
        await test.mouse.move(size.width*.8,size.height*.7,{steps:12});await test.waitForTimeout(700);
        if(Math.abs((await test.evaluate(()=>window.__sceneInfo.rotation[1]))-first)<.01)throw Error('Pointer response');
        await test.mouse.move(size.width/2,size.height/2);await test.waitForTimeout(1500);
        const initial=await test.evaluate(()=>window.__sceneInfo.card[1]);await test.waitForTimeout(700);
        if(Math.abs((await test.evaluate(()=>window.__sceneInfo.card[1]))-initial)>.0001)throw Error('Ambient entrance did not settle');
      }
      results.push({size,product,accountDiff,calls:poses.get(0).calls,triangles:poses.get(0).triangles,transitionCalls:poses.get(.1).calls,transitionTriangles:poses.get(.1).triangles,reverse:'passed'});
    }
    for(const [mode,size] of [['reduced',{width:390,height:844}],['reduced',{width:360,height:640}],['webgl',{width:390,height:844}],['webgl',{width:360,height:640}],['landscape',{width:844,height:390}]]){
      const fallback=await page.context().browser().newContext({viewport:size,reducedMotion:mode==='reduced'?'reduce':'no-preference'});
      try{
        const f=await fallback.newPage();f.on('pageerror',e=>errors.push(e.message));
        if(mode==='webgl')await f.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:original.call(this,type,...args);};});
        await f.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded',timeout:120000});await f.waitForSelector('.static-mode');await f.evaluate(()=>document.fonts.ready);
        if(await f.locator('.webgl canvas').count())throw Error('Fallback mounted WebGL');
        if(await f.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Fallback overflow');
        await f.screenshot({path:`output/playwright/${prefix}-fallback-${mode}-${size.width}.png`});
        const bounds=await f.locator('.hero-copy .primary-cta').boundingBox();if(!bounds||bounds.height<44||bounds.y+bounds.height>size.height)throw Error('Fallback CTA clipped');
        results.push({mode,size,status:'passed'});
      }finally{await fallback.close();}
    }
    if(errors.length)throw Error(errors.join('; '));
    return {results,errors};
  } finally {await context.close();}
}
