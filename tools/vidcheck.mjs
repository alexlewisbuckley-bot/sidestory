import { chromium } from 'playwright';
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p = await b.newPage({viewport:{width:390,height:844}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
await p.goto('http://localhost:8802/index.html',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(600);
const r = await p.evaluate(()=>{
  const v=document.querySelector('.yfeat video');
  return {muted:v.muted, playsinline:v.hasAttribute('playsinline'),
    webkit:v.hasAttribute('webkit-playsinline'), pip:v.hasAttribute('disablepictureinpicture'),
    autoplay:v.autoplay, preload:v.preload, cls:v.className,
    imgBelow:!!document.querySelector('.yfeat > img')};
});
// the nudge must survive a gesture without throwing
await p.mouse.move(100,400); await p.mouse.down(); await p.mouse.up();
await p.evaluate(()=>window.scrollBy(0,200));
await p.waitForTimeout(300);
console.log(JSON.stringify(r), 'errors:', errs.filter(e=>!/ERR_TUNNEL/.test(e)));
await b.close();
