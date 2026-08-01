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

await b.close();
console.log(fails?`\n${fails} FAILURES`:'\nall footer checks pass');
process.exit(fails?1:0);
