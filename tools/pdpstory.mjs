import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
let fails = 0; const ok = (n,v,x)=>{ if(!v) fails++; console.log((v?'PASS ':'FAIL ')+n+(v?'':'  '+JSON.stringify(x||''))); };
const SLUGS = ['hotel-lobby','sibling-rivalry','pillow-talk','sunday-service','third-date','road-trip','4pm-matinee'];
const p = await (await b.newContext({ viewport:{width:1440,height:900} })).newPage();
for (const s of SLUGS) {
  await p.goto(`http://localhost:8802/product-${s}.html`, { waitUntil:'domcontentloaded' });
  const r = await p.evaluate(()=>{
    const ex = document.querySelector('.excerpt');
    const links = [...document.querySelectorAll('a[href^="story"]')].map(a=>a.getAttribute('href'));
    return { n: ex.querySelectorAll('p').length,
      words: ex.textContent.trim().split(/\s+/).length,
      links: [...new Set(links)] };
  });
  ok(`${s}: excerpt is 2–3 paragraphs`, r.n>=2 && r.n<=3, r);
  ok(`${s}: excerpt is an opening, not the chapter`, r.words<=250, r);
  ok(`${s}: every story link is its own`, r.links.length>0 && r.links.every(h=>h===`story-${s}.html`), r.links);
}
// no page anywhere may use the query-string route, which nothing reads
for (const s of SLUGS.concat(['index','stories','collection'])) {
  const f = SLUGS.includes(s) ? `product-${s}` : s;
  await p.goto(`http://localhost:8802/${f}.html`, { waitUntil:'domcontentloaded' });
  ok(`${f}: no story.html?s= links`, await p.evaluate(()=>
    ![...document.querySelectorAll('a')].some(a=>/story\.html\?s=/.test(a.getAttribute('href')||''))));
}
// the destination is the right story
await p.goto('http://localhost:8802/product-road-trip.html', { waitUntil:'networkidle' });
await p.click('.chapter .go a'); await p.waitForTimeout(700);
ok('the CTA lands on that fragrance’s story', await p.evaluate(()=>
  location.pathname.endsWith('/story-road-trip.html') && /Road Trip/.test(document.title)));
await b.close();
console.log(fails ? `\n${fails} FAILURES` : '\nall PDP story checks pass');
process.exit(fails?1:0);
