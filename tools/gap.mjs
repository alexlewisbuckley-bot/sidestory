import {chromium} from 'playwright';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:1440,height:1000}});
const p=await ctx.newPage();
for(const url of process.argv.slice(2)){
  await p.goto('http://localhost:8801/'+url,{waitUntil:'networkidle'});
  const r=await p.evaluate(()=>{
    const out=[];const walk=(el,d)=>{ if(d>3)return;
      for(const c of el.children){const b=c.getBoundingClientRect();
        if(b.height<1)continue;
        out.push({d,tag:c.tagName.toLowerCase()+'.'+[...c.classList].slice(0,2).join('.'),
          top:Math.round(b.top),h:Math.round(b.height),
          pt:getComputedStyle(c).paddingTop,mt:getComputedStyle(c).marginTop});
        walk(c,d+1);}};
    walk(document.querySelector('main')||document.body,0);
    return out.slice(0,16);});
  console.log('###',url); console.table(r);
}
await b.close();
