# Verifying the build against the design

The point of this harness is that nobody has to eyeball the site against Figma
to know whether it is right. Run one command and it tells you.

```bash
npm install          # once
npm run check        # ~90s, prints a pass/fail line per page
```

Exit code 0 means every check passed. Any failure prints the Figma value, the
built value and the delta, e.g.

```
✗ [layout] 09b · journal h  —  figma 700 · built 606 · Δ-94
✗ [type] "Stories, carved in scent." width — figma 670px · built 723.9px · Δ+8.0%
```

## What it checks

**Against `spec/homepage.json`**, which is extracted straight out of the Figma
file (page `09 · Flagship Homepage`, root node `83:27`) and must never be
hand-edited to make a test pass:

- every section's y-position and height, to ±6px / ±8px
- every heading's font family, font size, and **rendered ink width** — the last
  one is the real test, because it fails if the typeface, the size, the tracking
  or the word-spacing is wrong even when `font-size` reads correctly
- that all eight webfont faces actually loaded

**On every page, at 1440 / 1280 / 1024 / 900 / 834 / 670 / 390 / 360:**

- no horizontal overflow
- every image loads and has an `alt`
- no console errors, no 4xx/5xx
- the sticky nav collapses at most once across a 0–600px scroll sweep
  (this is the check that catches the header-shake regression)

**Statically:** every local `href`/`src` in every page resolves to a file that
exists.

## The two design regimes

The page is built from two Figma artboards, and `--u` — the design unit every
value is expressed in — is re-based between them by the inline script in each
page head:

```
w >= 1024 :  --u = min(w, 1440) / 390 * (390/1440)   // desktop artboard 83:27, exact at 1440
w <  1024 :  --u = min(w,  560) /  390               // mobile artboard 86:74, exact at 390
```

This matters because the first version mixed the two: below 900px the desktop
unit kept shrinking (0.465px at 670px, so the nav bar collapsed to 41px tall)
while the mobile rules were written in fixed pixels and stayed full size. The
result was neither design. Every mobile value now comes from the 390 artboard
and is expressed in `--u`, so the two regimes never overlap.

`spec/homepage-mobile.json` asserts the mobile side at 390px. It only covers the
bands where the artboard and the build carry the same content — the build keeps
several sections and link columns the mobile artboard drops, and those are noted
in the spec rather than silently skipped.

## Why the fonts are self-hosted

They used to come from Google Fonts. When that request didn't land, the browser
silently fell back to a system serif and *every measurement on the page changed* —
the hero headline rendered 8% wider than the design at the correct `font-size`.
The woff2 files now ship in `assets/fonts/` and `check` asserts they loaded, so
that failure mode cannot recur silently.

## When the design changes

Re-extract the spec from Figma, don't edit the numbers by hand. The values in
`spec/homepage.json` carry their Figma node id (`"figma": "83:41"`) so each one
can be traced back to the layer it came from.
