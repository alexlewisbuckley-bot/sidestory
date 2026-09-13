import { chromium } from 'playwright';
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p = await b.newPage({viewport:{width:1440,height:900},deviceScaleFactor:2});
await p.goto('http://localhost:8802/index.html',{waitUntil:'networkidle'});
await p.locator('#making').scrollIntoViewIfNeeded(); await p.waitForTimeout(600);
await p.locator('.unfold').screenshot({path:'/tmp/drawer-closed.png'});
await p.locator('.unfold summary').click(); await p.waitForTimeout(900);
await p.locator('.unfold').screenshot({path:'/tmp/drawer-open.png'});
console.log(JSON.stringify(await p.evaluate(()=>{
  const d=document.querySelector('.unfold');
  return {open:d.open, h:Math.round(d.getBoundingClientRect().height),
    label:d.querySelector('.less').textContent,
    paras:d.querySelectorAll('.dbody p').length,
    cols:getComputedStyle(d.querySelector('.dbody')).gridTemplateColumns};
})));
await b.close();
