async (page) => {
  const phase=page.url().includes('polish=after')?'after':'before';
  const context=await page.context().browser().newContext(),test=await context.newPage(),results=[],errors=[];
  test.on('pageerror',e=>errors.push(e.message));test.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
  const moments=[[0,'hero'],[.48,'approach'],[.65,'approach-account'],[1,'account'],[1.6,'pix'],[1.85,'pix-confirmed'],[2.22,'card-return'],[2.65,'cashback'],[3.2,'cashback-cards'],[3.85,'cards'],[4.3,'cards-security'],[4.95,'security'],[5.3,'security-final'],[6,'final']];
  try {
    for(const size of [{width:1920,height:1080},{width:1440,height:900},{width:390,height:844},{width:360,height:640}]){
      await test.setViewportSize(size);await test.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded',timeout:120000});await test.waitForSelector('.scene-ready',{timeout:120000});
      await test.getByRole('button',{name:'Pausar movimento ambiente'}).click();
      const captures=[];
      for(const [p,name] of moments){
        await test.evaluate(p=>scrollTo(0,(document.documentElement.scrollHeight-innerHeight)*p/6),p);
        await test.waitForFunction(p=>Math.abs((window.__sceneInfo?.progress??-1)-p)<.001,p,{timeout:30000});
        for(let i=0;i<10;i++){await test.mouse.move(size.width/2+i%2,size.height/2);await test.waitForTimeout(30);}
        if(await test.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error(`Overflow ${size.width}/${name}`);
        const png=await test.screenshot({path:`output/playwright/polish-${phase}-${size.width}-${name}.png`});
        if(['hero','approach','account','pix','cashback','cards','security','final'].includes(name))captures.push({name,src:png.toString('base64')});
        const scene=await test.evaluate(()=>window.__sceneInfo);results.push({size,name,progress:scene.progress,calls:scene.calls,triangles:scene.triangles});
      }
      const sheet=await context.newPage();await sheet.setViewportSize({width:1560,height:900});
      await sheet.setContent(`<html><body style="margin:0;display:grid;grid-template-columns:repeat(4,1fr);background:#111513">${captures.map(i=>`<div><div style="padding:6px;color:white;font:12px Arial">${i.name}</div><img style="display:block;width:100%" src="data:image/png;base64,${i.src}"></div>`).join('')}</body></html>`);
      await sheet.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
      await sheet.screenshot({path:`output/playwright/polish-${phase}-${size.width}-overview.png`,fullPage:true});await sheet.close();
    }
    if(errors.length)throw Error(errors.join('; '));return {phase,results,errors};
  }finally{await context.close();}
}
