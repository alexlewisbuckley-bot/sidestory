import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
for (const [w,h] of [[390,844],[1440,900]]) {
  const ctx = await b.newContext({ viewport:{width:w,height:h}, deviceScaleFactor:2, hasTouch:w<900, isMobile:w<900 });
  const p = await ctx.newPage();
  await p.goto('http://localhost:8802/index.html',{waitUntil:'networkidle'});
  await p.waitForTimeout(900);
  await p.screenshot({ path:`/tmp/ann-${w}.png`, clip:{x:0,y:0,width:w,height:Math.min(200,h)} });
  await ctx.close();
}
// the bag threshold
const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, hasTouch:true, isMobile:true });
const p = await ctx.newPage();
await p.goto('http://localhost:8802/product-hotel-lobby.html',{waitUntil:'networkidle'});
await p.click('.pdp .cta .btn-ink'); await p.waitForTimeout(1000);
await p.screenshot({ path:'/tmp/ann-drawer.png' });
await b.close(); console.log('ok');
