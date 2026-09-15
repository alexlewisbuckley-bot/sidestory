import { chromium } from 'playwright';
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p = await b.newPage({viewport:{width:1440,height:900},deviceScaleFactor:2});
await p.goto('http://localhost:8802/our-house.html',{waitUntil:'networkidle'});
await p.locator('#credo').scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
console.log('credo items:', await p.evaluate(()=>document.querySelectorAll('.credo li').length),
  '| icons:', await p.evaluate(()=>document.querySelectorAll('.credo .ci svg').length),
  '| cols:', await p.evaluate(()=>getComputedStyle(document.querySelector('.credo')).gridTemplateColumns));
await p.locator('#credo').screenshot({path:'/tmp/credo.png'});
await p.goto('http://localhost:8802/product-sibling-rivalry.html',{waitUntil:'networkidle'});
await p.waitForTimeout(300);
console.log(JSON.stringify(await p.evaluate(()=>{
  const det=[...document.querySelectorAll('.acc details')].find(d=>/Notes/i.test(d.querySelector('summary').textContent));
  det.open=true;
  return {sub:document.querySelector('.pdp .sub').innerText,
    notes:[...det.querySelectorAll('.notelist p')].map(x=>x.innerText.replace('\n',' ')),
    hint:det.querySelector('.hint').innerText};
})));
await b.close();
