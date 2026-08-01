import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium' });
let fails=0; const ok=(n,v)=>{ if(!v) fails++; console.log((v?'PASS ':'FAIL ')+n); };
const ctx = await b.newContext({ viewport:{width:390,height:844}, hasTouch:true, isMobile:true });

// scent sheet, opened by touch
const p = await ctx.newPage();
await p.goto('http://localhost:8802/collection-7-5ml.html',{waitUntil:'networkidle'});
await p.locator('.shelfbar .disclose').tap(); await p.waitForTimeout(500);
let s = await p.evaluate(()=>{ const a=document.activeElement, cs=getComputedStyle(a);
  return { cls:a.className||a.tagName, isSheet:a.matches('.sheet'), ring:cs.outlineStyle!=='none'||cs.boxShadow!=='none',
    labelled:!!a.getAttribute('aria-labelledby') };});
console.log('  sheet ' + JSON.stringify(s));
ok('sheet focuses the dialog itself', s.isSheet);
ok('no ring on the touch-opened sheet', !s.ring);
ok('dialog is labelled for the screen reader', s.labelled);
// keyboard user still gets a ring on the first control
await p.keyboard.press('Tab'); await p.waitForTimeout(120);
s = await p.evaluate(()=>{ const a=document.activeElement, cs=getComputedStyle(a);
  return { cls:a.className||a.tagName, fv:a.matches(':focus-visible'), ring:cs.outlineStyle!=='none' };});
console.log('  after Tab ' + JSON.stringify(s));
ok('Tab moves into the sheet with a visible ring', s.fv && s.ring);
// shift-tab from the container wraps to the last control rather than escaping
await p.keyboard.press('Escape'); await p.waitForTimeout(450);
await p.locator('.shelfbar .disclose').tap(); await p.waitForTimeout(500);
await p.keyboard.press('Shift+Tab'); await p.waitForTimeout(120);
ok('Shift+Tab from the dialog stays inside it',
  await p.evaluate(()=>document.querySelector('.sheet').contains(document.activeElement)));
await p.keyboard.press('Escape'); await p.waitForTimeout(400);

// phone menu
const m = await ctx.newPage();
await m.goto('http://localhost:8802/index.html',{waitUntil:'networkidle'});
await m.locator('.burger').tap(); await m.waitForTimeout(500);
s = await m.evaluate(()=>{ const a=document.activeElement, cs=getComputedStyle(a);
  return { isPanel:a.id==='menupanel', ring:cs.outlineStyle!=='none'||cs.boxShadow!=='none' };});
console.log('  menu ' + JSON.stringify(s));
ok('menu focuses the panel itself', s.isPanel);
ok('no ring on the touch-opened menu', !s.ring);
await m.keyboard.press('Tab'); await m.waitForTimeout(120);
ok('Tab into the menu shows a ring', await m.evaluate(()=>document.activeElement.matches(':focus-visible')));

// bag drawer
const d = await ctx.newPage();
await d.goto('http://localhost:8802/product-hotel-lobby.html',{waitUntil:'networkidle'});
await d.locator('.pdp .cta .btn-ink').tap(); await d.waitForTimeout(900);
s = await d.evaluate(()=>{ const a=document.activeElement, cs=getComputedStyle(a);
  return { isDrawer:a.id==='drawer', ring:cs.outlineStyle!=='none'||cs.boxShadow!=='none' };});
console.log('  drawer ' + JSON.stringify(s));
ok('drawer focuses the dialog itself', s.isDrawer);
ok('no ring on the touch-opened drawer', !s.ring);

await b.close();
console.log(fails?`\n${fails} FAILURES`:'\nall focus-ring checks pass');
process.exit(fails?1:0);
