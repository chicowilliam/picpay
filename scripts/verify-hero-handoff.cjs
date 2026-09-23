async (page) => {
  const after = page.url().includes('after'), phase = after ? 'after' : 'before';
  const context = await page.context().browser().newContext();
  const test = await context.newPage(), results = [], errors = [];
  test.on('pageerror', e => errors.push(e.message));
  test.on('console', e => { if(e.type()==='error')errors.push(e.text()); });
  const scroll = async p => {
    await test.evaluate(p=>scrollTo(0,(document.documentElement.scrollHeight-innerHeight)*p/6),p);
    await test.waitForFunction(p=>Math.abs(window.__sceneInfo.progress-p)<.001,p);
    await test.waitForTimeout(180);
    return test.evaluate(()=>({scene:window.__sceneInfo,hero:Number(getComputedStyle(document.querySelector('.hero-copy')).opacity),account:Number(getComputedStyle(document.querySelector('.account-copy')).opacity)}));
  };
  try {
    for(const size of [{width:1440,height:900},{width:390,height:844},{width:360,height:640}]) {
      await test.setViewportSize(size);
      await test.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded',timeout:120000});
      await test.waitForSelector('.scene-ready',{timeout:120000});
      await test.mouse.move(size.width/2,size.height/2);await test.waitForTimeout(6500);
      const samples=new Map(), comparisons=[];
      const positions=after?[0,.05,.1,.15,.2,.23,.25,.27,.3,.4,.6,1,1.85,3,3.85,5,6]:[0,.1,.2,.3,.4,.6,1,1.85,3,3.85,5,6];
      for(const p of positions) {
        const state=await scroll(p);samples.set(p,state);
        if(await test.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Overflow');
        if(after&&p<=1&&Math.max(state.hero,state.account)<.3)throw Error(`Visual gap at ${size.width}/${p}`);
        if(after&&p===.25&&!(state.hero>0&&state.account>0&&state.scene.phoneVisible))throw Error('Missing overlap');
        if(after&&p===.3&&state.account<.99)throw Error('Account not established at Hero exit');
        if(after&&p>.23&&p<.3) {
          const gap=await test.evaluate(()=>{
            const h=document.querySelector('.hero-copy h1'),a=document.querySelector('.account-copy .eyebrow');
            const r=h.getBoundingClientRect();
            return a.getBoundingClientRect().top-(r.top+parseFloat(getComputedStyle(h).lineHeight));
          });
          if(gap<0)throw Error(`Overlapping headings ${size.width}/${p}: ${gap}`);
        }
        await test.screenshot({path:`output/playwright/handoff-${phase}-${size.width}-${p}.png`});
        if(after&&(p===0||p>=1)) {
          const diff=await test.evaluate(async ({width,p})=>{
            const imgs=await Promise.all(['before','after'].map(async phase=>{const i=new Image();i.src=`/output/playwright/handoff-${phase}-${width}-${p}.png`;await i.decode();return i;}));
            const c=document.createElement('canvas');c.width=imgs[0].width;c.height=imgs[0].height-3;const ctx=c.getContext('2d');
            const data=imgs.map(i=>{ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(i,0,0);return ctx.getImageData(0,0,c.width,c.height).data;});
            let changed=0;for(let i=0;i<data[0].length;i+=4)if(Math.abs(data[0][i]-data[1][i])+Math.abs(data[0][i+1]-data[1][i+1])+Math.abs(data[0][i+2]-data[1][i+2])>30)changed++;
            return changed/(c.width*c.height);
          },{width:size.width,p});
          if(diff>.001)throw Error(`Regression at ${size.width}/${p}: ${diff}`);
          comparisons.push({p,diff});
        }
      }
      if(after)for(const p of [...positions].reverse()) {
        const actual=await scroll(p),prior=samples.get(p);
        if(actual.scene.card.some((v,i)=>Math.abs(v-prior.scene.card[i])>.01)||Math.abs(actual.scene.scale-prior.scene.scale)>.005||Math.abs(actual.account-prior.account)>.01||Math.abs(actual.hero-prior.hero)>.01)throw Error(`Reverse mismatch ${size.width}/${p}`);
      }
      results.push({size,samples:[...samples].filter(([p])=>p<=1).map(([p,s])=>({p,hero:s.hero,account:s.account,phone:s.scene.phoneVisible})),comparisons});
    }
    if(errors.length)throw Error(errors.join('; '));
    return {phase,results,errors};
  } finally {await context.close();}
}
