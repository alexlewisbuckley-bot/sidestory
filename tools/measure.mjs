import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
await p.goto('http://localhost:8899/index.html', { waitUntil: 'networkidle' });
await p.evaluate(()=>document.fonts.ready);
await p.evaluate(()=>{const s=document.createElement('style');s.textContent='*,*::before,*::after{animation-duration:1ms!important;animation-delay:0ms!important;transition-duration:1ms!important}.rev,.rev.in{opacity:1!important;transform:none!important}';document.head.appendChild(s);
  document.querySelectorAll('img[loading="lazy"]').forEach(i=>i.loading='eager');});
await p.waitForTimeout(900);
const groups = JSON.parse(process.argv[2]);
const r = await p.evaluate(gs => {
  const out={};
  for (const [k, list] of Object.entries(gs)) {
    const sec = document.querySelector(k);
    if(!sec){ out[k]='MISSING'; continue; }
    const sr = sec.getBoundingClientRect();
    out[k] = { h: Math.round(sr.height), items: list.map(sel => {
      const els=[...sec.querySelectorAll(sel)];
      if(!els.length) return {sel, miss:true};
      const e=els[0], r=e.getBoundingClientRect();
      return {sel, n:els.length, y:Math.round(r.top-sr.top), h:Math.round(r.height), w:Math.round(r.width)};
    })};
  }
  return out;
}, groups);
console.log(JSON.stringify(r,null,1));
await b.close();
