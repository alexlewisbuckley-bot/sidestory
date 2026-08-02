import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
for (const [w,h] of [[390,844],[1440,900]]) {
  const ctx = await b.newContext({ viewport:{width:w,height:h}, deviceScaleFactor:2, hasTouch:w<900, isMobile:w<900 });
  const p = await ctx.newPage();
  await p.goto('http://localhost:8802/index.html',{waitUntil:'networkidle'});
  await p.evaluate(()=>document.querySelector('.house').scrollIntoView({block:'center'}));
  await p.waitForTimeout(900);
  await p.locator('.house').screenshot({ path:`/tmp/house-${w}.png` });
  await ctx.close();
}
await b.close(); console.log('ok');
