async (page) => {
 const context=await page.context().browser().newContext({viewport:{width:1440,height:900}});const p=await context.newPage();const errors=[];
 p.on('pageerror',e=>errors.push(e.stack));p.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
 await p.goto('http://127.0.0.1:5173/');await p.waitForTimeout(5000);
 const result={errors,body:await p.locator('body').innerText(),html:await p.locator('#root').innerHTML()};await context.close();return result;
}
