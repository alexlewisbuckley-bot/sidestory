import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
let fails=0; const ok=(n,v,x)=>{ if(!v) fails++; console.log((v?'PASS ':'FAIL ')+n+(v?'':'  '+JSON.stringify(x||''))); };
for (const w of [390,768,1440]) {
  const p = await (await b.newContext({viewport:{width:w,height:900},isMobile:w<900,hasTouch:w<900})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('http://localhost:8802/our-house.html',{waitUntil:'networkidle'});
  const s = await p.evaluate(()=>{
    const t=document.body.textContent;
    return { title:document.title, h1:document.querySelector('h1').textContent.trim(),
      h2s:[...document.querySelectorAll('h2')].map(x=>x.textContent.trim()),
      anchors:['making','stones','promise','perfumers'].filter(id=>document.getElementById(id)),
      imgs:[...document.querySelectorAll('main img')].map(i=>({src:i.getAttribute('src').split('/').pop().split('?')[0],
        alt:i.getAttribute('alt'), w:Math.round(i.getBoundingClientRect().width), h:Math.round(i.getBoundingClientRect().height)})),
      overflowX: document.documentElement.scrollWidth > innerWidth+1,
      oldCopy: /nine pages of fiction|We write the story first|commissioned novelists/.test(t),
      typo: /responsbility/.test(t),
      crumb: document.querySelector('.crumb').textContent.replace(/\s+/g,' ').trim(),
      signoff: (document.querySelector('.signoff')||{}).textContent,
      pull: (document.querySelector('.pull')||{}).textContent };
  });
  console.log('\n'+w, JSON.stringify({h1:s.h1.slice(0,50), h2s:s.h2s, anchors:s.anchors, crumb:s.crumb}));
  ok(w+' title is Our Story', /^Our Story ·/.test(s.title), s.title);
  ok(w+' every anchor the nav links to survives', s.anchors.length===4, s.anchors);
  ok(w+' no old copy left', !s.oldCopy);
  ok(w+' typo corrected', !s.typo);
  ok(w+' signature present', /Rana/.test(s.signoff||''));
  ok(w+' closing line present', /perfume for perfume/.test(s.pull||''));
  ok(w+' no horizontal overflow', !s.overflowX);
  ok(w+' every image has alt text', s.imgs.every(i=>i.alt&&i.alt.length>3), s.imgs.filter(i=>!i.alt||i.alt.length<=3));
  ok(w+' every image has a box', s.imgs.every(i=>i.w>0&&i.h>0), s.imgs.filter(i=>!i.w||!i.h));
  ok(w+' placeholders are obviously placeholders', s.imgs.filter(i=>/^ph-/.test(i.src)).length===3, s.imgs.map(i=>i.src));
  if(errs.length) ok(w+' no page errors', false, errs.slice(0,2));
  await p.context().close();
}
// the links that point at it from elsewhere
const p2 = await (await b.newContext({viewport:{width:1440,height:900}})).newPage();
await p2.goto('http://localhost:8802/index.html',{waitUntil:'networkidle'});
ok('nav says Our Story', await p2.evaluate(()=>[...document.querySelectorAll('.links a')].some(a=>a.textContent.trim()==='Our Story')));
ok('nothing anywhere still says Our House', await p2.evaluate(()=>!/Our House/.test(document.body.textContent)));
for (const frag of ['making','stones','promise','perfumers']) {
  await p2.goto('http://localhost:8802/our-house.html#'+frag,{waitUntil:'networkidle'});
  ok('#'+frag+' scrolls somewhere', await p2.evaluate(()=>scrollY>10||document.getElementById(location.hash.slice(1)).getBoundingClientRect().top<300));
}
await b.close();
console.log(fails?`\n${fails} FAILURES`:'\nall Our Story checks pass');
process.exit(fails?1:0);
