# Side Story Parfums — handover

Written at the end of the session of **1 August 2026**. Everything below is
current as of commit `e68ad80` on `main`.

---

## 1. Where everything lives

| | |
|---|---|
| Working copy | `/tmp/pushtest` — **ephemeral.** The cloud sandbox is reclaimed after inactivity. |
| Remote | `github.com/alexlewisbuckley-bot/sidestory`, branch `main` |
| Live | `sidestory-rho.vercel.app` (auto-deploys from `main`) |
| Pages | 37 static HTML files, all generated |
| Generator | `tools/build.py` — `python3 tools/build.py` rewrites all 37 |
| Stylesheet | `assets/css/app.css` (one file, ~160 KB) |
| Script | `assets/js/site.js` (one file, ~45 KB) |
| Local server | `node tools/serve.mjs` → **port 8802**, gzip/brotli. Every harness points at it. |
| Headless browser | `/opt/pw-browsers/chromium` (pre-installed; never run `playwright install`) |

**To resume from a fresh sandbox:** `git clone` the repo into `/tmp/pushtest`,
`node tools/serve.mjs &`, then `python3 tools/build.py` and run the harnesses
below. Nothing else needs installing.

---

## 2. Never edit the HTML

All 37 pages are build output. Every change is made in one of three places:

- **`tools/build.py`** — markup, copy, data, page assembly
- **`assets/css/app.css`** — everything visual
- **`assets/js/site.js`** — everything behavioural

Then `python3 tools/build.py`. Editing a `.html` file directly is always wrong
and will be silently overwritten.

---

## 3. Verification — run these before every push

They are the record of what this site is supposed to do. Several found real
bugs this session that reading the diff did not.

```
node tools/interact.mjs      # 31 checks: filters, sheet, drawer, forms, menu
node tools/menucheck.mjs     # phone menu: geometry, scroll, close, focus, overlap
node tools/searchcheck.mjs   # search panel: open, live results, keyboard, page
node tools/sizesearch.mjs    # the 14 ways to ask for a size, + Close/Clear alignment
node tools/filtera11y.mjs    # radio vs checkbox semantics, tap targets, labels
node tools/anncheck.mjs      # ticker loop geometry, pacing, reduced motion, CLS
node tools/annwide.mjs       # ticker fill at 390 → 2560
node tools/footcheck.mjs     # footer rows match the menu; legal line
node tools/focusring.mjs     # dialogs focus themselves, no ring on touch
node tools/deskmega.mjs      # desktop mega menu, keyboard, focus trap
node tools/struct.mjs        # skip link, landmarks, dup ids, alt, lang
W=390,1440 node tools/verify.mjs   # overflow, contrast, tap targets, console — ~4 min
node tools/perf.mjs index.html collection.html   # FCP/LCP/CLS at 4× throttle
```

Environment overrides: `PW`/`PH` set the viewport for `menucheck`, `searchcheck`;
`PAGES` sets the page list for `menucheck`; `W` sets widths for `verify`.

`verify.mjs` takes about four minutes over 37 pages × 2 widths — run it in the
background and collect the log rather than waiting on it inline.

**Watch for false failures from contention.** Running two Playwright harnesses
at once starves the CPU and a timing-sensitive assertion (`focus not moved into
the panel`) fails spuriously. Re-run alone before believing a failure.

Screenshot helpers, all writing to `/tmp`: `menushot.mjs`, `srchshot.mjs`,
`shelfshot.mjs`, `annshot.mjs`, `footshot.mjs`.

---

## 4. What was done this session, in order

1. **`85f0854` — phone menu rebuilt as its own panel.** It had been the desktop
   nav re-flowed; the desktop links carry `data-mega`, so focusing the first one
   on open fired the mega panel over the menu that had opened it. Now
   `#menupanel`, fixed between the measured header edge and the bottom of the
   screen, on the shared overlay contract.
2. **`5ecb5d1` — one row treatment, shop first, burger thumb-side.** Found the
   panel sharing a z-layer with the collection page's sticky size bar, which
   painted through the middle of the menu.
3. **`4108055` — focus the dialog, not its first control.** Safari matches
   `:focus-visible` on a programmatically focused control even after a touch,
   which is where Alex's "black box" came from.
4. **`78af88b` — search opens in place, answers as you type.** Panel on every
   page, 40-entry index shipped inline, no request between keystroke and answer.
5. **`a8fb3e9` — filters rebuilt on one declaration.** Size is a *choice*
   (radio, never hides a card), scent is a *filter* (checkbox). Found two shelf
   controllers bound to the same selector, so every tap ran twice.
6. **`b9e5230` — announcement is a continuous ticker; free delivery £40 / AED 400.**
7. **`e68ad80` — phone footer takes the menu's rows; legal line demoted.**

---

## 5. Architecture notes worth keeping

### The filter model is declarative — extend it here

`FILTERS` in `tools/build.py` (~line 555) is the single source. One entry:

```python
dict(key="feeling", attr="feeling", label="Feeling", mode="many",
     note="...", options=[dict(v="...", label="...", short="...", hint="")])
```

`mode` is `"one"` (radio; exactly one always active; never hides a card) or
`"many"` (checkbox; none active by default; narrows the shelf). Three renderings
come from it — `filter_inline()`, `filter_sheet()`, and the applied-chip row —
and the controller in `site.js` reads its groups out of the markup and **names
no filter anywhere**. The button label is generated by `filter_title()`, so it
cannot go stale.

The card must carry the value as `data-<key>` — `product_card()` already emits
`data-feeling`, `data-stone`, `data-note`, `data-family`.

The one presentational gate: the sheet is phone-only, via
`@media (max-width:51.9375em)`. A third group still fits the inline row at
≥52em; a fourth probably would not, and moving that breakpoint is the whole
change.

### The overlay contract

`overlayOpen(el, {scrim})` / `overlayClose(el)` in `site.js` (exposed as
`window.SSoverlay`). Gives a focus trap, one scroll-lock record, Escape, focus
return, and scrim show/hide. Used by the bag drawer, the phone menu, the filter
sheet and the search panel. **Anything modal added later should use it**, not a
private copy — the two private copies that existed were both subtly wrong.

It focuses the **container**, which carries `tabindex="-1"`; `[tabindex="-1"]:focus`
has its ring suppressed in the stylesheet. The one deliberate exception is the
search panel, which moves focus to its field afterwards, because a search field
is the point.

### Stacking

`--z-art:-2 · --z-behind:-1 · --z-base:1 · --z-raised:2 · --z-sticky:40 ·
--z-header:60 · --z-scrim:90 · --z-overlay:95 · --z-top:200`

The phone menu and the search panel sit at `calc(var(--z-header) - 1)` = 59, the
search scrim at 58. **`--z-sticky` is not safe for a header-anchored panel** —
the collection page's sticky size bar is there and, coming later in the
document, wins the tie. `menucheck.mjs` and `searchcheck.mjs` both probe for
this with `elementFromPoint` at nine depths.

### The search index

`search_index()` in `build.py` emits `window.SS_IDX` — `{t, s, k, h, x}` per row,
where `x` is the lower-cased haystack. Scoring is in `site.js`: title exact 120,
title prefix 90, title word-start 70, title substring 45, haystack word-start
30, haystack substring 12; every term must score or the row is out. Groups are
collected **before** any markup is written — emitting a heading whenever the
kind changed while walking a score-sorted list printed the same heading twice.

Add a page → add an `add(...)` call. Include the ways people actually type it;
the sizes carry `100ml`, `7.5`, `7ml`, `2ml`, `travel`, `tester`, `full size`
and the prices for exactly that reason. The punctuation stripper deliberately
keeps `.` (it is inside "7.5") and removes `£` (so "160" is a word).

### The ticker

`ANNOUNCEMENTS` in `build.py` is the message list. Two identical copies in one
track, translated `-50%`. `site.js` sets `--ann-dur` from the measured width so
the speed is a constant 42 px/s, re-measures after `document.fonts.ready`, and
pads each group with aria-hidden repeats when one copy is narrower than the
viewport. Reduced motion unwinds the whole thing and rotates one message on a
7-second timer.

### One number, one place

`FREE_GBP = 40` / `FREE_AED = 400` in `build.py`, emitted as `window.SS_FREE`.
It had been typed into six pieces of copy plus the bag maths twice.

---

## 6. Traps this codebase has already sprung

Worth reading before touching the relevant thing again.

- **`<source>` has no UA `display:none`.** Inside `picture{display:contents}` it
  becomes a layout item and takes grid tracks. `picture>source{display:none}` is
  load-bearing.
- **Setting `src` on an `<img>` inside a `<picture>` does nothing** when a
  `<source>` matches. Use `swapPicture()` / `swapFromThumb()`.
- **A touch-synthesised `click` carries `detail: 0`,** exactly like a keyboard
  one. There is no way to tell them apart, so "open on pointerdown and swallow
  the click" cannot work. One `click` listener; `touch-action: manipulation` for
  the immediacy.
- **`focus()` on a `display:none` element silently drops focus to `<body>`.**
  Filter arrow-key and result lists to `offsetParent !== null`.
- **Opacity compounds through nesting.** Charcoal at 70% over ivory is 3.9:1.
- **Specificity ties are broken by source order** — this bit the `.util>a` hide
  and the panel/sticky-bar z-index.
- **Author `display:block` beats the UA `[hidden]` rule** regardless of
  specificity. That is how `.menupanel` stays laid out while `hidden`, which is
  what took the first-open frame from ~90 ms to ~50 ms.
- **`prefers-reduced-motion` clamps `transition-duration` but not
  `transition-delay`.** Staggers need explicit zeroing.
- **Scroll-locking a long document costs ~30 ms at 4× throttle.** Inherent; the
  drawer and the sheet pay it too.

---

## 7. Open items — all Alex's calls, all still open

These have been flagged repeatedly across sessions and none is a code problem.

1. **Sibling Rivalry has no photography.** No story photograph, no 7.5 ml pack
   shot, no sample carton. It falls back to the bottle, and it is the one
   remaining image-crop flag in `mobaudit.mjs`.
2. **The Share page postbag still carries Figma placeholder testimonials**
   attributed to named members of the public. This should not go live.
3. **Six typos in the supplied story copy** remain verbatim, pending a decision
   on whether to correct an author's text.
4. **The GitHub PAT pasted in chat is still live** and still embedded in
   `/tmp/pushtest/.git/config`. It should be revoked. (Do not echo it.)
5. **The EU delivery threshold is still £180** while the UK one just moved to
   £40. The two now sit oddly far apart and may want a second look.
6. **"Explore"** is the label chosen for the phone menu's second group, and
   **"Size & scent"** is generated for the filter button. Both are easy to
   change if the wording is wrong.

---

## 8. The standing brief

Alex's instructions across this project, still in force:

- Inspect the whole codebase before changing anything; infer the design system,
  spacing and type scales, component patterns, breakpoint strategy, animation
  language and visual conventions. Never optimise a component in isolation —
  every change must strengthen consistency across the whole store.
- Do a **second pass after every change**, then a final full-site review to
  eliminate inconsistencies introduced or left behind.
- For every component touched, ask: *would Aesop ship this? Le Labo? The Row?
  Byredo?* If no, keep refining. Do not stop at the first acceptable
  implementation.
- Treat every pixel, spacing value, transition, breakpoint and interaction as
  intentional. Stop only when further changes would be diminishing returns.
- **Push after major updates and tell Alex**, so he can check on the live site
  while work continues.

House style for commits: explain what was wrong and why, in prose, not bullets.
The comments in the CSS and JS do the same — they are the reasoning, kept next
to the code, and they are worth maintaining rather than stripping.
