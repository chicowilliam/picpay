async (page) => {
  const context=await page.context().browser().newContext({viewport:{width:390,height:844}}), test=await context.newPage();
  const errors=[];test.on('pageerror',e=>errors.push(e.message));
  try {
    const cdp=await context.newCDPSession(test);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
    await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:90000,connectionType:'cellular3g'});
    // Delayed scene delivery makes the loading state observable on fast local disks too.
    await test.route('**/assets/Scene-*.js',async route=>{await test.waitForTimeout(3000);await route.continue();});
    const start=Date.now();await test.goto('http://127.0.0.1:5174/',{waitUntil:'commit'});
    await test.locator('.hero-copy h1').waitFor({state:'visible'});
    const contentMs=Date.now()-start;
    const poster=await test.locator('.fallback-hero').evaluate(el=>({opacity:getComputedStyle(el).opacity,rect:el.getBoundingClientRect().toJSON()}));
    if(Number(poster.opacity)<.99)throw Error('Loading poster missing');
    await test.screenshot({path:'output/playwright/rc-slow-poster.png'});
    await test.waitForSelector('.scene-ready',{timeout:120000});await test.waitForTimeout(600);
    const readyMs=Date.now()-start;
    await test.screenshot({path:'output/playwright/rc-slow-ready.png'});
    if(await test.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Loading overflow');
    return {contentMs,readyMs,poster,errors,network:'150ms latency, 200000 B/s down, no cache, extra 3s scene delay'};
  }finally{await context.close();}
}
