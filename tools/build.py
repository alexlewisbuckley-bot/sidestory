#!/usr/bin/env python3
"""
Side Story — static site builder.

Every page is emitted from here so the head, announcement bar, navigation,
footer and bag drawer are byte-identical across the site. Change the nav in one
place and all 21 pages follow. Asset URLs are fingerprinted with a content hash
so a stale stylesheet can never be served against fresh markup.

    python3 tools/build.py
"""
import hashlib, html, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import photos

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def fp(path):
    """Content hash for cache-busting."""
    full = os.path.join(ROOT, path)
    if not os.path.exists(full):
        return path
    h = hashlib.md5(open(full, "rb").read()).hexdigest()[:8]
    return f"{path}?v={h}"


# ---------------------------------------------------------------- data ----

PRODUCTS = [
    dict(slug="hotel-lobby",    name="Hotel Lobby",    stone="Nero Marquina",  swatch="#1C1D1D",
         notes="woods, spice, green",        story="Story I",   feeling="Anticipation",
         line="It was ten minutes before eight when she arrived, and the bar had just begun to forgive the afternoon.",
         img="p-hotel-lobby", badge="Bestseller", read="5 min"),
    dict(slug="sibling-rivalry", name="Sibling Rivalry", stone="Leopard Salome", swatch="#8A6A3F",
         notes="grapefruit, vetiver, smoke", story="Story II",  feeling="Mischief",
         line="There is a particular silence that only a brother can make, and she had been listening to it for thirty years.",
         img="p-sibling-rivalry", badge="", read="6 min"),
    dict(slug="pillow-talk",    name="Pillow Talk",    stone="Calacatta",      swatch="#E0DCD0",
         notes="musk, powder, warm skin",    story="Story III", feeling="Comfort",
         line="They agreed on almost nothing except the hour, and the hour was always late.",
         img="p-pillow-talk", badge="", read="4 min"),
    dict(slug="sunday-service", name="Sunday Service", stone="Verde Jade",     swatch="#3E5147",
         notes="incense, linen, morning air", story="Story IV", feeling="Devotion",
         line="The road home has not been resurfaced in twenty years, and neither has the part of me that drives it.",
         img="p-sunday-service", badge="", read="7 min"),
    dict(slug="third-date",     name="Third Date",     stone="Rosso Levanto",  swatch="#7A2E2A",
         notes="plum, tobacco, candlelight",  story="Story V",  feeling="Attraction",
         line="By the third one you stop performing, which is either the end of it or the beginning.",
         img="p-third-date", badge="", read="5 min"),
    dict(slug="road-trip",      name="Road Trip",      stone="Rosso Francia",  swatch="#B5593F",
         notes="amber, leather, warm wind",   story="Story VI", feeling="Escape",
         line="We left before the light did and agreed not to name the destination until the second tank.",
         img="p-road-trip", badge="New story", read="6 min"),
    dict(slug="4pm-matinee",    name="4pm Matinee",    stone="Giallo Siena",   swatch="#C99A3F",
         notes="citrus, velvet, dark rooms",  story="Story VII", feeling="Solitude",
         line="Nobody goes to the cinema at four in the afternoon unless they are hiding from something.",
         img="p-4pm-matinee", badge="", read="5 min"),
]
BY_SLUG = {p["slug"]: p for p in PRODUCTS}

# The PDP story bands. Written per fragrance so the chapter, the margins and the
# stone all speak about the same bottle rather than sharing generic copy.
CHAPTERS = {
  "hotel-lobby": dict(
    pull="Eight o\u2019clock passed without appearing to.", pullref="From Hotel Lobby, Chapter II",
    numeral="I", chapter="Chapter I of IX", title="The lobby at ten to eight.", author="Morgan Childs",
    paras=["It was ten minutes before eight when she arrived, and the lobby had already decided the evening for her. The revolving door gave its slow, museum turn; the marble took her heels and made them sound deliberate. At the bar, the wood had been polished so long it had opinions.",
           "She asked for nothing yet. The barman, who understood waiting the way sommeliers understand rain, set down a glass of ice and let it speak."],
    scent="antique bergamot, poured over ice \u2014 the scent begins where the chapter does",
    caption="the chapter, photographed as it was written \u2014 box, liner, and the bar\u2019s low light",
    margins=[("Opening","antique bergamot, poured over ice","\u2014 as she crosses the marble"),
             ("Heart","polished cedar \u2014 the bar\u2019s opinion","\u2014 the hand rests on the counter"),
             ("Base","sandalwood, faint incense, warm amber","\u2014 eight o\u2019clock passes unnoticed")],
    stone_title="Nero Marquina, cut once.",
    stone_body="Quarried at Markina-Xemein, its veining decided by nature alone \u2014 your lid\u2019s pattern exists on no other bottle, and will not be cut again."),

  "sibling-rivalry": dict(
    pull="He had been winning the same argument since 1994.", pullref="From Sibling Rivalry, Chapter IV",
    numeral="II", chapter="Chapter I of IX", title="Two brothers, one kitchen.", author="Nell Ferreira",
    paras=["There is a particular silence that only a brother can make, and she had been listening to it for thirty years. It arrived with the kettle, sat down uninvited, and waited to be contradicted.",
           "The kitchen had not changed. The argument had not changed. Only the two of them had, and not in the places that would have helped."],
    scent="grapefruit cut with smoke \u2014 sharp first, then unwilling to leave",
    caption="the chapter, photographed as it was written \u2014 the table, the kettle, the unfinished sentence",
    margins=[("Opening","grapefruit, bitten not peeled","\u2014 the first thing either of them says"),
             ("Heart","vetiver, green and unbothered","\u2014 neither of them apologises"),
             ("Base","birch smoke, faint tar","\u2014 and still nobody leaves the room")],
    stone_title="Leopard Salome, cut once.",
    stone_body="A brecciated marble whose fracture lines were set long before anyone thought to quarry it \u2014 the seam on your lid runs in one direction only, and once."),

  "pillow-talk": dict(
    pull="What is said in the dark, and the longer thing that is not.", pullref="From Pillow Talk, Chapter III",
    numeral="III", chapter="Chapter I of IX", title="They agreed on the hour.", author="Iris Vandeleur",
    paras=["They agreed on almost nothing except the hour, and the hour was always late. It was the one negotiation neither of them wanted to win, so they returned to it nightly, like a book left face-down.",
           "The room kept its own weather: linen still warm, a lamp neither of them reached to turn off, and the particular quiet that only arrives after everything worth saying has been said badly."],
    scent="warm skin under cotton \u2014 nothing announced, everything understood",
    caption="the chapter, photographed as it was written \u2014 linen, lamplight, the hour kept late",
    margins=[("Opening","powder, soft as a first sentence","\u2014 the lamp is still on"),
             ("Heart","white musk, skin-warm","\u2014 neither of them moves"),
             ("Base","cashmere wood, faint vanilla","\u2014 what is not said, said longest")],
    stone_title="Calacatta, cut once.",
    stone_body="One grey seam through a white field, running off-centre because the block decided so \u2014 the lid on your bottle is the only one that will carry that line."),

  "sunday-service": dict(
    pull="The music was the same. The cool, oaky air of the church was the same.", pullref="From Sunday Service, Chapter V",
    numeral="IV", chapter="Chapter I of IX", title="The road home, unresurfaced.", author="Morgan Childs",
    paras=["The road home has not been resurfaced in twenty years, and neither has the part of me that drives it. Past the reservoir the trees close over the lane the way they always did, and there \u2014 still standing, still rusted the colour of a wet penny \u2014 is the gate we used to climb.",
           "Inside, the cool oaky air arrives before the organ does \u2014 polish and cold stone and the ghost of last week\u2019s lilies \u2014 and I am eleven again in an itching jumper, and thirty-eight, and neither."],
    scent="church oak and beeswax \u2014 cold air held in clean linen",
    caption="the chapter, photographed as it was written \u2014 stone, polish, and the last of the lilies",
    margins=[("Opening","cold water, cut grass","\u2014 the gate, still rusted"),
             ("Heart","incense over pressed linen","\u2014 the organ starts before you are ready"),
             ("Base","beeswax, church oak, old stone","\u2014 and you are eleven again")],
    stone_title="Verde Jade, cut once.",
    stone_body="Green under the polish and almost black away from the light \u2014 quarried in a seam that gives perhaps a dozen lids a year, and never the same twice."),

  "third-date": dict(
    pull="By the third one you stop performing.", pullref="From Third Date, Chapter II",
    numeral="V", chapter="Chapter I of IX", title="The third one, and after.", author="Nell Ferreira",
    paras=["By the third one you stop performing, which is either the end of it or the beginning. The menu is no longer a prop. The stories have run out of their best versions and have started telling themselves honestly, which is slower and much more dangerous.",
           "There was a candle between them doing the work of a much larger fire, and neither of them moved it out of the way."],
    scent="plum and tobacco \u2014 the point where the evening stops being polite",
    caption="the chapter, photographed as it was written \u2014 candle, glass, and the second bottle",
    margins=[("Opening","dark plum, barely sweet","\u2014 the menu is put down"),
             ("Heart","tobacco leaf, warm and dry","\u2014 the stories stop being edited"),
             ("Base","benzoin, candle smoke","\u2014 nobody suggests leaving")],
    stone_title="Rosso Levanto, cut once.",
    stone_body="Deep red run through with white \u2014 a stone that looks composed and is entirely accidental. Your lid\u2019s pattern was decided in the block, not by us."),

  "road-trip": dict(
    pull="We agreed not to name the destination until the second tank.", pullref="From Road Trip, Chapter I",
    numeral="VI", chapter="Chapter I of IX", title="Before the light did.", author="Iris Vandeleur",
    paras=["We left before the light did and agreed not to name the destination until the second tank. The windows came down somewhere past the second roundabout and stayed down, which meant conversation had to be shouted or abandoned. We abandoned it.",
           "The road warmed as the morning did. By ten the car smelled of hot upholstery, someone\u2019s cigarette from a decade ago, and whatever grows beside a road in July."],
    scent="warm wind through an open window \u2014 leather, amber, dust",
    caption="the chapter, photographed as it was written \u2014 the road, the light, the second tank",
    margins=[("Opening","hot dust, bright and dry","\u2014 the windows come down"),
             ("Heart","worn leather, sun on the seat","\u2014 conversation is abandoned"),
             ("Base","amber, faint petrol, warm tar","\u2014 nobody names the destination")],
    stone_title="Rosso Francia, cut once.",
    stone_body="Warm and veined like an old map, which is the whole joke \u2014 no two lids agree on the route, and yours will not be repeated."),

  "4pm-matinee": dict(
    pull="Nobody goes to the cinema at four unless they are hiding from something.", pullref="From 4pm Matinee, Chapter I",
    numeral="VII", chapter="Chapter I of IX", title="The four o\u2019clock showing.", author="Morgan Childs",
    paras=["Nobody goes to the cinema at four in the afternoon unless they are hiding from something. The foyer knows it and is kind about it: the carpet takes your footsteps, the girl on the desk does not ask, and the room beyond is already dark.",
           "There were nine of us. We sat with an empty seat between each, like a code, and for two hours the afternoon was somebody else\u2019s problem."],
    scent="citrus in a dark room \u2014 velvet, dust, and an afternoon spent elsewhere",
    caption="the chapter, photographed as it was written \u2014 foyer light, velvet, the empty seat",
    margins=[("Opening","bergamot and bitter orange","\u2014 the foyer, before the dark"),
             ("Heart","iris over warm velvet","\u2014 nine people, nine empty seats"),
             ("Base","dry cedar, faint dust","\u2014 two hours that belong to nobody")],
    stone_title="Giallo Siena, cut once.",
    stone_body="A yellow marble that reads gold under lamplight and sand under daylight \u2014 the lid you receive will do both, in a pattern cut only once."),
}

JOURNAL = [
    dict(slug="ten-to-eight", kicker="Campaign · 5 min read", img="p-third-date-1.jpg",
         title="Ten to Eight — the autumn story, on film",
         sub="Shot in a Lisbon hotel that asked not to be named."),
    dict(slug="story-first", kicker="Founders · 4 min read", img="founders.jpg",
         title="Why we write the story before the scent",
         sub="On briefs, fiction, and arguments worth keeping."),
    dict(slug="cutting-verde-jade", kicker="Atelier · 6 min read", img="stone-shelf.jpg",
         title="Cutting Verde Jade — a lid diary",
         sub="Six weeks, one seam, and the cut that decided the season."),
]

# ------------------------------------------------------------- chrome ----

# only The Fragrances opens the mega panel; the rest are plain links
MEGA_FOR = "collection.html"

NAV_LINKS = [
    ("collection.html", "The Fragrances"),
    ("stories.html",    "Your Stories"),
    ("share.html",      "Share Yours"),
    ("samples.html",    "Samples"),
    ("gifting.html",    "Gifting"),
    ("our-house.html",  "Our House"),
]

FOOTER_COLS = [
    ("The Shelf",     [("collection.html", "The Fragrances"), ("samples.html", "The First Lines"),
                       ("samples.html", "Samples"), ("gifting.html", "Gifting")]),
    ("The House",     [("our-house.html", "Our Story"), ("our-house.html#making", "The Making"),
                       ("our-house.html#stones", "The Stones"), ("journal.html", "Atelier Journal")]),
    ("The Practical", [("shipping.html", "Shipping &amp; Returns"), ("stockists.html", "Stockists"),
                       ("contact.html", "Contact"), ("faq.html", "FAQ")]),
]


def head(title, desc, css):
    links = "\n".join(f'<link rel="stylesheet" href="{fp(c)}">' for c in css)
    return f"""<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title} · Side Story — Parfums &amp; Oils</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#2B2E2D">
<link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">
<link rel="icon" href="favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="assets/img/apple-touch-icon.png">
<link rel="preload" as="font" type="font/woff2" crossorigin href="assets/fonts/libre-caslon-display-latin-400-normal.woff2">
<link rel="preload" as="font" type="font/woff2" crossorigin href="assets/fonts/libre-caslon-text-latin-400-normal.woff2">
<link rel="preload" as="font" type="font/woff2" crossorigin href="assets/fonts/montserrat-latin-500-normal.woff2">
{links}
</head><body>
"""


def topbar(current):
    cur = ' aria-current="page"'
    items = "\n      ".join(
        '<a href="%s"%s%s>%s</a>' % (href, ' data-mega="1"' if href == MEGA_FOR else "",
                                     cur if href == current else "", label)
        for href, label in NAV_LINKS)
    return f"""<div class="enter-veil" aria-hidden="true"></div>
<div class="menu-dim" id="menudim"></div>
<div class="topbar">
<div class="ann"><span>A second story’s sample, complimentary with every bottle</span></div>
<header class="nav">
  <div class="inner">
    <button class="burger" aria-label="Menu" aria-expanded="false"><i></i><i></i><i></i></button>
    <a class="brand" href="index.html" aria-label="Side Story — Parfums &amp; Oils"><img src="{fp('assets/img/logo.svg')}" alt="Side Story — Parfums &amp; Oils"></a>
    <nav class="links" aria-label="Primary">
      {items}
    </nav>
    <div class="mega" id="mega" hidden>
      <div class="inner">
        <div>
          <h4>Shop</h4>
          <a class="ml" href="collection.html">All seven stories</a>
          <a class="ml" href="collection.html#by-feeling">By feeling</a>
          <a class="ml" href="collection.html#by-stone">By stone</a>
          <a class="ml" href="samples.html">Samples &mdash; &pound;5</a>
          <a class="ml" href="samples.html">The First Lines &mdash; &pound;38</a>
        </div>
        <div>
          <h4>Read</h4>
          <a class="ml" href="stories.html">The stories</a>
          <a class="ml" href="our-house.html#making">The making</a>
          <a class="ml" href="our-house.html#stones">The stones</a>
          <a class="ml" href="journal.html">Atelier journal</a>
        </div>
        <a class="feature" href="product-hotel-lobby.html">
          <img src="{fp('assets/img/p-hotel-lobby-card.jpg')}" alt="Hotel Lobby eau de parfum" loading="lazy">
          <span>Bestseller &mdash; Hotel Lobby, &pound;160</span></a>
        <a class="feature" href="samples.html">
          <img src="{fp('assets/img/set-first-lines.jpg')}" alt="The First Lines discovery set" loading="lazy">
          <span>Begin here &mdash; The First Lines, &pound;38</span></a>
      </div>
    </div>
    <div class="util">
      <a href="search.html">Search</a><a href="account.html">Account</a>
      <button class="bagbtn" onclick="openDrawer()">Bag (<span id="bagcount">0</span>)</button>
    </div>
  </div>
</header>
</div>
"""


def footer():
    cols = "\n      ".join(
        "<div><h4>%s</h4>%s</div>" % (h, "".join(f'<a href="{u}">{t}</a>' for u, t in ls))
        for h, ls in FOOTER_COLS)
    return f"""<footer>
  <div class="inner">
    <div class="cols">
      {cols}
    </div>
    <div class="fmid">
      <p class="fcopy">&copy; Side Story Parfums MMXXVI &middot; Made in Grasse</p>
      <div class="fbrand"><img src="{fp('assets/img/logo-ivory.svg')}" alt="Side Story &mdash; Parfums &amp; Oils"></div>
    </div>
    <div class="fbot">
      <div class="pay"><i>VISA</i><i>MC</i><i>AMEX</i><i>&#63743;Pay</i></div>
      <p class="legal"><a href="legal.html">Privacy</a> &middot; <a href="legal.html">Terms</a> &middot; <a href="legal.html">Cookies</a> &nbsp; United Kingdom (GBP &pound;)</p>
    </div>
  </div>
</footer>
"""


DRAWER = """<div class="scrim" id="scrim" onclick="closeDrawer()"></div>
<aside class="drawer" id="drawer" aria-label="Your bag">
  <div class="dhead"><span>Your bag &mdash; <span data-bagcount>0</span></span><button onclick="closeDrawer()">Close</button></div>
  <div id="ditems"></div>
  <label class="tryfirst"><input type="checkbox" checked>
    <div><b>Try a second story first</b><span>A complimentary 2ml of another story &mdash; its argument &mdash; tucked into the parcel.</span></div></label>
  <p class="thresh" id="thresh">Complimentary delivery at &pound;100</p>
  <div class="tbar"><div class="tfill" id="tfill"></div></div>
  <div class="dtot"><span>Subtotal</span><b id="dtotal">&pound;0</b></div>
  <a class="btn btn-ink" href="checkout.html">Checkout</a>
  <p class="dfine">Tax included &middot; 30-day returns &middot; sample cost redeemed</p>
</aside>
"""


def catalogue_json():
    """The bag reads this instead of carrying its own copy of the product list —
    that duplicate is what left the drawer pointing at image files the photo
    pipeline had stopped producing."""
    import json
    data = {p["slug"]: dict(name=p["name"], stone=p["stone"], col=p["swatch"],
                            notes=p["notes"], price=160,
                            img="assets/img/p-%s-card.jpg" % p["slug"],
                            href="product-%s.html" % p["slug"])
            for p in PRODUCTS}
    data["set"] = dict(name="The First Lines", stone="", col="#3E5147",
                       notes="all seven in miniature", price=38,
                       img="assets/img/set-first-lines.jpg", href="samples.html")
    return json.dumps(data, ensure_ascii=False)


def page(slug, title, desc, body, current=None, css=("assets/css/fonts.css", "assets/css/app.css")):
    out = head(title, desc, css) + topbar(current or (slug + ".html")) + body.strip() + "\n" \
        + footer() + DRAWER \
        + f'<script>window.SS_CAT={catalogue_json()};</script>\n' \
        + f'<script src="{fp("assets/js/site.js")}"></script>\n</body></html>\n'
    with open(os.path.join(ROOT, slug + ".html"), "w") as f:
        f.write(out)
    return len(out)


# ----------------------------------------------------------- fragments ----

def crumbs(*parts):
    bits = []
    for p in parts[:-1]:
        bits.append(f'<a href="{p[1]}">{p[0]}</a>')
    bits.append(parts[-1][0] if isinstance(parts[-1], tuple) else parts[-1])
    return '<p class="crumb">' + " / ".join(bits) + "</p>"


def product_card(p, reveal=True):
    badge = f'<span class="badge">{p["badge"]}</span>' if p["badge"] else ""
    return f"""      <article class="card{' rev' if reveal else ''}" data-order="{PRODUCTS.index(p)}" data-feeling="{p['feeling']}" data-stone="{p['stone']}" data-note="{p['notes'].split(',')[0].strip()}">
        <div class="ph"><a href="product-{p['slug']}.html"><img src="{fp('assets/img/' + p['img'] + '-card.jpg')}" alt="{p['name']} eau de parfum" loading="lazy"></a>{badge}
          <div class="quick"><div class="r">
            <button class="btn btn-ink btn-sm" onclick="addToBag('{p['slug']}','full',this)">100ml &mdash; &pound;160</button>
            <button class="btn btn-ghostink btn-sm" onclick="addToBag('{p['slug']}','sample',this)">Sample &pound;5</button>
          </div><small>The printed story is in the box</small></div></div>
        <div class="meta"><span class="chip" style="background:{p['swatch']}"></span><span class="stone">{p['stone']}</span>
          <h3>{p['name']}</h3><p class="notes">{p['notes']}</p>
          <p class="price"><span>&pound;160 &middot; 100 ml</span><a class="ul" href="product-{p['slug']}.html">View</a></p></div>
      </article>"""


PROMO_CARD = """      <article class="promo rev">
        <p class="k">Undecided?</p><h3>The First Lines</h3>
        <p>All seven stories in miniature &mdash; read them on your own skin. &pound;38, credited against your first full bottle.</p>
        <div><a class="btn btn-ghost btn-sm" href="samples.html">Begin the set</a></div>
      </article>"""


# --------------------------------------------------------------- pages ----

def build():
    written = {}

    # ---- 01 home (body kept in tools/parts/home.html) --------------------
    # The fragment is authored with plain asset paths; fingerprint them here so
    # the homepage cannot serve a stale image while every generated page serves
    # a fresh one. That mismatch is exactly what made the homepage cards look
    # unfixed after the crops were corrected.
    home_body = open(os.path.join(ROOT, "tools/parts/home.html")).read()
    home_body = re.sub(r'(href|src)="(assets/(?:img|css|js)/[^"?]+)"',
                       lambda m: '%s="%s"' % (m.group(1), fp(m.group(2))), home_body)
    # the gallery swaps images from an inline handler, so hash those paths too
    home_body = re.sub(r"'(assets/img/[^'?]+)'",
                       lambda m: "'%s'" % fp(m.group(1)), home_body)
    written["index"] = page("index", "Stories, carved in scent",
        "Seven fine fragrances, each begun as a commissioned short story and sealed beneath a hand-carved stone lid.",
        home_body, current="index.html")

    # ---- 02 collection ---------------------------------------------------
    cards = "\n".join(product_card(p) for p in PRODUCTS) + "\n" + PROMO_CARD
    written["collection"] = page("collection", "The Fragrances",
        "Seven stories, worn as scent. Eau de parfum, 100ml, £160 — samples always £5 and always redeemable.", f"""
<section class="seven">
  <div class="inner">
    {crumbs(("Home", "index.html"), "The Fragrances")}
    <div class="phead">
      <p class="k">The collection</p>
      <h1>Seven stories, worn as scent.</h1>
      <p class="lede">Each began as nine pages of fiction, commissioned before a single note was weighed; each is sealed beneath a hand-carved stone lid. Eau de parfum, 100ml, &pound;160 &mdash; samples always &pound;5, always redeemable against a full bottle.</p>
    </div>
    <div class="filters" data-sort-for=".cards">
      <button data-sort="order" aria-current="true">All</button>
      <button data-sort="feeling">By feeling</button>
      <button data-sort="stone">By stone</button>
      <button data-sort="note">By note</button>
      <span class="count" data-count>7 stories &middot; 1 set</span>
    </div>
    <div class="cards">
{cards}
    </div>
    <p class="foot rev">Every bottle ships with its printed story &nbsp;&middot;&nbsp; samples always &pound;5, always redeemable &nbsp;&middot;&nbsp; complimentary UK delivery over &pound;100</p>
  </div>
</section>
""")

    # ---- 03 product — one page per fragrance -----------------------------
    for p in PRODUCTS:
        slug_page = "product-" + p["slug"]
        shots = photos.manifest()[p["slug"]]
        # the product page uses its own frame: same crop size as the card, so the
        # same detail, but with the bottle centred — nothing rises over it here
        shots = ["p-%s-hero.jpg" % p["slug"]] + shots[1:]
        gal = [fp("assets/img/" + f) for f in shots]
        alts = ["The bottle", "Boxed with its printed story", "The outer carton", "The set"]
        thumbs = "".join(
            '<button%s onclick="pdpSwap(this,\'%s\')"><img src="%s" alt="%s" loading="lazy"></button>'
            % (' aria-current="true"' if i == 0 else "", u, u, alts[i] if i < len(alts) else "View %d" % (i + 1))
            for i, u in enumerate(gal))
        ch = CHAPTERS[p["slug"]]
        second = next(q for q in PRODUCTS if q["slug"] != p["slug"])
        pyramid = "\n".join(
            f"      <div><b>{a}</b><em>{b}</em><i>{c}</i></div>" for a, b, c in ch["margins"])
        paras = "\n".join(f"        <p>{t}</p>" for t in ch["paras"])
        bands = f"""
    <section class="storyband">
      <img src="{fp('assets/img/' + p['img'] + '-2.jpg') if len(gal) > 1 else fp('assets/img/unboxing.jpg')}" alt="">
      <div class="c">
        <blockquote>&ldquo;{ch['pull']}&rdquo;</blockquote>
        <p>{ch['pullref']} &middot; <a href="story.html?s={p['slug']}">Read the full story</a></p>
      </div>
    </section>

    <section class="chapter">
      <span class="numeral" aria-hidden="true">{ch['numeral']}</span>
      <div class="inner">
        <div>
          <p class="k">The story &middot; {ch['chapter']}</p>
          <h2>{ch['title']}</h2>
          <p class="byline">written by {ch['author']} &mdash; nine pages, printed and boxed with this bottle</p>
          <div class="excerpt">
    {paras}
          </div>
          <p class="scent">{ch['scent']}</p>
          <div class="go">
            <a class="btn btn-ghostink" href="story.html?s={p['slug']}">Read chapter one</a>
            <small>The full story ships in the box</small>
          </div>
        </div>
        <figure class="plates2">
          <img class="big" src="{gal[1] if len(gal) > 1 else fp('assets/img/unboxing.jpg')}" alt="{p['name']}, as the chapter was written" loading="lazy">
          <img class="small" src="{gal[2] if len(gal) > 2 else fp('assets/img/spine.jpg')}" alt="" loading="lazy">
          <figcaption>{ch['caption']}</figcaption>
        </figure>
      </div>
    </section>

    <section class="margins">
      <div class="inner">
        <p class="k">Notes &amp; composition</p>
        <h2>The pyramid, read as margins.</h2>
        <div class="pyramid">
    {pyramid}
        </div>
      </div>
    </section>

    <section class="stoneband">
      <div class="inner">
        <img src="{fp('assets/img/stone-shelf.jpg')}" alt="{p['stone']}, hand-cut in Liguria" loading="lazy">
        <div>
          <p class="k">The stone</p>
          <h2>{ch['stone_title']}</h2>
          <p>{ch['stone_body']}</p>
          <a class="ul" href="our-house.html#stones">More on the stones</a>
        </div>
      </div>
    </section>
    """
        others = [q for q in PRODUCTS if q["slug"] != p["slug"]][:4]
        rel = "\n".join(product_card(q, reveal=False) for q in others)
        written[slug_page] = page(slug_page, p["name"],
            f"{p['name']} eau de parfum — {p['notes']}. Sealed beneath a {p['stone']} lid, with its printed story in the box.", f"""
    <div class="inner">
      {crumbs(("Home", "index.html"), ("The Fragrances", "collection.html"), p["name"])}
      <div class="pdp">
        <div class="gal">
          <img class="main" id="pdpmain" src="{gal[0]}" alt="{p['name']} eau de parfum">
          <div class="strip">{thumbs}</div>
        </div>
        <div class="info">
          <p class="k">{p['story']} &middot; Eau de parfum</p>
      <h1>{p['name']}</h1>
      <p class="sub"><span class="chip" style="background:{p['swatch']}"></span>{p['stone']} &middot; {p['notes']}</p>
      <blockquote>&ldquo;{p['line'][:52]}&hellip;&rdquo; &mdash; nine pages of {p['feeling'].lower()}, worn as {p['notes'].split(',')[0]} warmed by a polished bar.</blockquote>

      <p class="fieldlabel">Size</p>
      <div class="sizes">
        <button aria-current="true" data-price="160">100 ml &mdash; &pound;160</button>
        <button data-price="110">50 ml &mdash; &pound;110</button>
        <button data-price="5">Sample &mdash; &pound;5</button>
      </div>

      <label class="tryfirst"><input type="checkbox" checked>
        <div><b>Try a second story first &mdash; complimentary</b>
          <span>A 2ml of {second['name']} &mdash; {second['feeling'].lower()} &mdash; tucked into the parcel.</span></div></label>

      <div class="cta">
        <button class="btn btn-ink" onclick="addToBag('{p['slug']}','full',this)">Add to bag &mdash; &pound;160</button>
        <button class="btn btn-ghostink applepay" onclick="addToBag('{p['slug']}','full',this)">&#63743;&nbsp;Apple Pay</button>
      </div>
      <p class="re">Complimentary UK delivery &middot; 30-day returns &middot; sample cost redeemed</p>

      <div class="acc">
            <details open><summary>The story</summary><div class="body">{p['name']} began as {p['story']}, commissioned from a novelist and printed on cotton paper before the first accord was weighed. Nine pages arrive with the bottle; the digital edition arrives with your confirmation.</div></details>
            <details><summary>Notes</summary><div class="body">Top &mdash; bergamot, pink pepper. Heart &mdash; {p['notes']}. Base &mdash; vetiver, cedar, a little smoke. Composed in Grasse by Jacques Chabert.</div></details>
            <details><summary>The stone</summary><div class="body">{p['stone']}, hand-cut in Liguria. Veining is decided by the block, so no two lids repeat. The lid lifts free of the glass and keeps its weight in the hand.</div></details>
            <details><summary>Delivery &amp; returns</summary><div class="body">Complimentary UK delivery over &pound;100, otherwise &pound;5. Two to four working days, signed for. Unopened bottles may be returned within 30 days; samples are non-returnable but always credited.</div></details>
          </div>
        </div>
      </div>
    </div>

    {bands}

    <section class="seven">
      <div class="inner">
        <div class="head"><div><p class="k">Also on the shelf</p><h2>Other stories.</h2></div>
          <a class="ul" href="collection.html">All fragrances</a></div>
        <div class="cards">
    {rel}
        </div>
      </div>
    </section>
    """, current="collection.html")

    # ---- 04 samples ------------------------------------------------------
    written["samples"] = page("samples", "Samples & The First Lines",
        "The First Lines — all seven stories in miniature, £38 and credited against your first full bottle.", f"""
<section class="banner">
  <img src="{fp('assets/img/set-first-lines.jpg')}" alt="The First Lines discovery set">
  <div class="c">
    <p class="k">The discovery set</p>
    <h1>The First Lines.</h1>
    <p>All seven stories in miniature &mdash; 2ml of each, and the opening page of every one. &pound;38, credited in full against your first bottle.</p>
  </div>
</section>

<section class="band">
  <div class="inner">
    {crumbs(("Home", "index.html"), "Samples")}
    <div class="grid-2">
      <div>
        <p class="k">How it works</p>
        <h2>Read first. Decide later.</h2>
        <p>Fragrance is the only luxury bought blind, and we would rather you did not. The set arrives as seven 2ml vials in a stone-grey folder, each paired with the first page of the story it was written from.</p>
        <p>Wear one a day for a week. When you choose a full bottle, the &pound;38 comes off &mdash; no code, no expiry, no conditions. A single sample is &pound;5 and works the same way.</p>
        <div class="actions">
          <button class="btn btn-ink" onclick="addToBag('set','full',this)">Add the set &mdash; &pound;38</button>
          <a class="btn btn-ghostink" href="collection.html">Choose a single sample</a>
        </div>
      </div>
      <img class="figfull" src="{fp('assets/img/set-first-lines.jpg')}" alt="Seven miniatures in their folder" loading="lazy">
    </div>
    <div class="grid-3">
      <div class="tile"><h3>Seven miniatures</h3><p>2ml of each fragrance, enough for a full day&rsquo;s wear and a second opinion.</p></div>
      <div class="tile"><h3>Seven first pages</h3><p>The opening page of every story, letterpressed on the same cotton paper as the full edition.</p></div>
      <div class="tile"><h3>&pound;38, fully redeemable</h3><p>Credited against your first full bottle, automatically, whenever you come back.</p></div>
    </div>
  </div>
</section>
""")

    # ---- 05 gifting ------------------------------------------------------
    written["gifting"] = page("gifting", "Gifting",
        "Gift-ready always, with a complimentary Dedication typeset on the story's flyleaf.", f"""
<section class="banner">
  <img src="{fp('assets/img/unboxing.jpg')}" alt="A Side Story parcel, ready to give">
  <div class="c">
    <p class="k">Kept &amp; given</p>
    <h1>A story is a serious gift.</h1>
    <p>Every parcel arrives gift-ready &mdash; the stone lid, the printed story, no plastic in the box. Add the Dedication and a line of yours is typeset on the flyleaf.</p>
  </div>
</section>

<section class="band">
  <div class="inner">
    {crumbs(("Home", "index.html"), "Gifting")}
    <div class="grid-2">
      <div>
        <p class="k">The Dedication</p>
        <h2>One line, typeset on the flyleaf.</h2>
        <p>Complimentary with any bottle. Write up to sixty characters and we set them in Cormorant italic on the first page of the story, then send the same dedication as a digital edition to whoever you choose, on the morning you choose.</p>
        <div class="dedication">for A. &mdash; who was late</div>
        <p>No engraving, no marking of the stone &mdash; the lid stays exactly as the block cut it.</p>
      </div>
      <div>
        <p class="k">Choosing for someone else</p>
        <h2>When you are not sure.</h2>
        <p>Send The First Lines instead. Seven miniatures, seven first pages, &pound;38 &mdash; and the credit transfers to them, not to you, so they choose their own bottle.</p>
        <div class="chips" style="margin-top:var(--s-4)">
          <a href="samples.html">The First Lines &mdash; &pound;38</a>
          <a href="collection.html">A full bottle &mdash; &pound;160</a>
        </div>
      </div>
    </div>
    <div class="grid-3">
      <div class="tile"><h3>Dated delivery</h3><p>Choose the morning it should land. We hold the parcel and the digital edition until then.</p></div>
      <div class="tile"><h3>No prices in the box</h3><p>The invoice goes to you, by email. Nothing in the parcel mentions what it cost.</p></div>
      <div class="tile"><h3>Extended returns</h3><p>Gifts bought in November and December may be exchanged until the end of January.</p></div>
    </div>
  </div>
</section>
""")

    # ---- 06 our house ----------------------------------------------------
    written["our-house"] = page("our-house", "Our House",
        "A fragrance house that writes the story first — nine pages of commissioned fiction, then the perfume to keep it.", f"""
<section class="banner">
  <img src="{fp('assets/img/founders.jpg')}" alt="The founders in the studio">
  <div class="c">
    <p class="k">The house</p>
    <h1>We write the story first.</h1>
    <p>Nine pages of fiction, commissioned and paid for before a single note is weighed &mdash; then a perfume composed to keep it.</p>
  </div>
</section>

<section class="band">
  <div class="inner">
    {crumbs(("Home", "index.html"), "Our House")}
    <div class="artgrid">
      <div class="col">
        <p class="dropcap">Side Story began with an argument about briefs. Every fragrance house we had worked with started from a mood board &mdash; a page of adjectives, a photograph of a beach, a competitor to beat. We wanted to start from something a person had actually written, and had been paid properly to write.</p>
        <p>So we commission novelists. They are given a feeling, a length, and no notes at all on scent. When the nine pages come back we send them to Grasse, and the perfumer works to the writing &mdash; to the hour of day in it, the room, the weather, the thing left unsaid.</p>
        <p>The result goes into a bottle with the story printed alongside it, on cotton paper, in an edition that matches the run. The lid is cut from a single block of stone, so the veining on yours has never existed before and will not again.</p>
      </div>
      <div class="artaside">
        <p class="marginnote">Seven writers. Seven stones. One perfumer.<small>The house, in short</small></p>
        <p class="marginnote">Every writer is paid a fee and a royalty on the fragrance their story becomes.<small>How we commission</small></p>
      </div>
    </div>
  </div>
</section>

<section class="band tint" id="making">
  <div class="inner">
    <p class="k">The making</p>
    <h2>Begun in Grasse. Finished by hand.</h2>
    <div class="grid-3">
      <figure><img class="figfull" src="{fp('assets/img/plants.jpg')}" alt="Jasmine outside Mougins" loading="lazy"><figcaption class="crumb" style="margin-top:var(--s-3)">jasmine outside Mougins, first light</figcaption></figure>
      <figure><img class="figfull" src="{fp('assets/img/founders.jpg')}" alt="The two of us, working" loading="lazy"><figcaption class="crumb" style="margin-top:var(--s-3)">the two of us, arguing a story into its final line</figcaption></figure>
      <figure><img class="figfull" src="{fp('assets/img/spine.jpg')}" alt="Stone meeting glass" loading="lazy"><figcaption class="crumb" style="margin-top:var(--s-3)">stone meets glass &mdash; recycled, refillable</figcaption></figure>
    </div>
    <p>Composed by Jacques Chabert with the house in Grasse &middot; written by seven commissioned novelists &middot; stone cut in Liguria &middot; bottled and bound in the United Kingdom.</p>
  </div>
</section>

<section class="band" id="stones">
  <div class="inner">
    <p class="k">The stones</p>
    <h2>No two lids repeat.</h2>
    <p>Each lid is cut from a block chosen for its seam, not its evenness. We do not select for consistency and we do not correct the veining, which means the lid on your bottle is the only one of its kind. It lifts free of the glass and is heavy on purpose.</p>
    <div class="matrow" style="margin-top:var(--s-5)">
      <div class="mat"><div class="sw" style="background:linear-gradient(150deg,#2B2E2D,#111312);color:#F1F0E8"><em>nero marquina</em></div><b>Nero Marquina</b><i>raking light, wet-polished vein</i></div>
      <div class="mat"><div class="sw" style="background:linear-gradient(150deg,#EDE7DA,#C9BEA6);color:#2B2E2D"><em>calacatta</em></div><b>Calacatta</b><i>a single grey seam, off-centre</i></div>
      <div class="mat"><div class="sw" style="background:linear-gradient(150deg,#3E5147,#26332C);color:#F1F0E8"><em>verde jade</em></div><b>Verde Jade</b><i>green under the polish, almost black</i></div>
      <div class="mat"><div class="sw" style="background:linear-gradient(150deg,#B5593F,#7A2E2A);color:#F1F0E8"><em>rosso francia</em></div><b>Rosso Francia</b><i>warm, veined like an old map</i></div>
    </div>
  </div>
</section>
""")

    # ---- 07 stories index ------------------------------------------------
    cards = "\n".join(f"""      <a class="post rev" href="story.html?s={q['slug']}">
        <img src="{fp('assets/img/' + q['img'] + '-1.jpg')}" alt="{q['name']}" loading="lazy">
        <p class="k">{q['story']} &middot; {q['read']} read</p><h3>{q['name']}</h3>
        <p>&ldquo;{q['line'][:96]}&hellip;&rdquo;</p></a>""" for q in PRODUCTS)
    written["stories"] = page("stories", "Your Stories",
        "Every fragrance began as fiction. Read all seven stories in full — the printed edition arrives in the box.", f"""
<section class="band">
  <div class="inner">
    {crumbs(("Home", "index.html"), "Your Stories")}
    <div class="phead">
      <p class="k">Your stories</p>
      <h1>Seven stories. Read one on us.</h1>
      <p class="lede">Every fragrance we make began as fiction, commissioned before a single note was weighed. Read them here in full &mdash; the printed edition arrives in the box.</p>
    </div>
    <div class="posts">
{cards}
    </div>
  </div>
</section>

<section class="band tint">
  <div class="inner" style="text-align:center">
    <p class="k">An open call</p>
    <h2 style="margin-inline:auto">The eighth story hasn&rsquo;t been written yet.</h2>
    <p style="margin-inline:auto">The next fragrance could begin with something that actually happened &mdash; to you.</p>
    <div class="chips" style="justify-content:center"><a href="share.html">Share your story</a></div>
  </div>
</section>
""")

    # ---- 08 single story -------------------------------------------------
    q = BY_SLUG["sunday-service"]
    written["story"] = page("story", q["name"],
        f"{q['name']} — the story that became the fragrance. Written by Morgan Childs.", f"""
<section class="banner">
  <img src="{fp('assets/img/' + q['img'] + '-1.jpg')}" alt="{q['name']}">
  <div class="c">
    <p class="k">Your stories &middot; {q['story']} &middot; {q['stone']}</p>
    <h1>{q['name']}</h1>
    <p>Written by Morgan Childs &middot; {q['read']} read &middot; the story that became a fragrance</p>
  </div>
</section>

<section class="article">
  <div class="inner">
    {crumbs(("Home", "index.html"), ("Your Stories", "stories.html"), q["name"])}
    <div class="artgrid">
      <div class="col">
        <p class="dropcap">The road home has not been resurfaced in twenty years, and neither has the part of me that drives it. Past the reservoir the trees close over the lane the way they always did, and there &mdash; still standing, still rusted the colour of a wet penny &mdash; is the gate we used to climb.</p>
        <p>I am late for my niece&rsquo;s christening. I park badly, as everyone does here, and cross the gravel with my collar wrong. Inside, the cool oaky air arrives before the organ does &mdash; polish and cold stone and the ghost of last week&rsquo;s lilies &mdash; and I am eleven again in an itching jumper, and thirty-eight, and neither.</p>
        <p>My mother is three rows from the front, in the coat. She turns before I have made a sound, which she has done my whole life and has never once explained.</p>
        <p>The music was the same. The cool, oaky air of the church was the same. Only the child being held over the font was new, and she was furious about it, and everybody laughed, and for a moment the building held all of us at once &mdash; the ones who came back, the ones who never left, and the ones who were only ever here in the smell of the place.</p>
        <p>Afterwards there are sandwiches in the hall and someone&rsquo;s husband has opinions about the bypass. I stand by the door with a paper cup and let the incense come off my coat in the cold.</p>
      </div>
      <div class="artaside">
        <p class="marginnote">cold water, cut grass, iron on the hands<small>In the margin &mdash; 01 of 09</small></p>
        <p class="marginnote">linen dried outdoors &mdash; the smell of being fifteen<small>In the margin &mdash; 03 of 09</small></p>
        <p class="marginnote">church oak, beeswax polish, the last of the lilies<small>In the margin &mdash; 05 of 09</small></p>
      </div>
    </div>
    <p class="pull">&ldquo;The music was the same. The cool, oaky air of the church was the same.&rdquo;</p>
  </div>
</section>

<section class="band tint">
  <div class="inner">
    <div class="grid-2">
      <div>
        <p class="k">The fragrance it became</p>
        <h2>{q['name']}</h2>
        <p>{q['stone']} lid &middot; {q['notes']}. Composed to the fifth page &mdash; church oak, beeswax, cold air held in linen.</p>
        <div class="actions">
          <button class="btn btn-ink" onclick="addToBag('{q['slug']}','full',this)">Add to bag &mdash; &pound;160</button>
          <a class="btn btn-ghostink" href="product-{q['slug']}.html">See the bottle</a>
        </div>
      </div>
      <img class="figfull" src="{fp('assets/img/' + q['img'] + '-1.jpg')}" alt="{q['name']} eau de parfum" loading="lazy">
    </div>
  </div>
</section>
""", current="stories.html")

    # ---- 09 share your story --------------------------------------------
    written["share"] = page("share", "Share Yours",
        "Send us the moment. The eighth fragrance could begin with something that actually happened to you.", f"""
<section class="banner">
  <img src="{fp('assets/img/spine.jpg')}" alt="An open notebook">
  <div class="c">
    <p class="k">Your stories &middot; an open call</p>
    <h1>The eighth story hasn&rsquo;t been written yet.</h1>
    <p>Seven fragrances began as fiction. The next one could begin with something that actually happened &mdash; to you. Send us the moment; we read every one.</p>
  </div>
</section>

<div class="inner">
  {crumbs(("Home", "index.html"), "Share Yours")}
  <form class="form" onsubmit="event.preventDefault();this.querySelector('.sent').hidden=false;this.querySelector('.btn').disabled=true;">
    <div>
      <p class="k">Write yours</p>
      <h2 class="sechead">Tell us the moment.</h2>
      <label class="field"><span>Your story</span>
        <textarea name="story" placeholder="Start anywhere. The room, the hour, what was said." required></textarea>
        <small>Three hundred words is plenty. We are after one moment, not a life.</small></label>
      <div class="row2">
        <label class="field"><span>Name</span><input name="name" required></label>
        <label class="field"><span>Email</span><input type="email" name="email" required></label>
      </div>
      <label class="field"><span>What should it smell of?</span><input name="notes" placeholder="Optional — cold water, cut grass, iron on the hands"></label>
      <div class="actions"><button class="btn btn-ink" type="submit">Send your story</button></div>
      <p class="re sent" hidden>Thank you &mdash; it is with the reading group. We reply to every submission within a fortnight.</p>
    </div>
    <div class="aside-card">
      <h3>Why we are asking</h3>
      <p>We have never made a fragrance from a marketing brief and we are not about to start. Every bottle we make was composed against nine pages of writing.</p>
      <p>Stories chosen for development are commissioned properly: a fee, a royalty on the fragrance, and your name on the printed edition. Nothing is published without your written say-so.</p>
      <p><a class="ul" href="stories.html">Read what others sent</a></p>
    </div>
  </form>
</div>
""")

    # ---- 10 journal ------------------------------------------------------
    posts = "\n".join(f"""      <a class="post rev" href="journal.html">
        <img src="{fp('assets/img/' + j['img'])}" alt="" loading="lazy">
        <p class="k">{j['kicker']}</p><h3>{j['title']}</h3><p>{j['sub']}</p></a>""" for j in JOURNAL)
    written["journal"] = page("journal", "Atelier Journal",
        "Notes from the house — campaigns, commissions, and the cutting of the stone.", f"""
<section class="band">
  <div class="inner">
    {crumbs(("Home", "index.html"), "Atelier Journal")}
    <div class="phead">
      <p class="k">The atelier journal</p>
      <h1>Notes from the house.</h1>
      <p class="lede">What we are reading, shooting and cutting. Published when there is something worth saying, which is not often.</p>
    </div>
    <div class="posts">
{posts}
    </div>
  </div>
</section>
""")

    # ---- 11 search -------------------------------------------------------
    written["search"] = page("search", "Search",
        "Search the shelf — by fragrance, by feeling, by stone, or by the story it began as.", f"""
<div class="inner">
  {crumbs(("Home", "index.html"), "Search")}
  <div class="phead">
    <p class="k">Search</p>
    <h1>What are you after?</h1>
    <form class="searchbar" onsubmit="event.preventDefault()">
      <input type="search" placeholder="A fragrance, a feeling, a stone&hellip;" aria-label="Search">
      <button class="btn btn-ink" type="submit">Search</button>
    </form>
    <div class="chips">
      <a href="collection.html">All seven</a><a href="samples.html">Samples</a>
      <a href="gifting.html">Gifting</a><a href="stories.html">Stories</a>
      <a href="collection.html">Woods</a><a href="collection.html">Citrus</a><a href="collection.html">Incense</a>
    </div>
  </div>
</div>

<section class="band">
  <div class="inner">
    <p class="k">Popular this week</p>
    <div class="cards">
{chr(10).join(product_card(x, reveal=False) for x in PRODUCTS[:4])}
    </div>
  </div>
</section>
""")

    # ---- 12 account ------------------------------------------------------
    written["account"] = page("account", "Account",
        "Your orders, your dedications, and the stories you have unlocked.", f"""
<div class="inner">
  {crumbs(("Home", "index.html"), "Account")}
  <div class="phead"><p class="k">Account</p><h1>Welcome back.</h1></div>
  <div class="acct">
    <nav class="acctnav" aria-label="Account">
      <a href="account.html" aria-current="page">Orders</a>
      <a href="account.html">Your stories</a>
      <a href="account.html">Dedications</a>
      <a href="account.html">Addresses</a>
      <a href="account.html">Details</a>
      <a href="index.html">Sign out</a>
    </nav>
    <div>
      <h2 class="sechead">Orders</h2>
      <div class="scrollx">
        <table class="table">
          <thead><tr><th>Order</th><th>Placed</th><th>Contents</th><th>Status</th><th>Total</th></tr></thead>
          <tbody>
            <tr><td>SS-2114</td><td>28 July 2026</td><td>Sunday Service, 100ml &middot; Dedication</td><td>Preparing</td><td>&pound;160</td></tr>
            <tr><td>SS-1980</td><td>2 May 2026</td><td>The First Lines</td><td>Delivered</td><td>&pound;38</td></tr>
            <tr><td>SS-1642</td><td>14 February 2026</td><td>Hotel Lobby, 100ml</td><td>Delivered</td><td>&pound;160</td></tr>
          </tbody>
        </table>
      </div>
      <h2 class="sechead">Your stories</h2>
      <p class="crumb">Digital editions unlocked by your orders. They stay in your account whatever happens to the paper.</p>
      <div class="chips">
        <a href="story.html?s=sunday-service">Sunday Service</a>
        <a href="stories.html">Hotel Lobby</a>
        <a href="stories.html">The First Lines &mdash; seven openings</a>
      </div>
    </div>
  </div>
</div>
""")

    # ---- 13 bag ----------------------------------------------------------
    written["bag"] = page("bag", "Your bag",
        "Your bag. Every story ships printed, in the box.", f"""
<div class="inner">
  {crumbs(("Home", "index.html"), "Bag")}
  <div class="phead"><p class="k">Your bag</p><h1>Every story ships printed, in the box.</h1></div>
  <div class="cart">
    <div>
      <div id="baglines"><div class="empty"><p class="k">Nothing here yet</p>
        <p>Your bag is empty. The shelf is seven stories long.</p>
        <div class="chips" style="justify-content:center"><a href="collection.html">See the fragrances</a><a href="samples.html">Begin with samples</a></div>
      </div></div>
      <label class="tryfirst"><input type="checkbox" checked>
        <div><b>Add a Dedication &mdash; complimentary</b><span>A line of yours, typeset on the story&rsquo;s flyleaf, and sent again as a digital edition.</span></div></label>
    </div>
    <div class="summary">
      <h3>Summary</h3>
      <div class="srow"><span>Subtotal</span><span id="bagsub">&pound;0</span></div>
      <div class="srow"><span>Delivery</span><span>Complimentary</span></div>
      <div class="srow"><span>Sample credit</span><span>&minus;&pound;5</span></div>
      <div class="srow total"><span>Total</span><span id="bagtotal">&pound;0</span></div>
      <a class="btn btn-ink" href="checkout.html" style="width:100%;margin-top:var(--s-4)">Proceed to checkout</a>
      <p class="re">Tax included &middot; 30-day returns &middot; Visa, Mastercard, Amex, Apple Pay</p>
    </div>
  </div>
</div>
<div class="note-strip">&ldquo;Your stone is cut. Your story is bound.&rdquo;</div>
""")

    # ---- 14 checkout -----------------------------------------------------
    written["checkout"] = page("checkout", "Checkout",
        "Where the parcel is headed.", """
<div class="inner">
  <p class="steps"><a href="bag.html">Bag</a> / <b>Information</b> / Delivery / Payment</p>
  <div class="phead"><h1>Where the parcel is headed.</h1></div>
  <form class="form" onsubmit="event.preventDefault();location.href='confirmation.html'">
    <div>
      <h2 class="sechead">Contact</h2>
      <div class="row2">
        <label class="field"><span>Email</span><input type="email" required></label>
        <label class="field"><span>Phone</span><input type="tel"></label>
      </div>
      <h2 class="sechead">Delivery address</h2>
      <div class="row2">
        <label class="field"><span>First name</span><input required></label>
        <label class="field"><span>Last name</span><input required></label>
      </div>
      <label class="field"><span>Address</span><input required></label>
      <div class="row2">
        <label class="field"><span>City</span><input required></label>
        <label class="field"><span>Postcode</span><input required></label>
      </div>
      <h2 class="sechead">Payment</h2>
      <label class="field"><span>Card number</span><input inputmode="numeric" placeholder="Demo only — do not enter a real card"></label>
      <div class="row2">
        <label class="field"><span>Expiry</span><input placeholder="MM / YY"></label>
        <label class="field"><span>CVC</span><input inputmode="numeric"></label>
      </div>
      <div class="actions"><button class="btn btn-ink" type="submit">Pay &pound;0</button></div>
      <p class="re">Demo only &mdash; no payment is taken and no card details are stored or transmitted.</p>
    </div>
    <div class="summary">
      <h3>Your order</h3>
      <div class="srow"><span>Items (<span data-bagcount>0</span>)</span><span id="cosub">&pound;0</span></div>
      <div class="srow"><span>Delivery</span><span>Complimentary</span></div>
      <div class="srow total"><span>Total</span><span id="cototal">&pound;0</span></div>
      <p class="re">&ldquo;The last page is the easiest to turn.&rdquo;</p>
    </div>
  </form>
</div>
""", current="bag.html")

    # ---- 15 confirmation -------------------------------------------------
    written["confirmation"] = page("confirmation", "Order confirmed",
        "Your story is bound.", f"""
<section class="band">
  <div class="inner">
    <div class="phead center">
      <p class="k">Order SS-2114 &mdash; confirmed</p>
      <h1>Your story is bound.</h1>
      <p class="lede">Your fragrance is being prepared: the story at full size, the parcel without plastic &mdash; and your stone, its veining decided by nature alone, is about to meet its glass.</p>
    </div>
    <p class="crumb" style="text-align:center">A confirmation letter is on its way &middot; arrives Thursday, signed for</p>
    <div class="grid-3">
      <div class="tile"><h3>Read while you wait</h3><p>The digital edition of your story is already in your account.</p><p><a class="ul" href="stories.html">Read the stories</a></p></div>
      <div class="tile"><h3>Track the parcel</h3><p>We will write again the moment it leaves the bindery.</p><p><a class="ul" href="account.html">See the order</a></p></div>
      <div class="tile"><h3>Your Dedication</h3><p>Typeset and proofed by hand before the story goes to press.</p><p><a class="ul" href="account.html">Review the line</a></p></div>
    </div>
  </div>
</section>
""", current="bag.html")

    # ---- 16-20 practical pages -------------------------------------------
    written["shipping"] = page("shipping", "Shipping & Returns",
        "Delivery times, costs and the 30-day return policy.", f"""
<div class="inner">
  {crumbs(("Home", "index.html"), "Shipping &amp; Returns")}
  <div class="phead"><p class="k">The practical</p><h1>Shipping &amp; returns.</h1>
    <p class="lede">Everything ships signed-for and without plastic. If a bottle is not for you, thirty days is plenty of time to say so.</p></div>
  <div class="scrollx">
    <table class="table">
      <thead><tr><th>Destination</th><th>Service</th><th>Time</th><th>Cost</th></tr></thead>
      <tbody>
        <tr><td>United Kingdom</td><td>Tracked, signed for</td><td>2&ndash;4 working days</td><td>&pound;5, complimentary over &pound;100</td></tr>
        <tr><td>Ireland &amp; EU</td><td>Tracked, duties paid</td><td>4&ndash;7 working days</td><td>&pound;12, complimentary over &pound;180</td></tr>
        <tr><td>United States</td><td>Tracked, duties paid</td><td>5&ndash;8 working days</td><td>&pound;18</td></tr>
        <tr><td>Rest of world</td><td>Tracked</td><td>7&ndash;14 working days</td><td>From &pound;22</td></tr>
      </tbody>
    </table>
  </div>
  <div class="acc">
    <details open><summary>Returns</summary><div class="body">Unopened bottles may be returned within thirty days of delivery for a full refund. Email contact@sidestoryparfums.com and we send a prepaid label. Refunds are issued to the original payment method within five working days of arrival.</div></details>
    <details><summary>Samples</summary><div class="body">Samples and The First Lines are not returnable, for reasons we hope are obvious. The cost is always credited against your first full bottle instead.</div></details>
    <details><summary>Damaged in transit</summary><div class="body">Stone travels well but not perfectly. Photograph the parcel as it arrived and write to us the same week; we replace without argument.</div></details>
    <details><summary>Gifts</summary><div class="body">Gifts bought in November and December may be exchanged until 31 January. The invoice goes to the buyer by email &mdash; nothing in the parcel mentions price.</div></details>
  </div>
</div>
""")

    written["stockists"] = page("stockists", "Stockists",
        "Where to find Side Story in person.", f"""
<div class="inner">
  {crumbs(("Home", "index.html"), "Stockists")}
  <div class="phead"><p class="k">In person</p><h1>Where to smell them first.</h1>
    <p class="lede">A short list, kept short on purpose. Every stockist below carries the full seven and the printed editions.</p></div>
  <div class="grid-3">
    <div class="tile"><h3>Liberty London</h3><p>Regent Street, W1B 5AH<br>Beauty Hall, ground floor<br>&amp; liberty.co.uk</p></div>
    <div class="tile"><h3>Le Bon March&eacute;</h3><p>24 Rue de S&egrave;vres, Paris 75007<br>Parfums rares, first floor</p></div>
    <div class="tile"><h3>The Shop, Grasse</h3><p>12 Rue Marcel Journet<br>By appointment, Tuesdays and Thursdays</p></div>
  </div>
  <div class="grid-3">
    <div class="tile"><h3>Bergdorf Goodman</h3><p>754 Fifth Avenue, New York<br>Beauty, level two</p></div>
    <div class="tile"><h3>Lane Crawford</h3><p>IFC Mall, Hong Kong<br>Beauty, level one</p></div>
    <div class="tile"><h3>Become a stockist</h3><p>We are careful about this. Write to us and tell us about the shop.</p><p><a class="ul" href="contact.html">Get in touch</a></p></div>
  </div>
</div>
""")

    written["contact"] = page("contact", "Contact",
        "Write to the house. We read everything and reply within two working days.", f"""
<div class="inner">
  {crumbs(("Home", "index.html"), "Contact")}
  <div class="phead"><p class="k">Contact</p><h1>Write to the house.</h1>
    <p class="lede">Two people read this inbox. You will hear back within two working days, from one of them.</p></div>
  <form class="form" onsubmit="event.preventDefault();this.querySelector('.sent').hidden=false;this.querySelector('.btn').disabled=true;">
    <div>
      <div class="row2">
        <label class="field"><span>Name</span><input required></label>
        <label class="field"><span>Email</span><input type="email" required></label>
      </div>
      <label class="field"><span>What is it about?</span>
        <select><option>An order</option><option>A return</option><option>Gifting</option><option>Stockists &amp; press</option><option>Something else</option></select></label>
      <label class="field"><span>Message</span><textarea required></textarea></label>
      <div class="actions"><button class="btn btn-ink" type="submit">Send</button></div>
      <p class="re sent" hidden>Thank you &mdash; it has arrived. You will hear from us within two working days.</p>
    </div>
    <div class="aside-card">
      <h3>Directly</h3>
      <p>contact@sidestoryparfums.com<br>+44 20 7946 0114<br>Monday to Friday, 9&ndash;5 UK</p>
      <p>Side Story Parfums<br>Unit 4, The Bindery<br>London E2 8HD</p>
      <p>Press and wholesale: press@sidestoryparfums.com</p>
    </div>
  </form>
</div>
""")

    written["faq"] = page("faq", "FAQ",
        "The questions we are actually asked.", f"""
<div class="inner">
  {crumbs(("Home", "index.html"), "FAQ")}
  <div class="phead"><p class="k">The practical</p><h1>The questions we are actually asked.</h1></div>
  <div class="acc" style="max-width:52rem">
    <details open><summary>Is the story really written first?</summary><div class="body">Yes, and it is the whole point. A novelist is commissioned and paid before any brief goes to Grasse. The perfumer works to the finished pages &mdash; the hour of day in them, the room, the weather &mdash; not to a mood board.</div></details>
    <details><summary>What arrives in the box?</summary><div class="body">The bottle under its stone lid, the story printed on cotton paper in an edition matched to the run, and a 2ml sample of a second story. No plastic anywhere in the parcel.</div></details>
    <details><summary>Are the lids really all different?</summary><div class="body">Every lid is cut from a block chosen for its seam. We do not select for consistency or correct the veining, so no two repeat. We do not engrave or mark them.</div></details>
    <details><summary>How does the sample credit work?</summary><div class="body">Samples are &pound;5 and The First Lines is &pound;38. Whatever you spend on samples comes off your first full bottle &mdash; no code, no expiry, applied automatically at checkout.</div></details>
    <details><summary>Can I refill a bottle?</summary><div class="body">Yes. Refills are &pound;120 and ship in a glass flacon; keep the stone and the glass. Send the empty back with the prepaid label and we reuse it.</div></details>
    <details><summary>Do you test on animals?</summary><div class="body">No, and neither do our suppliers. We do not sell in markets that require it.</div></details>
    <details><summary>Can I visit?</summary><div class="body">The Grasse shop is open by appointment on Tuesdays and Thursdays. Write to us and we will find an hour.</div></details>
  </div>
</div>
""")

    written["legal"] = page("legal", "Privacy, Terms & Cookies",
        "Privacy policy, terms of sale and cookie notice.", f"""
<div class="inner">
  {crumbs(("Home", "index.html"), "Legal")}
  <div class="phead"><p class="k">Legal</p><h1>Privacy, terms &amp; cookies.</h1>
    <p class="lede">Placeholder text for the demo. The published site would carry policies reviewed by counsel; nothing below should be relied on.</p></div>
  <div class="artgrid">
    <div class="col">
      <h2 class="sechead">Privacy</h2>
      <p>We collect the minimum needed to send you a parcel and a story: name, address, email, and what you ordered. Payment details are handled by our payment processor and never touch our servers. We do not sell data and we do not share it with advertisers.</p>
      <p>You can ask us for a copy of everything we hold, or ask us to delete it, by writing to privacy@sidestoryparfums.com. We answer within thirty days.</p>
      <h2 class="sechead">Terms of sale</h2>
      <p>Prices include UK VAT and are shown in pounds sterling. A contract is formed when we email to say the parcel has shipped. Unopened bottles may be returned within thirty days; samples are not returnable but are always credited.</p>
      <p>Nothing in these terms affects your statutory rights.</p>
      <h2 class="sechead">Cookies</h2>
      <p>This demo stores your bag in the browser session and nothing else. The published site would use strictly necessary cookies for the basket and checkout, and analytics only with consent.</p>
    </div>
    <div class="artaside">
      <p class="marginnote">Last reviewed &mdash; placeholder<small>This is demo copy</small></p>
      <p class="marginnote">privacy@sidestoryparfums.com<small>Data requests</small></p>
    </div>
  </div>
</div>
""")

    # ---- 21 404 ----------------------------------------------------------
    written["404"] = page("404", "Page not found",
        "That page does not exist.", """
<div class="inner">
  <div class="notfound">
    <div>
      <p class="k">404</p>
      <h1>This page was never written.</h1>
      <p>The address you followed does not exist, or has been retired. The shelf is still seven stories long.</p>
      <div class="cta">
        <a class="btn btn-ink" href="collection.html">See the fragrances</a>
        <a class="btn btn-ghostink" href="index.html">Back to the house</a>
      </div>
    </div>
  </div>
</div>
""", current="index.html")

    return written


if __name__ == "__main__":
    w = build()
    for k in sorted(w):
        print(f"  {k+'.html':22} {w[k]:>7,} bytes")
    print(f"\n{len(w)} pages written")
