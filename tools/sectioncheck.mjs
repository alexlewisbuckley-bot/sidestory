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
  const f = await p.evaluate(()=>{const cs=[...document.querySelectorAll('.feel')];
    const r=c=>c.getBoundingClientRect();
    const rows={}; cs.forEach(c=>{const t=Math.round(r(c).top); rows[t]=(rows[t]||0)+1;});
    return {n:cs.length, rows:Object.values(rows),
      first:cs[0]&&{name:cs[0].querySelector('.fn').textContent.trim(),
        chipTop:Math.round(cs[0].querySelector('.chip').getBoundingClientRect().top),
        nameTop:Math.round(cs[0].querySelector('.fn').getBoundingClientRect().top),
        h3:cs[0].querySelector('h3').textContent.trim(),
        ft:cs[0].querySelector('.ft').textContent.trim()},
      // do all cards in a row share a bottom?
      ftBottoms:[...new Set(cs.map(c=>Math.round(c.querySelector('.ft').getBoundingClientRect().bottom)))].length,
      wideLast: cs.length>1 && Math.abs(r(cs[cs.length-1]).width - r(cs[0]).width*2 - 8) < 24,
      heights: Object.values(cs.reduce((a,c)=>{const t=Math.round(r(c).top);
        (a[t]=a[t]||new Set()).add(Math.round(r(c).height)); return a;},{})).map(s=>s.size),
      clipped:cs.some(c=>c.scrollWidth>c.clientWidth+1||c.scrollHeight>c.clientHeight+1)};});
  console.log('  feel '+JSON.stringify(f));
  ok('all seven styles', f.n===7, f);
  ok('name sits on the chip line', f.first && Math.abs(f.first.chipTop-f.first.nameTop)<14, f.first);
  ok('name is first in the card', f.first && /HOTEL LOBBY/i.test(f.first.name), f.first);
  ok('no card clips its content', !f.clipped, f);
  if (W>=1150) ok('seven across on wide', f.rows.length===1 && f.rows[0]===7, f.rows);
  ok('no half-empty orphan row', f.rows.length===1 || f.rows[f.rows.length-1]>1 || f.wideLast, f);
  ok('cards in a row share a height', f.heights.every(h=>h===1), f.heights);

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
