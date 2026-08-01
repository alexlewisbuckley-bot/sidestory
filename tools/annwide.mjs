import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
let fails=0;
for (const w of [2560, 1920, 1440, 390]) {
  const p = await (await b.newContext({viewport:{width:w,height:800}})).newPage();
  await p.goto('http://localhost:8802/index.html',{waitUntil:'networkidle'});
  await p.waitForTimeout(700);
  const s = await p.evaluate(()=>{
    const t=document.querySelector('[data-ann]'), g=t.querySelectorAll('.anngroup');
    const a=g[0].getBoundingClientRect().width, c=g[1].getBoundingClientRect().width;
    return { group:Math.round(a), equal:Math.abs(a-c)<1, vw:innerWidth,
      covers:a>=innerWidth-1, dur:getComputedStyle(t).animationDuration,
      spoken:[...g[0].querySelectorAll('.anni')].filter(x=>!x.closest('[aria-hidden="true"]')&&x.getAttribute('aria-hidden')!=='true').length };
  });
  const good = s.equal && s.covers && s.spoken===4;
  if(!good) fails++;
  console.log((good?'PASS ':'FAIL ')+w+'  '+JSON.stringify(s));
}
await b.close();
console.log(fails?`${fails} FAILURES`:'ok');
process.exit(fails?1:0);
