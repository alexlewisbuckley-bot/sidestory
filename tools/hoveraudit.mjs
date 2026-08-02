import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await (await b.newContext({viewport:{width:1440,height:900}})).newPage();
const PAGES = {
  'index.html': ['.links a:not([data-mega])','.util a','.util .bagbtn','.brand',
    '.sig','.house .row a','.card','.card .price .ul','.promo .btn','.sty',
    '.way','.hero .dots button','.show .thumbs button','.styindex .sty',
    'footer .cols a','.legal a','.fbrand','.news .btn','.cred'],
  'collection.html': ['.crumb a','.finline .opts button','.filterbtn','.shelfbar [data-size]','.achip'],
  'product-hotel-lobby.html': ['.gal .strip button','.sizes button','.acc summary','.pyramid div','.stoneband .ul'],
  'stories.html': ['.scard','.ygrid a'],
  'journal.html': ['.jcard','article a'],
  'search.html': ['.tagrow a','.searchbar .btn'],
  'faq.html': ['.acc summary'],
};
const PROPS=['color','backgroundColor','borderColor','borderBottomColor','opacity','transform','backgroundSize','textDecorationColor','outlineColor','boxShadow','letterSpacing'];
const flat=[];
for (const [page, sels] of Object.entries(PAGES)) {
  await p.goto('http://localhost:8802/'+page,{waitUntil:'networkidle'});
  await p.evaluate(()=>document.querySelectorAll('.rev').forEach(e=>e.classList.add('in','done')));
  for (const sel of sels) {
    const el = p.locator(sel).first();
    if (!(await el.count())) { continue; }
    try { await el.scrollIntoViewIfNeeded(); } catch(e){ continue; }
    const before = await el.evaluate((e,PROPS)=>{const cs=getComputedStyle(e);
      const kid=e.querySelector('img,h3,.go,b,span,i');
      const kcs=kid?getComputedStyle(kid):null;
      return PROPS.map(k=>cs[k]).join('|')+'§'+(kcs?PROPS.map(k=>kcs[k]).join('|'):'');},PROPS);
    try { await el.hover({timeout:2000}); } catch(e){ continue; }
    await p.waitForTimeout(420);
    const after = await el.evaluate((e,PROPS)=>{const cs=getComputedStyle(e);
      const kid=e.querySelector('img,h3,.go,b,span,i');
      const kcs=kid?getComputedStyle(kid):null;
      return PROPS.map(k=>cs[k]).join('|')+'§'+(kcs?PROPS.map(k=>kcs[k]).join('|'):'');},PROPS);
    if (before===after) flat.push(page+'  '+sel);
    await p.mouse.move(10,850); await p.waitForTimeout(150);
  }
}
console.log(flat.length? 'FLAT:\n'+flat.join('\n') : 'no flat hovers');
await b.close();
