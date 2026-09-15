import { chromium } from 'playwright';
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p = await b.newPage({viewport:{width:390,height:844}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
let bad=0;
for (const s of ['hotel-lobby','sunday-service','road-trip','pillow-talk','third-date','sibling-rivalry','4pm-matinee']){
  await p.goto('http://localhost:8802/product-'+s+'.html',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(150);
  const r = await p.evaluate(()=>({
    sizeline:!!document.querySelector('[data-sizeline]'),
    nine:document.body.innerText.includes('in nine pages'),
    story:(document.querySelector('.acc .body')?.innerText||'').slice(-40)}));
  if(r.sizeline||r.nine){bad++;console.log('FAIL',s,JSON.stringify(r));}
}
// the size picker must still work with the line gone
await p.goto('http://localhost:8802/product-hotel-lobby.html',{waitUntil:'domcontentloaded'});
await p.waitForTimeout(250);
await p.click('.sizes button[data-size="7-5ml"]');
await p.waitForTimeout(250);
const after = await p.evaluate(()=>document.querySelector('.pdp .cta .btn-ink').textContent.trim());
console.log(bad?bad+' PAGES STILL CARRY IT':'all seven PDPs clean', '| size switch ->', after,
  '| errors:', errs.filter(e=>!/ERR_TUNNEL/.test(e)));
await b.close();
