# Verifying the homepage

```bash
npm install       # once
npm run check     # ~3 min, 13 widths from 320 to 2560
```

Exit code 0 means every check passed on the pages that have been rebuilt on the
responsive stylesheet. Pages not yet migrated are reported separately, under a
clearly marked heading, and do not gate the run — they are the work list.

## How the homepage is built

There is **no global scale factor and no JavaScript in the layout**. That was the
cause of the failures you saw: a single `--u` variable, set by a script in the
HTML, multiplied every value on the page. When it was slightly wrong — a stale
stylesheet, a breakpoint disagreement, a viewport the formula did not anticipate
— everything on the page was wrong at once, and the promo card's type ran away.

`assets/css/home.css` now works the way a stylesheet should:

* **One type scale**, `--t-xs` through `--t-6`. Each step interpolates between a
  mobile size at 390px and a desktop size at 1440px and is hard-clamped at both
  ends. Body copy can never render below 15px or above 17.5px; labels never
  below 10px or above 11.5px; the hero never above 76px. Nothing can run away.
* **One space scale**, `--s-1` through `--s-7`, plus `--gutter`, on the same
  principle.
* **Grid tracks are `minmax(0,1fr)` or `auto-fit`**, never fixed widths, so a
  column can always shrink. The promo card is an ordinary grid item that fills
  its track rather than a box with a hard-coded height.
* **Breakpoints are chosen by content**: the card grid goes 2 → 3 → 4 up at 40em
  and 68em; the nav collapses at 64em; the showcase splits at 60em; gifting
  splits at 56em.

## What `npm run check` asserts

At 320, 360, 390, 430, 540, 670, 768, 900, 1024, 1280, 1440, 1920 and 2560:

* nothing overflows horizontally
* every type role sits inside its floor and ceiling — this is the check that
  catches a runaway scale before anyone sees it
* heading hierarchy holds: hero > section > card > body, at every width
* no text is clipped by its own container
* tap targets are at least 32px tall where there is no pointer (inline text
  links are exempt, per WCAG 2.5.8)
* every image loads and carries alt text
* no console errors, no 4xx/5xx

Plus, once per page: all four webfonts actually load (a silent fallback to a
system serif changes every measurement); the page renders correctly with
**JavaScript disabled** at 390, 768 and 1440; every local href/src resolves; and
the stylesheet contains no script-driven design unit, so the architecture cannot
regress to the old model.

`tools/responsive.mjs` is a faster sweep of 15 widths for overflow only.

## Rolling out

The homepage is done. The remaining pages (collection, product, story, stories,
share, bag, checkout, confirmation) still use `assets/css/site.css`. Migrating
each one means the same three moves: adopt the scales from `home.css`, replace
fixed widths with grid tracks, then add the page to `MIGRATED` in
`tools/check.mjs` so its results start gating the run.
