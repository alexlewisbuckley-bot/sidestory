import { chromium } from 'playwright';
import fs from 'fs';

/* The sandbox Chromium has no H.264 decoder and cannot reach cdn.shopify.com,
   so the real file can be neither fetched nor played here. Both paths are
   still testable: route the request to a tiny local VP9 clip for the success
   path, and leave it unrouted for the failure path. */
const CLIP = fs.readFileSync(new URL('./fixtures-film.webm', import.meta.url));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
let fails=0; const ok=(n,v,x)=>{if(!v)fails++;console.log((v?'PASS ':'FAIL ')+n+(v?'':'  '+JSON.stringify(x||'')));};
const read = p => p.evaluate(()=>{const s=document.querySelector('.storyband');
  const i=s.querySelector('img'), v=s.querySelector('video');
  return { nofilm:s.classList.contains('nofilm'), hasfilm:s.classList.contains('hasfilm'),
    imgOp:+getComputedStyle(i).opacity, imgLoaded:i.complete&&i.naturalWidth>0,
    vidOp:v?+getComputedStyle(v).opacity:null, ready:v?v.classList.contains('ready'):null,
    playing:v?!v.paused:null, t:v?+v.currentTime.toFixed(1):null,
    z:v?getComputedStyle(v).zIndex:null, imgZ:getComputedStyle(i).zIndex,
    bandH:Math.round(s.getBoundingClientRect().height),
    quoteBottom:Math.round(s.querySelector('.c').getBoundingClientRect().bottom),
    bandBottom:Math.round(s.getBoundingClientRect().bottom) }; });

// ---- only Hotel Lobby carries a film ------------------------------------
for (const [slug, want] of [['hotel-lobby',1],['pillow-talk',1],['sunday-service',1],['road-trip',0],['third-date',0],['4pm-matinee',0]]) {
  const p = await (await b.newContext({viewport:{width:1440,height:900}})).newPage();
  await p.goto(`http://localhost:8802/product-${slug}.html`,{waitUntil:'domcontentloaded'});
  const n = await p.evaluate(()=>({v:document.querySelectorAll('.storyband video').length,
    f:document.querySelectorAll('.storyband.hasfilm').length}));
  ok(`${slug}: ${want} film`, n.v===want && n.f===want, n);
  await p.close();
}

// ---- the film plays: the photograph must never be seen -------------------
for (const SLUG of ['hotel-lobby','pillow-talk','sunday-service']) {
  const ctx = await b.newContext({viewport:{width:1440,height:900}});
  await ctx.route('**/*.mp4', r=>r.fulfill({status:200, contentType:'video/webm', body:CLIP}));
  const p = await ctx.newPage();
  const reqs=[]; p.on('request',r=>{ if(/\.mp4/.test(r.url())) reqs.push(1); });
  await p.goto(`http://localhost:8802/product-${SLUG}.html`,{waitUntil:'load'});
  const t0 = await read(p);
  ok(SLUG+': the still starts hidden under a film', t0.hasfilm && t0.imgOp===0, t0);
  ok(SLUG+': the film starts hidden too', t0.vidOp===0 || t0.ready, t0);
  ok(SLUG+': same depth as the still', t0.z===t0.imgZ, t0);
  await p.waitForTimeout(1800);
  const t1 = await read(p);
  console.log('  playing '+JSON.stringify(t1));
  ok(SLUG+': the film comes up', t1.ready && t1.vidOp===1 && t1.playing, t1);
  ok(SLUG+': the photograph is never revealed', !t1.nofilm && t1.imgOp===0, t1);
  await p.waitForTimeout(2200);
  const t2 = await read(p);
  ok(SLUG+': it loops rather than stopping', t2.playing, t2);
  ok(SLUG+': one request, not one per frame', reqs.length===1, reqs.length);
  await ctx.close();
}

// ---- the film cannot come: the photograph must take over -----------------
for (const SLUG of ['hotel-lobby','pillow-talk','sunday-service']) {
  const ctx = await b.newContext({viewport:{width:1440,height:900}});
  await ctx.route('**/*.mp4', r=>r.abort());
  const p = await ctx.newPage();
  await p.goto(`http://localhost:8802/product-${SLUG}.html`,{waitUntil:'load'});
  await p.waitForTimeout(2000);
  const s = await read(p);
  console.log('  failed  '+JSON.stringify(s));
  ok(SLUG+': a dead film falls back to the photograph', s.nofilm && s.imgOp===1 && s.imgLoaded, s);
  ok(SLUG+': the band is never a black rectangle', s.imgOp===1 || s.vidOp===1, s);
  await ctx.close();
}

// ---- reduced motion: no film at all, photograph immediately -------------
for (const SLUG of ['hotel-lobby','pillow-talk','sunday-service']) {
  const ctx = await b.newContext({viewport:{width:1440,height:900}, reducedMotion:'reduce'});
  const p = await ctx.newPage(); const reqs=[];
  p.on('request',r=>{ if(/\.mp4/.test(r.url())) reqs.push(r.url()); });
  await p.goto(`http://localhost:8802/product-${SLUG}.html`,{waitUntil:'load'});
  await p.evaluate(()=>document.querySelector('.storyband').scrollIntoView());
  await p.waitForTimeout(1200);
  ok(SLUG+' reduced motion: never requested', reqs.length===0, reqs);
  const s = await read(p);
  ok(SLUG+' reduced motion: the photograph, at once', s.imgOp===1, s);
  ok(SLUG+' reduced motion: no video box', await p.evaluate(()=>
    getComputedStyle(document.querySelector('.storyband video')).display==='none'));
  await ctx.close();
}

// ---- the taller band, on every product and every viewport ---------------
const WANT = {390:439, 768:532, 1440:468, 1920:562};
for (const [W,H] of [[390,844],[768,1024],[1440,900],[1920,1080]]) {
  const p = await (await b.newContext({viewport:{width:W,height:H}})).newPage();
  for (const slug of ['hotel-lobby','pillow-talk','sunday-service','road-trip']) {
    await p.goto(`http://localhost:8802/product-${slug}.html`,{waitUntil:'networkidle'});
    const s = await read(p);
    ok(`${W} ${slug}: band is ~${WANT[W]}px`, Math.abs(s.bandH-WANT[W])<=6, {got:s.bandH,want:WANT[W]});
    ok(`${W} ${slug}: the quote sits inside the band`, s.quoteBottom<=s.bandBottom+1, s);
  }
  ok(`${W}: no horizontal overflow`, await p.evaluate(()=>
    document.documentElement.scrollWidth<=innerWidth+1));
  await p.close();
}

await b.close();
console.log(fails?`\n${fails} FAILURES`:'\nall band checks pass');
process.exit(fails?1:0);
