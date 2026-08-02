import {chromium} from 'playwright';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const out=[];
const ok=(n,c)=>out.push((c?'PASS ':'FAIL ')+n);

// desktop: shelf filtering + size switching
let p=await (await b.newContext({viewport:{width:1440,height:1000}})).newPage();
await p.goto('http://localhost:8802/collection.html',{waitUntil:'networkidle'});
await p.click('.finline [data-filter="family"][data-value="citrus"]');
await p.waitForTimeout(300);
ok('scent filter hides cards', await p.evaluate(()=>[...document.querySelectorAll('.cards .card')].some(c=>c.hidden)));
ok('scent chip marks pressed', await p.evaluate(()=>document.querySelector('.finline [data-value="citrus"]').getAttribute('aria-pressed')==='true'));
ok('scent mark fills', await p.evaluate(()=>getComputedStyle(document.querySelector('.finline [data-value="citrus"]'),'::before').backgroundColor!=='rgba(0, 0, 0, 0)'));
ok('applied row lists it', await p.evaluate(()=>{const a=document.querySelector('[data-applied]');
  return !a.hidden && a.querySelectorAll('.achip').length===1}));
await p.click('.applied .clear'); await p.waitForTimeout(300);
ok('clear restores all', await p.evaluate(()=>[...document.querySelectorAll('.cards .card')].every(c=>!c.hidden)
  && document.querySelector('[data-applied]').hidden));
await p.click('.finline [data-filter="size"][data-value="7-5ml"]'); await p.waitForTimeout(400);
ok('size swaps price', await p.evaluate(()=>document.querySelector('.card .price').textContent.includes('40')));
ok('size marker moves', await p.evaluate(()=>getComputedStyle(document.querySelector('.finline [data-value="7-5ml"]'),'::after').opacity==='1'
  && getComputedStyle(document.querySelector('.finline [data-value="100ml"]'),'::after').opacity==='0'));
ok('size never hides a card', await p.evaluate(()=>[...document.querySelectorAll('.cards .card')].every(c=>!c.hidden)));
ok('size is a radio group', await p.evaluate(()=>{const b=document.querySelector('.finline [data-value="7-5ml"]');
  return b.getAttribute('role')==='radio' && b.getAttribute('aria-checked')==='true'
    && b.closest('[role="radiogroup"]')!==null
    && document.querySelector('.finline [data-value="100ml"]').tabIndex===-1}));
await p.focus('.finline [data-value="7-5ml"]');
await p.keyboard.press('ArrowRight'); await p.waitForTimeout(350);
ok('arrow keys move the size choice', await p.evaluate(()=>
  document.querySelector('.finline [data-value="sample"]').getAttribute('aria-checked')==='true'
  && document.activeElement.dataset.value==='sample'));
ok('no fill on selected size', await p.evaluate(()=>{const c=getComputedStyle(document.querySelector('.finline [data-value="sample"]')).backgroundColor;
  return c==='rgba(0, 0, 0, 0)'||c==='transparent'}));

// PDP
await p.goto('http://localhost:8802/product-hotel-lobby.html',{waitUntil:'networkidle'});
await p.click('.sizes button[data-size="sample"]'); await p.waitForTimeout(300);
ok('pdp size sets price', await p.evaluate(()=>document.querySelector('.cta .btn').textContent.includes('5')));
ok('pdp marker moves', await p.evaluate(()=>getComputedStyle(document.querySelector('.sizes button[data-size="sample"]'),'::after').opacity==='1'));
await p.click('.cta .btn');
await p.waitForFunction(()=>!document.getElementById('drawer').hidden,{timeout:5000}).catch(()=>{});
await p.waitForTimeout(200);
ok('add to bag increments', await p.evaluate(()=>document.getElementById('bagcount').textContent!=='0'));
ok('drawer opens as dialog', await p.evaluate(()=>{const d=document.getElementById('drawer');
  return !d.hidden && d.getAttribute('aria-modal')==='true' && document.documentElement.classList.contains('overlay-open')}));
await p.keyboard.press('Escape');
await p.waitForFunction(()=>document.getElementById('drawer').hidden,{timeout:5000}).catch(()=>{});
await p.waitForTimeout(150);
ok('escape closes and unlocks', await p.evaluate(()=>document.getElementById('drawer').hidden
  && !document.documentElement.classList.contains('overlay-open')));

// forms
await p.goto('http://localhost:8802/contact.html',{waitUntil:'networkidle'});
await p.evaluate(()=>document.querySelector('.form').requestSubmit());
await p.waitForTimeout(300);
ok('invalid form blocks + marks', await p.evaluate(()=>document.querySelectorAll('.field.invalid').length>0
  && document.querySelector('.formdone').hidden));
await p.evaluate(()=>{const f=document.querySelector('.form');
 f.querySelectorAll('input,textarea').forEach(el=>el.value=el.type==='email'?'a@b.com':'x'); f.requestSubmit();});
await p.waitForTimeout(400);
ok('valid form shows confirmation', await p.evaluate(()=>!document.querySelector('.formdone').hidden
  && document.querySelector('.form').hidden));

// mobile sheet + nav
const m=await (await b.newContext({viewport:{width:390,height:844},hasTouch:true})).newPage();
await m.goto('http://localhost:8802/collection.html',{waitUntil:'networkidle'});
ok('nav is one row', await m.evaluate(()=>{const i=document.querySelector('.nav .inner');
  const kids=[...i.children].filter(c=>getComputedStyle(c).display!=='none');
  const tops=new Set(kids.map(c=>Math.round(c.getBoundingClientRect().top/10)));return tops.size<=1}));
await m.click('.filterbtn'); await m.waitForTimeout(450);
ok('filter sheet opens', await m.evaluate(()=>!document.querySelector('.sheet').hidden
  && getComputedStyle(document.querySelector('.sheetscrim')).display!=='none'
  && document.querySelector('.filterbtn').getAttribute('aria-expanded')==='true'));
ok('sheet carries both groups', await m.evaluate(()=>
  document.querySelectorAll('.sheet .sgroup').length===2
  && document.querySelectorAll('.sheet [data-filter="size"]').length===3
  && document.querySelectorAll('.sheet [data-filter="family"]').length===7));
await m.click('.sheet [data-filter="family"][data-value="citrus"]'); await m.waitForTimeout(300);
ok('sheet row toggles tick', await m.evaluate(()=>
  document.querySelector('.sheet [data-value="citrus"]').getAttribute('aria-pressed')==='true'));
ok('the row and the sheet share one state', await m.evaluate(()=>
  document.querySelector('.finline [data-value="citrus"]').getAttribute('aria-pressed')==='true'));
ok('tally counts it', await m.evaluate(()=>{const t=document.querySelector('.filterbtn .tally');
  return !t.hidden && t.textContent==='1'}));
await m.click('.sheet [data-filter="size"][data-value="sample"]'); await m.waitForTimeout(400);
ok('size in the sheet is single-select', await m.evaluate(()=>
  document.querySelector('.sheet [data-value="sample"]').getAttribute('aria-checked')==='true'
  && document.querySelector('.sheet [data-value="100ml"]').getAttribute('aria-checked')==='false'));
ok('size does not raise the tally', await m.evaluate(()=>
  document.querySelector('.filterbtn .tally').textContent==='1'));
await m.keyboard.press('Escape'); await m.waitForTimeout(500);
ok('sheet closes on escape', await m.evaluate(()=>document.querySelector('.sheet').hidden
  && document.querySelector('.filterbtn').getAttribute('aria-expanded')==='false'
  && !document.documentElement.classList.contains('overlay-open')));
ok('applied row survives the sheet', await m.evaluate(()=>{const a=document.querySelector('[data-applied]');
  return !a.hidden && a.querySelectorAll('.achip').length===1}));
await m.click('.applied .achip'); await m.waitForTimeout(350);
ok('an applied chip removes its own filter', await m.evaluate(()=>
  document.querySelector('[data-applied]').hidden
  && [...document.querySelectorAll('.cards .card')].every(c=>!c.hidden)));
/* the phone menu is #menupanel now, not the desktop .links re-flowed —
   tools/menucheck.mjs is the thorough one, this is the smoke test */
await m.click('.burger'); await m.waitForTimeout(450);
ok('burger opens menu', await m.evaluate(()=>document.getElementById('menupanel').classList.contains('open')
  && document.documentElement.classList.contains('overlay-open')));
await m.click('.burger'); await m.waitForTimeout(500);
ok('burger closes menu', await m.evaluate(()=>!document.getElementById('menupanel').classList.contains('open')
  && !document.documentElement.classList.contains('overlay-open')
  && document.querySelector('.burger').getAttribute('aria-expanded')==='false'));

console.log(out.join('\n'));
console.log(out.filter(x=>x.startsWith('FAIL')).length?'\n*** FAILURES ***':'\nall interaction checks pass');
await b.close();
