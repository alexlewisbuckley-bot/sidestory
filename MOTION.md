# Side Story — Motion System

The rule that governs everything: **motion is a surface property, not a spatial one.**
Nothing on this site lifts, drops a shadow, bounces or springs. Things ink in,
warm their ground, draw their rule, and settle. The user should never notice an
animation — only that every interaction lands softly.

## Tokens (defined once, in `app.css`)

| Token | Value | Used for |
|---|---|---|
| `--settle` | `cubic-bezier(.22,1,.36,1)` | the only curve on the site — fast out, long soft landing |
| `--d-instant` | 100ms | a press, a tick — felt, not seen |
| `--d-quick` | 250ms | state on a control: colour, rule, opacity, the radio dot |
| `--d-settled` | 500ms | something arriving: a panel, a quick-add, accordion content, gallery crossfade |
| `--d-slow` | 800ms | image and reveal — the only motion meant to be noticed |
| `--d-cinematic` | 1.2s | the arrival veil, once per session |
| `--d-ambient` | 16s | the hero's drift, the ticker's pace |

**Distances:** reveals travel ≤ 14px; hover travel ≤ 6px; a press travels 1px.
**Stagger:** 70ms between siblings entering together, capped at 5 steps.
**Layering:** background media (films, Ken Burns) may move continuously; content
may move only in response to the user (scroll, hover, press).

## The vocabulary

- **The drawn rule** — nav links reveal an underline by `scaleX` from the left;
  editorial `.ul` links redraw theirs on hover (out to the right, in from the
  left — the same line, re-read). State on `<summary>`, sizes and thumbs is a
  painted rule, never a fill.
- **Ink and brass** — hover changes a word's colour, `--d-quick`, nothing else.
- **The settle** — panels (menu, search, drawer, sheet, sticky bar) translate
  in ≤ 16px with opacity, `--d-settled`, and the scrim breathes with them.
- **The breath** — accordion content and confirmations arrive with 4px of rise
  and a fade; heights are never animated.
- **The commitment dot** — radio selection grows its dot from the ring's
  centre (`background-size` 0→100%, `--d-quick`).
- **The press** — every `.btn:active` sits down 1px for `--d-instant`.
- **The creamy zoom** — product imagery scales 1.00→1.03 over `--d-slow` on
  hover; gallery swaps crossfade opacity over `--d-settled`. Nothing pops.
- **The tick** — the bag count hops `-.35em` when something lands in it.
- **The fan** — the style index's stone chips ease 2/4/6px apart under the hand.
- **The writing line** — input focus thickens the baseline via an easing
  box-shadow; the field never reflows.

## Restraint (deliberate non-motion)

Prices, totals and legal text never animate. The footer is still. Filters hide
cards on one debounced beat (`settle()` queue, 100ms) rather than animating
each card away. No parallax beyond the fixed background plates; no cursor-aware
movement; no kinetic type. Some sections simply appear — rhythm needs rests.

## Performance & accessibility

Transforms and opacity only (the two compositor properties); `background-size`
is used solely on ≤14px dots/underlines where paint cost is negligible. No
layout properties are transitioned. `prefers-reduced-motion` clamps every
animation to 0.01ms and every transition to `--d-instant` globally; the ticker
unwinds to a timed swap, films never load, the accordion breath is gated behind
`no-preference`, and every state remains fully legible with zero motion.
