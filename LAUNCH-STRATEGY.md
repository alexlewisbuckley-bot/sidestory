# Side Story — launch strategy

Seven themes, ranked by return. Every complexity figure is measured blast radius,
not estimate. Nothing here is a feature; everything is the difference between a
site that works and a site that feels made.

**The governing principle:** the design system is sound. Almost every problem is
drift away from it, or an obligation it never took on. So the work is subtraction
and consolidation, not addition — and that is why the return is high. Roughly 1,900
lines of CSS and JS need about **250 lines changed**, most of them deletions.

---

## THEME 1 — Make it usable without a mouse
**Focus visibility · landmarks · overlay semantics · press states**

**Why it matters.** This is the only theme on the list where the site is currently
*failing*, not merely imperfect. A focus ring at 2.73:1 on the surface under 90% of
the content means a keyboard user genuinely cannot see where they are. The bag
drawer — the entry to checkout — has no dialog semantics, does not move focus, does
not lock scroll and does not return focus. There is no `<main>` and no skip link on
any of 37 pages.

**The user problem.** Someone navigating by keyboard, or with a screen reader, or
with a tremor that makes a trackpad unreliable, cannot buy from this site without
difficulty. On a phone, opening the bag lets the page scroll underneath it — that
one is not an accessibility edge case, it is everybody.

**Visual quality.** Moderate on its face, high in practice. A considered focus
state is one of the clearest signals that a product was finished rather than
shipped; the sites this is being measured against all have one. And `:disabled` and
`:active` — currently **zero occurrences in 101 KB of CSS** — are why the site feels
slightly dead under the finger: nothing acknowledges a press, and a button that
disables itself for 1.4 s after add-to-bag looks completely live while ignoring
taps.

**Complexity: low.** The focus ring is **one rule**. The landmark and skip link are
**one function** in the generator, regenerating all 37 pages. The drawer needs the
dialog behaviour the scent sheet **already has** — lift it into a shared helper and
apply it to the drawer, the mobile menu and the sheet, which is a net *reduction* in
JS. `:disabled` and `:active` across **five button classes**.

**Expected impact.** Removes every legal-exposure item on the audit. Makes the site
navigable by keyboard for the first time. Adds tactile feedback everywhere.
**~60 lines. Highest return on the list by a wide margin.**

---

## THEME 2 — Make it arrive as fast as it looks
**Responsive images · modern formats · intrinsic dimensions**

**Why it matters.** The homepage is **2.42 MB over 31 requests, 2.09 MB of it
images**. There is no `srcset`, no `<picture>`, no AVIF or WebP — the 1800 px hero
JPEG is delivered intact to a 390 px phone, roughly a 6× overdraw on the single
largest asset. Separately, **no image on the site declares width or height**, so
every page reflows as it decodes.

**The user problem.** The first impression of a £160 fragrance house is currently a
slow grey rectangle that then shoves the text down the page. Layout shift while
reading is the most reliable way to make an expensive site feel cheap, and it is
happening on every page, most visibly on the story pages where a 620 px band sits
above the reading column.

**Visual quality.** The largest perceived-quality gain available, and it changes no
layout at all. Perceived speed *is* perceived quality at this price point.

**Complexity: medium.** The photography already runs through one pipeline, so
emitting three widths and an AVIF alongside each JPEG is a change to
`tools/photos.py`, not to 37 pages. The markup side is **25 `<img>` emission points**
in the generator. Intrinsic dimensions come free from the same pipeline, since it
already knows every output's size.

**Expected impact.** Better than half the bytes gone. Zero layout shift. No visual
change whatsoever — the site looks identical and feels twice as expensive.
**~80 lines, mostly in the pipeline.**

---

## THEME 3 — Decide the brass
**One colour, used 392 times, currently failing**

**Why it matters.** Brass `#a98e63` on ivory measures **2.73:1** where 4.5 is
required. It is the signature colour of every section eyebrow, every margin note,
every journal kicker — **392 failing text nodes per breakpoint**, overwhelmingly
this one pairing. Alongside it sit **seven hardcoded near-duplicate brasses**
(`#D8C6A4`, `#d4c7a3`, `#d9c7a3`, `#dbc9a6`…) invented locally because there is no
brass-on-dark token.

**The user problem.** Small tracked brass text on ivory is hard to read for anyone
over about forty, in any room that is not brightly lit. It is used for the label
that tells you what section you are in.

**Visual quality.** This is the one theme with a real trade-off. Darkening the brass
to roughly `#7a6435` clears AA and stays recognisably the same pigment, but it *is*
a change to the brand's most distinctive accent. My recommendation: darken it for
text, keep the drawn brass for rules, chips and non-text accents, and add the
missing `--brass-on-dark` token so the seven local variants collapse to one.

**Complexity: low — but it is a decision, not a task.** **Eight declarations, 26
token uses.** Ten minutes of work behind a judgement that is Alex's to make.

**Expected impact.** Clears the single largest block of contrast failures and
removes a whole class of colour drift. **Blocked pending a decision.**

---

## THEME 4 — Three breakpoints, one unit
**Structural consolidation**

**Why it matters.** There are **15 distinct breakpoint thresholds across 55 media
queries**, in two units: `34em, 40em, 47.9375em, 48em, 52em, 56em, 60em, 63.9375em,
64em, 67.9375em, 68em, 100em`, plus `767px` and `1023px` in the token layer. The
design specifies exactly three modes.

**The user problem.** Almost none today — this is why it survived. But `em` and `px`
breakpoints respond differently when someone raises their browser font size, so at
125% text the layout crosses some thresholds and not others, and the result is
layouts nobody designed. There are also two overlapping systems governing the same
transitions.

**Visual quality.** Invisible when it lands, and the reason everything after it
becomes cheaper and safer to change. This is the theme that stops the site drifting
again.

**Complexity: medium, and unglamorous.** **55 media queries** to fold onto three
named thresholds. Mechanical, but it must be verified breakpoint by breakpoint —
which the existing harness already does at six widths.

**Expected impact.** No visible change if done correctly. Every subsequent change
gets faster and less risky, and font-size zoom stops producing undesigned layouts.

---

## THEME 5 — One motion language, actually applied
**Durations · layout-triggering transitions · hover parity**

**Why it matters.** The token layer defines **five durations**; the stylesheet uses
**22**, of which fifteen are off-scale. The easing is perfectly consistent — one
cubic-bezier, 65 uses — so the site already *feels* calm; it is the timing that
wobbles. Similar gestures resolve at different speeds (card hover 400 ms, button
250, nav 350) and the eye reads that as imprecision without being able to name it.

Separately, **six transitions animate layout properties** — `width`, `padding`,
`max-height` — and all three fire on scroll, forcing a reflow per frame at exactly
the moment the main thread is busiest.

And the sheet declares **36 hover states against one focus state**, with only three
rules guarded by `@media (hover:hover)` — so on touch, hover either never fires or
sticks after a tap.

**The user problem.** Nothing a customer could report, and everything they feel. The
scroll jank on the shrinking header is noticeable on a mid-tier Android.

**Visual quality.** High, and almost entirely subliminal. Consistent timing is a
large part of what separates Linear and Stripe from competent work.

**Complexity: low-to-medium.** **52 transition declarations**, snapped to five
values. Six layout transitions rewritten to `transform`/`opacity`. Hover affordances
mirrored onto `:focus-visible`, which overlaps Theme 1.

**Expected impact.** The site stops feeling *slightly* uneven. Scroll gets smoother
on mid-tier phones. **~50 edited lines, no new code.**

---

## THEME 6 — Collapse the remaining drift
**Elevation · typography tokens · heading order · z-index**

**Why it matters.** Four separate pockets of the same disease:

- **Seven shadows, no two related** — and the Figma file defines *no* effect styles,
  so every one was invented at the point of use. Three would do: hairline, raised,
  overlay.
- **143 inline `font-family` declarations** while four font tokens sit unused — and
  the same face appears in two different fallback stacks, so if the webfont fails,
  part of the page falls back to Georgia and part to the platform serif, at
  different metrics.
- **23 heading-order skips**, mostly the footer's four `<h4>`s landing under
  whatever came last. Every page's screen-reader outline is wrong; the fix is that
  those are decorative labels, not headings.
- **31 z-index declarations across 13 values** with no layering model.

**The user problem.** Individually trivial. Collectively this is the difference
between a system and a pile of decisions.

**Visual quality.** Low individually, high cumulatively — this is the theme that
makes the site *coherent* rather than merely consistent.

**Complexity: low, high line count.** Mostly find-and-replace with verification.

**Expected impact.** The design system becomes true again, which is what keeps
everything above from decaying.

---

## THEME 7 — Finish the edges
**Form validation · loading states · empty states · measure**

**Why it matters.** `:invalid`, `aria-invalid` and error styling appear **zero
times**. The share form, the newsletter and checkout all fall back to the browser's
native validation bubble — a system-styled popover in the wrong typeface that
vanishes on the next click. There are no loading or pending states anywhere. The
shelf footnote runs to **250 characters per line** where 45–75 is readable.

**The user problem.** The exact moments where a customer is most invested — filling
in the form that might get their story made into a fragrance, or paying — are the
moments the site stops being designed.

**Visual quality.** High at the moments that matter most, invisible the rest of the
time.

**Complexity: medium.** Real design work rather than consolidation; a validation
pattern has to be invented, because the Figma file has no error states for these
forms.

**Expected impact.** Removes the last places where the illusion breaks.

---

## Ranked by return

| # | Theme | Effort | Visual gain | Risk | Verdict |
|---|---|---|---|---|---|
| 1 | **Usable without a mouse** | ~60 lines | Moderate/high | Very low | **Do first.** Only theme where the site is failing. |
| 2 | **Arrive as fast as it looks** | ~80 lines | **Highest** | Low | Biggest perceived-quality win per line changed. |
| 3 | **Decide the brass** | ~10 lines | High | Low | **Blocked on Alex.** Ten minutes once decided. |
| 4 | **Three breakpoints** | 55 queries | Invisible | Medium | Do before 5 and 6, or you clean twice. |
| 5 | **One motion language** | ~50 lines | High, subliminal | Low | Cheap; large felt difference. |
| 6 | **Collapse the drift** | High count | Cumulative | Very low | Mechanical. Do last of the code work. |
| 7 | **Finish the edges** | Design work | High, localised | Medium | Genuine design decisions needed. |

---

## Recommended sequence

**Pass one — the failing things.** Themes 1 and 3. Half a day. Moves the site from
failing to passing on everything that carries legal exposure, and gives keyboard and
touch users the affordances mouse users already have. Theme 3 needs your call on the
brass before I start.

**Pass two — the felt things.** Theme 2. This is where a customer notices, without
being able to say why. No layout changes, no visual risk.

**Pass three — the structural things.** Themes 4, then 5, then 6, in that order —
breakpoints first because 5 and 6 both touch rules inside media queries, and doing
it the other way means cleaning the same lines twice.

**Pass four — the edges.** Theme 7, with a review point before I invent a validation
pattern the design file does not contain.

**Then a full-site review** at every breakpoint against the audit, to catch what the
work itself introduced. I would not trust any of the above without it.

---

## What I would not do

**Not a redesign.** Nothing in the audit argues for one. The composition is good;
the system underneath it has drifted.

**Not new features.** The gap between this site and a world-class one is entirely in
finish.

**Not chase the 8.5 px type.** 1,779 text nodes render below 11 px, and it is a
large part of why the site reads as expensive. It is faithful to the artboards. I
have flagged it, and I would leave it deliberate rather than fix it by reflex — but
it deserves a conscious decision rather than an inherited one.

**Not remove the inline handlers** unless a Content-Security-Policy is on the
roadmap. They work and they survive the no-JS check. If a payment provider demands
CSP without `unsafe-inline`, this becomes urgent; until then it is churn.
