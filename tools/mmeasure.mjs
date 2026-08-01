import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 390, height: 900 } });
await p.goto('http://localhost:8899/index.html', { waitUntil: 'networkidle' });
await p.evaluate(()=>document.fonts.ready);
await p.evaluate(()=>{const s=document.createElement('style');s.textContent='*{animation-duration:1ms!important;animation-delay:0ms!important}.rev,.rev.in{opacity:1!important;transform:none!important}';document.head.appendChild(s);
  document.querySelectorAll('img[loading="lazy"]').forEach(i=>i.loading='eager');});
await p.waitForTimeout(900);
const r = await p.evaluate(()=>{
  const out=[];
  document.querySelectorAll('.ann,.nav,section,footer').forEach(s=>{
    const b=s.getBoundingClientRect();
    out.push({c:(s.className||s.tagName).toString().split(' ')[0], h:Math.round(b.height)});
  });
  const g=(sel,ps)=>{const e=document.querySelector(sel); if(!e) return null; const cs=getComputedStyle(e);
    const rg=document.createRange(); rg.selectNodeContents(e);
    const o={ink:+rg.getBoundingClientRect().width.toFixed(1)}; ps.forEach(k=>o[k]=cs[k]); return o;};
  return {out, u:getComputedStyle(document.documentElement).getPropertyValue('--u'),
    h1:g('.hero h1',['fontSize']), sub:g('.hero p',['fontSize','width']),
    cardH3:g('.card h3',['fontSize']), showH2:g('.show h2',['fontSize'])};
});
console.log(JSON.stringify(r,null,1));
await b.close();
