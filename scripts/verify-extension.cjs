async (page) => {
  const context = await page.context().browser().newContext();
  const test = await context.newPage();
  const errors = [], results = [];
  test.on('pageerror', error => errors.push(error.message));
  test.on('console', message => { if(message.type()==='error') errors.push(message.text()); });
  const scroll = async p => {
    await test.evaluate(p => scrollTo(0,(document.documentElement.scrollHeight-innerHeight)*p/Number(document.querySelector('.story').dataset.storyEnd)),p);
    await test.waitForFunction(p => Math.abs((window.__sceneInfo?.progress ?? -1)-p)<.001,p,{timeout:30000});
    await test.waitForTimeout(200);
    return test.evaluate(()=>window.__sceneInfo);
  };
  try {
    for(const size of [{width:1440,height:900},{width:390,height:844},{width:360,height:640}]) {
      await test.setViewportSize(size);
      await test.goto('http://127.0.0.1:5173/');
      await test.waitForSelector('.scene-ready',{timeout:60000});
      await test.getByRole('button',{name:'Pausar movimento ambiente'}).click();
      const forward = new Map();
      for(const p of [0,1,1.15,1.4,1.6,1.85,2.15,2.48,2.65,2.9,3]) {
        const state = await scroll(p); forward.set(p,state);
        if(await test.evaluate(()=>document.documentElement.scrollWidth>innerWidth)) throw Error('Horizontal overflow');
        if(await test.locator('form,input').count()) throw Error('Unexpected data collection');
        const name = p===0?'hero':p===1?'account':p===1.6?'pix':p===2.65?'cashback':String(p);
        await test.screenshot({path:`output/playwright/slice2-${size.width}-${name}.png`});
        if(p===1.6 || p===2.65) {
          const png = await test.locator('canvas').screenshot();
          const pixels = await test.evaluate(async base64 => {
            const img = new Image(); img.src = `data:image/png;base64,${base64}`; await img.decode();
            const canvas = document.createElement('canvas'); canvas.width=img.width; canvas.height=img.height;
            const ctx=canvas.getContext('2d'); ctx.drawImage(img,0,0);
            const data=ctx.getImageData(0,0,img.width,img.height).data;
            let green=0,minX=img.width,maxX=0;
            for(let i=0;i<img.width*(img.height-5)*4;i+=4) if(data[i+3]>100 && data[i+1]>60 && data[i+1]-data[i]>20 && data[i+1]-data[i+2]>15) {green++;const x=(i/4)%img.width;minX=Math.min(minX,x);maxX=Math.max(maxX,x);}
            return {green,minX,maxX,width:img.width};
          },png.toString('base64'));
          if(pixels.green<500 || pixels.minX<8 || pixels.maxX>pixels.width-8) throw Error(`Blank or clipped product: ${JSON.stringify(pixels)}`);
        }
        if(p===1) {
          const difference = await test.evaluate(async width => {
            const images=await Promise.all(['baseline','slice2'].map(async prefix=>{const img=new Image();img.src=`/output/playwright/${prefix}-${width}-${prefix==='baseline'?'1':'account'}.png`;await img.decode();return img;}));
            const canvas=document.createElement('canvas');canvas.width=images[0].width;canvas.height=images[0].height-3;
            const ctx=canvas.getContext('2d');
            const data=images.map(img=>{ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0);return ctx.getImageData(0,0,canvas.width,canvas.height).data;});
            let changed=0;for(let i=0;i<data[0].length;i+=4) if(Math.abs(data[0][i]-data[1][i])+Math.abs(data[0][i+1]-data[1][i+1])+Math.abs(data[0][i+2]-data[1][i+2])>30) changed++;
            return changed/(canvas.width*canvas.height);
          },size.width);
          if(difference>.015) throw Error(`Account visual regression: ${difference}`);
          results.push({size,accountPixelDifference:difference});
        }
        results.push({size,p,scene:state});
      }
      for(const p of [2.9,2.65,2.48,2.15,1.85,1.6,1.4,1.15,1,0]) {
        const state = await scroll(p), old = forward.get(p);
        if(p>0 && state.card.some((v,i)=>Math.abs(v-old.card[i])>.01)) throw Error(`Reverse pose mismatch at ${p}`);
        if(p>1 && (Math.abs(state.transfer.travel-old.transfer.travel)>.01 || state.transfer.complete!==old.transfer.complete)) throw Error('Transfer not reversible');
        if(p===1 && (Math.abs(state.card[0]-(size.width<760?-.61:.35))>.002 || state.cameraZ!==8.6)) throw Error('Account pose regression');
      }
    }
    await test.setViewportSize({width:844,height:390});
    await test.waitForSelector('.static-mode');
    if(await test.locator('canvas').count()) throw Error('Landscape should be static');
    if(await test.locator('.static-chapters section').count()!==2) throw Error('Missing static chapters');
    if(await test.evaluate(()=>document.documentElement.scrollWidth>innerWidth)) throw Error('Landscape overflow');
    await test.screenshot({path:'output/playwright/slice2-landscape.png',fullPage:true});
    if(errors.length) throw Error(errors.join('; '));
    return {errors,results,reverse:'passed',landscape:'passed'};
  } finally {await context.close();}
}
