import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const w of [320,340,360,375,390,414,430]) {
  const ctx = await b.newContext({ viewport:{width:w,height:740}, hasTouch:true, isMobile:true });
  const pg = await ctx.newPage();
  await pg.goto('http://localhost:8802/index.html', { waitUntil:'networkidle' });
  const r = await pg.evaluate(() => {
    const inner = document.querySelector('.nav .inner');
    const kids = [...inner.children].filter(k => getComputedStyle(k).display !== 'none');
    const ir = inner.getBoundingClientRect();
    const last = kids[kids.length-1].getBoundingClientRect();
    const brand = document.querySelector('.brand').getBoundingClientRect();
    const util = document.querySelector('.util').getBoundingClientRect();
    return { innerRight: Math.round(ir.right), lastRight: Math.round(last.right),
      overflow: Math.round(last.right - ir.right),
      brandRight: Math.round(brand.right), utilLeft: Math.round(util.left),
      collide: Math.round(brand.right - util.left) };
  });
  console.log(w, JSON.stringify(r));
  await ctx.close();
}
await b.close();
