# Side Story Parfums — experience demo

A static, deploy-ready demo of the Side Story digital flagship, built from the Figma design system.
**Demo only** — no real transactions, no backend. Cart state lives in `sessionStorage`.

## Pages
| Route | File | Purpose |
|---|---|---|
| `/` | `index.html` | Homepage — hero, the seven, chapter showcase, feelings, making, journal, gifting |
| `/collection` | `collection.html` | Collection / PLP with filters |
| `/product` | `product.html` | Product page (accepts `?f=hotel-lobby` etc.) |
| `/stories` | `stories.html` | Your Stories index |
| `/story` | `story.html` | Story template — Sunday Service |
| `/share` | `share.html` | Share your story — open call + submission form |
| `/bag` | `bag.html` | Bag |
| `/checkout` | `checkout.html` | Checkout |
| `/confirmation` | `confirmation.html` | Order confirmation |

## Running locally
No build step. Any static server:
```bash
npx serve .
# or
python3 -m http.server 8000
```

## Deploying
Vercel: import the repo, framework preset **Other**, no build command, output directory `.`
`vercel.json` enables clean URLs (`/product` rather than `/product.html`).

## Notes for build
- Fonts are Google stand-ins for the brand faces: Libre Caslon (→ Kings Caslon), Montserrat (→ Gotham), Cormorant Garamond (inscription voice).
- Imagery is placeholder/existing product photography, cropped for web. See the photography brief for the shot list.
- Motion uses a single easing curve, `cubic-bezier(.22,1,.36,1)`, and respects `prefers-reduced-motion`.
