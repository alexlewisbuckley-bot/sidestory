import { chromium } from 'playwright';
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p = await b.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1.5});
await p.goto('http://localhost:8802/our-house.html',{waitUntil:'networkidle'});
const el = p.locator('#promise');
await el.scrollIntoViewIfNeeded();
await p.waitForTimeout(1200);
console.log(JSON.stringify(await p.evaluate(()=>{
  const s=document.getElementById('promise'); const i=s.querySelector('img');
  return {h:Math.round(s.getBoundingClientRect().height), src:i&&i.currentSrc, complete:i&&i.complete,
    nat:i&&i.naturalWidth, txt:s.querySelector('h2')?.textContent};
})));
await el.screenshot({path:'/tmp/promise.png'});
await b.close();
