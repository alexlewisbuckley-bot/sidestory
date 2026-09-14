import { chromium } from 'playwright';
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p = await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
await p.goto('http://localhost:8802/index.html',{waitUntil:'networkidle'});
await p.click('.burger'); await p.waitForTimeout(600);
await p.evaluate(()=>document.querySelector('.mputil').scrollIntoView({block:'end'}));
await p.waitForTimeout(300);
await p.screenshot({path:'/tmp/menu.png'});
console.log(JSON.stringify(await p.evaluate(()=>({
  overflowX:document.documentElement.scrollWidth>innerWidth,
  utilH:Math.round(document.querySelector('.mputil a').getBoundingClientRect().height),
  panelScroll:Math.round(document.querySelector('.menupanel').scrollHeight)}))));
// tablet
const t = await b.newPage({viewport:{width:820,height:900},deviceScaleFactor:1.5});
await t.goto('http://localhost:8802/index.html',{waitUntil:'networkidle'});
await t.click('.burger'); await t.waitForTimeout(600);
await t.screenshot({path:'/tmp/menu-tablet.png'});
await b.close();
