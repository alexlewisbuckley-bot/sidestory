import { chromium } from 'playwright';
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p = await b.newPage({viewport:{width:1440,height:1000}});
await p.goto('http://localhost:8802/contact.html',{waitUntil:'networkidle'});
await p.waitForTimeout(400);
console.log(JSON.stringify(await p.evaluate(()=>{
  const out=[];
  document.querySelectorAll('body *').forEach(el=>{
    const cs=getComputedStyle(el); const r=el.getBoundingClientRect();
    if((cs.position==='fixed'||cs.position==='absolute') && r.width>1000 && r.height>500
       && cs.display!=='none' && cs.visibility!=='hidden' && parseFloat(cs.opacity)>0.01){
      out.push({tag:el.tagName, cls:el.className, pos:cs.position, z:cs.zIndex,
        bg:cs.backgroundColor, op:cs.opacity, w:Math.round(r.width),h:Math.round(r.height),t:Math.round(r.top)});
    }
  });
  return out;
})), null, 1);
await b.close();
