import { chromium } from 'playwright';
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p = await b.newPage({viewport:{width:390,height:844}});
await p.goto('http://localhost:8802/product-hotel-lobby.html',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(300);
console.log(JSON.stringify(await p.evaluate(()=>{
  const det=[...document.querySelectorAll('.acc details')].find(d=>/Notes/i.test(d.querySelector('summary').textContent));
  det.open=true;
  const body=det.querySelector('.body');
  const kids=[...body.children].map(el=>({tag:el.tagName+(el.className?'.'+el.className:''),
    top:Math.round(el.getBoundingClientRect().top), bottom:Math.round(el.getBoundingClientRect().bottom),
    mt:getComputedStyle(el).marginTop, mb:getComputedStyle(el).marginBottom}));
  return kids;
}),null,1));
await b.close();
