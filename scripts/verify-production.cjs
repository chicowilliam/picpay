async (page) => {
  const context=await page.context().browser().newContext({viewport:{width:390,height:844}});
  const test=await context.newPage();const errors=[];
  test.on('pageerror',e=>errors.push(e.message));test.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
  try {
    await test.goto('http://127.0.0.1:5174/');await test.waitForSelector('.scene-ready',{timeout:60000});
    await test.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
    await test.locator('.closing-copy').waitFor({state:'visible'});await test.waitForTimeout(1500);
    if(await test.locator('.closing-copy a').getAttribute('href')!=='https://picpay.com/pt-br/pf')throw Error('Official CTA missing');
    if(await test.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Production overflow');
    if(errors.length)throw Error(errors.join('; '));
    await test.screenshot({path:'output/playwright/production-mobile-cta.png'});
    return {production:'passed',errors};
  }finally{await context.close();}
}
