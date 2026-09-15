async (page) => {
  const context=await page.context().browser().newContext(); const test=await context.newPage();
  const errors=[], results=[];
  test.on('pageerror',e=>errors.push(e.message)); test.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
  const scroll=async p=>{
    await test.evaluate(p=>scrollTo(0,(document.documentElement.scrollHeight-innerHeight)*p/Number(document.querySelector('.story').dataset.storyEnd)),p);
    await test.waitForFunction(p=>Math.abs((window.__sceneInfo?.progress??-1)-p)<.001,p,{timeout:30000});
    await test.waitForTimeout(250); return test.evaluate(()=>window.__sceneInfo);
  };
  try {
    for(const size of [{width:1440,height:900},{width:1920,height:1080},{width:390,height:844},{width:360,height:640}]) {
      await test.setViewportSize(size); await test.goto('http://127.0.0.1:5173/'); await test.waitForSelector('.scene-ready',{timeout:60000});
      await test.getByRole('button',{name:'Pausar movimento ambiente'}).click();
      const forward=new Map();
      for(const p of [0,1,1.6,2.65,3,3.2,3.6,3.85,4.1,4.28,4.55,4.75,4.95,5]) {
        await scroll(p);
        // Match the pre-closing baseline's settled, paused pointer sampling.
        for(let i=0;i<10;i++){await test.mouse.move(size.width/2+i%2,size.height/2);await test.waitForTimeout(30);}
        const scene=await test.evaluate(()=>window.__sceneInfo); forward.set(p,scene);
        if(await test.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Horizontal overflow');
        if(await test.locator('form,input').count())throw Error('Unexpected input');
        if(size.width<760 && scene.cards.count+Number(scene.phoneVisible)>3)throw Error('More than three mobile product objects');
        const name=p===3.85?'cards':p===4.95?'security':String(p);
        await test.screenshot({path:`output/playwright/slice3-${size.width}-${name}.png`});
        if([0,1,1.6,2.65,3].includes(p)) {
          const difference=await test.evaluate(async ({width,p})=>{
            const images=await Promise.all([`reference3-${width}-${p}`,`slice3-${width}-${p}`].map(async name=>{const i=new Image();i.src=`/output/playwright/${name}.png`;await i.decode();return i;}));
            // The requested portfolio disclaimer and story progress intentionally changed.
            const c=document.createElement('canvas');c.width=images[0].width;c.height=images[0].height-80;const ctx=c.getContext('2d');
            const pixels=images.map(i=>{ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(i,0,0);return ctx.getImageData(0,0,c.width,c.height).data;});
            let changed=0;for(let i=0;i<pixels[0].length;i+=4)if(Math.abs(pixels[0][i]-pixels[1][i])+Math.abs(pixels[0][i+1]-pixels[1][i+1])+Math.abs(pixels[0][i+2]-pixels[1][i+2])>30)changed++;
            return changed/(c.width*c.height);
          },{width:size.width,p});
          if(difference>(p===0?.02:.003))throw Error(`Visual regression at ${size.width}/${p}: ${difference}`);
          results.push({size,p,difference});
        }
        if(p===3.85 && (scene.cards.count!==3 || scene.phoneVisible))throw Error('Stack composition failed');
        if(p===4.95 && (!scene.protection.blocked || scene.cards.count!==1 || !scene.phoneVisible))throw Error('Security state failed');
        if(p===3.85 || p===4.95) {
          const png=await test.locator('canvas').screenshot();
          const green=await test.evaluate(async base64=>{
            const i=new Image();i.src=`data:image/png;base64,${base64}`;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height-5;const ctx=c.getContext('2d');ctx.drawImage(i,0,0);const d=ctx.getImageData(0,0,c.width,c.height).data;let n=0;for(let j=0;j<d.length;j+=4)if(d[j+1]>70&&d[j+1]-d[j]>25&&d[j+1]-d[j+2]>20)n++;return n;
          },png.toString('base64'));
          if(green<500)throw Error('Blank product canvas');
          results.push({size,p,scene,green});
        }
      }
      for(const p of [4.95,4.75,4.55,4.28,4.1,3.85,3.6,3.2,3,2.65,1.6,1,0]) {
        const actual=await scroll(p), expected=forward.get(p);
        if(p>0 && actual.card.some((v,i)=>Math.abs(v-expected.card[i])>.01))throw Error('Card reverse mismatch');
        if(Math.abs(actual.cards.spread-expected.cards.spread)>.01 || actual.protection.blocked!==expected.protection.blocked)throw Error('Chapter reverse mismatch');
      }
    }
    for(const mode of ['landscape','reduced','webgl']) {
      const fallback=await page.context().browser().newContext({viewport:mode==='landscape'?{width:844,height:390}:{width:390,height:844},reducedMotion:mode==='reduced'?'reduce':'no-preference'});
      try {
        const f=await fallback.newPage();
        if(mode==='webgl')await f.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:original.call(this,type,...args);};});
        await f.goto('http://127.0.0.1:5173/');await f.waitForSelector('.static-mode');
        if(await f.locator('canvas').count() || await f.locator('.static-next-chapters section').count()!==2)throw Error('New chapter fallback missing');
        if(await f.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Fallback overflow');
        await f.screenshot({path:`output/playwright/slice3-${mode}.png`,fullPage:true});
      }finally{await fallback.close();}
    }
    if(errors.length)throw Error(errors.join('; '));
    return {errors,results,reverse:'passed',fallbacks:'passed'};
  }finally{await context.close();}
}
