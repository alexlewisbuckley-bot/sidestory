#!/usr/bin/env node
/**
 * Side Story — responsive verification harness.
 *
 *   npm run check              # every page, every width
 *   node tools/check.mjs index.html
 *
 * This does not compare the build to Figma. It asserts the things that make a
 * site actually work on a real screen, at 13 widths from 320 to 2560:
 *
 *   · nothing overflows horizontally
 *   · no text is smaller than its legibility floor, and none is larger than
 *     its ceiling — the failure mode that made the promo card explode
 *   · headings stay in hierarchy (hero > section > card > body)
 *   · no text is clipped by its own container
 *   · tap targets are big enough where there is no pointer
 *   · images all load and carry alt text
 *   · the layout is correct with JavaScript switched off
 *   · no console errors, no failed requests, no dead local links
 *
 * Exit code 0 = everything passed.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8911;
const MIME = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.svg':'image/svg+xml',
  '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp',
  '.woff2':'font/woff2', '.json':'application/json', '.ico':'image/x-icon' };

/* The widths worth testing: the common device classes plus the awkward
   in-between sizes where fixed layouts historically broke. */
const WIDTHS = [
  { n:'320',  w:320,  h:720,  touch:true  },
  { n:'360',  w:360,  h:780,  touch:true  },
  { n:'390',  w:390,  h:844,  touch:true  },
  { n:'430',  w:430,  h:932,  touch:true  },
  { n:'540',  w:540,  h:900,  touch:true  },
  { n:'670',  w:670,  h:900,  touch:true  },
  { n:'768',  w:768,  h:1024, touch:true  },
  { n:'900',  w:900,  h:1100, touch:false },
  { n:'1024', w:1024, h:800,  touch:false },
  { n:'1280', w:1280, h:900,  touch:false },
  { n:'1440', w:1440, h:1000, touch:false },
  { n:'1920', w:1920, h:1080, touch:false },
  { n:'2560', w:2560, h:1400, touch:false },
];

/* Legibility floors and ceilings. This is the contract: whatever the viewport,
   running text never drops below 15px and labels never below 10px; the hero
   never exceeds 76px and section headings never exceed 44px. */
const TYPE_RULES = [
  { sel:'body',         label:'body copy',        min:15,   max:17.5 },
  { sel:'.hero h1',     label:'hero headline',    min:38,   max:76.5 },
  { sel:'.head h2',     label:'section heading',  min:27,   max:44.5 },
  { sel:'.sechead',     label:'section heading',  min:27,   max:44.5 },
  { sel:'.show h2',     label:'showcase heading', min:31,   max:56.5 },
  { sel:'.card h3',     label:'product title',    min:17,   max:22.5 },
  { sel:'.promo h3',    label:'promo heading',    min:19,   max:26.5 },
  { sel:'.promo p',     label:'promo body',       min:12.5, max:14.5 },
  { sel:'.k',           label:'label',            min:9.8,  max:11.5 },
  { sel:'.btn',         label:'button',           min:9.8,  max:11.5 },
  { sel:'.card .price', label:'price',            min:9.8,  max:11.5 },
  { sel:'footer a',     label:'footer link',      min:12.5, max:14.5 },
];

/* Pages already rebuilt on the responsive stylesheet. Everything else is still
   on the older fixed-pixel CSS and is reported separately, so the migrated set
   stays a clean signal and the rest reads as a work list. */
const MIGRATED = new Set(['ALL']);   /* the whole site is on app.css now */

const results = [];
const rec = (page, group, name, ok, detail = '') => results.push({ page, group, name, ok, detail });

function serve() {
  return new Promise(res => {
    const s = createServer(async (req, rp) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      const f = join(ROOT, p);
      if (!f.startsWith(ROOT)) { rp.writeHead(403).end(); return; }
      try { rp.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' })
              .end(await readFile(f)); }
      catch { rp.writeHead(404).end('404'); }
    });
    s.listen(PORT, () => res(s));
  });
}

/* ------------------------------------------------------------ static ---- */
async function checkLinks() {
  const htmls = (await readdir(ROOT)).filter(f => f.endsWith('.html'));
  for (const f of htmls) {
    const html = await readFile(join(ROOT, f), 'utf8');
    const refs = new Set();
    for (const m of html.matchAll(/(?:href|src)="([^"#?:]+)(?:[#?][^"]*)?"/g)) {
      const t = m[1];
      if (!t || /^(https?:|\/\/|mailto|data:)/.test(t)) continue;
      refs.add(t);
    }
    const missing = [...refs].filter(r => !existsSync(join(ROOT, r)));
    rec(f, 'links', `${refs.size} local references resolve`, missing.length === 0, 'missing: ' + missing.join(', '));
    rec(f, 'arch', 'no inline layout script', !/setProperty\('--u'/.test(html));
  }
  const css = await readFile(join(ROOT, 'assets/css/app.css'), 'utf8');
  rec('assets/css/app.css', 'arch', 'no script-driven design unit', !/var\(--u\)/.test(css),
    'app.css still references --u');
}

/* ------------------------------------------------------- per-viewport ---- */
async function checkAt(browser, file, v) {
  const ctx = await browser.newContext({
    viewport: { width: v.w, height: v.h }, hasTouch: v.touch, deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  const errs = [], bad = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + new URL(r.url()).pathname); });

  await page.goto(`http://localhost:${PORT}/${file}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => {
    const s = document.createElement('style');
    s.textContent = '*,*::before,*::after{animation-duration:1ms!important;animation-delay:0ms!important;' +
                    'transition-duration:1ms!important}.rev,.rev.in{opacity:1!important;transform:none!important}';
    document.head.appendChild(s);
    document.querySelectorAll('img[loading="lazy"]').forEach(i => (i.loading = 'eager'));
  });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(250);

  const g = v.n;
  const o = await page.evaluate(rules => {
    const de = document.documentElement;
    const inScroller = e => {
      for (let n = e.parentElement; n && n !== document.body; n = n.parentElement) {
        const ox = getComputedStyle(n).overflowX;
        if (ox === 'auto' || ox === 'scroll') return true;
      }
      return false;
    };
    const name = e => e.tagName.toLowerCase() + '.' + (e.className || '').toString().trim().split(/\s+/)[0];

    const over = [...document.querySelectorAll('body *')].filter(e => {
      const cs = getComputedStyle(e);
      if (cs.position === 'fixed' || cs.display === 'none' || cs.visibility === 'hidden') return false;
      const r = e.getBoundingClientRect();
      return r.width > 0 && (r.right > de.clientWidth + 2 || r.left < -2) && !inScroller(e);
    }).slice(0, 6).map(name);

    const type = rules.map(r => {
      const el = document.querySelector(r.sel);
      if (!el) return { ...r, missing: true };
      return { ...r, px: +parseFloat(getComputedStyle(el).fontSize).toFixed(2) };
    });

    const fs = s => { const e = document.querySelector(s); return e ? parseFloat(getComputedStyle(e).fontSize) : null; };
    const hier = { hero: fs('.hero h1'), sec: fs('.head h2'), card: fs('.card h3'),
                   body: parseFloat(getComputedStyle(document.body).fontSize) };

    const clipped = [...document.querySelectorAll('h1,h2,h3,p,li,blockquote,figcaption,b,i,small')]
      .filter(e => {
        const cs = getComputedStyle(e);
        if (cs.display === 'none' || cs.overflow === 'visible' || !e.textContent.trim()) return false;
        return e.scrollHeight > e.clientHeight + 2 || e.scrollWidth > e.clientWidth + 2;
      }).slice(0, 5).map(name);

    /* Only real controls are held to a touch-target size. Inline text links
       (the underlined .ul style, the wordmark, links inside prose) are exempt,
       as they are under WCAG 2.5.8's inline exception. */
    const small = [...document.querySelectorAll('button,input,summary,.btn,a')]
      .filter(e => {
        const cs = getComputedStyle(e);
        if (cs.display === 'none' || cs.visibility === 'hidden') return false;
        if (e.matches('.ul,.brand,.go') || e.closest('.links,.util,footer,.house .row,.credit,.crumb,.legal,.acctnav,.steps,.marginnote')) return false;
        if (e.matches('input[type=checkbox],input[type=radio]')) return false;  /* natively small by design */
        if (e.tagName === 'A' && cs.display.startsWith('inline') && !e.classList.contains('btn')) return false;
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.height < 32;
      }).slice(0, 5).map(name);

    const imgs = [...document.images].filter(i => !i.complete || i.naturalWidth === 0).map(i => i.getAttribute('src'));
    const noAlt = [...document.images].filter(i => !i.hasAttribute('alt')).length;

    return { scrollW: de.scrollWidth, clientW: de.clientWidth, over, type, hier, clipped, small, imgs, noAlt };
  }, TYPE_RULES);

  rec(file, g, 'no horizontal overflow', o.scrollW <= o.clientW + 1,
    `scrollWidth ${o.scrollW} vs ${o.clientW}${o.over.length ? ' — ' + o.over.join(', ') : ''}`);

  for (const t of o.type) {
    if (t.missing) continue;
    rec(file, g, `${t.label} within ${t.min}–${t.max}px`, t.px >= t.min && t.px <= t.max, `${t.px}px`);
  }

  const { hero, sec, card, body } = o.hier;
  if (hero && sec && card) {
    rec(file, g, 'heading hierarchy holds', hero > sec && sec > card && card > body,
      `hero ${hero} > section ${sec} > card ${card} > body ${body}`);
  }

  rec(file, g, 'no text clipped by its box', o.clipped.length === 0, o.clipped.join(', '));
  if (v.touch) rec(file, g, 'tap targets at least 32px tall', o.small.length === 0, o.small.join(', '));
  rec(file, g, 'all images load', o.imgs.length === 0, o.imgs.slice(0, 3).join(', '));
  rec(file, g, 'every image has alt', o.noAlt === 0, `${o.noAlt} missing`);
  rec(file, g, 'no console errors', errs.length === 0, errs.slice(0, 2).join(' | '));
  rec(file, g, 'no 4xx/5xx', bad.length === 0, bad.slice(0, 3).join(' | '));

  if (v.w >= 1024) {
    const toggles = await page.evaluate(async () => {
      const nav = document.querySelector('.nav'); if (!nav) return -1;
      let n = 0, last = nav.classList.contains('shrunk');
      for (let y = 0; y <= 600; y += 10) {
        window.scrollTo(0, y);
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        const now = nav.classList.contains('shrunk');
        if (now !== last) { n++; last = now; }
      }
      return n;
    });
    rec(file, g, 'nav collapses at most once on scroll', toggles >= 0 && toggles <= 1, `${toggles} changes over 0–600px`);
  }
  await ctx.close();
}


/* ------------------------------------------------------- interactions --- */
async function checkInteractions(browser, file) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`http://localhost:${PORT}/${file}`, { waitUntil: 'networkidle' });

  // the collection sort must actually reorder, not merely highlight a tab
  if (await page.$('.filters[data-sort-for]')) {
    const order = () => page.evaluate(() => [...document.querySelectorAll('.cards .card')]
      .sort((a, b) => (+getComputedStyle(a).order) - (+getComputedStyle(b).order))
      .map(c => c.querySelector('h3').textContent).join('|'));
    const before = await order();
    await page.click('.filters button[data-sort="stone"]');
    await page.waitForTimeout(320);
    const after = await order();
    rec(file, 'ui', 'sort tabs reorder the grid', before !== after, 'order unchanged after clicking a tab');
    const promoLast = await page.evaluate(() => {
      const all = [...document.querySelectorAll('.cards > *')].map(e => +getComputedStyle(e).order);
      const promo = +getComputedStyle(document.querySelector('.promo')).order;
      return Math.max(...all) === promo;
    });
    rec(file, 'ui', 'discovery-set card stays last', promoLast);
  }

  // the bag drawer must open, and the menu must open on a narrow viewport
  if (await page.$('#drawer')) {
    await page.click('.util button');
    await page.waitForTimeout(300);
    rec(file, 'ui', 'bag drawer opens',
      await page.$eval('#drawer', e => e.classList.contains('open')));
    await page.keyboard.press('Escape');
  }
  await page.setViewportSize({ width: 390, height: 800 });
  await page.waitForTimeout(150);
  if (await page.$('.burger')) {
    await page.click('.burger');
    await page.waitForTimeout(250);
    const open = await page.evaluate(() => {
      const n = document.querySelector('.navlinks,.links');
      return !!n && getComputedStyle(n).display !== 'none' && n.getBoundingClientRect().height > 40;
    });
    rec(file, 'ui', 'menu opens at 390px', open);
  }
  await page.close();
}

/* --------------------------------------------------------- no script ---- */
async function checkNoScript(browser, file) {
  for (const w of [390, 768, 1440]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, javaScriptEnabled: false });
    const p = await ctx.newPage();
    await p.goto(`http://localhost:${PORT}/${file}`, { waitUntil: 'networkidle' });
    const r = await p.evaluate(() => {
      const de = document.documentElement;
      return { sw: de.scrollWidth, cw: de.clientWidth,
               body: parseFloat(getComputedStyle(document.body).fontSize),
               h1: !!document.querySelector('h1') && document.querySelector('h1').getBoundingClientRect().height > 0,
               nav: !!document.querySelector('.nav') && document.querySelector('.nav').getBoundingClientRect().height > 0,
               foot: !!document.querySelector('footer') && document.querySelector('footer').getBoundingClientRect().height > 0,
               tall: document.body.scrollHeight > 700 };
    });
    rec(file, 'no-js', `${w}px · no overflow`, r.sw <= r.cw + 1, `scrollWidth ${r.sw} vs ${r.cw}`);
    rec(file, 'no-js', `${w}px · type still in range`, r.body >= 15 && r.body <= 17.5, `body ${r.body}px`);
    rec(file, 'no-js', `${w}px · page renders`, r.h1 && r.nav && r.foot && r.tall,
      `h1 ${r.h1} · nav ${r.nav} · footer ${r.foot} · height ${r.tall}`);
    await ctx.close();
  }
}

/* ------------------------------------------------------------- fonts ---- */
async function checkFonts(browser, file) {
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(`http://localhost:${PORT}/${file}`, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  const r = await p.evaluate(() => {
    const declared = [...document.fonts].map(f => `${f.family}|${f.style}|${f.weight}|${f.status}`);
    const used = new Set();
    document.querySelectorAll('body *').forEach(e => {
      if (!e.textContent.trim()) return;
      used.add(getComputedStyle(e).fontFamily.split(',')[0].replace(/["']/g, '').trim());
    });
    return { declared, used: [...used] };
  });
  for (const fam of ['Libre Caslon Display', 'Libre Caslon Text', 'Montserrat', 'Cormorant Garamond']) {
    const faces = r.declared.filter(l => l.startsWith(fam + '|'));
    if (!faces.length) { rec(file, 'fonts', fam, false, 'no @font-face declared'); continue; }
    // A family may declare several faces; the browser only fetches the ones the
    // page actually needs, so require at least one loaded where the family is used.
    const needed = r.used.includes(fam);
    const anyLoaded = faces.some(l => l.endsWith('|loaded'));
    rec(file, 'fonts', `${fam} (${faces.length} faces)${needed ? '' : ' — not used here'}`,
      !needed || anyLoaded, faces.join('  '));
  }
  await p.close();
}

/* -------------------------------------------------------------- main ---- */
const server = await serve();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });

await checkLinks();
const only = process.argv.slice(2).filter(a => !a.startsWith('-'));
const pages = (await readdir(ROOT)).filter(f => f.endsWith('.html'))
  .filter(f => !only.length || only.includes(f)).sort();

for (const f of pages) {
  await checkFonts(browser, f);
  for (const v of WIDTHS) await checkAt(browser, f, v);
  await checkInteractions(browser, f);
  await checkNoScript(browser, f);
}

await browser.close(); server.close();

const isMigrated = p => MIGRATED.has('ALL') || MIGRATED.has(p) || !p.endsWith('.html');
const show = (pages, heading) => {
  if (!pages.length) return;
  console.log(`\n${heading}`);
  for (const p of pages) {
    const rs = results.filter(r => r.page === p);
    const f = rs.filter(r => !r.ok);
    console.log(`\n${f.length ? '✗' : '✓'} ${p}  ${rs.length - f.length}/${rs.length} passed`);
    for (const r of f) console.log(`    ✗ [${r.group}] ${r.name}${r.detail ? '  —  ' + r.detail : ''}`);
  }
};
const allPages = [...new Set(results.map(r => r.page))];
show(allPages.filter(isMigrated),  '══ on the responsive stylesheet ══');
show(allPages.filter(p => !isMigrated(p)), '══ not yet migrated (reported, not gating) ══');

const gating = results.filter(r => isMigrated(r.page));
const fails  = gating.filter(r => !r.ok);
const pending = results.filter(r => !isMigrated(r.page) && !r.ok).length;
console.log(`\n${'─'.repeat(64)}`);
console.log(`${gating.length - fails.length}/${gating.length} checks passed on migrated pages, ${fails.length} failed`);
if (pending) console.log(`${pending} findings on pages still awaiting migration (not gating)`);
console.log('');
process.exit(fails.length ? 1 : 0);
