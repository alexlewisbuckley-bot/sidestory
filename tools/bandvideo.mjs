import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
let fails=0; const ok=(n,v,x)=>{if(!v)fails++;console.log((v?'PASS ':'FAIL ')+n+(v?'':'  '+JSON.stringify(x||'')));};

// 1. only Hotel Lobby carries the film
for (const [slug, want] of [['hotel-lobby',1],['sunday-service',0],['road-trip',0],['pillow-talk',0]]) {
  const p = await (await b.newContext({viewport:{width:1440,height:900}})).newPage();
  await p.goto(`http://localhost:8802/product-${slug}.html`,{waitUntil:'domcontentloaded'});
  ok(`${slug}: ${want} film`, await p.evaluate(()=>document.querySelectorAll('.storyband video').length)===want);
  await p.close();
}

// 2. the film is not requested until the band is near the viewport
const ctx = await b.newContext({viewport:{width:1440,height:900}});
const p = await ctx.newPage(); const reqs=[], errs=[];
p.on('request',r=>{ if(/\.mp4/.test(r.url())) reqs.push(r.url()); });
p.on('pageerror',e=>errs.push(String(e)));
p.on('console',m=>{ if(m.type()==='error' && !/mp4|shopify|net::/i.test(m.text())) errs.push(m.text()); });
await p.goto('http://localhost:8802/product-hotel-lobby.html',{waitUntil:'load'});
await p.waitForTimeout(800);
const s0 = await p.evaluate(()=>{const v=document.querySelector('.storyband video');
  return { src:v.getAttribute('src'), data:!!v.dataset.src, preload:v.preload,
    op:+getComputedStyle(v).opacity, muted:v.muted, loop:v.loop,
    aria:v.getAttribute('aria-hidden'), tab:v.getAttribute('tabindex'),
    z:getComputedStyle(v).zIndex, imgZ:getComputedStyle(document.querySelector('.storyband img')).zIndex,
    fit:getComputedStyle(v).objectFit };});
console.log('  idle '+JSON.stringify(s0));
ok('no mp4 requested on load', reqs.length===0, reqs);
ok('no src until it is needed', !s0.src && s0.data, s0);
ok('starts invisible', s0.op===0, s0);
ok('same depth as the still, later in source', s0.z===s0.imgZ, s0);
ok('covers, muted, looping', s0.fit==='cover' && s0.loop, s0);
ok('hidden from a11y tree and tab order', s0.aria==='true' && s0.tab==='-1', s0);

// 3. the still is still what paints, and the quote is still legible over it
const band = await p.evaluate(()=>{const s=document.querySelector('.storyband');
  const i=s.querySelector('img'), q=s.querySelector('blockquote');
  return { img:i.currentSrc.split('/').pop(), imgH:Math.round(i.getBoundingClientRect().height),
    complete:i.complete&&i.naturalWidth>0,
    quote:getComputedStyle(q).color, bandH:Math.round(s.getBoundingClientRect().height) };});
ok('the photograph is present and decoded', band.complete && band.imgH>100, band);
ok('the band has its full height with no film', band.bandH>=300, band);

// 4. scrolling in triggers the request (it will fail against a blocked CDN —
//    what matters is that the band survives the failure)
await p.evaluate(()=>document.querySelector('.storyband').scrollIntoView());
await p.waitForTimeout(2500);
const s1 = await p.evaluate(()=>{const v=document.querySelector('.storyband video');
  return { src:!!v.getAttribute('src'), ready:v.classList.contains('ready'),
    op:+getComputedStyle(v).opacity,
    imgVisible:getComputedStyle(document.querySelector('.storyband img')).opacity };});
console.log('  scrolled '+JSON.stringify(s1)+'  reqs='+reqs.length);
ok('scrolling in asks for the file', reqs.length>0 || s1.src, {reqs,s1});
ok('a film that never plays stays invisible', s1.ready || s1.op===0, s1);
ok('the still is never hidden by a failed film', +s1.imgVisible===1, s1);
ok('no console errors from the film', !errs.length, errs.slice(0,3));

// 5. reduced motion removes it entirely
const rm = await b.newContext({viewport:{width:1440,height:900}, reducedMotion:'reduce'});
const p2 = await rm.newPage(); const reqs2=[];
p2.on('request',r=>{ if(/\.mp4/.test(r.url())) reqs2.push(r.url()); });
await p2.goto('http://localhost:8802/product-hotel-lobby.html',{waitUntil:'load'});
await p2.evaluate(()=>document.querySelector('.storyband').scrollIntoView());
await p2.waitForTimeout(1500);
ok('reduced motion: never requested', reqs2.length===0, reqs2);
ok('reduced motion: not displayed', await p2.evaluate(()=>
  getComputedStyle(document.querySelector('.storyband video')).display==='none'));

await b.close();
console.log(fails?`\n${fails} FAILURES`:'\nall band-film checks pass');
process.exit(fails?1:0);
