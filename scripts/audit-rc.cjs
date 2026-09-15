async (page) => {
  const context=await page.context().browser().newContext({viewport:{width:390,height:844}});
  const test=await context.newPage(), errors=[], warnings=[], missing=[];
  test.on('pageerror',e=>errors.push(e.message));
  test.on('console',e=>{if(e.type()==='error')errors.push(e.text());if(e.type()==='warning')warnings.push(e.text());});
  test.on('response',r=>{if(r.status()>=400)missing.push({url:r.url(),status:r.status()});});
  await test.addInitScript(()=>{
    const audit=window.__rc={draws:0,created:{},deleted:{},listeners:0,contexts:0,lostContexts:0,cls:0,lcp:0};
    const getContext=HTMLCanvasElement.prototype.getContext,contexts=new WeakSet();
    HTMLCanvasElement.prototype.getContext=function(...args){const result=getContext.apply(this,args);if(args[0]==='webgl2'&&result&&!contexts.has(result)){contexts.add(result);audit.contexts++;this.addEventListener('webglcontextlost',()=>audit.lostContexts++);}return result;};
    new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)audit.cls+=e.value;}).observe({type:'layout-shift',buffered:true});
    new PerformanceObserver(list=>{for(const e of list.getEntries())audit.lcp=e.startTime;}).observe({type:'largest-contentful-paint',buffered:true});
    const add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener;
    const tracked=new WeakMap();
    EventTarget.prototype.addEventListener=function(type,fn,options){
      if(this===window||this===document){let entries=tracked.get(fn);if(!entries)tracked.set(fn,entries=new Set());const key=`${this===window?'w':'d'}:${type}:${typeof options==='boolean'?options:!!options?.capture}`;if(!entries.has(key)){entries.add(key);audit.listeners++;}}
      return add.call(this,type,fn,options);
    };
    EventTarget.prototype.removeEventListener=function(type,fn,options){if(this===window||this===document){const key=`${this===window?'w':'d'}:${type}:${typeof options==='boolean'?options:!!options?.capture}`;if(tracked.get(fn)?.delete(key))audit.listeners--;}return remove.call(this,type,fn,options);};
    const proto=WebGL2RenderingContext.prototype;
    for(const kind of ['Texture','Buffer','Program','Framebuffer','Renderbuffer','VertexArray'])for(const operation of ['create','delete']){
      const name=operation+kind,original=proto[name];proto[name]=function(...args){const result=original.apply(this,args);if(operation==='create'?result:args[0]){const counts=operation==='create'?audit.created:audit.deleted;counts[kind]=(counts[kind]??0)+1;}return result;};
    }
    for(const name of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']){const original=proto[name];proto[name]=function(...args){audit.draws++;return original.apply(this,args);};}
  });
  try {
    await test.goto('http://127.0.0.1:5174/');await test.waitForSelector('.scene-ready',{timeout:90000});
    await test.getByRole('button',{name:'Pausar movimento ambiente'}).click();
    const cdp=await context.newCDPSession(test);
    const snapshot=async()=>{await cdp.send('HeapProfiler.collectGarbage');return {heap:await cdp.send('Runtime.getHeapUsage'),gpu:await test.evaluate(()=>window.__rc)};};
    await test.waitForTimeout(1500);const initial=await snapshot();
    const max=await test.evaluate(()=>document.documentElement.scrollHeight-innerHeight);
    for(const p of [1,2,3,4,5,6,5,4,3,2,1,0]){await test.evaluate(y=>scrollTo(0,y),max*p/6);await test.waitForTimeout(700);}
    const idleStart=await test.evaluate(()=>window.__rc.draws);await test.waitForTimeout(1000);const idleDraws=await test.evaluate(start=>window.__rc.draws-start,idleStart);
    const cycles=[];
    for(let i=0;i<3;i++){
      await test.emulateMedia({reducedMotion:'reduce'});await test.waitForSelector('.static-mode');await test.waitForTimeout(1000);const off=await snapshot();
      await test.emulateMedia({reducedMotion:'no-preference'});await test.waitForSelector('canvas');await test.waitForSelector('.scene-ready',{timeout:90000});await test.waitForTimeout(1800);cycles.push({off,on:await snapshot()});
    }
    const assets=await test.evaluate(()=>performance.getEntriesByType('resource').map(r=>({name:r.name.split('/').pop(),bytes:r.transferSize,duration:r.duration})));
    await test.evaluate(()=>document.querySelector('canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
    await test.waitForSelector('.static-mode');await test.waitForTimeout(1500);
    const lost=await snapshot();
    if(await test.locator('canvas').count())throw Error('Context-loss fallback failed');
    return {errors,warnings,missing,initial,idleDraws,cycles,assets,lost};
  }finally{await context.close();}
}
