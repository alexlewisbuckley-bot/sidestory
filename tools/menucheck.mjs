import { chromium } from 'playwright';

const W = +(process.env.PW || 390), H = +(process.env.PH || 844);
const PAGES = (process.env.PAGES || 'index.html,collection.html,product-hotel-lobby.html,stories.html,checkout.html').split(',');
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
let fails = 0;
const bad = (m) => { fails++; console.log('  ✗ ' + m); };

for (const p of PAGES) {
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e)));
  pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.goto('http://localhost:8802/' + p, { waitUntil: 'networkidle' });
  console.log('\n' + p + '  ' + W + '×' + H);

  const burger = pg.locator('.burger');
  if (!(await burger.isVisible())) { bad('burger not visible'); await pg.close(); continue; }

  // closed state
  let s = await pg.evaluate(() => {
    const el = document.getElementById('menupanel'), cs = getComputedStyle(el);
    return { hidden: el.hasAttribute('hidden'), vis: cs.visibility, op: cs.opacity, lock: document.documentElement.className.includes('overlay-open') };
  });
  if (!s.hidden || s.vis !== 'hidden' || s.lock) bad('closed state wrong: ' + JSON.stringify(s));

  // open
  await burger.tap();
  await pg.waitForTimeout(450);
  s = await pg.evaluate(() => {
    const el = document.getElementById('menupanel'), r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    const nav = document.querySelector('.nav').getBoundingClientRect();
    const mega = document.getElementById('mega');
    const links = [...el.querySelectorAll('a')];
    const small = links.filter(a => { const b = a.getBoundingClientRect(); return b.height < 24 || b.width < 24; }).map(a => a.textContent.trim() + ' ' + Math.round(a.getBoundingClientRect().height));
    return {
      open: el.classList.contains('open'), vis: cs.visibility, op: +cs.opacity,
      top: Math.round(r.top), bottom: Math.round(r.bottom), navBottom: Math.round(nav.bottom),
      vh: innerHeight, scrollH: el.scrollHeight, clientH: el.clientHeight,
      overflowY: cs.overflowY, z: cs.zIndex,
      aria: document.querySelector('.burger').getAttribute('aria-expanded'),
      lock: document.documentElement.className.includes('overlay-open'),
      megaOn: mega ? (mega.classList.contains('on') || getComputedStyle(mega).visibility === 'visible') : false,
      megaDisplay: mega ? getComputedStyle(mega).display : 'none',
      linkCount: links.length, small,
      docOverflowX: document.documentElement.scrollWidth > innerWidth + 1,
      focus: document.activeElement ? (document.activeElement.className || document.activeElement.tagName) : null,
      focusInPanel: el.contains(document.activeElement)
    };
  });
  console.log('  open: ' + JSON.stringify(s));
  if (!s.open || s.vis !== 'visible' || s.op < 0.99) bad('did not open cleanly');
  if (s.aria !== 'true') bad('aria-expanded not true');
  if (!s.lock) bad('page not scroll-locked');
  if (s.megaOn || s.megaDisplay !== 'none') bad('MEGA MENU visible on phone');
  if (Math.abs(s.top - s.navBottom) > 1) bad('panel top ' + s.top + ' != nav bottom ' + s.navBottom);
  if (s.bottom > s.vh + 1) bad('panel runs past the viewport (' + s.bottom + ' > ' + s.vh + ')');
  if (s.scrollH > s.clientH && s.overflowY !== 'auto' && s.overflowY !== 'scroll') bad('taller than its box with no scroller');
  if (s.small.length) bad('tap targets under 24px: ' + JSON.stringify(s.small));
  if (s.docOverflowX) bad('horizontal overflow while open');
  if (!s.focusInPanel) bad('focus not moved into the panel (was ' + s.focus + ')');

  // nothing may paint through the open panel — a sticky bar lower down the
  // document at the same z-index will happily win the tie and draw over it
  const pierced = await pg.evaluate(() => {
    const el = document.getElementById('menupanel'), r = el.getBoundingClientRect(), out = [];
    for (let i = 1; i <= 9; i++) {
      const y = r.top + (r.height * i / 10), x = innerWidth / 2;
      const hit = document.elementFromPoint(x, y);
      if (hit && !el.contains(hit) && hit !== el) {
        out.push(Math.round(y) + ':' + hit.tagName + '.' + (hit.className || '').toString().slice(0, 30));
      }
    }
    return out;
  });
  if (pierced.length) bad('something paints over the open panel: ' + JSON.stringify(pierced));

  // scrollability if it overflows
  if (s.scrollH > s.clientH) {
    const sc = await pg.evaluate(() => { const el = document.getElementById('menupanel'); el.scrollTop = 9999; return el.scrollTop; });
    if (sc <= 0) bad('overflowing panel will not scroll');
  }

  // close by tapping the burger again
  await burger.tap();
  await pg.waitForTimeout(500);
  s = await pg.evaluate(() => {
    const el = document.getElementById('menupanel'), cs = getComputedStyle(el);
    return { open: el.classList.contains('open'), vis: cs.visibility, hidden: el.hasAttribute('hidden'),
      aria: document.querySelector('.burger').getAttribute('aria-expanded'),
      lock: document.documentElement.className.includes('overlay-open'),
      focus: document.activeElement ? (document.activeElement.className || document.activeElement.tagName) : null,
      // scroll-behavior:smooth makes scrollTo async — ask the computed style instead
      canScroll: getComputedStyle(document.documentElement).overflow !== 'hidden'
        && getComputedStyle(document.body).overflow !== 'hidden' };
  });
  console.log('  closed: ' + JSON.stringify(s));
  if (s.open || s.vis !== 'hidden') bad('second tap did not close');
  if (!s.hidden) bad('panel not re-hidden after close');
  if (s.aria !== 'false') bad('aria-expanded stuck true');
  if (s.lock) bad('scroll lock left on');
  if (!s.canScroll) bad('page still cannot scroll after close');
  if (!String(s.focus).includes('burger')) bad('focus not returned to the burger (' + s.focus + ')');

  // Escape closes
  await burger.tap(); await pg.waitForTimeout(400);
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(400);
  const esc = await pg.evaluate(() => ({ open: document.getElementById('menupanel').classList.contains('open'),
    lock: document.documentElement.className.includes('overlay-open') }));
  if (esc.open || esc.lock) bad('Escape did not close: ' + JSON.stringify(esc));

  // link tap closes and navigates
  await burger.tap(); await pg.waitForTimeout(400);
  await pg.locator('#menupanel .mplinks a').first().tap();
  await pg.waitForTimeout(700);
  const after = await pg.evaluate(() => ({ url: location.pathname,
    lock: document.documentElement.className.includes('overlay-open'),
    open: document.getElementById('menupanel').classList.contains('open') }));
  if (after.lock || after.open) bad('menu left open after following a link: ' + JSON.stringify(after));

  if (errs.length) bad('console/page errors: ' + errs.slice(0, 3).join(' | '));
  await pg.close();
}

await b.close();
console.log('\n' + (fails ? fails + ' FAILURES' : 'all menu checks pass'));
process.exit(fails ? 1 : 0);
