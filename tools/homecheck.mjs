import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
let fails=0; const ok=(n,v,x)=>{if(!v)fails++;console.log((v?'PASS ':'FAIL ')+n+(v?'':'  '+JSON.stringify(x||'')));};
for (const W of [390, 1440]) {
  const ctx = await b.newContext({viewport:{width:W,height:900}, hasTouch:W<900, isMobile:W<900});
  const p = await ctx.newPage(); const errs=[];
  p.on('pageerror',e=>errs.push(String(e)));
  p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  await p.goto('http://localhost:8802/index.html',{waitUntil:'networkidle'});
  console.log('\n'+W);
  // the removed line was the .seven footnote; the drawer (shared chrome on
  // every page) legitimately states the threshold, so scope the check
  ok('no free-delivery foot line', await p.evaluate(()=>!document.querySelector('.seven .foot')
    && !/complimentary UK delivery/.test(document.querySelector('main').textContent)));
  ok('no gifting panel', await p.evaluate(()=>!document.getElementById('gifting') && !/Add a dedication/.test(document.body.textContent)));
  const g = await p.evaluate(()=>{const el=document.getElementById('set');if(!el)return null;
    const r=el.getBoundingClientRect(), img=el.querySelector('img'), btn=el.querySelector('button');
    return {w:Math.round(r.width), vw:innerWidth, img:img&&img.currentSrc.split('/').pop(),
      imgH:img&&Math.round(img.getBoundingClientRect().height),
      btn:btn&&btn.textContent.trim(), cta:el.querySelectorAll('.cta a,.cta button').length};});
  ok('discovery set panel present', !!g, g);
  ok('panel is full-bleed', g && Math.abs(g.w-g.vw)<=1, g);
  ok('set image loaded', g && /set-first-lines/.test(g.img) && g.imgH>100, g);
  ok('two CTAs', g && g.cta===2, g);
  // add to bag from the panel
  await p.click('#set .cta button'); await p.waitForTimeout(500);
  ok('set adds to bag', await p.evaluate(()=>+document.querySelector('.bagcount,[data-bagcount],.util .n')?.textContent.replace(/\D/g,'')>0)
     || await p.evaluate(()=>/1/.test(document.querySelector('.drawer,.bag')?.textContent||'')));
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  // by-style card
  const way = await p.evaluate(()=>{const a=[...document.querySelectorAll('.way')].find(x=>x.getAttribute('href')==='#styles');
    return a && {k:a.querySelector('.k').textContent, h:a.querySelector('h3').textContent, go:a.querySelector('.go').textContent};});
  ok('by-style card', way && way.k==='By style', way);
  ok('no private reading', await p.evaluate(()=>!/A private reading/.test(document.body.textContent)));
  ok('#styles target exists', await p.evaluate(()=>!!document.getElementById('styles')));
  await p.evaluate(()=>document.querySelector('.way[href="#styles"]').click());
  await p.waitForTimeout(900);
  const anch = await p.evaluate(()=>{const r=document.getElementById('styles').getBoundingClientRect();
    const nav=document.querySelector('.nav').getBoundingClientRect();
    return {top:Math.round(r.top), navH:Math.round(nav.height), hash:location.hash};});
  ok('anchor lands below the header', anch.hash==='#styles' && anch.top>=anch.navH-2 && anch.top<200, anch);
  ok('no horizontal overflow', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(errs.length) ok('no console errors', false, errs.slice(0,3));
  await ctx.close();
}
await b.close();
console.log(fails?`\n${fails} FAILURES`:'\nall homepage checks pass');
process.exit(fails?1:0);
