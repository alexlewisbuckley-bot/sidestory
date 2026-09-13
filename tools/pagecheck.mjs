import { chromium } from 'playwright';
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const p = await b.newPage({viewport:{width:1280,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
const out={};
await p.goto('http://localhost:8802/shipping.html'); await p.waitForTimeout(250);
out.shipping = await p.evaluate(()=>({h1:document.querySelector('h1').textContent,
  rows:[...document.querySelectorAll('tbody tr')].map(r=>r.cells[0].textContent+' | '+r.cells[3].textContent),
  acc:[...document.querySelectorAll('.acc summary')].map(s=>s.textContent)}));
await p.goto('http://localhost:8802/stockists.html'); await p.waitForTimeout(250);
out.stockists = await p.evaluate(()=>({h1:document.querySelector('h1').textContent,
  tiles:[...document.querySelectorAll('.tile h3')].map(h=>h.textContent),
  pfoot:!!document.querySelector('.pfoot'),
  gapBeforeFooter:Math.round(document.querySelector('footer').getBoundingClientRect().top - document.querySelector('.pfoot').getBoundingClientRect().bottom)}));
await p.goto('http://localhost:8802/contact.html'); await p.waitForTimeout(250);
out.contact = await p.evaluate(()=>({h1:document.querySelector('h1').textContent,
  lede:document.querySelector('.lede').textContent,
  opts:[...document.querySelectorAll('select option')].map(o=>o.textContent),
  aside:document.querySelector('.aside-card').innerText.split('\n').filter(Boolean)}));
await p.goto('http://localhost:8802/legal.html'); await p.waitForTimeout(250);
out.legal = await p.evaluate(()=>({lede:!!document.querySelector('.phead .lede'),
  aside:!!document.querySelector('.artaside'),
  footerLinks:[...document.querySelectorAll('footer .legal a')].map(a=>a.textContent)}));
await p.goto('http://localhost:8802/product-hotel-lobby.html'); await p.waitForTimeout(250);
out.pdp = await p.evaluate(()=>document.querySelector('.acc .hint')?.textContent);
console.log(JSON.stringify(out,null,1),'errors:',errs.filter(e=>!/ERR_TUNNEL/.test(e)));
await b.close();
