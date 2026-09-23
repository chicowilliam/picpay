async (page) => {
  const context=await page.context().browser().newContext();
  const test=await context.newPage(),errors=[],results=[];
  test.on('pageerror',e=>errors.push(e.message));
  test.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
  const seek=async p=>{
    await test.evaluate(p=>scrollTo(0,(document.documentElement.scrollHeight-innerHeight)*p/6),p);
    await test.waitForFunction(p=>Math.abs(window.__sceneInfo.progress-p)<.001,p);
    await test.waitForTimeout(180);
    return test.evaluate(()=>window.__sceneInfo);
  };
  const compare=async (baseline,path)=>test.evaluate(async ({baseline,path})=>{
    const pixels=[];let width,height;
    for(const src of [baseline,path]){
      const image=new Image();image.src=`/output/playwright/${src}.png`;await image.decode();
      width=image.width;height=image.height-3;
      const c=document.createElement('canvas');c.width=width;c.height=height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);pixels.push(ctx.getImageData(0,0,width,height).data);
    }
    let changed=0;for(let i=0;i<pixels[0].length;i+=4)if(Math.abs(pixels[0][i]-pixels[1][i])+Math.abs(pixels[0][i+1]-pixels[1][i+1])+Math.abs(pixels[0][i+2]-pixels[1][i+2])>30)changed++;
    return changed/(width*height);
  },{baseline,path});
  try{
    for(const size of [{width:1440,height:900},{width:1920,height:1080},{width:390,height:844},{width:360,height:640}]){
      await test.setViewportSize(size);
      await test.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded',timeout:120000});
      await test.waitForSelector('.scene-ready',{timeout:120000});
      await test.mouse.move(size.width/2,size.height/2);
      await test.waitForFunction(()=>window.__sceneInfo.ambientTime>=4,null,{timeout:60000});
      const poses=new Map(),diffs=[],path=[];
      const positions=[0,.05,.1,.2,.25,.3,.4,.55,.65,.8,1,1.12,1.25,1.85,2.22,2.48,2.62,3,3.2,3.4,3.85,4.25,4.65,5,5.3,5.8,6];
      for(const p of positions){
        const s=await seek(p);poses.set(p,s);
        if(await test.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error(`Overflow ${size.width}/${p}`);
        if(p<=1){
          if(!s.cardVisible||s.scale<.2)throw Error(`Missing travelling card ${size.width}/${p}`);
          const units=size.width<760?size.width/4.05:size.height/(2*Math.tan(37*Math.PI/360)*8.6);
          const screenY=size.height/2-s.card[1]*units*8.6/(s.cameraZ-s.card[2]);
          if(path.length&&screenY<path[path.length-1].screenY-2)throw Error(`Path reversed direction ${size.width}/${p}`);
          path.push({p,screenY,card:s.card,rotation:s.rotation,scale:s.scale});
          const readable=await test.evaluate(()=>Math.max(+getComputedStyle(document.querySelector('.hero-copy')).opacity,+getComputedStyle(document.querySelector('.account-copy')).opacity));
          if(readable<.3)throw Error('Context gap');
        }
        if([1.25,1.85,2.22,3.2,4.25,5.3].includes(p)&&s.cardVisible)throw Error(`Persistent card outside chapters ${p}`);
        if([3,3.85,5,6].includes(p)&&!s.cardVisible)throw Error('Missing local card composition');
        if([0,.2,.55,1,3,3.85,5,6].includes(p)){
          const name=`card-trajectory-${size.width}-${p}`;
          await test.screenshot({path:`output/playwright/${name}.png`});
          let baseline;
          if(p===0)baseline=`hero-panel-after-${size.width}`;
          else if(p===1)baseline=`hero-panel-after-${size.width}-account`;
          else baseline=`hero-panel-sequence-${size.width}-${p}`;
          if(p===0||p>=1){const diff=await compare(baseline,name);diffs.push({p,diff});if(diff>.001)throw Error(`Approved composition changed ${size.width}/${p}: ${diff}`);}
        }
      }
      const descent=path[path.length-1].screenY-path[0].screenY;
      if(descent<100)throw Error(`Insufficient descent ${size.width}: ${descent}`);
      for(const p of [...positions].reverse()){
        const a=await seek(p),b=poses.get(p);
        if(a.card.some((v,i)=>Math.abs(v-b.card[i])>.01)||Math.abs(a.scale-b.scale)>.005||a.cardVisible!==b.cardVisible)throw Error(`Reverse mismatch ${size.width}/${p}`);
      }
      results.push({size,descent,path,diffs,heroCalls:poses.get(0).calls,heroTriangles:poses.get(0).triangles,pixCalls:poses.get(1.85).calls,reverse:'passed'});
    }
    if(errors.length)throw Error(errors.join('; '));
    return {results,errors};
  }finally{await context.close();}
}
