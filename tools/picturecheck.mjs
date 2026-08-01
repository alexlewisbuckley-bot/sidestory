import {chromium} from 'playwright';
import fs from 'fs';
const PAGES=fs.readdirSync('.').filter(f=>f.endsWith('.html'));
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const found=[];
for(const w of [390,1440]){
  const ctx=await b.newContext({viewport:{width:w,height:1000}});
  const p=await ctx.newPage();
  for(const pg of PAGES){
    await p.goto('http://localhost:8802/'+pg,{waitUntil:'networkidle'});
    await p.evaluate(()=>{document.querySelectorAll('.rev').forEach(e=>e.classList.add('in','done'));
      document.querySelectorAll('.enter-veil').forEach(e=>e.remove());});
    await p.waitForTimeout(90);
    const r=await p.evaluate(()=>{
      const out=[];
      document.querySelectorAll('picture').forEach(pic=>{
        const par=pic.parentElement; if(!par)return;
        const d=getComputedStyle(par).display;
        if(d!=='grid'&&d!=='flex')return;
        // any rendered box that is not the img we expect
        [...pic.children].forEach(c=>{
          if(c.tagName==='IMG')return;
          const cs=getComputedStyle(c);
          if(cs.display!=='none') out.push(par.className.slice(0,28)+' > '+c.tagName+' display:'+cs.display);
        });
      });
      return [...new Set(out)];});
    r.forEach(x=>found.push(`${w} ${pg} ${x}`));
  }
  await ctx.close();
}
console.log(found.length? found.join('\n') : 'no <source> is contributing a box anywhere');
await b.close();
