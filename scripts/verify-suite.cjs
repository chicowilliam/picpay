async (page) => {
  const context = await page.context().browser().newContext();
  const test = await context.newPage();
  const results = {};
  const run = async name => {
    const response = await test.request.get(`http://127.0.0.1:5173/scripts/${name}.cjs`);
    if(!response.ok()) throw Error(`Cannot load ${name}`);
    const execute = new Function(`return (${await response.text()})`)();
    return execute(test);
  };
  try {
    for(const size of [{width:1440,height:900},{width:390,height:844}]) {
      await test.setViewportSize(size);
      results[`visual-${size.width}`] = await run('verify-visual');
    }
    results.final = await run('verify-final');
    results.polish = await run('verify-polish');
    results.extension = await run('verify-extension');
    results.cardsSecurity = await run('verify-cards-security');
    results.closing = await run('verify-closing');
    results.fallback = await run('verify-fallback');
    return results;
  } finally { await context.close(); }
}
