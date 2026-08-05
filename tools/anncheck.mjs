import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
let fails = 0;
const ok = (n, v, x) => { if (!v) fails++; console.log((v ? 'PASS ' : 'FAIL ') + n + (v ? '' : '  ' + JSON.stringify(x || ''))); };

for (const [w, h] of [[390, 844], [1440, 900]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 900, isMobile: w < 900 });
  const p = await ctx.newPage();
  await p.goto('http://localhost:8802/index.html', { waitUntil: 'networkidle' });
  await p.waitForTimeout(600);
  console.log('\n' + w + '×' + h);

  const s = await p.evaluate(() => {
    const ann = document.querySelector('.ann'), t = document.querySelector('[data-ann]');
    const groups = t.querySelectorAll('.anngroup');
    const a = groups[0].getBoundingClientRect(), bg = groups[1].getBoundingClientRect();
    const cs = getComputedStyle(t), acs = getComputedStyle(ann);
    return {
      groups: groups.length,
      items: groups[0].querySelectorAll('.anni').length,
      spoken: [...groups[0].querySelectorAll('.anni')].filter(x=>x.getAttribute('aria-hidden')!=='true').length,
      identical: groups[0].innerHTML === groups[1].innerHTML,
      cloneHidden: groups[1].getAttribute('aria-hidden') === 'true',
      firstNotHidden: !groups[0].hasAttribute('aria-hidden'),
      region: ann.getAttribute('role') === 'region' && !!ann.getAttribute('aria-label'),
      notLive: !ann.hasAttribute('aria-live'),
      overflow: acs.overflow === 'hidden',
      anim: cs.animationName,
      dur: cs.animationDuration,
      paced: t.style.getPropertyValue('--ann-dur') !== '',
      iter: cs.animationIterationCount,
      timing: cs.animationTimingFunction,
      widthsEqual: Math.abs(a.width - bg.width) < 1,
      halfIsGroup: Math.abs(t.scrollWidth / 2 - a.width) < 2,
      annH: Math.round(ann.getBoundingClientRect().height),
      oneLine: (() => { const i = t.querySelector('.anni');
        return getComputedStyle(i).whiteSpace === 'nowrap'
          && i.getClientRects().length === 1; })(),
      docOverflowX: document.documentElement.scrollWidth > innerWidth + 1,
      free: window.SS_FREE
    };
  });
  console.log('  ' + JSON.stringify(s));
  ok('two identical copies in the track', s.groups === 2 && s.identical && s.widthsEqual, s);
  ok('translating half the track lands on the clone', s.halfIsGroup, s);
  ok('the clone is hidden from the accessibility tree', s.cloneHidden && s.firstNotHidden, s);
  ok('labelled region, not a live region', s.region && s.notLive, s);
  ok('the strip clips its own overflow', s.overflow, s);
  ok('the loop is linear and endless', s.anim === 'annroll' && s.iter === 'infinite' && s.timing === 'linear', s);
  // dur !== 40s was a proxy for "the pacer ran", and with two messages the
  // measured pace now lands on 40s by coincidence — assert the inline
  // property the pacer sets instead
  ok('the speed is paced from the measured width', /^[0-9]+s$/.test(s.dur) && s.paced, s);
  ok('every message present', s.spoken === 2, s);
  ok('no horizontal page overflow', !s.docOverflowX, s);
  ok('one line tall', s.annH < 52 && s.oneLine, s);
  ok('the threshold reaches the script', s.free === 30, s);

  // it actually moves, and it rejoins
  const a1 = await p.evaluate(() => new DOMMatrixReadOnly(getComputedStyle(document.querySelector('[data-ann]')).transform).m41);
  await p.waitForTimeout(900);
  const a2 = await p.evaluate(() => new DOMMatrixReadOnly(getComputedStyle(document.querySelector('[data-ann]')).transform).m41);
  ok('the track is moving', a2 < a1, { a1, a2 });

  // hover pauses
  await p.hover('.ann');
  await p.waitForTimeout(120);
  const h1 = await p.evaluate(() => new DOMMatrixReadOnly(getComputedStyle(document.querySelector('[data-ann]')).transform).m41);
  await p.waitForTimeout(500);
  const h2 = await p.evaluate(() => new DOMMatrixReadOnly(getComputedStyle(document.querySelector('[data-ann]')).transform).m41);
  ok('hovering pauses it', Math.abs(h2 - h1) < 0.5, { h1, h2 });

  // the delivery line is there and reads with both currencies
  ok('the delivery message carries both currencies', await p.evaluate(() =>
    /£30/.test(document.querySelector('.ann').textContent)
    && /AED\s?150/.test(document.querySelector('.ann').textContent.replace(/ /g, ' '))));

  // no layout shift attributable to the strip
  const cls = await p.evaluate(() => new Promise(res => {
    let v = 0;
    new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) v += e.value; })
      .observe({ type: 'layout-shift', buffered: true });
    setTimeout(() => res(+v.toFixed(4)), 1200);
  }));
  ok('no layout shift', cls < 0.01, { cls });
  await ctx.close();
}

// reduced motion: no ticker, one message at a time
const rc = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
const rp = await rc.newPage();
await rp.goto('http://localhost:8802/index.html', { waitUntil: 'networkidle' });
await rp.waitForTimeout(500);
console.log('\nreduced motion');
const r = await rp.evaluate(() => {
  const t = document.querySelector('[data-ann]');
  const items = [...t.querySelectorAll('.anngroup:first-child .anni')];
  return { anim: getComputedStyle(t).animationName,
    visible: items.filter(i => !i.hidden).length,
    cloneShown: getComputedStyle(t.querySelectorAll('.anngroup')[1]).display !== 'none',
    x: new DOMMatrixReadOnly(getComputedStyle(t).transform).m41 };
});
console.log('  ' + JSON.stringify(r));
ok('no ticker under reduced motion', r.anim === 'none' && r.x === 0, r);
ok('one message at a time', r.visible === 1, r);
ok('the clone is out of the way', !r.cloneShown, r);
// textContent would include the hidden siblings — read what is on screen
const visible = () => rp.evaluate(() =>
  [...document.querySelectorAll('.anngroup:first-child .anni')]
    .filter(i => !i.hidden).map(i => i.textContent.trim()).join(''));
const t1 = await visible();
await rp.waitForTimeout(7600);
const t2 = await visible();
ok('the message rotates on a timer', t1 !== t2, { t1: t1.slice(0, 30), t2: t2.slice(0, 30) });

// the threshold is one number everywhere
const cp = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
for (const [url, sel] of [['shipping.html', 'body'], ['product-hotel-lobby.html', 'body'], ['collection.html', 'body']]) {
  await cp.goto('http://localhost:8802/' + url, { waitUntil: 'domcontentloaded' });
  const stale = await cp.evaluate(() => /complimentary[^.]{0,40}£100/i.test(document.body.textContent));
  ok(url + ' carries no stale £100 threshold', !stale);
}

await b.close();
console.log(fails ? `\n${fails} FAILURES` : '\nall announcement checks pass');
process.exit(fails ? 1 : 0);
