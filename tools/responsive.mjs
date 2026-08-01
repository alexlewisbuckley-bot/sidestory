import { chromium } from 'playwright';
import { readdir } from 'node:fs/promises';
const W = [360,390,414,540,670,768,834,900,1024,1180,1280,1366,1440,1600,1920];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const pages = (await readdir('.')).filter(f=>f.endsWith('.html')).sort();
const rows=[];
for (const f of pages) {
  const p = await b.newPage({ viewport:{width:1440,height:900} });
  await p.goto('http://localhost:8899/'+f, { waitUntil:'domcontentloaded' });
  for (const w of W) {
    await p.setViewportSize({width:w, height:900});
    await p.evaluate(()=>{ window.dispatchEvent(new Event('resize')); });
    await p.waitForTimeout(120);
    const r = await p.evaluate(()=>{
      const de=document.documentElement;
      const over=[...document.querySelectorAll('body *')].filter(e=>{
        const cs=getComputedStyle(e); if(cs.position==='fixed'||cs.display==='none') return false;
        const r=e.getBoundingClientRect(); return r.width>0 && (r.right>de.clientWidth+2||r.left<-2);
      }).slice(0,4).map(e=>(e.tagName.toLowerCase()+'.'+(e.className||'').toString().trim().split(/\s+/)[0]).slice(0,26));
      const bodyFs=getComputedStyle(document.body).fontSize;
      const h1=document.querySelector('h1,h2'); 
      return {sw:de.scrollWidth, cw:de.clientWidth, over, u:getComputedStyle(de).getPropertyValue('--u').trim(),
              h1:h1?Math.round(parseFloat(getComputedStyle(h1).fontSize)):null, body:bodyFs};
    });
    if (r.sw > r.cw+1) rows.push({f,w,sw:r.sw,cw:r.cw,over:r.over.join(','),u:r.u,h1:r.h1});
  }
  await p.close();
}
console.log(rows.length? rows.map(r=>`${r.f.padEnd(18)} ${String(r.w).padStart(5)}px  scrollW ${r.sw} (+${r.sw-r.cw})  --u=${r.u||'-'}  h=${r.h1}  ${r.over}`).join('\n') : 'no overflow anywhere');
await b.close();
