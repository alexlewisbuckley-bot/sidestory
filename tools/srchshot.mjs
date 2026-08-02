import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
for (const [w,h,q] of [[390,844,''],[390,844,'incense'],[1440,900,''],[1440,900,'stone']]) {
  const ctx = await b.newContext({ viewport:{width:w,height:h}, deviceScaleFactor:2, hasTouch:w<900, isMobile:w<900 });
  const p = await ctx.newPage();
  await p.goto('http://localhost:8802/collection.html',{waitUntil:'networkidle'});
  const vis = await p.locator('.util a[href="search.html"]').isVisible();
  if(vis) await p.click('.util a[href="search.html"]');
  else { await p.click('.util a[href="search.html"]'); }
  await p.waitForTimeout(600);
  if(q){ await p.fill('#srchq', q); await p.waitForTimeout(250); }
  await p.screenshot({ path:`/tmp/srch-${w}-${q||'idle'}.png` });
  await ctx.close();
}
await b.close(); console.log('ok');
