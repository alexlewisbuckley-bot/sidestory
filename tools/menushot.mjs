import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const [w, h] of [[320,568],[390,844],[768,1024],[1150,800]]) {
  const ctx = await b.newContext({ viewport:{width:w,height:h}, deviceScaleFactor:2, hasTouch:true, isMobile:w<768 });
  const pg = await ctx.newPage();
  await pg.goto('http://localhost:8802/index.html', { waitUntil:'networkidle' });
  await pg.locator('.burger').tap();
  await pg.waitForTimeout(700);
  await pg.screenshot({ path: `/tmp/menu-${w}.png` });
  await ctx.close();
}
await b.close();
console.log('ok');
