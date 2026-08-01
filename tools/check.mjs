#!/usr/bin/env node
/**
 * Side Story — build verification harness.
 *
 * Renders the site in a real browser and asserts it against `spec/homepage.json`,
 * which is extracted directly from the Figma file. Nothing here is a judgement
 * call: every number is a measurement compared to a Figma value.
 *
 *   npm run check          # all pages, all viewports
 *   node tools/check.mjs   # same
 *
 * Exit code 0 = everything matches. Non-zero = at least one FAIL.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8911;
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.json': 'application/json', '.ico': 'image/x-icon' };

const results = [];
const rec = (page, group, name, ok, detail) => results.push({ page, group, name, ok, detail });

/* ---------------------------------------------------------------- server */
function serve() {
  return new Promise(res => {
    const s = createServer(async (req, rp) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      const f = join(ROOT, p);
      if (!f.startsWith(ROOT)) { rp.writeHead(403).end(); return; }
      try {
        const body = await readFile(f);
        rp.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' }).end(body);
      } catch { rp.writeHead(404).end('404'); }
    });
    s.listen(PORT, () => res(s));
  });
}

/* ------------------------------------------------------- static link check */
async function checkLinks() {
  const files = (await readdir(ROOT)).filter(f => f.endsWith('.html'));
  for (const f of files) {
    const html = await readFile(join(ROOT, f), 'utf8');
    const refs = new Set();
    for (const m of html.matchAll(/(?:href|src)="([^"#?:]+)(?:[#?][^"]*)?"/g)) {
      const t = m[1];
      if (!t || t.startsWith('http') || t.startsWith('//') || t.startsWith('mailto') || t.startsWith('data:')) continue;
      refs.add(t);
    }
    const missing = [...refs].filter(r => !existsSync(join(ROOT, r)));
    rec(f, 'links', `${refs.size} local refs resolve`, missing.length === 0,
      missing.length ? 'missing: ' + missing.join(', ') : '');
  }
}

/* --------------------------------------------------------- spec assertions */
async function checkSpec(browser, spec) {
  const vw = spec.viewport || 1440;
  const tag = g => (spec.label ? spec.label + '·' : '') + g;
  const page = await browser.newPage({ viewport: { width: vw, height: 1000 } });
  const consoleErrs = [], netErrs = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrs.push(m.text()); });
  page.on('requestfailed', r => netErrs.push('FAILED ' + r.url() + ' — ' + (r.failure()||{}).errorText));
  page.on('response', r => { if (r.status() >= 400) netErrs.push(r.status() + ' ' + r.url()); });

  await page.goto(`http://localhost:${PORT}/${spec.page}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  // settle entrance animations so measurements are of the resting state
  await page.evaluate(() => {
    const s = document.createElement('style');
    s.textContent = '*,*::before,*::after{animation-duration:1ms!important;animation-delay:0ms!important;transition-duration:1ms!important}.rev,.rev.in{opacity:1!important;transform:none!important}';
    document.head.appendChild(s);
  });
  await page.waitForTimeout(400);

  /* --- fonts actually loaded (this is the check that catches a silent
         fallback to a system serif, which changes every measure on the page) */
  const loaded = await page.evaluate(() => [...document.fonts].map(f => `${f.family}|${f.style}|${f.weight}|${f.status}`));
  for (const want of spec.fonts) {
    const hit = loaded.find(l => l.startsWith(want + '|'));
    rec(spec.page, tag('fonts'), want, !!hit && hit.endsWith('|loaded'), hit || 'NOT DECLARED');
  }

  /* --- section geometry vs Figma */
  const tol = spec.tolerance;
  const geo = await page.evaluate(sels => sels.map(s => {
    const el = document.querySelector(s.sel);
    if (!el) return { ...s, found: false };
    const r = el.getBoundingClientRect();
    return { ...s, found: true, gy: Math.round(r.top + window.scrollY), gh: Math.round(r.height) };
  }), spec.sections);

  for (const g of geo) {
    if (!g.found) { rec(spec.page, tag('layout'), `${g.name} [${g.sel}]`, false, 'selector not found'); continue; }
    const dy = g.gy - g.y, dh = g.gh - g.h;
    rec(spec.page, tag('layout'), `${g.name} y`, Math.abs(dy) <= tol.y, `figma ${g.y} · built ${g.gy} · Δ${dy > 0 ? '+' : ''}${dy}`);
    rec(spec.page, tag('layout'), `${g.name} h`, Math.abs(dh) <= tol.h, `figma ${g.h} · built ${g.gh} · Δ${dh > 0 ? '+' : ''}${dh}`);
  }

  /* --- typography vs Figma: family, size, and rendered ink width.
         Ink width is the real test — it fails if the font, the size, the
         tracking or the word-spacing is wrong, even when font-size looks right. */
  const typ = await page.evaluate(items => items.map(it => {
    const want = it.text.trim().toLowerCase();
    const scope = it.within ? document.querySelector(it.within) : document;
    if (!scope) return { ...it, found: false, cands: 0 };
    const cands = [...scope.querySelectorAll(it.sel || 'h1,h2,h3,h4,p,span,em,blockquote,a,div,li')]
      .filter(e => (e.textContent || '').trim().toLowerCase().startsWith(want))
      .filter(e => ![...e.children].some(c => (c.textContent || '').trim().toLowerCase().startsWith(want)));
    const el = cands[(it.nth || 1) - 1];
    if (!el) return { ...it, found: false, cands: cands.length };
    const cs = getComputedStyle(el);
    const rg = document.createRange(); rg.selectNodeContents(el);
    const b = rg.getBoundingClientRect();
    return { ...it, found: true, gFam: cs.fontFamily, gSize: parseFloat(cs.fontSize), gInk: +b.width.toFixed(1) };
  }), spec.type);

  for (const t of typ) {
    const label = `"${t.text.slice(0, 34)}"`;
    if (!t.found) { rec(spec.page, tag('type'), label, false, `no element starts with this text (${t.cands} candidates)`); continue; }
    rec(spec.page, tag('type'), `${label} family`, t.gFam.includes(t.family), `want ${t.family} · got ${t.gFam}`);
    rec(spec.page, tag('type'), `${label} size`, Math.abs(t.gSize - t.size) <= tol.fontSize, `figma ${t.size} · built ${t.gSize}`);
    if (t.ink) {
      const d = Math.abs(t.gInk - t.ink) / t.ink;
      rec(spec.page, tag('type'), `${label} width`, d <= tol.inkPct,
        `figma ${t.ink}px · built ${t.gInk}px · Δ${((t.gInk / t.ink - 1) * 100).toFixed(1)}%`);
    }
  }

  rec(spec.page, tag('runtime'), 'no console errors', consoleErrs.length === 0,
    consoleErrs.slice(0, 3).join(' | ') + (netErrs.length ? '  [' + netErrs.slice(0, 3).join(' | ') + ']' : ''));
  rec(spec.page, tag('runtime'), 'no failed requests', netErrs.length === 0, netErrs.slice(0, 3).join(' | '));
  await page.close();
}

/* --------------------------------------- per-page checks at every viewport */
const VIEWPORTS = [{ n: 'desktop', w: 1440, h: 1000 }, { n: 'laptop', w: 1280, h: 900 },
  { n: 'small-laptop', w: 1024, h: 800 }, { n: 'tablet-wide', w: 900, h: 1100 },
  { n: 'tablet', w: 834, h: 1100 }, { n: 'phablet', w: 670, h: 900 },
  { n: 'mobile', w: 390, h: 844 }, { n: 'mobile-sm', w: 360, h: 780 }];

async function checkPage(browser, file) {
  for (const v of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: v.w, height: v.h } });
    const errs = [], bad = [];
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    page.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + new URL(r.url()).pathname); });
    await page.goto(`http://localhost:${PORT}/${file}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    // sweep the full page so loading="lazy" images actually fetch before we assert on them
    await page.evaluate(() => {
      // force every lazy image to fetch now, without a slow scroll sweep
      document.querySelectorAll('img[loading="lazy"]').forEach(i => i.loading = 'eager');
    });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(300);

    const o = await page.evaluate(() => {
      const de = document.documentElement;
      // content inside a deliberate horizontal scroller (the mobile swipe rows)
      // is not page overflow — only measure elements not inside one
      const inScroller = e => {
        for (let n = e.parentElement; n && n !== document.body; n = n.parentElement) {
          const ox = getComputedStyle(n).overflowX;
          if (ox === 'auto' || ox === 'scroll') return true;
        }
        return false;
      };
      const over = [...document.querySelectorAll('body *')]
        .filter(e => { const cs = getComputedStyle(e); if (cs.position === 'fixed' || cs.display === 'none') return false;
          const r = e.getBoundingClientRect();
          return r.width > 0 && (r.right > de.clientWidth + 2 || r.left < -2) && !inScroller(e); })
        .slice(0, 5).map(e => e.tagName.toLowerCase() + '.' + (e.className || '').toString().split(' ')[0]);
      const imgs = [...document.images].filter(i => !i.complete || i.naturalWidth === 0).map(i => i.getAttribute('src'));
      const noAlt = [...document.images].filter(i => !i.hasAttribute('alt')).length;
      return { scrollW: de.scrollWidth, clientW: de.clientWidth, over, imgs, noAlt };
    });

    rec(file, v.n, 'no horizontal overflow', o.scrollW <= o.clientW + 1, `scrollWidth ${o.scrollW} vs ${o.clientW}${o.over.length ? ' — ' + o.over.join(', ') : ''}`);
    rec(file, v.n, 'all images load', o.imgs.length === 0, o.imgs.slice(0, 3).join(', '));
    rec(file, v.n, 'every <img> has alt', o.noAlt === 0, `${o.noAlt} missing`);
    rec(file, v.n, 'no console errors', errs.length === 0, errs.slice(0, 2).join(' | '));
    rec(file, v.n, 'no 4xx/5xx', bad.length === 0, bad.slice(0, 3).join(' | '));

    /* nav must collapse exactly once over a full scroll sweep — the bug that
       produced the shaking header was a toggle firing on every frame */
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
      rec(file, v.n, 'nav collapses once on scroll', toggles >= 0 && toggles <= 1, `${toggles} state changes over 0–600px`);
    }
    await page.close();
  }
}

/* ------------------------------------------------------------------- main */
const server = await serve();
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });

await checkLinks();
for (const f of ['spec/homepage.json', 'spec/homepage-mobile.json'])
  await checkSpec(browser, JSON.parse(await readFile(join(ROOT, f), 'utf8')));

const only = process.argv.slice(2).filter(a => !a.startsWith('-'));
const pages = (await readdir(ROOT)).filter(f => f.endsWith('.html'))
  .filter(f => !only.length || only.includes(f)).sort();
for (const f of pages) { const t0=Date.now(); await checkPage(browser, f); if(process.env.VERBOSE) console.log(`  ${f} ${(Date.now()-t0)/1000}s`); }

await browser.close(); server.close();

/* ----------------------------------------------------------------- report */
const fails = results.filter(r => !r.ok);
const byPage = [...new Set(results.map(r => r.page))];
for (const p of byPage) {
  const rs = results.filter(r => r.page === p);
  const f = rs.filter(r => !r.ok);
  console.log(`\n${f.length ? '✗' : '✓'} ${p}  ${rs.length - f.length}/${rs.length} passed`);
  for (const r of f) console.log(`    ✗ [${r.group}] ${r.name}${r.detail ? '  —  ' + r.detail : ''}`);
}
console.log(`\n${'─'.repeat(60)}\n${results.length - fails.length}/${results.length} checks passed, ${fails.length} failed\n`);
process.exit(fails.length ? 1 : 0);
