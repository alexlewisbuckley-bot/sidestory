import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport:{width:390,height:844}, isMobile:true, hasTouch:true, deviceScaleFactor:2 });
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });   // a mid-range phone
await p.goto('http://localhost:8802/index.html', { waitUntil:'networkidle' });

for (const round of [1,2,3]) {
  const r = await p.evaluate(() => new Promise(res => {
    const bg = document.querySelector('.burger'), el = document.getElementById('menupanel');
    const long = []; let shift = 0;
    const po = new PerformanceObserver(l => { for (const e of l.getEntries()) long.push(Math.round(e.duration)); });
    try { po.observe({ type:'longtask', buffered:false }); } catch {}
    const ls = new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) shift += e.value; });
    try { ls.observe({ type:'layout-shift', buffered:false }); } catch {}
    const frames = []; let last = performance.now();
    const tick = () => { const n = performance.now(); frames.push(n - last); last = n;
      if (n - t0 < 900) requestAnimationFrame(tick); };
    const t0 = performance.now();
    let painted = 0;
    el.addEventListener('transitionend', e => { if (e.propertyName === 'opacity' && !painted) painted = performance.now() - t0; }, { once:true });
    bg.click();
    requestAnimationFrame(tick);
    setTimeout(() => { po.disconnect(); ls.disconnect();
      // close again and settle
      bg.click();
      setTimeout(() => res({ toFullyOpen: Math.round(painted),
        worstFrame: Math.round(Math.max(...frames.slice(1))),
        framesOver32ms: frames.slice(1).filter(f => f > 32).length,
        frameCount: frames.length,
        longTasks: long, shiftDuringOpen: +shift.toFixed(4) }), 600);
    }, 900);
  }));
  console.log('round ' + round + '  ' + JSON.stringify(r));
}
await b.close();
