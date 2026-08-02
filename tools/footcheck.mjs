import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
let fails=0; const ok=(n,v,x)=>{ if(!v) fails++; console.log((v?'PASS ':'FAIL ')+n+(v?'':'  '+JSON.stringify(x||''))); };

// phone
const m = await (await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true})).newPage();
await m.goto('http://localhost:8802/index.html',{waitUntil:'networkidle'});
// the panel is laid out but hidden; open it so its rows can be measured
await m.click('.burger'); await m.waitForTimeout(500);
const s = await m.evaluate(()=>{
  const g=s=>{const e=document.querySelector(s); const c=getComputedStyle(e);
    const r=e.getBoundingClientRect();
    return {ff:c.fontFamily.split(',')[0].replace(/"/g,''), fs:parseFloat(c.fontSize),
      ls:c.letterSpacing, h:Math.round(r.height), w:Math.round(r.width), bb:c.borderBottomWidth};};
  return { foot:g('footer .cols a'), menu:g('.mplinks a'),
    footH:g('footer .cols a').h, menuH:g('.mplinks a').h,
    legal:g('.legal a'), locale:g('.locale'), fcopy:g('.fcopy'),
    legalCount:document.querySelectorAll('.legal a').length,
    middots:/·/.test(document.querySelector('.legal').textContent),
    legalNav:document.querySelector('.legal').tagName==='NAV'
      && !!document.querySelector('.legal').getAttribute('aria-label'),
    localeOwnLine: (()=>{ const a=document.querySelector('.legal').getBoundingClientRect();
      const l=document.querySelector('.locale').getBoundingClientRect();
      return l.top >= a.bottom-1; })(),
    legalTaps:[...document.querySelectorAll('.legal a')].map(a=>{const r=a.getBoundingClientRect();
      return {w:Math.round(r.width),h:Math.round(r.height)};}),
    docOverflowX: document.documentElement.scrollWidth > innerWidth+1 };
});
console.log(JSON.stringify(s,null,1));
ok('footer nav uses the menu font', s.foot.ff===s.menu.ff && s.foot.ff==='Montserrat', s);
ok('footer nav uses the menu size', Math.abs(s.foot.fs-s.menu.fs)<0.6, s);
ok('footer nav uses the menu row height', Math.abs(s.footH-s.menuH)<2, s);
ok('footer nav has the menu hairline', parseFloat(s.foot.bb)>0, s);
ok('three separate legal links', s.legalCount===3 && !s.middots, s);
ok('legal is a labelled nav', s.legalNav, s);
ok('legal is much smaller than the nav', s.legal.fs <= s.foot.fs*0.85, s);
ok('legal matches the smallest tier already in the footer', Math.abs(s.legal.fs-s.fcopy.fs)<0.6, s);
ok('the locale takes its own line', s.localeOwnLine, s);
ok('every legal link still clears 24px', s.legalTaps.every(t=>t.w>=24&&t.h>=24), s.legalTaps);
ok('no horizontal overflow', !s.docOverflowX, s);

// the wordmark's two lines start on the same vertical, and on the same one
// as everything else down the left edge of the footer
const brand = await m.evaluate(async ()=>{
  const img=document.querySelector('.fbrand img');
  const src=img.getAttribute('src');
  const txt=await (await fetch(src)).text();
  const el=new Image();
  await new Promise(r=>{ el.onload=r; el.src=URL.createObjectURL(new Blob([txt],{type:'image/svg+xml'})); });
  const W=849,H=190,c=document.createElement('canvas'); c.width=W;c.height=H;
  const g=c.getContext('2d'); g.drawImage(el,0,0,W,H);
  const d=g.getImageData(0,0,W,H).data, ink=(x,y)=>d[(y*W+x)*4+3]>40;
  const rows=[]; for(let y=0;y<H;y++){let n=0;for(let x=0;x<W;x++) if(ink(x,y))n++; rows.push(n);}
  let split=0; for(let y=Math.floor(H*0.4);y<H*0.85;y++) if(rows[y]===0){split=y;break;}
  const band=(a,z)=>{let min=W;for(let y=a;y<z;y++)for(let x=0;x<W;x++) if(ink(x,y)&&x<min){min=x;}return min;};
  return { src, top:band(0,split), bot:band(split,H),
    brandLeft:Math.round(document.querySelector('.fbrand').getBoundingClientRect().left),
    linkLeft:Math.round(document.querySelector('footer .cols a').getBoundingClientRect().left),
    copyLeft:Math.round(document.querySelector('.fcopy').getBoundingClientRect().left),
    legalLeft:Math.round(document.querySelector('.legal a').getBoundingClientRect().left) };
});
console.log(JSON.stringify(brand));
ok('the footer uses the left-aligned lockup', /logo-ivory-left/.test(brand.src), brand);
ok('both lines of the wordmark start together', Math.abs(brand.top-brand.bot)<=2, brand);
ok('the wordmark starts where the links do', brand.brandLeft===brand.linkLeft, brand);
ok('one left edge down the whole footer',
  new Set([brand.brandLeft,brand.linkLeft,brand.copyLeft,brand.legalLeft]).size===1, brand);

// desktop untouched in kind
const d = await (await b.newContext({viewport:{width:1440,height:900}})).newPage();
await d.goto('http://localhost:8802/index.html',{waitUntil:'networkidle'});
const ds = await d.evaluate(()=>{
  const c=getComputedStyle(document.querySelector('footer .cols a'));
  const l=getComputedStyle(document.querySelector('.legal a'));
  return { navFont:c.fontFamily.split(',')[0].replace(/"/g,''), navBorder:c.borderBottomWidth,
    legalFs:parseFloat(l.fontSize), legalCount:document.querySelectorAll('.legal a').length,
    localeInline:(()=>{const a=document.querySelector('.legal').getBoundingClientRect();
      const p=document.querySelector('.locale').getBoundingClientRect();
      return p.top < a.bottom-1;})() };
});
console.log(JSON.stringify(ds));
ok('desktop footer nav keeps the serif', ds.navFont==='Libre Caslon Text', ds);
ok('desktop footer nav keeps no rules', parseFloat(ds.navBorder)===0, ds);
ok('desktop legal is three links, small', ds.legalCount===3 && ds.legalFs<9, ds);
ok('desktop puts the locale beside them', ds.localeInline, ds);

// the desktop block is flush right, so the sub-line meets the right edge
const dbrand = await d.evaluate(async ()=>{
  const img=document.querySelector('.fbrand img');
  const src=img.currentSrc || img.src;
  const txt=await (await fetch(src)).text();
  const el=new Image();
  await new Promise(r=>{ el.onload=r; el.src=URL.createObjectURL(new Blob([txt],{type:'image/svg+xml'})); });
  const W=849,H=190,c=document.createElement('canvas'); c.width=W;c.height=H;
  const g=c.getContext('2d'); g.drawImage(el,0,0,W,H);
  const dd=g.getImageData(0,0,W,H).data, ink=(x,y)=>dd[(y*W+x)*4+3]>40;
  const rows=[]; for(let y=0;y<H;y++){let n=0;for(let x=0;x<W;x++) if(ink(x,y))n++; rows.push(n);}
  let split=0; for(let y=Math.floor(H*0.4);y<H*0.85;y++) if(rows[y]===0){split=y;break;}
  const right=(a,z)=>{let max=0;for(let y=a;y<z;y++)for(let x=W-1;x>=0;x--) if(ink(x,y)&&x>max){max=x;break;}return max;};
  return { src, top:right(0,split), bot:right(split,H),
    brandRight:Math.round(document.querySelector('.fbrand').getBoundingClientRect().right),
    innerRight:Math.round(document.querySelector('footer .cols').getBoundingClientRect().right) };
});
console.log(JSON.stringify(dbrand));
ok('desktop serves the right-aligned lockup', /logo-ivory-right/.test(dbrand.src), dbrand);
ok('both lines end together on desktop', Math.abs(dbrand.top-dbrand.bot)<=2, dbrand);
ok('the wordmark ends where the columns do', Math.abs(dbrand.brandRight-dbrand.innerRight)<=1, dbrand);

await b.close();
console.log(fails?`\n${fails} FAILURES`:'\nall footer checks pass');
process.exit(fails?1:0);
