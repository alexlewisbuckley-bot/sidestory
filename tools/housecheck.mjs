import { chromium } from 'playwright';
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const out={};
for (const [name,url] of [['ourstory','our-house.html'],['share','share.html']]){
  const p = await b.newPage({viewport:{width:1440,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('http://localhost:8802/'+url); await p.waitForTimeout(400);
  out[name]= await p.evaluate(()=>{
    const h=document.querySelector('.shero');
    const r=h.getBoundingClientRect();
    return {heroH:Math.round(r.height), heroTop:Math.round(r.top), heroBottom:Math.round(r.bottom)};
  });
  if(name==='ourstory'){
    out.credo = await p.evaluate(()=>{
      const li=[...document.querySelectorAll('.credo li')];
      const icons=li.map(l=>!!l.querySelector('.ci svg'));
      const cs=getComputedStyle(document.querySelector('.credo'));
      const last=li[li.length-1].getBoundingClientRect();
      const first=li[0].getBoundingClientRect();
      return {n:li.length, allIcons:icons.every(Boolean), cols:cs.gridTemplateColumns,
        iconColor:getComputedStyle(li[0].querySelector('.ci')).color,
        lastSpans:Math.round(last.width)>Math.round(first.width)+50,
        band:getComputedStyle(document.getElementById('credo')).backgroundColor};
    });
  }
  out[name].errors=errs.filter(e=>!/ERR_TUNNEL/.test(e));
  await p.close();
}
const p2=await b.newPage({viewport:{width:390,height:780}});
await p2.goto('http://localhost:8802/our-house.html'); await p2.waitForTimeout(300);
out.phone=await p2.evaluate(()=>({cols:getComputedStyle(document.querySelector('.credo')).gridTemplateColumns,
  overflow:document.documentElement.scrollWidth>innerWidth}));
console.log(JSON.stringify(out,null,1));
await b.close();
