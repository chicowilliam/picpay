async (page) => {
  const results = [], errors = [];
  const selected = page.url().match(/panel-after-(\d+|fallback)/)?.[1];
  const browser = page.context().browser();
  const context = await browser.newContext();
  const test = await context.newPage();
  test.on('pageerror', e => errors.push(e.message));
  test.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
  const seek = async p => {
    await test.evaluate(p => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * p / 6), p);
    await test.waitForFunction(p => Math.abs(window.__sceneInfo.progress - p) < .001, p);
    await test.waitForTimeout(200);
    return test.evaluate(() => ({
      scene: window.__sceneInfo,
      hero: +getComputedStyle(document.querySelector('.hero-copy')).opacity,
      account: +getComputedStyle(document.querySelector('.account-copy')).opacity,
      panel: +getComputedStyle(document.querySelector('.hero-panel')).opacity,
    }));
  };
  try {
    for (const size of [{width:1440,height:900},{width:1920,height:1080},{width:390,height:844},{width:360,height:640}]) {
      if(selected && selected !== String(size.width)) continue;
      await test.setViewportSize(size);
      await test.goto('http://127.0.0.1:5173/', {waitUntil:'domcontentloaded',timeout:120000});
      await test.waitForSelector('.scene-ready', {timeout:120000});
      await test.mouse.move(size.width/2,size.height/2);
      await test.waitForTimeout(6500);
      const boxes = await test.evaluate(() => Object.fromEntries(['.hero-panel','.hero-copy h1','.hero-microcopy','.hero-copy .primary-cta','.wordmark','.concept-label'].map(s => {
        const r = document.querySelector(s).getBoundingClientRect();
        return [s,{x:r.x,y:r.y,right:r.right,bottom:r.bottom,height:r.height}];
      })));
      for (const [selector,r] of Object.entries(boxes)) if(r.x<0||r.y<0||r.right>size.width+.5||r.bottom>size.height) throw Error(`Clipped ${selector}/${size.width}`);
      const cta = boxes['.hero-copy .primary-cta'], panel = boxes['.hero-panel'];
      if(cta.height<44||cta.x<panel.x+12||cta.right>panel.right-12||cta.bottom>panel.bottom-12)throw Error('CTA outside panel');
      if(size.width>=760&&Math.abs(boxes['.wordmark'].x-panel.x)>.5)throw Error('Header/panel grid');
      const png = await test.locator('.webgl canvas').screenshot({style:'.hero-copy,.nav,.hero-bottom,.concept-label,.story-progress,.hero-atmosphere,.hero-panel,.light-stage{visibility:hidden!important}'});
      const product = await test.evaluate(async src => {
        const i=new Image();i.src=`data:image/png;base64,${src}`;await i.decode();
        const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const ctx=c.getContext('2d');ctx.drawImage(i,0,0);
        const data=ctx.getImageData(0,0,c.width,c.height).data;let count=0,x=c.width,y=c.height,right=0,bottom=0;
        for(let p=0;p<data.length;p+=4)if(data[p]+data[p+1]+data[p+2]>170){count++;const px=p/4%c.width,py=Math.floor(p/4/c.width);x=Math.min(x,px);right=Math.max(right,px);y=Math.min(y,py);bottom=Math.max(bottom,py);}
        return {count,x,y,right,bottom};
      },png.toString('base64'));
      if(product.count<2000||product.x<panel.x+8||product.right>panel.right-8)throw Error(`Blank/clipped product ${size.width}: ${JSON.stringify(product)}`);
      if(size.width<760 ? product.bottom>cta.y-12||product.y<boxes['.hero-microcopy'].bottom+8 : product.x<boxes['.hero-copy h1'].right+16)throw Error(`Product/text collision ${size.width}`);
      const poses = new Map(), diffs = [];
      const positions=[0,.025,.05,.075,.1,.15,.17,.2,.23,.25,.27,.3,.6,1,1.85,3,3.85,5,6];
      for(const p of positions) {
        const state=await seek(p);poses.set(p,state);
        if(await test.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error(`Overflow ${size.width}/${p}`);
        if(p<=1&&Math.max(state.hero,state.account)<.3)throw Error(`Empty context ${size.width}/${p}`);
        if(p===0&&state.scene.cards.count!==(size.width<760?2:3))throw Error('Hero stack count');
        if(p===.17&&state.scene.cards.count!==1)throw Error('Stack release');
        if(p===.25&&!(state.hero>0&&state.account>0&&state.scene.phoneVisible))throw Error('Missing chapter overlap');
        if(p===.3&&(state.account<.99||state.panel>.001))throw Error('Account not established');
        if(p===3.85&&state.scene.cards.count!==3)throw Error('Cards chapter changed');
        const path=`output/playwright/hero-panel-sequence-${size.width}-${p}.png`;
        if(p===0||[.05,.1,.17,.25,.3].includes(p)||p>=1) await test.screenshot({path});
        if(p>=1&&(size.width!==1920||p===1)) {
          const baseline=size.width===1920?'hero-panel-before-1920-account':`handoff-after-${size.width}-${p}`;
          const diff=await test.evaluate(async ({baseline,path})=>{
            const data=[];let width,height;
            for(const src of [`/output/playwright/${baseline}.png`,`/${path}`]){
              const i=new Image();i.src=src;await i.decode();width=i.width;height=i.height-3;
              const c=document.createElement('canvas');c.width=width;c.height=height;const ctx=c.getContext('2d');ctx.drawImage(i,0,0);data.push(ctx.getImageData(0,0,width,height).data);
            }
            let changed=0;for(let i=0;i<data[0].length;i+=4)if(Math.abs(data[0][i]-data[1][i])+Math.abs(data[0][i+1]-data[1][i+1])+Math.abs(data[0][i+2]-data[1][i+2])>30)changed++;
            return changed/(width*height);
          },{baseline,path});
          diffs.push({p,diff});if(diff>.001)throw Error(`Downstream regression ${size.width}/${p}: ${diff}`);
        }
      }
      for(const p of [...positions].reverse()) {
        const a=await seek(p),b=poses.get(p);
        if(a.scene.card.some((v,i)=>Math.abs(v-b.scene.card[i])>.01)||Math.abs(a.scene.scale-b.scene.scale)>.005||Math.abs(a.panel-b.panel)>.015||Math.abs(a.account-b.account)>.015)throw Error(`Reverse mismatch ${size.width}/${p}`);
      }
      const link=test.locator('.hero-copy .primary-cta');
      if(await link.getAttribute('href')!=='https://picpay.com/pt-br/pf')throw Error('Official CTA URL');
      await test.keyboard.press('Tab');await link.focus();
      if(await link.evaluate(el=>getComputedStyle(el).outlineStyle)==='none')throw Error('Keyboard focus missing');
      if(size.width>=760){
        await link.hover();await test.waitForTimeout(250);
        if(await link.evaluate(el=>getComputedStyle(el).transform)==='none')throw Error('Hover missing');
        await test.mouse.move(size.width*.2,size.height*.3);await test.waitForTimeout(700);
        const first=await test.evaluate(()=>window.__sceneInfo.rotation[1]);
        await test.mouse.move(size.width*.8,size.height*.7,{steps:12});await test.waitForTimeout(700);
        if(Math.abs((await test.evaluate(()=>window.__sceneInfo.rotation[1]))-first)<.01)throw Error('Pointer inactive');
      }
      results.push({size,product,diffs,calls:poses.get(0).scene.calls,triangles:poses.get(0).scene.triangles,reverse:'passed'});
    }
  } finally { await context.close(); }
  for(const [mode,size] of [['reduced',{width:1440,height:900}],['reduced',{width:390,height:844}],['reduced',{width:360,height:640}],['webgl',{width:390,height:844}],['webgl',{width:360,height:640}],['landscape',{width:844,height:390}]]){
    if(selected && selected !== 'fallback') continue;
    const context=await browser.newContext({viewport:size,reducedMotion:mode==='reduced'?'reduce':'no-preference'});
    try{
      const f=await context.newPage();f.on('pageerror',e=>errors.push(e.message));
      if(mode==='webgl')await f.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:original.call(this,type,...args);};});
      await f.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded',timeout:120000});await f.waitForSelector('.static-mode');await f.evaluate(()=>document.fonts.ready);
      if(await f.locator('canvas,.motion-toggle').count())throw Error('Fallback mounted Canvas/control');
      if(await f.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Fallback overflow');
      const cta=await f.locator('.hero-copy .primary-cta').boundingBox();
      if(cta.height<44||(mode!=='landscape'&&cta.y+cta.height>size.height))throw Error('Fallback CTA clipped');
      const collisions=await f.evaluate(()=>{
        const c=document.querySelector('.hero-copy .primary-cta').getBoundingClientRect();
        return [...document.querySelectorAll('.fallback-hero .static-card')].filter(el=>el.getClientRects().length).some(el=>{const r=el.getBoundingClientRect();return r.x<c.right&&r.right>c.x&&r.y<c.bottom+8&&r.bottom>c.y-8;});
      });
      if(collisions)throw Error(`Fallback CTA collision ${mode}/${size.width}`);
      await f.screenshot({path:`output/playwright/hero-panel-fallback-${mode}-${size.width}.png`});
      results.push({mode,size,status:'passed'});
    }finally{await context.close();}
  }
  if(errors.length)throw Error(errors.join('; '));
  return {results,errors};
}
