import {chromium} from 'playwright';
const W=+(process.env.PW||390);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p=await (await b.newContext({viewport:{width:W,height:844},isMobile:true,hasTouch:true})).newPage();
for(const pg of process.argv.slice(2)){
  await p.goto('http://localhost:8802/'+pg,{waitUntil:'networkidle'});
  await p.evaluate(()=>{document.querySelectorAll('.rev').forEach(e=>e.classList.add('in'));document.querySelectorAll('.enter-veil').forEach(e=>e.remove());});
  await p.waitForTimeout(120);
  const r=await p.evaluate(()=>{
    const main=document.querySelector('main')||document.body;
    return [...main.children].map(c=>{const b=c.getBoundingClientRect();const cs=getComputedStyle(c);
      return {sec:c.tagName.toLowerCase()+'.'+[...c.classList].filter(x=>x!=='rev').slice(0,2).join('.'),
        h:Math.round(b.height), screens:+(b.height/844).toFixed(1),
        pt:cs.paddingTop, pb:cs.paddingBottom, bg:cs.backgroundColor.replace(/\s/g,'')};});});
  console.log('###',pg, r.reduce((a,x)=>a+x.h,0)+'px');
  console.table(r);
}
await b.close();
