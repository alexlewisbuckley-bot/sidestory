import {chromium} from 'playwright';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:1440,height:1000}});
const p=await ctx.newPage();
await p.goto('http://localhost:8801/collection.html',{waitUntil:'networkidle'});
const r=await p.evaluate(()=>{
  const out=[];
  const q=s=>[...document.querySelectorAll(s)];
  for(const sel of ['.shelfbar','.shelfbar .ctl','.shelfbar .lbl','.shelfbar .seg','.shelfbar .seg button','.shelfbar .chips','.shelfbar .chips button','.shelfcount']){
    q(sel).slice(0,3).forEach((e,i)=>{const b=e.getBoundingClientRect();const cs=getComputedStyle(e);
      out.push({sel:sel+'#'+i,top:+b.top.toFixed(1),h:+b.height.toFixed(1),
        mid:+(b.top+b.height/2).toFixed(1),fs:cs.fontSize,ls:cs.letterSpacing,
        op:cs.opacity,col:cs.color});});
  }
  return out;});
console.table(r); await b.close();
