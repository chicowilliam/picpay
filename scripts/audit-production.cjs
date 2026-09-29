async (page) => {
  const browser = page.context().browser();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const test = await context.newPage();
  const errors = [];
  const warnings = [];
  const missing = [];
  test.on('pageerror', error => errors.push(error.message));
  test.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
    if (message.type() === 'warning') warnings.push(message.text());
  });
  test.on('response', response => {
    if (response.status() >= 400) missing.push({ url: response.url(), status: response.status() });
  });

  await test.addInitScript(() => {
    const audit = window.__productionAudit = {
      domReady: 0,
      sceneReady: 0,
      cls: 0,
      lcp: 0,
      longTasks: [],
      listeners: 0,
      draws: 0,
      contexts: 0,
      lostContexts: 0,
      created: {},
      deleted: {},
    };
    const add = EventTarget.prototype.addEventListener;
    const remove = EventTarget.prototype.removeEventListener;
    const tracked = new WeakMap();
    EventTarget.prototype.addEventListener = function(type, listener, options) {
      if ((this === window || this === document) && listener) {
        let entries = tracked.get(listener);
        if (!entries) tracked.set(listener, entries = new Set());
        const key = `${this === window ? 'window' : 'document'}:${type}:${typeof options === 'boolean' ? options : !!options?.capture}`;
        if (!entries.has(key)) { entries.add(key); audit.listeners++; }
      }
      return add.call(this, type, listener, options);
    };
    EventTarget.prototype.removeEventListener = function(type, listener, options) {
      if ((this === window || this === document) && listener) {
        const key = `${this === window ? 'window' : 'document'}:${type}:${typeof options === 'boolean' ? options : !!options?.capture}`;
        if (tracked.get(listener)?.delete(key)) audit.listeners--;
      }
      return remove.call(this, type, listener, options);
    };
    const contexts = new WeakSet();
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      const result = getContext.call(this, type, ...args);
      if ((type === 'webgl2' || type === 'webgl') && result && !contexts.has(result)) {
        contexts.add(result);
        audit.contexts++;
        this.addEventListener('webglcontextlost', () => audit.lostContexts++);
      }
      return result;
    };
    const instrument = proto => {
      if (!proto) return;
      for (const kind of ['Texture', 'Buffer', 'Program', 'Framebuffer', 'Renderbuffer', 'VertexArray']) {
        for (const operation of ['create', 'delete']) {
          const name = operation + kind;
          const original = proto[name];
          if (!original) continue;
          proto[name] = function(...args) {
            const result = original.apply(this, args);
            if (operation === 'create' ? result : args[0]) {
              const target = operation === 'create' ? audit.created : audit.deleted;
              target[kind] = (target[kind] || 0) + 1;
            }
            return result;
          };
        }
      }
      for (const name of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
        const original = proto[name];
        if (!original) continue;
        proto[name] = function(...args) { audit.draws++; return original.apply(this, args); };
      }
    };
    instrument(window.WebGL2RenderingContext?.prototype);
    instrument(window.WebGLRenderingContext?.prototype);
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) audit.cls += entry.value;
    }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) audit.lcp = entry.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    try {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) audit.longTasks.push(entry.duration);
      }).observe({ type: 'longtask', buffered: true });
    } catch {}
    document.addEventListener('DOMContentLoaded', () => {
      audit.domReady = performance.now();
      const root = document.querySelector('.experience');
      if (!root) return;
      const observer = new MutationObserver(() => {
        if (root.classList.contains('scene-ready') && !audit.sceneReady) {
          audit.sceneReady = performance.now();
          observer.disconnect();
        }
      });
      observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    }, { once: true });
  });

  try {
    const started = Date.now();
    await test.goto('http://127.0.0.1:5174/', { waitUntil: 'domcontentloaded', timeout: 120000 });
    const immediate = await test.evaluate(() => {
      const hero = document.querySelector('.hero-copy')?.getBoundingClientRect();
      const poster = document.querySelector('.fallback-hero');
      return {
        elapsed: performance.now(),
        heroVisible: !!hero && hero.width > 0 && hero.height > 0,
        posterVisible: !!poster && getComputedStyle(poster).opacity !== '0',
        canvasCount: document.querySelectorAll('canvas').length,
        scrollHeight: document.documentElement.scrollHeight,
      };
    });
    await test.waitForSelector('.scene-ready', { timeout: 120000 });
    const sceneReadyObservedAt = await test.evaluate(() => performance.now());
    await test.waitForTimeout(4500);
    const ready = await test.evaluate(sceneReadyObservedAt => ({
      ...window.__productionAudit,
      navigation: performance.getEntriesByType('navigation')[0]?.toJSON(),
      resources: performance.getEntriesByType('resource').map(resource => ({
        name: resource.name.split('/').pop(),
        bytes: resource.transferSize,
        duration: resource.duration,
      })),
      posterOpacity: getComputedStyle(document.querySelector('.fallback-hero')).opacity,
      canvasCount: document.querySelectorAll('canvas').length,
      sceneReadyObservedAt,
    }), sceneReadyObservedAt);
    const cdp = await context.newCDPSession(test);
    const snapshot = async () => {
      await cdp.send('HeapProfiler.collectGarbage');
      return {
        heap: await cdp.send('Runtime.getHeapUsage'),
        audit: await test.evaluate(() => structuredClone(window.__productionAudit)),
      };
    };
    const initial = await snapshot();
    const idleStart = await test.evaluate(() => window.__productionAudit.draws);
    await test.waitForTimeout(1500);
    const idleDraws = await test.evaluate(start => window.__productionAudit.draws - start, idleStart);
    const max = await test.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    const frameProfile = await test.evaluate(async maxScroll => {
      const frames = [];
      let previous = performance.now();
      for (let step = 0; step <= 120; step++) {
        await new Promise(resolve => requestAnimationFrame(time => {
          frames.push(time - previous);
          previous = time;
          scrollTo(0, maxScroll * step / 120);
          resolve();
        }));
      }
      const sorted = frames.slice(1).sort((a, b) => a - b);
      return {
        samples: sorted.length,
        average: sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
        p95: sorted[Math.floor(sorted.length * .95)],
        max: sorted[sorted.length - 1],
        over20ms: sorted.filter(value => value > 20).length,
        over50ms: sorted.filter(value => value > 50).length,
      };
    }, max);
    const scrollSamples = [];
    for (const progress of [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1, 0]) {
      const before = await test.evaluate(() => ({ draws: window.__productionAudit.draws, time: performance.now() }));
      await test.evaluate(y => scrollTo(0, y), max * progress / 6);
      await test.waitForTimeout(750);
      scrollSamples.push(await test.evaluate(({ progress, before }) => ({
        progress,
        duration: performance.now() - before.time,
        draws: window.__productionAudit.draws - before.draws,
      }), { progress, before }));
    }
    const warmFrameProfile = await test.evaluate(async maxScroll => {
      const frames = [];
      let previous = performance.now();
      for (let step = 0; step <= 180; step++) {
        await new Promise(resolve => requestAnimationFrame(time => {
          frames.push(time - previous);
          previous = time;
          scrollTo(0, maxScroll * step / 180);
          resolve();
        }));
      }
      const sorted = frames.slice(1).sort((a, b) => a - b);
      return {
        samples: sorted.length,
        average: sorted.reduce((sum, value) => sum + value, 0) / sorted.length,
        p95: sorted[Math.floor(sorted.length * .95)],
        max: sorted[sorted.length - 1],
        over20ms: sorted.filter(value => value > 20).length,
        over50ms: sorted.filter(value => value > 50).length,
      };
    }, max);
    const afterScroll = await snapshot();
    const cycles = [];
    for (let index = 0; index < 2; index++) {
      await test.emulateMedia({ reducedMotion: 'reduce' });
      await test.waitForSelector('.static-mode');
      await test.waitForTimeout(800);
      const off = await snapshot();
      await test.emulateMedia({ reducedMotion: 'no-preference' });
      await test.waitForSelector('.scene-ready', { timeout: 120000 });
      await test.waitForTimeout(1000);
      cycles.push({ off, on: await snapshot() });
    }
    const canvas = test.locator('canvas').first();
    await canvas.evaluate(element => element.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext());
    await test.waitForSelector('.static-mode');
    await test.waitForTimeout(1000);
    const contextLost = await snapshot();
    return {
      wallTimeToDomReady: Date.now() - started,
      immediate,
      ready,
      initial,
      idleDraws,
      frameProfile,
      warmFrameProfile,
      scrollSamples,
      afterScroll,
      cycles,
      contextLost,
      finalCanvasCount: await test.locator('canvas').count(),
      errors,
      warnings,
      missing,
    };
  } finally {
    await context.close();
  }
}
