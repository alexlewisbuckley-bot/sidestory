import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
let fails = 0;
const ok = (n, v, x) => { if (!v) fails++; console.log((v ? 'PASS ' : 'FAIL ') + n + (v ? '' : '  ' + JSON.stringify(x || ''))); };

const small = () => [...document.querySelectorAll('.sheet button, .shelfbar button, .applied button')]
  .filter(el => el.offsetParent !== null)
  .map(el => { const r = el.getBoundingClientRect(); return { t: el.textContent.trim().slice(0, 18), w: Math.round(r.width), h: Math.round(r.height) }; })
  .filter(x => x.w < 24 || x.h < 24);

// ---- phone
const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })).newPage();
await m.goto('http://localhost:8802/collection.html', { waitUntil: 'networkidle' });
ok('one control in the phone bar', await m.evaluate(() =>
  getComputedStyle(document.querySelector('.finline')).display === 'none'
  && getComputedStyle(document.querySelector('.filterbtn')).display !== 'none'));
ok('filter button announces its popup', await m.evaluate(() => {
  const b = document.querySelector('.filterbtn');
  return b.getAttribute('aria-haspopup') === 'dialog' && b.getAttribute('aria-expanded') === 'false'; }));
await m.click('.filterbtn'); await m.waitForTimeout(500);
ok('sheet is a labelled modal', await m.evaluate(() => {
  const s = document.querySelector('.sheet');
  return s.getAttribute('role') === 'dialog' && s.getAttribute('aria-modal') === 'true'
    && document.getElementById(s.getAttribute('aria-labelledby')) !== null; }));
ok('each group is named to its rows', await m.evaluate(() =>
  [...document.querySelectorAll('.sheet .sgrows')].every(g => {
    const id = g.getAttribute('aria-labelledby');
    return id && document.getElementById(id); })));
ok('the choice group is a radiogroup', await m.evaluate(() => {
  const g = document.querySelector('.sheet [data-filter="size"]').closest('[role="radiogroup"]');
  return g && g.getAttribute('role') === 'radiogroup'
    && [...g.querySelectorAll('button')].every(b => b.getAttribute('role') === 'radio')
    && [...g.querySelectorAll('button')].filter(b => b.getAttribute('aria-checked') === 'true').length === 1; }));
ok('the filter group is a plain group of toggles', await m.evaluate(() => {
  const g = document.querySelector('.sheet [data-filter="family"]').closest('[role]');
  return g.getAttribute('role') === 'group'
    && [...g.querySelectorAll('button')].every(b => b.hasAttribute('aria-pressed') && !b.hasAttribute('role')); }));
ok('radio and checkbox are drawn differently', await m.evaluate(() => {
  const r = getComputedStyle(document.querySelector('.sheet .srow-one i')).borderRadius;
  const c = getComputedStyle(document.querySelector('.sheet [data-filter="family"] i')).borderRadius;
  return r !== c && parseFloat(r) > 0; }));
ok('no tap target under 24px in the sheet', (await m.evaluate(small)).length === 0, await m.evaluate(small));
ok('the choice is one tab stop', await m.evaluate(() =>
  [...document.querySelectorAll('.sheet [data-filter="size"]')].filter(b => b.tabIndex === 0).length === 1));
await m.focus('.sheet [data-filter="size"][aria-checked="true"]');
await m.keyboard.press('ArrowDown'); await m.waitForTimeout(350);
ok('arrows move the choice in the sheet', await m.evaluate(() =>
  document.querySelector('.sheet [data-value="7-5ml"]').getAttribute('aria-checked') === 'true'));
ok('the shelf count updates', await m.evaluate(() =>
  /stor(y|ies)/.test(document.querySelector('[data-sheetcount]').textContent)));
await m.keyboard.press('Escape'); await m.waitForTimeout(500);

// ---- desktop
const d = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await d.goto('http://localhost:8802/collection.html', { waitUntil: 'networkidle' });
ok('inline row on desktop, no filter button', await d.evaluate(() =>
  getComputedStyle(document.querySelector('.finline')).display !== 'none'
  && getComputedStyle(document.querySelector('.filterbtn')).display === 'none'));
ok('the two kinds are marked differently', await d.evaluate(() => {
  const one = getComputedStyle(document.querySelector('.fgroup-one button'), '::after').content;
  const many = getComputedStyle(document.querySelector('.fgroup-many button'), '::before').content;
  return one !== 'none' && many !== 'none'; }));
ok('no tap target under 24px in the row', (await d.evaluate(small)).length === 0, await d.evaluate(small));
await d.click('.finline [data-value="citrus"]'); await d.waitForTimeout(400);
ok('applied chip is labelled for a screen reader', await d.evaluate(() =>
  /remove this filter/i.test(document.querySelector('.achip').textContent)));
ok('the × is hidden from the accessibility tree', await d.evaluate(() =>
  document.querySelector('.achip span[aria-hidden="true"]') !== null));

await b.close();
console.log(fails ? `\n${fails} FAILURES` : '\nall filter accessibility checks pass');
process.exit(fails ? 1 : 0);
