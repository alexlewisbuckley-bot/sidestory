import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
let fails = 0; const ok = (n,v) => { if(!v) fails++; console.log((v?'PASS ':'FAIL ')+n); };

// desktop: mega still works, phone panel absent
const d = await (await b.newContext({ viewport:{width:1440,height:900} })).newPage();
await d.goto('http://localhost:8802/index.html',{waitUntil:'networkidle'});
ok('desktop links visible', await d.evaluate(()=>getComputedStyle(document.querySelector('.links')).display!=='none'));
ok('desktop burger hidden', await d.evaluate(()=>getComputedStyle(document.querySelector('.burger')).display==='none'));
ok('desktop menupanel not rendered', await d.evaluate(()=>getComputedStyle(document.getElementById('menupanel')).display==='none'));
await d.hover('.links a[data-mega]'); await d.waitForTimeout(500);
ok('mega opens on hover', await d.evaluate(()=>document.getElementById('mega').classList.contains('on')
  && +getComputedStyle(document.getElementById('menudim')).opacity>0.99));
await d.mouse.move(700, 700); await d.waitForTimeout(600);
ok('mega closes on leave', await d.evaluate(()=>!document.getElementById('mega').classList.contains('on')));

// phone: keyboard path
const m = await (await b.newContext({ viewport:{width:390,height:844}, hasTouch:true, isMobile:true })).newPage();
await m.goto('http://localhost:8802/index.html',{waitUntil:'networkidle'});
await m.focus('.burger');
await m.keyboard.press('Enter'); await m.waitForTimeout(450);
ok('Enter opens', await m.evaluate(()=>document.getElementById('menupanel').classList.contains('open')));
// tab wraps inside the panel
const trapped = await m.evaluate(async ()=>{
  const el=document.getElementById('menupanel');
  return el.contains(document.activeElement);
});
ok('focus starts inside panel', trapped);
for (let i=0;i<16;i++) await m.keyboard.press('Tab');
ok('focus still trapped after 16 tabs', await m.evaluate(()=>document.getElementById('menupanel').contains(document.activeElement)));
await m.keyboard.press('Escape'); await m.waitForTimeout(450);
ok('Escape closes + returns focus', await m.evaluate(()=>!document.getElementById('menupanel').classList.contains('open')
  && document.activeElement.classList.contains('burger')
  && !document.documentElement.classList.contains('overlay-open')));
await m.keyboard.press(' '); await m.waitForTimeout(450);
ok('Space opens', await m.evaluate(()=>document.getElementById('menupanel').classList.contains('open')));

// reduced motion
const rm = await (await b.newContext({ viewport:{width:390,height:844}, hasTouch:true, isMobile:true, reducedMotion:'reduce' })).newPage();
await rm.goto('http://localhost:8802/index.html',{waitUntil:'networkidle'});
await rm.click('.burger'); await rm.waitForTimeout(200);
ok('reduced motion opens immediately', await rm.evaluate(()=>{
  const el=document.getElementById('menupanel');
  return getComputedStyle(el).visibility==='visible' && +getComputedStyle(el).opacity>0.99
    && [...el.querySelectorAll('.mplinks a')].every(a=>+getComputedStyle(a).opacity>0.99);
}));

await b.close();
console.log(fails?`\n${fails} FAILURES`:'\nall desktop + keyboard checks pass');
process.exit(fails?1:0);
