async (page) => {
  const context = await page.context().browser().newContext(), test = await context.newPage();
  const errors = [], results = [];
  test.on('pageerror', e => errors.push(e.message));
  test.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
  const seek = async p => {
    const target = await test.evaluate(p => {
      const distance = document.documentElement.scrollHeight-innerHeight;
      scrollTo(0, distance*p/6);
      return scrollY/distance*6;
    }, p);
    // Wait for scrub at the actual scroll pixel, including mobile pixel rounding.
    await test.waitForFunction(target => Math.abs(window.__sceneInfo.progress-target)<.00001, target);
    await test.waitForTimeout(90);
    return test.evaluate(() => window.__sceneInfo);
  };
  try {
    for (const [width,height] of [[1440,900],[1920,1080],[390,844],[360,640]]) {
      await test.setViewportSize({width,height});
      await test.goto('http://127.0.0.1:5173/', {timeout:120000});
      await test.waitForSelector('.scene-ready', {timeout:120000});
      await test.mouse.move(width/2,height/2);
      await test.waitForFunction(() => window.__sceneInfo.ambientTime>=4,null,{timeout:90000});
      await test.screenshot({path:`output/playwright/evolution-locked-hero-${width}.png`});
      const heroDifference = await test.evaluate(async width => {
        const pixels=[]; let w,h;
        for(const name of [`evolution-before-${width}-hero`,`evolution-locked-hero-${width}`]) {
          const image=new Image();image.src=`/output/playwright/${name}.png`;await image.decode();
          w=image.width;h=image.height-3;const c=document.createElement('canvas');c.width=w;c.height=h;
          const ctx=c.getContext('2d');ctx.drawImage(image,0,0);pixels.push(ctx.getImageData(0,0,w,h).data);
        }
        let changed=0;for(let i=0;i<pixels[0].length;i+=4)if(Math.abs(pixels[0][i]-pixels[1][i])+Math.abs(pixels[0][i+1]-pixels[1][i+1])+Math.abs(pixels[0][i+2]-pixels[1][i+2])>30)changed++;
        return changed/(w*h);
      },width);
      if(heroDifference>.001)throw Error(`Locked Hero changed ${width}: ${heroDifference}`);
      const poses=new Map(), costs=[];
      const positions=[...new Set([0,.05,.2,.55,1,1.12,1.2,1.85,2.12,2.65,3.12,3.85,4.2,4.3,4.4,4.55,4.95,5.2,5.35,5.8,6,...Array.from({length:51},(_,i)=>1+i/10)])].sort((a,b)=>a-b);
      for(const p of positions) {
        const s=await seek(p);poses.set(p,s);
        if(await test.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error(`Overflow ${width}/${p}`);
        if(p>=1 && !s.phoneVisible && (!s.cardVisible||s.scale<.18))throw Error(`Empty product transition ${width}/${p}`);
        if(p<=1 && (!s.cardVisible||s.scale<.2))throw Error('Initial card trajectory lost');
        if([1,1.6,2.65,3.85,4.95,6].some(v=>Math.abs(p-v)<.001)) {
          const layout=await test.evaluate(()=>{
            const copies=[...document.querySelectorAll('.account-copy,.chapter-copy')].filter(el=>+getComputedStyle(el).opacity>.95);
            return copies.flatMap(el=>[...el.querySelectorAll('h2,p,.product-detail,.chapter-note,.account-detail small,.primary-cta')]).filter(el=>el.getClientRects().length&&getComputedStyle(el).display!=='none').map(el=>{const r=el.getBoundingClientRect();return {text:el.textContent,x:r.x,y:r.y,right:r.right,bottom:r.bottom};});
          });
          for(const r of layout)if(r.x<0||r.right>width+1||r.y<84||r.bottom>height-45)throw Error(`Clipped chapter ${width}/${p}: ${JSON.stringify(r)}`);
          const shot=await test.locator('canvas').screenshot();
          const green=await test.evaluate(async src=>{
            const i=new Image();i.src=`data:image/png;base64,${src}`;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height-5;const ctx=c.getContext('2d');ctx.drawImage(i,0,0);const d=ctx.getImageData(0,0,c.width,c.height).data;let n=0;for(let j=0;j<d.length;j+=4)if(d[j+1]>60&&d[j+1]-d[j]>20&&d[j+1]-d[j+2]>15)n++;return n;
          },shot.toString('base64'));
          if(green<500)throw Error(`Blank Canvas ${width}/${p}`);
          costs.push({p,calls:s.calls,triangles:s.triangles,green});
        }
      }
      for(const p of [...positions].reverse()) {
        const a=await seek(p),b=poses.get(p);
        if(a.card.some((v,i)=>Math.abs(v-b.card[i])>.01)||a.phone.some((v,i)=>Math.abs(v-b.phone[i])>.01)||Math.abs(a.scale-b.scale)>.005||a.protection.blocked!==b.protection.blocked||Math.abs(a.transfer.travel-b.transfer.travel)>.001)throw Error(`Reverse mismatch ${width}/${p}: ${JSON.stringify({forward:b,reverse:a})}`);
      }
      results.push({width,height,heroDifference,positions:positions.length,costs,reverse:'passed'});
    }
    if(errors.length)throw Error(errors.join('; '));
    return {results,errors};
  } finally {await context.close();}
}
