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
  ok(`${s}: excerpt is one or two paragraphs`, r.n>=1 && r.n<=2, r);
  ok(`${s}: excerpt is an opening, not the chapter`, r.words>=45 && r.words<=140, r);
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
// The story itself is real on six of the seven, so the excerpt must be clean
// on those and Latin on Sibling Rivalry. Everything that is not the story —
// notes, scent line, wear line, caption, stone note, author — is awaiting
// Alex's copy on all seven and must be visibly marked on all seven.
for (const s of SLUGS) {
  await p.goto(`http://localhost:8802/product-${s}.html`, { waitUntil:'domcontentloaded' });
  const r = await p.evaluate(()=>({
    excerptFiller: /FILLER|Lorem ipsum/i.test(document.querySelector('.excerpt').textContent),
    pageFiller: (document.querySelector('main').textContent.match(/FILLER/g)||[]).length,
    byline: /to be credited/.test(document.querySelector('.byline').textContent),
  }));
  ok(`${s}: story text ${s==='sibling-rivalry' ? 'is marked missing' : 'is the real story'}`,
     r.excerptFiller === (s === 'sibling-rivalry'), r);
  ok(`${s}: the copy still awaiting Alex is marked`, r.pageFiller >= 3 && r.byline, r);
}
// the story tab carries the supplied summary, not a template
const SUMMARY_OPENERS = {
  'hotel-lobby':'It was a ten minutes before 8pm', 'sunday-service':'As he slipped into the pew',
  'sibling-rivalry':'FILLER', 'third-date':'What did she like about him',
  'road-trip':'They knew where they were going', '4pm-matinee':'She came to the afternoon matinee alone',
  'pillow-talk':'Morning light spilled into the bedroom' };
for (const s of SLUGS) {
  await p.goto(`http://localhost:8802/product-${s}.html`, { waitUntil:'domcontentloaded' });
  const body = await p.evaluate(()=>{
    const d=[...document.querySelectorAll('details')].find(x=>/The story/.test(x.querySelector('summary').textContent));
    return d ? d.querySelector('.body').textContent.trim() : ''; });
  ok(`${s}: the story tab is its own summary`, body.startsWith(SUMMARY_OPENERS[s]), body.slice(0,60));
}
await b.close();
console.log(fails ? `\n${fails} FAILURES` : '\nall PDP story checks pass');
process.exit(fails?1:0);
