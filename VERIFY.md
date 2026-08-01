# Side Story — build & verification

```bash
npm install                       # once
python3 tools/build.py            # regenerate all 37 pages
node tools/verify.mjs             # overflow, contrast, tap targets, console
W=360,1024,1280 node tools/verify.mjs   # the other three widths
node tools/struct.mjs             # headings, names, landmarks, ids, alt, lang
node tools/interact.mjs           # filters, variants, drawer, sheet, forms
```

`tools/verify.mjs` sweeps every page at three widths (390/768/1440 by default;
set `W` for others). Nothing in it is sampled — every element on every page is
walked.

## How the site is built

**One generator.** `tools/build.py` emits all 21 pages. The head, announcement
bar, navigation, footer and bag drawer are produced by one function each, so
they are byte-identical everywhere — change the nav once and all 21 follow.
Asset URLs carry a content hash, so a stale stylesheet cannot be served against
fresh markup.

**One stylesheet.** `assets/css/app.css`. There is no global scale factor and no
JavaScript in the layout.

* **One type scale** (`--t-xs` … `--t-6`). Each step interpolates between a
  mobile size at 390px and a desktop size at 1440px and is hard-clamped at both
  ends. Body copy cannot render below 15px or above 17.5px; labels stay between
  10 and 11.5px; the hero never exceeds 76px.
* **One space scale** (`--s-1` … `--s-7`) plus a fluid `--gutter`.
* **Grid tracks are `minmax(0,1fr)` or `auto-fit`**, never fixed widths, so
  every column can shrink.
* **Utilities are declared last**, and section-scoped element rules are written
  as `.band :where(p)` so their specificity is the class alone. This is the
  guard against the bug that kept recurring — a rule like `.band p` silently
  out-specifying `.k` and rendering a 10px tracked label at body size.

## The pages

| | |
|---|---|
| Shop | `collection` · `product` · `samples` · `gifting` |
| Story | `stories` · `story` · `share` · `journal` |
| House | `our-house` · `stockists` |
| Buy | `bag` · `checkout` · `confirmation` |
| Account | `account` · `search` |
| Practical | `shipping` · `contact` · `faq` · `legal` · `404` |

Copy on the practical and legal pages is placeholder written for the demo.

## What the harness asserts

`verify.mjs`, per element, per page, per width:

* nothing overflows horizontally — discounting boxes that a clipping ancestor
  contains, which the previous sweep counted as failures
* **contrast, accounting for opacity.** This matters more than it sounds. The
  earlier walker read `color` alone, so text painted at `opacity:.6` measured
  as if it were full strength — and it treated text over photography as
  ivory-on-ivory, which scores 1:1 and was being reported as clean. Corrected,
  it found 315 failing nodes on a build that had been reported as having two.
  It now multiplies every ancestor opacity into the sample, blends against the
  nearest opaque ground, and **declines to score text over art at all** rather
  than inventing a number for it.
* tap targets at least 24×24 (WCAG 2.5.8), inline exceptions taken as padding
  rather than claimed
* no console errors and no page errors

`struct.mjs`, per page: heading order, accessible names on every control, one
`main`, no duplicate ids, `alt` on every image, a `lang`.

`interact.mjs`: scent filtering and clearing, size variants on the shelf and on
the product page, add-to-bag, the drawer's dialog semantics and scroll lock,
Escape, the mobile scent sheet, the phone menu, and both form paths — invalid
blocks and marks, valid reveals the confirmation.

Current state, across **222 page-widths** (37 pages × 6 widths from 360 to
1440): overflow **0**, contrast failures **0**, tap targets under 24px **0**,
console errors **0**. Heading skips **0**, unnamed controls **0**, duplicate ids
**0**, images without alt **0**. All 19 interaction checks pass.

## Where the system is not yet what it claims

Kept here because the previous version of this file overstated two things.

* **Breakpoints.** The strategy said these had been folded onto three named
  thresholds. They have not: there are seven — 34, 40, 48, 52, 64, 68 and 90em
  — all in `em`, all complementary (no gaps or overlaps between the max/min
  pairs). Content-driven breakpoints are the stated strategy at the head of the
  stylesheet and they are defensible; the claim that there were three was not.
* **Duration tokens.** They were declared and referenced zero times until this
  pass, while the sheet ran on ten raw values. They are used now.
