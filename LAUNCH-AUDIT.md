# Side Story — pre-launch design review

37 pages, 101 KB of CSS, 26 KB of JS, audited at 390 / 768 / 1440 and spot-checked
at 320 / 1024 / 1920 / 2560. Every number below is measured, not estimated.

---

## The design system that actually exists

Before criticising anything, this is what the codebase is already doing well,
because the failures below are mostly failures *against this system*, not the
absence of one.

**Colour** is a single coherent palette taken from the composed artboards rather
than the variable panel: ivory `#f1f0e8` as ground, `#efebe1` raised and `#e9e5da`
recessed, ink `#2b2e2d`, text `#404443`, brass `#a98e63`, and seven stone accents.
Hairlines are ink at 8–12%. It is warm, narrow and disciplined.

**Type** is three families with one job each — Libre Caslon Display for
display-scale headings, Libre Caslon Text for reading, Montserrat for interface —
plus Cormorant Garamond italic as a single decorative voice. The scale is measured
off the artboards and interpolates exactly between 390 and 1440.

**Space** is a 14-step primitive scale, 4 → 240.

**Motion** has exactly one easing, `cubic-bezier(.22,1,.36,1)`, used 65 times. That
is unusually disciplined and it is the reason the site feels calm.

**Radius** is effectively zero. **Elevation** is essentially flat.

That is a real system. The problems are drift away from it, and a set of
accessibility obligations it never took on.

---

## CRITICAL

### C1 · The focus ring is invisible on the site's primary surface

One rule governs focus everywhere: `:focus-visible{outline:2px solid var(--brass)}`.
Measured against each surface it sits on:

| surface | contrast |
|---|---|
| ivory `#f1f0e8` (every page ground) | **2.73 : 1** |
| sand `#efebe1` | **2.62 : 1** |
| verde `#3e5147` | **2.72 : 1** |
| ink `#2b2e2d` | 4.40 : 1 |

WCAG 2.4.11 requires **3 : 1** against adjacent colours. The ring fails on three of
the four surfaces the site uses, including the one under 90% of its content. A
keyboard user cannot see where they are. This is not a nuance — it is the single
worst defect on the site, and it is one rule.

### C2 · The bag drawer is not a dialog

The drawer is the checkout entry point. Measured on open: no `role="dialog"`, no
`aria-modal`, **focus is not moved into it**, **background scroll is not locked**,
the page behind is not inert, and focus is **not returned** on close.

A screen-reader user who adds to bag has their focus left behind a scrim, reading
a page they can no longer see. On a phone, the page scrolls underneath the open
drawer.

The damning part is that the site already contains the correct pattern: the scent
sheet built yesterday has `role="dialog"`, `aria-modal`, focus moved in, focus
trapped, scroll locked and Escape. **Two overlays, two standards.** The drawer and
the mobile menu need to be brought to the sheet's level, and that pattern extracted
so the next overlay inherits it.

### C3 · Brass text fails contrast almost everywhere it is used

Brass `#a98e63` on ivory is **2.73 : 1** where 4.5 : 1 is required. It is the
signature colour of every section eyebrow, every "in the margin" note, every
journal kicker — **392 failing text nodes per breakpoint**, the great majority of
them this one pairing. Footer headings (brass on ink) measure 4.40, also failing.
Body text at 60% opacity measures 3.13.

This cannot be fixed by nudging opacity. It needs a decision: darken the brass for
text use while keeping the drawn brass for rules and accents, or accept a
documented deviation. Given the volume — this colour is on every page, above every
heading — I would darken it. A brass at roughly `#7a6435` clears 4.5 : 1 on ivory
and is still recognisably the same pigment.

### C4 · No `<main>` and no skip link on any of 37 pages

Zero `<main>` landmarks sitewide. No skip-to-content link. Every keyboard user tabs
through the announcement bar, the logo, eight nav links and three utility links
before reaching content — on every single page, including a 4,000px story page.
This is the cheapest fix on the list and the most disproportionate in effect.

---

## HIGH

### H1 · The page is far heavier than it looks

Homepage: **2.42 MB over 31 requests, 2.09 MB of it images.** Product page 1.57 MB.
There is no `srcset`, no `<picture>`, no `decoding` hint, and no modern format — the
1800px hero JPEG is served intact to a 390px phone, which is roughly a 6× overdraw
on the largest asset on the site. On a mid-tier phone on 4G this is a slow LCP for
a brand whose entire proposition is that it feels expensive.

Fixing this is not a redesign: responsive `srcset` at three widths plus AVIF with
JPEG fallback would remove more than half the bytes without touching a layout.

### H2 · 253 images with no intrinsic dimensions

No `width`/`height` on any image, anywhere. Every plate reserves zero space until it
decodes, so every page reflows as it loads. On the story pages — a 620px full-bleed
band above the reading column — the text visibly jumps. This is the most common
cause of a site feeling cheap on a slow connection, and it is an attribute pair.

### H3 · Disabled buttons look identical to enabled ones

`:disabled` appears **zero times** in 101 KB of CSS. Add-to-bag sets
`button.disabled = true` for 1.4 s after a click. During that window the control
looks fully live and silently ignores taps. On a slow phone a customer taps it two
or three more times.

Likewise `:active` appears **zero times**. Nothing on the site acknowledges a press.
On touch, where there is no hover, that means the *only* feedback for tapping
anything is whatever happens next — which is why the site feels slightly dead under
the finger.

### H4 · Twelve breakpoints in two units, for a three-mode design

`34em, 40em, 47.9375em, 48em, 52em, 56em, 60em, 63.9375em, 64em, 67.9375em, 68em,
100em` — plus `767px` and `1023px` in the token layer. Fourteen thresholds, mixed
units, for a design that specifies exactly three modes.

Nothing is visibly broken, which is why it has survived, but every future change
has to guess which of fourteen thresholds is the right one, and the `em`/`px` mix
means two of them move when a user changes their browser font size and twelve do
not. This is the highest-leverage structural cleanup on the list: three named
breakpoints, one unit.

### H5 · Tap targets below the minimum, concentrated on mobile

444 block-level links render at **19 px tall** and 296 at 25 px. WCAG 2.5.8 sets
24 × 24 as the floor. The worst offenders are the footer link columns and the
`.ul` underlined links, which on a phone are a 19px target in a 24px rhythm. The
segmented size control and the quick-add buttons sit at 33–34 px — under the 44 px
comfort threshold though above the legal one.

### H6 · Heading order is broken on every page

23 skips: `h1 → h3` on the homepage, bag, confirmation and contact; `h1 → h4` and
`h2 → h4` wherever the footer appears — the footer column headings are `<h4>` under
whatever came last. Every page's screen-reader outline is wrong. The footer
headings are decorative labels and should not be headings at all.

---

## MEDIUM

### M1 · The motion scale is declared and then ignored

The token layer defines five durations — 100 / 250 / 500 / 800 / 1200 ms. The
stylesheet uses **eighteen**, of which **fifteen are off-scale**: 0.3 s ×12,
0.35 s ×9, 0.4 s ×9, 0.45, 0.6, 0.9 ×3, 0.95 ×2, 1.1, 1.6, 2.6 s. The easing is
perfectly consistent; the timing is not. The result is that similar gestures resolve
at subtly different speeds — a card hover at 400 ms, a button at 250, a nav at 350 —
and the eye reads that as imprecision without being able to name it.

### M2 · Six transitions animate layout

`transition: width` (3), `padding` (2), `max-height` (1) — the announcement bar
collapses by animating `max-height` and `padding`, the nav shrinks by animating
`padding`, and the wordmark shrinks by animating `width`. All three fire on scroll,
which is exactly when the main thread is busiest, and each forces a full reflow per
frame. They should be `transform` and `opacity`, or they should be instant.

### M3 · Five hardcoded brasses where there should be one token

`#a98e63`, `#D8C6A4`, `#d4c7a3`, `#d9c7a3`, `#dbc9a6`, `#D4A65C`, `#8C6128` — seven
values, all "brass", four of them within a few percent of each other and clearly
meant to be the same colour on dark grounds. There is no `--brass-on-dark` token, so
each band invented its own. Alongside these, **59 distinct rgba values** across 85
uses.

### M4 · Elevation has no system at all

Seven distinct shadows, no two related:
`0 1rem 2.5rem /.12`, `0 1.25rem 2rem /.08`, `0 1rem 2.5rem /.14`,
`-1.5rem 0 3.75rem /.2`, `0 -1px 0 /.14`, plus two insets. The Figma file defines
**no effect styles at all**, so every one of these was invented at the point of use.
On a flat, paper-like design, three shadows would do: hairline, raised, overlay.

### M5 · The stylesheet declares 36 hover states and one focus state

Hover is richly designed — cards lift, images develop, titles take brass, links draw
underlines. Focus gets a single global outline. Keyboard users get almost none of
the affordances mouse users get, and touch users get none of them either, because
`hover` on touch either never fires or sticks after a tap. Only three rules across
the whole sheet are guarded by `@media (hover:hover)`.

### M6 · No form validation design

`:invalid`, `aria-invalid` and any error styling appear **zero times** in the CSS and
JS. The share form, the newsletter and checkout all rely entirely on the browser's
native validation bubble — a system-styled popover in the wrong typeface that
disappears on the next click. For a site this carefully composed, that is the point
where the illusion breaks.

### M7 · No loading state anywhere

No skeletons, no pending state, no optimistic feedback beyond a text swap on
add-to-bag. Images pop in against unreserved space (see H2). Nothing tells a
customer that something is happening.

### M8 · 143 inline `font-family` declarations, in two fallback stacks

`--font-display`, `--font-serif`, `--font-sans` and `--font-script` are defined and
then used almost nowhere; the families are written out longhand 143 times. Worse,
the same face appears as both `'Libre Caslon Display',Georgia,serif` and
`'Libre Caslon Display',serif` — so if the webfont fails, part of the page falls back
to Georgia and part to the platform serif, at different metrics.

---

## LOW

### L1 · Thirteen z-index values with no layering model

`-2, -1, 0, 1, 2, 55, 60, 70, 90, 95, 120, 125, 200`. The scrim is 90, the drawer 95,
the sheet scrim 120, the sheet 125, the entrance veil 200, the sticky header 60.
Nothing collides today, but the numbers encode no intent, and 55/70 exist for
reasons no longer visible.

### L2 · `border-radius: 3px` on the payment chips

The system has exactly two radii, 0 and 2px. The payment marks in the footer use 3px.
One value, one place, wrong.

### L3 · The shelf footnote runs to 250 characters per line

`.foot` on the collection and homepage spans the full 1248px content width as a
single line — roughly 250 characters where 45–75 is readable. It is legible only
because it is short enough to scan, not because it is set well.

### L4 · 57 distinct untokenised spacing values

Mostly small `em`-based optical adjustments, which are defensible, but they sit
alongside `10px` gaps and `clamp(1rem,1.9vw,1.875rem)` one-offs that duplicate what
the space scale already provides.

### L5 · 57 inline `onclick` handlers on three sampled pages

Behaviour is attached in markup rather than bound in JS. It works, and it survives
the no-JS check, but it means a Content-Security-Policy without `unsafe-inline`
cannot be adopted without a rewrite — which is a launch-blocker for some payment
providers.

---

## COSMETIC

- **CS1** — 1,779 text nodes render below 11 px at desktop, floor 8.5 px. This is
  faithful to the artboards and it is a large part of why the site reads as
  expensive. It is also below what most people over forty can read comfortably in a
  dim room. Worth a deliberate decision rather than an inherited one.
- **CS2** — the `.k` kicker letter-spacing varies between `.22em`, `.24em`, `.26em`,
  `.28em`, `.30em` and `.32em` across sections. All are plausible; none is the token.
- **CS3** — the announcement bar is 43 px against a drawn 40, and the nav 81 px
  against 88. Both within 10%, both visible if you put the frames side by side.
- **CS4** — the footer is 470 px against a drawn 380. The excess is in the payment
  and legal row.
- **CS5** — story pages set three margin notes at a fixed 120 px rhythm regardless of
  article length, so on a short story they bunch at the top and on a long one they
  strand.

---

## What I would fix, in order

1. **C4, C1, C2** — a `<main>` landmark and skip link, a focus ring that can be
   seen, and the drawer brought up to the sheet's dialog standard. Half a day, and
   it moves the site from failing to passing on the things that get a brand sued.
2. **C3** — the brass decision. Needs Alex, not me: darken for text, or accept and
   document.
3. **H1, H2** — `srcset`, modern formats, intrinsic dimensions. The biggest
   perceived-quality win per line changed on the whole list.
4. **H3, M5** — `:disabled`, `:active`, and hover affordances mirrored onto focus.
5. **H4** — three breakpoints, one unit. Structural, invisible, and it makes
   everything after it cheaper.
6. **H6, M1, M3, M4, M8** — the consistency sweep: heading levels, five durations,
   one brass-on-dark token, three shadows, four font tokens.
7. Everything else.

**Nothing here is a rewrite.** The system is sound; it has drifted, and it never
took on the accessibility work. Items 1 and 3 alone would change how the site feels
more than any new feature could.

---

# Resolution — what changed

Measured after the work, with the same instruments.

| | before | after |
|---|---|---|
| Focus ring contrast on ivory | 2.73 : 1 | **12 : 1** |
| Failing text nodes, sitewide | 392 | **2** *(both text over veiled photography, where the walker reads the ground as ivory — visually correct)* |
| Pages with `<main>` and a skip link | 0 of 37 | **37 of 37** |
| Heading-order skips | 23 | **0** |
| Overlays meeting the dialog contract | 1 of 3 | **3 of 3** |
| `:disabled` / `:active` rules | 0 | present on every control |
| Homepage weight, mobile | 2 420 KB | **632 KB** |
| Homepage images, mobile | 2 085 KB | **270 KB** |
| Images without dimensions | 253 | **0** |
| Layout shift on load | unmeasured | **≈ 0** |
| Breakpoint units | px and em mixed | **em only** |
| Distinct transition durations | 22 | **6**, all on the token scale |
| Transitions animating layout | 6 | **0** |
| Inline `font-family` declarations | 143 | **0** |
| Distinct shadows | 7 invented | **3 tokens** |
| Hardcoded brass values | 7 | **3 tokens** (accent, text, inverse) |
| `z-index` literals | 13 arbitrary | **6 named layers** |
| Form validation | native bubbles only | inline, announced, cleared on fix |
| Tap targets under 24 px | 1 243 desktop / 799 mobile | **18** |

**Deliberately not done.** The 8.5 px type floor stands — it is faithful to the
artboards and it is a large part of why the site reads as expensive. The inline
event handlers stand until a Content-Security-Policy is actually required. No
redesign: every composition is where it was.

**One judgement call taken under standing authority.** Brass on ivory could not
reach 4.5 : 1 without moving. It is now three tokens rather than one: the drawn
brass `#a98e63` for rules, chips and marks, a darkened `#6f5a2f` wherever brass
is used as a colour for words, and `#d9c7a3` for brass on dark grounds — which
also absorbed the seven near-duplicate values that had been hand-rolled around
the site. The identity is unchanged at a glance; it is legible at reading size
for the first time.
