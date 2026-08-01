import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, hasTouch:true, isMobile:true });
const p = await ctx.newPage();
await p.goto('http://localhost:8802/collection.html',{waitUntil:'networkidle'});
await p.locator('.burger').tap(); await p.waitForTimeout(700);
await p.screenshot({ path:'/tmp/menu-current.png' });
await b.close(); console.log('ok');
