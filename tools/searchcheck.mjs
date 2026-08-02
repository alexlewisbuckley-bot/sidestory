import { chromium } from 'playwright';

const W = +(process.env.PW || 390), H = +(process.env.PH || 844);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport:{width:W,height:H}, hasTouch:W<900, isMobile:W<900, deviceScaleFactor:2 });
let fails = 0; const ok = (n,v,extra) => { if(!v) fails++; console.log((v?'PASS ':'FAIL ')+n+(v?'':'  '+JSON.stringify(extra||''))); };

// below 360px the header drops Search and the phone menu carries it instead
async function openSearch(pg){
  const inHeader = await pg.locator('.util a[href="search.html"]').isVisible();
  if(inHeader){ await pg.click('.util a[href="search.html"]'); return; }
  await pg.click('.burger'); await pg.waitForTimeout(450);
  await pg.click('#menupanel a[href="search.html"]');
}

const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push(String(e)));
p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
await p.goto('http://localhost:8802/index.html', { waitUntil:'networkidle' });
console.log(`\n${W}×${H}`);

ok('index shipped', await p.evaluate(()=>Array.isArray(window.SS_IDX) && window.SS_IDX.length > 20));

// closed
let s = await p.evaluate(()=>{ const el=document.getElementById('srch'), cs=getComputedStyle(el);
  return { hidden:el.hasAttribute('hidden'), vis:cs.visibility }; });
ok('panel closed on load', s.hidden && s.vis==='hidden', s);

// header Search opens it in place, no navigation
const before = p.url();
await openSearch(p);
await p.waitForTimeout(600);
s = await p.evaluate(()=>{ const el=document.getElementById('srch'), r=el.getBoundingClientRect(),
    cs=getComputedStyle(el), nav=document.querySelector('.nav').getBoundingClientRect();
  return { url:location.pathname, open:el.classList.contains('open'), op:+cs.opacity,
    top:Math.round(r.top), navBottom:Math.round(nav.bottom), bottom:Math.round(r.bottom), vh:innerHeight,
    focus:document.activeElement.id, lock:document.documentElement.className.includes('overlay-open'),
    scrim:!document.getElementById('srchscrim').hidden,
    overflowY:cs.overflowY, z:cs.zIndex,
    xoverflow: document.documentElement.scrollWidth > innerWidth+1 }; });
console.log('  open ' + JSON.stringify(s));
ok('did not navigate', s.url === new URL(before).pathname, s.url);
ok('panel open and painted', s.open && s.op > 0.99, s);
ok('sits at the header edge', Math.abs(s.top - s.navBottom) <= 1, s);
ok('never past the viewport', s.bottom <= s.vh + 1, s);
ok('field takes focus', s.focus === 'srchq', s);
ok('page scroll locked', s.lock, s);
ok('no horizontal overflow', !s.xoverflow, s);

// nothing paints over it
const pierced = await p.evaluate(()=>{ const el=document.getElementById('srch'), r=el.getBoundingClientRect(), out=[];
  for(let i=1;i<=8;i++){ const y=r.top + r.height*i/9, x=innerWidth/2; const hit=document.elementFromPoint(x,y);
    if(hit && hit!==el && !el.contains(hit)) out.push(Math.round(y)+':'+hit.tagName+'.'+(hit.className||'')); }
  return out; });
ok('nothing paints over the panel', !pierced.length, pierced);

// idle state offers something
ok('idle suggestions shown', await p.evaluate(()=>!document.getElementById('srchidle').hidden
  && document.querySelectorAll('#srchidle .srchlist a').length >= 6));

// typing produces results, live
for (const [q, expect] of [['sunday','Sunday Service'],['hotel','Hotel Lobby'],['gift','Gifting'],
                           ['ship','Shipping'],['verde','Sunday Service'],['saffron','Sunday Service']]) {
  await p.fill('#srchq', q);
  await p.waitForTimeout(120);
  const r = await p.evaluate(()=>({
    shown: !document.getElementById('srchres').hidden,
    idle: !document.getElementById('srchidle').hidden,
    n: document.querySelectorAll('#srchres .srchlist a').length,
    titles: [...document.querySelectorAll('#srchres .srchlist a span:first-child')].map(x=>x.textContent),
    marks: document.querySelectorAll('#srchres mark').length,
    live: document.getElementById('srchsr').textContent,
    aria: document.getElementById('srchq').getAttribute('aria-expanded') }));
  ok(`"${q}" → ${expect}`, r.shown && !r.idle && r.titles.some(t=>t.includes(expect)) && r.aria==='true', r);
  if (q==='sunday') ok('matched run is marked', r.marks > 0, r);
  if (q==='sunday') ok('result count announced', /result/.test(r.live), r);
}

// a group heading may never appear twice in one result set
for (const q of ['stone','s','a','story','samples']) {
  await p.fill('#srchq', q); await p.waitForTimeout(120);
  const heads = await p.evaluate(()=>[...document.querySelectorAll('#srchres .mpfh')].map(x=>x.textContent));
  ok(`"${q}" groups each heading once`, new Set(heads).size === heads.length, heads);
}

// no results path
await p.fill('#srchq', 'zzzqqq');
await p.waitForTimeout(120);
ok('empty state offers a way out', await p.evaluate(()=>{
  const n=document.getElementById('srchnone');
  return !n.hidden && n.querySelectorAll('[data-srch-try]').length===3
    && document.getElementById('srchres').hidden; }));
await p.click('[data-srch-try="citrus"]');
await p.waitForTimeout(150);
ok('suggestion chip runs the search', await p.evaluate(()=>
  document.getElementById('srchq').value==='citrus'
  && !document.getElementById('srchres').hidden));

// clear returns to idle
await p.click('#srchclear');
await p.waitForTimeout(150);
ok('clear returns to the idle state', await p.evaluate(()=>
  document.getElementById('srchq').value===''
  && !document.getElementById('srchidle').hidden
  && document.getElementById('srchres').hidden));

// keyboard: down walks results, enter in the field takes the first
await p.fill('#srchq', 'hotel');
await p.waitForTimeout(120);
await p.keyboard.press('ArrowDown');
ok('ArrowDown enters the results', await p.evaluate(()=>
  document.activeElement.matches('#srchres .srchlist a')));
await p.keyboard.press('ArrowUp');
ok('ArrowUp returns to the field', await p.evaluate(()=>document.activeElement.id==='srchq'));

// escape closes, focus returns, scroll unlocks
await p.keyboard.press('Escape');
await p.waitForTimeout(550);
s = await p.evaluate(()=>({ open:document.getElementById('srch').classList.contains('open'),
  hidden:document.getElementById('srch').hasAttribute('hidden'),
  lock:document.documentElement.className.includes('overlay-open'),
  scrimHidden:document.getElementById('srchscrim').hidden,
  focus:document.activeElement.tagName+'.'+(document.activeElement.className||'') }));
console.log('  closed ' + JSON.stringify(s));
ok('Escape closes it', !s.open && s.hidden && !s.lock && s.scrimHidden, s);

// close button, scrim click
await openSearch(p); await p.waitForTimeout(550);
await p.click('#srchclose'); await p.waitForTimeout(500);
ok('Close button closes it', await p.evaluate(()=>!document.getElementById('srch').classList.contains('open')));

// following a result navigates and leaves nothing locked
await openSearch(p); await p.waitForTimeout(550);
await p.fill('#srchq', 'hotel'); await p.waitForTimeout(150);
await p.click('#srchres .srchlist a');
await p.waitForTimeout(800);
s = await p.evaluate(()=>({ url:location.pathname,
  lock:document.documentElement.className.includes('overlay-open') }));
ok('a result navigates', /product-hotel-lobby/.test(s.url), s);
ok('nothing left locked after navigating', !s.lock, s);

// the phone menu's Search opens the panel too
if (W < 1150) {
  await p.goto('http://localhost:8802/index.html', { waitUntil:'networkidle' });
  await p.click('.burger'); await p.waitForTimeout(450);
  await p.click('#menupanel a[href="search.html"]'); await p.waitForTimeout(600);
  ok("the menu's Search opens the panel", await p.evaluate(()=>
    document.getElementById('srch').classList.contains('open')
    && !document.getElementById('menupanel').classList.contains('open')
    && location.pathname.endsWith('/index.html')));
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
}

// the page still works on its own, and reads ?q=
const sp = await ctx.newPage();
await sp.goto('http://localhost:8802/search.html?q=incense', { waitUntil:'networkidle' });
await sp.waitForTimeout(300);
ok('search.html renders results from ?q=', await sp.evaluate(()=>{
  const r=document.getElementById('pagesearchres');
  return !r.hidden && r.querySelectorAll('.srchlist a').length>0
    && document.getElementById('pagesearchidle').hidden
    && document.querySelector('.searchbar input').value==='incense'; }));
await sp.fill('.searchbar input', 'road');
await sp.waitForTimeout(150);
ok('search.html filters as you type', await sp.evaluate(()=>
  [...document.querySelectorAll('#pagesearchres .srchlist a span:first-child')]
    .some(x=>x.textContent.includes('Road Trip'))));
ok('the header link on search.html still navigates normally', await sp.evaluate(()=>{
  const a=document.querySelector('a[href="search.html"]');
  const ev=new MouseEvent('click',{bubbles:true,cancelable:true});
  a.dispatchEvent(ev); return !ev.defaultPrevented; }));

if (errs.length) ok('no console errors', false, errs.slice(0,3));
await b.close();
console.log(fails ? `\n${fails} FAILURES` : '\nall search checks pass');
process.exit(fails?1:0);
