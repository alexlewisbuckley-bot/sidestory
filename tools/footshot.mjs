import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
for (const [w,h] of [[390,844],[1440,900]]) {
  const ctx = await b.newContext({ viewport:{width:w,height:h}, deviceScaleFactor:2, hasTouch:w<900, isMobile:w<900 });
  const p = await ctx.newPage();
  await p.goto('http://localhost:8802/index.html',{waitUntil:'networkidle'});
  await p.evaluate(()=>document.querySelector('footer').scrollIntoView({block:'end'}));
  await p.waitForTimeout(800);
  const box = await p.evaluate(()=>{const r=document.querySelector('footer').getBoundingClientRect();
    return {y:Math.max(0,Math.round(r.top)), h:Math.round(Math.min(r.height, innerHeight-Math.max(0,r.top)))};});
  await p.screenshot({ path:`/tmp/foot-${w}.png`, clip:{x:0,y:box.y,width:w,height:box.h} });
  await ctx.close();
}
await b.close(); console.log('ok');
