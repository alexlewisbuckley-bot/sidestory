import { chromium } from 'playwright';
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p = await b.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1.5});
await p.goto('http://localhost:8802/contact.html',{waitUntil:'networkidle'});
await p.waitForTimeout(400);
await p.locator('.creach').scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
await p.locator('.creach').screenshot({path:'/tmp/reach.png'});
const m = await b.newPage({viewport:{width:390,height:780}});
await m.goto('http://localhost:8802/contact.html',{waitUntil:'networkidle'});
await m.waitForTimeout(300);
console.log(JSON.stringify(await m.evaluate(()=>({
  pic:getComputedStyle(document.querySelector('.cpic')).display,
  overflow:document.documentElement.scrollWidth>innerWidth,
  chips:getComputedStyle(document.querySelector('.chips .cr')).flexWrap,
  reach:getComputedStyle(document.querySelector('.creach')).gridTemplateColumns}))));
await b.close();
