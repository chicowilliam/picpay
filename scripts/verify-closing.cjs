async (page) => {
  const context=await page.context().browser().newContext();const test=await context.newPage();const errors=[],results=[];
  test.on('pageerror',e=>errors.push(e.message));test.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
  const scroll=async p=>{
    await test.evaluate(p=>scrollTo(0,(document.documentElement.scrollHeight-innerHeight)*p/Number(document.querySelector('.story').dataset.storyEnd)),p);
    await test.waitForFunction(p=>Math.abs((window.__sceneInfo?.progress??-1)-p)<.001,p,{timeout:30000});
    await test.waitForTimeout(200);return test.evaluate(()=>window.__sceneInfo);
  };
  const bounds=async()=>test.evaluate(()=>{
    const elements=['.closing-copy h2','.closing-copy .primary-cta','.concept-label'];
    return elements.map(selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {selector,x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right};});
  });
  try {
    for(const size of [{width:1440,height:900},{width:1920,height:1080},{width:390,height:844},{width:360,height:640}]) {
      await test.setViewportSize(size);await test.goto('http://127.0.0.1:5173/');await test.waitForSelector('.scene-ready',{timeout:60000});
      await test.getByRole('button',{name:'Pausar movimento ambiente'}).click();
      const poses=new Map();const captures=[];
      for(const [p,name] of [[0,'hero'],[.48,'approach'],[1,'account'],[1.6,'pix'],[2.65,'cashback'],[3.85,'cards'],[5,'security'],[5.3,'release'],[5.6,'arrival'],[5.8,'rest'],[6,'cta']]) {
        const scene=await scroll(p);poses.set(p,scene);
        if(await test.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error(`Overflow ${size.width}/${p}`);
        const label=await test.locator('.concept-label').boundingBox();if(!label||label.y<0||label.y+label.height>size.height)throw Error('Unofficial label clipped');
        const png=await test.screenshot({path:`output/playwright/complete-${size.width}-${name}.png`});
        if(!['release','arrival','rest'].includes(name))captures.push(png.toString('base64'));
        if(p===5) {
          const diff=await test.evaluate(async width=>{
            const images=await Promise.all([`pre-closing-${width}-5`,`complete-${width}-security`].map(async name=>{const i=new Image();i.src=`/output/playwright/${name}.png`;await i.decode();return i;}));
            const c=document.createElement('canvas');c.width=images[0].width;c.height=images[0].height-80;const ctx=c.getContext('2d');
            const data=images.map(i=>{ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(i,0,0);return ctx.getImageData(0,0,c.width,c.height).data;});
            let changed=0;for(let i=0;i<data[0].length;i+=4)if(Math.abs(data[0][i]-data[1][i])+Math.abs(data[0][i+1]-data[1][i+1])+Math.abs(data[0][i+2]-data[1][i+2])>30)changed++;
            return changed/(c.width*c.height);
          },size.width);
          if(diff>.003)throw Error(`Security start changed: ${diff}`);results.push({size,securityPixelDifference:diff});
        }
      }
      const final=poses.get(6), resting=poses.get(5.8);
      if(final.card.some((v,i)=>Math.abs(v-resting.card[i])>.001))throw Error('Final pose should rest');
      if(!final.phoneVisible||final.cards.count!==1||final.protection.active)throw Error('Final composition not assembled');
      const boxes=await bounds();for(const r of boxes)if(r.x<0||r.y<0||r.right>size.width+.5||r.bottom>size.height)throw Error(`Clipped element ${r.selector}`);
      if(boxes[1].height<44||boxes[1].y<boxes[0].bottom)throw Error('CTA touch area or text overlap');
      const link=test.locator('.closing-copy .primary-cta');if(await link.getAttribute('href')!=='https://picpay.com/pt-br/pf'||await link.getAttribute('target')!=='_blank')throw Error('Wrong official link');
      await test.keyboard.press('Tab');await link.focus();if(await link.evaluate(el=>getComputedStyle(el).outlineStyle)==='none')throw Error('Missing keyboard focus');
      await test.mouse.move(5,5);await link.evaluate(el=>el.blur());
      await test.screenshot({path:`output/playwright/final-${size.width}-cta.png`});
      if(size.width>=760){
        await test.getByRole('button',{name:'Retomar movimento ambiente'}).click();
        await test.mouse.move(size.width*.2,size.height*.3);await test.waitForTimeout(600);const before=await test.evaluate(()=>window.__sceneInfo.rotation[1]);
        await test.mouse.move(size.width*.8,size.height*.3,{steps:12});await test.waitForTimeout(600);const after=await test.evaluate(()=>window.__sceneInfo.rotation[1]);
        if(Math.abs(after-before)<.01)throw Error('Final cursor reaction failed');
        await test.getByRole('button',{name:'Pausar movimento ambiente'}).click();await test.waitForTimeout(600);
      }
      for(const p of [5.8,5.6,5.3,5,3.85,2.65,1.6,1,0]) {
        const state=await scroll(p),old=poses.get(p);
        if(p>0&&(state.card.some((v,i)=>Math.abs(v-old.card[i])>.01)||state.protection.active!==old.protection.active))throw Error(`Reverse failed at ${p}`);
      }
      if(size.width===1440||size.width===390){
        const sheet=await context.newPage();await sheet.setViewportSize(size);
        await sheet.setContent(`<html><body style="margin:0;background:#111513">${captures.map(src=>`<img style="display:block;width:100%;height:auto" src="data:image/png;base64,${src}">`).join('')}</body></html>`);
        await sheet.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
        await sheet.screenshot({path:`output/playwright/complete-story-${size.width}.png`,fullPage:true});await sheet.close();
      }
      results.push({size,scene:final,boxes,reverse:'passed'});
    }
    for(const mode of ['landscape','reduced','webgl']){
      const fallback=await page.context().browser().newContext({viewport:mode==='landscape'?{width:844,height:390}:{width:390,height:844},reducedMotion:mode==='reduced'?'reduce':'no-preference'});
      try{const f=await fallback.newPage();f.on('pageerror',e=>errors.push(e.message));
        if(mode==='webgl')await f.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:original.call(this,type,...args);};});
        await f.goto('http://127.0.0.1:5173/');await f.waitForSelector('.static-mode');await f.locator('.static-closing').scrollIntoViewIfNeeded();
        if(await f.locator('canvas').count()||await f.locator('#closing-title').count()!==1)throw Error('Final fallback failed');
        if(await f.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Fallback overflow');
        if(await f.locator('.static-closing a').getAttribute('href')!=='https://picpay.com/pt-br/pf')throw Error('Fallback link');
        await f.screenshot({path:`output/playwright/closing-${mode}.png`,fullPage:true});
      }finally{await fallback.close();}
    }
    if(errors.length)throw Error(errors.join('; '));return {errors,results,fallbacks:'passed'};
  }finally{await context.close();}
}
