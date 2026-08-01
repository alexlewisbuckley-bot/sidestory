# Prototype → build gap analysis

Full sweep of Figma page **P10 — Interactive Prototype** (60+ frames) against the
21 built pages. Nothing already built and approved is being removed; this is
purely what the prototype specifies and the site does not yet have.

Status key: **✅ built** · **◐ partial** · **✗ missing**

---

## 1. Missing pages

| Prototype frame | Built | Note |
|---|---|---|
| `PAGE — Journal Article` (108:625) | ✗ | Only the journal index exists. Article template with pull quotes and a related strip. |
| `PAGE — Checkout · payment` (124:904) | ✗ | Checkout is one step; the prototype has a second payment step. |

## 2. Missing states and overlays

| Prototype frame | Built | Note |
|---|---|---|
| `A2 · Menu open` — mega-panel (90:79) | ✗ | Two link columns (Shop / Read) plus two feature cards, over a dimmed page. |
| `STATE — Search overlay` (108:701) | ◐ | Exists as a page, not the overlay the prototype specifies. |
| `STATE — Search open (typing)` (115:822) | ✗ | Live results: stories column, journal column, "search looks inside the stories too". |
| `STATE — PLP · by stone open` (115:849) | ✗ | Stone panel under the filter bar. **Hover a stone and every other card recedes to 40% — the shelf filters before you click.** |
| `STATE — Checkout · payment error` (124:945) | ✗ | Declined-card banner and recovery. |
| `STATE — PDP · out of stock` (124:988) | ✗ | Notify-me replacement for the buy block. |
| `STATE — Story sent` (169:1233) | ◐ | Currently an inline line of text; the prototype has a full confirmation screen. |
| `E1 · Newsletter — confirmed` (97:253) | ✗ | Form becomes a receipt. |
| `A0 → A1 → A1b · Arrival` (90:53, 90:27, 115:794) | ✗ | **Hero is a two-image sequence with an entrance veil**, not a single still. |

## 3. Missing sections within existing pages

**PDP** — prototype has eight bands, the build has four.

| Band | Built |
|---|---|
| `pdp main` | ✅ |
| `pdp · story band` | ◐ has a short band |
| `pdp · the story` (108:625 style — chapter I of IX, dropcap, overlapping plates) | ✗ |
| `pdp · the margins` | ✗ |
| `pdp · the stone` | ✗ |
| `pdp · cross-sell` | ✅ |

**PLP** — `06 · campaign band` ✗ · `07 · discovery` ✗

**Our House** — `09 · materiality` ✗ · `09b · journal` ✗ · `11 · credentials` ✗

**Gifting** — `masons mark` ✗ · `gift picks` ✗ · `11 · credentials` ✗

**Samples** — `set feature` ◐ · `06b · begin with a feeling` ✗

**Story page** — `story nav` (previous/next) ✗ · `share invite` ✗ · `all seven strip` ✗

**Your Stories index** — `featured story` ✗ (grid only at present)

**Share Your Story** — `how it works` ✗ · `from the postbag` ✗ · `the small print` ✗

## 4. Micro-interactions — the µ specs, verbatim from the prototype

| Spec | Built |
|---|---|
| **µ1 CARD** — image develops +6% inside a fixed crop (never the frame), card lifts on shadow, title takes brass. 400ms. | ◐ image scales 3.5%, no lift, no brass title |
| **µ2 SIZE OPTION** — hairline inks to 90%, field tints 6% ink. Selection is an instant fill swap, no animation on commitment. | ◐ |
| **µ3 BAG ROW** — row warms to sand, REMOVE inks in and underlines; destructive action only visible when attended. 300ms. | ✗ |
| **µ5 GALLERY** — main image develops on thumb click, dissolve 400ms; hairline moves to the active thumb. No sliding, no zoom theatrics. | ◐ dissolve present, hairline present, timing wrong |
| `C0 → C1 Chapter develop/settled` | ◐ |
| `F1 Footer link hover` | ◐ |
| `G1 Journal card hover` | ◐ |
| `D1 Feelings hover` | ✅ |

---

## Order of work

1. **Hero sequence + mega menu** — the two things on every visit.
2. **PDP story bands** — the chapter block, the margins, the stone. This is the brand's whole argument and it is the biggest single omission.
3. **µ1 card hover** — image rests large and zooms out on hover to open room for the buy controls, desktop only — then µ2, µ3, µ5.
4. **Search overlay** (both states) and the **PLP stone panel** with the 40% recede.
5. **Section gaps** on Our House, Gifting, Samples, PLP, Story, Your Stories, Share.
6. **Journal Article** page. *(Stone Registry dropped at your request.)*
7. **Remaining states**: payment step + error, out of stock, story sent, newsletter confirmed.

Each item lands with harness coverage so it cannot regress.
