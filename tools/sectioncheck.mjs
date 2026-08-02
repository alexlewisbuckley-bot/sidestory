import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
let fails=0; const ok=(n,v,x)=>{if(!v)fails++;console.log((v?'PASS ':'FAIL ')+n+(v?'':'  '+JSON.stringify(x||'')));};
for (const W of [390, 768, 1024, 1440, 1920]) {
  const ctx = await b.newContext({viewport:{width:W,height:900}, hasTouch:W<900, isMobile:W<900});
  const p = await ctx.newPage(); const errs=[];
  p.on('pageerror',e=>errs.push(String(e))); p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  await p.goto('http://localhost:8802/index.html',{waitUntil:'networkidle'});
  await p.evaluate(()=>document.querySelectorAll('.rev').forEach(e=>e.classList.add('in')));
  await p.waitForTimeout(1400);
  console.log('\n'+W);
  // the style index: seven ruled rows, generated from the style data
  const f = await p.evaluate(()=>{
    const rows=[...document.querySelectorAll('.sty')];
    const r=el=>el.getBoundingClientRect();
    return { n:rows.length,
      first: rows[0]&&{ name:rows[0].querySelector('.styname').textContent.trim(),
        who:rows[0].querySelector('.stywho').textContent.trim(),
        count:rows[0].querySelector('.stycount').textContent.trim(),
        chips:rows[0].querySelectorAll('.stychips i').length,
        href:rows[0].getAttribute('href') },
      heights: rows.map(x=>Math.round(r(x).height)),
      overlap: rows.some((x,i)=>i&&r(x).top<r(rows[i-1]).bottom-1),
      clipped: rows.some(x=>x.scrollWidth>x.clientWidth+1) };
  });
  console.log('  sty '+JSON.stringify(f));
  ok('seven styles', f.n===7, f);
  ok('Woods leads with its four', f.first && f.first.name==='Woods'
     && /4 stories/i.test(f.first.count) && f.first.chips===4
     && f.first.href==='collection.html?scent=woods', f.first);
  ok('member names present', f.first && /Hotel Lobby/.test(f.first.who), f.first);
  ok('rows do not overlap', !f.overlap, f);
  ok('no row clips', !f.clipped, f);
  ok('rows are thumb-height on touch', W>=900 || f.heights.every(h=>h>=44), f.heights);

  const c = await p.evaluate(()=>{const qs=[...document.querySelectorAll('.cred')];
    return {n:qs.length,
      capBottoms:[...new Set(qs.map(q=>Math.round(q.querySelector('figcaption').getBoundingClientRect().bottom)))],
      tops:[...new Set(qs.map(q=>Math.round(q.getBoundingClientRect().top)))],
      marks:qs.filter(q=>getComputedStyle(q.querySelector('blockquote'),'::before').content!=='none').length,
      foot:!!document.querySelector('.creds .credfoot'),
      lines:qs.map(q=>Math.round(q.querySelector('blockquote').getBoundingClientRect().height))};});
  console.log('  cred '+JSON.stringify(c));
  ok('three quotes', c.n===3, c);
  ok('quote marks render', c.marks===3, c);
  ok('attributions bottom-align per row', c.capBottoms.length===c.tops.length, c);
  ok('stockist demoted to a footline', c.foot, c);
  ok('no horizontal overflow', await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(errs.length) ok('no console errors', false, errs.slice(0,3));
  await ctx.close();
}
await b.close();
console.log(fails?`\n${fails} FAILURES`:'\nall section checks pass');
process.exit(fails?1:0);
