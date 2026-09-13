import { chromium } from 'playwright';
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p = await b.newPage({viewport:{width:1280,height:900}});
const out={};
for (const page of ['shipping','stockists','contact','legal','account']){
  await p.goto('http://localhost:8802/'+page+'.html',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(200);
  out[page]=await p.evaluate(()=>{
    const m=document.querySelector('main'); const f=document.querySelector('footer');
    const last=m.querySelector('.inner')?.lastElementChild;
    return {gap:Math.round(f.getBoundingClientRect().top-(last?last.getBoundingClientRect().bottom:m.getBoundingClientRect().bottom)),
      last:last?last.className||last.tagName:'?'};
  });
}
await p.goto('http://localhost:8802/index.html',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(300);
out.press=await p.evaluate(()=>[...document.querySelectorAll('.cred figcaption img')].map(i=>({
  cls:i.className, h:getComputedStyle(i).height, alt:i.alt, src:i.getAttribute('src').split('/').pop().split('?')[0]})));
console.log(JSON.stringify(out,null,1));
await b.close();
