import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
const p = await (await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true})).newPage();
await p.goto('http://localhost:8802/index.html',{waitUntil:'networkidle'});
await p.evaluate(()=>document.querySelector('.fmid').scrollIntoView({block:'center'}));
await p.waitForTimeout(600);
await p.locator('.fmid').screenshot({ path:'/tmp/foot-brand.png' });
await b.close(); console.log('ok');
