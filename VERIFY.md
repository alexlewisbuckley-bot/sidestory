# Side Story — build & verification

```bash
npm install                # once
python3 tools/build.py     # regenerate all 21 pages
npm run check              # ~9 min, every page at 13 widths
node tools/responsive.mjs  # ~1 min, overflow-only sweep at 15 widths
```

`npm run check` exits 0 only if every page passes every check.

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

## What `npm run check` asserts

At 320, 360, 390, 430, 540, 670, 768, 900, 1024, 1280, 1440, 1920 and 2560, on
every page:

* nothing overflows horizontally
* every type role sits inside its floor and ceiling
* heading hierarchy holds: hero > section > card > body
* no text is clipped by its own container
* tap targets are at least 32px tall where there is no pointer (inline text
  links are exempt, per WCAG 2.5.8)
* every image loads and carries alt text
* no console errors, no 4xx/5xx

Plus, once per page: each font family has at least one face loaded wherever the
family is used; the page renders correctly with **JavaScript disabled** at 390,
768 and 1440; every local href/src resolves; and no stylesheet or page contains
a script-driven design unit, so the architecture cannot regress.

Current state: **3,571 / 3,571 passing across all 21 pages**, and
`tools/responsive.mjs` reports no overflow at any of 15 widths from 360 to 1920.
