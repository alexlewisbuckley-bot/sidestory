import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
for (const [w,h] of [[390,844],[1440,900]]) {
  const p = await (await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:1,isMobile:w<900,hasTouch:w<900})).newPage();
  await p.goto('http://localhost:8802/our-house.html',{waitUntil:'networkidle'});
  await p.evaluate(async()=>{ for(let y=0;y<document.body.scrollHeight;y+=400){ scrollTo(0,y); await new Promise(r=>setTimeout(r,60)); } scrollTo(0,0); });
  await p.waitForTimeout(900);
  await p.screenshot({ path:`/tmp/os-${w}.png`, fullPage:true });
  await p.context().close();
}
await b.close(); console.log('ok');
