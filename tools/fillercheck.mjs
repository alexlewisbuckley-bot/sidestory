import { chromium } from 'playwright';
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p = await b.newPage({viewport:{width:1280,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
const slugs=['hotel-lobby','sunday-service','sibling-rivalry','third-date','road-trip','4pm-matinee','pillow-talk'];
let bad=[];
for (const s of slugs){
  for (const kind of ['product','story']){
    await p.goto(`http://localhost:8802/${kind}-${s}.html`,{waitUntil:'domcontentloaded'});
    await p.waitForTimeout(120);
    const r = await p.evaluate(()=>{
      const t=document.body.innerText;
      const empties=[...document.querySelectorAll('figcaption,.scent,.byline,.marginnote,.nrow span,.notelist span,.stoneband p')]
        .filter(e=>!e.textContent.trim()).length;
      return {filler:/FILLER|to be credited|to come/.test(t), empties,
        overflow:document.documentElement.scrollWidth>innerWidth+1};
    });
    if(r.filler||r.empties||r.overflow) bad.push(`${kind}-${s} ${JSON.stringify(r)}`);
  }
}
await p.goto('http://localhost:8802/account.html',{waitUntil:'domcontentloaded'});
const acct = await p.evaluate(()=>/FILLER|sample data/.test(document.body.innerText));
console.log(bad.length?('ISSUES:\n'+bad.join('\n')):'14 product + story pages clean, no empty blocks',
  '| account filler:', acct, '| errors:', errs.filter(e=>!/ERR_TUNNEL/.test(e)));
await b.close();
