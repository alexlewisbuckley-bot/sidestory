import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const out = [];
for (const w of [1920, 1600, 1440, 1280, 1024, 768, 390]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } });
  await p.goto('http://localhost:8899/index.html', { waitUntil: 'load' });
  await p.waitForTimeout(400);
  const m = await p.evaluate(() => {
    const g = s => { const e=document.querySelector(s); if(!e) return null;
      const c=getComputedStyle(e), r=e.getBoundingClientRect();
      return {fs:+parseFloat(c.fontSize).toFixed(1), w:Math.round(r.width), h:Math.round(r.height)}; };
    return { u:getComputedStyle(document.documentElement).getPropertyValue('--u').trim(),
      h1:g('.hero h1'), kicker:g('.hero .k'), body:g('.hero p:not(.k)'),
      logo:g('.brand'), nav:g('.nav'), card:g('.card'), cardimg:g('.card .ph') };
  });
  out.push({ w, ...m }); await p.close();
}
// nav stability probe at 1440
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://localhost:8899/index.html', { waitUntil: 'load' });
let flips = 0, last = null;
await p.evaluate(() => window.scrollTo(0, 0));
for (let y = 0; y <= 400; y += 10) {
  await p.evaluate(v => window.scrollTo(0, v), y);
  await p.waitForTimeout(60);
  const st = await p.evaluate(() => document.querySelector('.ann').classList.contains('hide'));
  if (last !== null && st !== last) flips++;
  last = st;
}
out.push({ navStateChangesOverScroll: flips });
await b.close();
console.log(JSON.stringify(out, null, 1));
