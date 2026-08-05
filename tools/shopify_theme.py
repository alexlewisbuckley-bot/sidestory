#!/usr/bin/env python3
"""
Side Story — Shopify theme emitter.

The site generator already produces every page, pixel-final. This emitter
takes those built pages and wraps them into a native Shopify theme: same
markup, same CSS, same JS, with the demo commerce swapped for the real
thing (cart, variants, checkout). 1:1 by construction, not by imitation.

    python3 tools/build.py && python3 tools/shopify_theme.py

Output: theme/ (theme directories at root) and side-story-theme.zip,
which Shopify's themeCreate can fetch once deployed.
"""
import io, json, os, re, shutil, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "theme")
CDN = "https://sidestory-rho.vercel.app"

SLUGS = ["hotel-lobby", "sunday-service", "sibling-rivalry", "third-date",
         "road-trip", "4pm-matinee", "pillow-talk"]
PAGES = ["our-story", "stories", "share", "faq", "shipping", "stockists",
         "contact", "legal"] + ["story-" + s for s in SLUGS]

# ---------------------------------------------------------------- URL map --
# Every internal href/src the static site uses, mapped onto Shopify routes.
# Applied as plain text replacement over the whole document, so URLs inside
# inline JSON (the search index) are carried along with the anchors.
URLMAP = [(f"product-{s}.html", f"/products/{s}") for s in SLUGS]
URLMAP += [
    ("samples.html",            "/products/discovery-set"),
    ("collection-100ml.html",   "/collections/the-fragrances"),
    ("collection-7-5ml.html",   "/collections/the-fragrances?size=7-5ml"),
    ("collection-samples.html", "/collections/the-fragrances?size=sample"),
    ("collection.html",         "/collections/the-fragrances"),
    ("our-house.html",          "/pages/our-story"),
    ("stories.html",            "/pages/stories"),
    ("share.html",              "/pages/share"),
    ("faq.html",                "/pages/faq"),
    ("shipping.html",           "/pages/shipping"),
    ("stockists.html",          "/pages/stockists"),
    ("contact.html",            "/pages/contact"),
    ("legal.html",              "/pages/legal"),
    ("search.html",             "/search"),
    ("bag.html",                "/cart"),
    ("checkout.html",           "/checkout"),
    ("account.html",            "/account"),
    ("confirmation.html",       "/account"),
]
URLMAP += [(f"story-{s}.html", f"/pages/story-{s}") for s in SLUGS]
URLMAP += [('href="index.html"', 'href="/"'), ("index.html#", "/#")]


def map_urls(s):
    # Longest keys first so e.g. "collection-samples.html" is rewritten before
    # the shorter "samples.html" can corrupt it from inside.
    for a, b in sorted(URLMAP, key=lambda kv: -len(kv[0])):
        s = s.replace(a, b)
    return s


def map_assets(s):
    """CSS/JS through asset_url; everything else absolute to the CDN."""
    s = re.sub(r'(?:/?assets/css/(fonts|app)\.css)(\?v=[0-9a-f]+)?',
               lambda m: "{{ '%s.css' | asset_url }}" % m.group(1), s)
    s = re.sub(r'(?:/?assets/js/site\.js)(\?v=[0-9a-f]+)?',
               "{{ 'site.js' | asset_url }}", s)
    s = re.sub(r'(?:/?assets/fonts/([a-z0-9-]+\.woff2))',
               lambda m: "{{ '%s' | asset_url }}" % m.group(1), s)
    # Any remaining assets/ reference — quoted, parenthesised, or a srcset
    # continuation entry after ", " — goes absolute to the CDN. The lookbehind
    # refuses matches already inside an absolute URL (preceded by "/").
    s = re.sub(r"(?<![a-z/])/?assets/", CDN + "/assets/", s)
    return s


def read(name):
    with open(os.path.join(ROOT, name), encoding="utf-8") as f:
        return f.read()


# ------------------------------------------------------------ sectionizer --
# Turns baked page markup into OS 2.0 sections: every safe leaf text, link,
# image and film URL becomes a schema setting whose value (the current
# content) lives in the JSON template, so the theme editor is pre-filled
# with the real site and every field is editable. Repeating units that are
# structurally identical and image-free become blocks (add/remove/reorder).

TEXT_TAGS = "h1|h2|h3|h4|p|blockquote|figcaption|summary|em|b|i"
LABELS = {"h1": "Heading", "h2": "Heading", "h3": "Sub-heading",
          "h4": "Sub-heading", "p": "Text", "blockquote": "Quote",
          "figcaption": "Caption", "summary": "Question", "em": "Label",
          "b": "Label", "i": "Small print", "span": "Label",
          "a": "Link label"}
SEC_NAMES = {"hero": "Hero", "strip": "Promo strip", "house": "Quote band",
             "seven": "The seven grid", "show": "Gallery",
             "atelier": "In the hand", "yfeat": "Featured story",
             "feelings": "Style index", "ways": "Three ways in",
             "band": "Story band", "gift": "Gifting", "creds": "Press quotes",
             "news": "Newsletter", "making": "The making", "mater": "Materials",
             "postbag": "Postbag", "reader": "Story text"}

MASK_PAT = re.compile(
    r"<script\b.*?</script>|<form\b.*?</form>|<button\b.*?</button>|<svg\b.*?</svg>",
    re.S)


class Ex:
    """Collects settings + their current values while markup is rewritten."""
    def __init__(self, scope):
        self.scope = scope          # 'section' | 'block'
        self.settings, self.values = [], {}
        self.n = 0
        self.roles = {}

    def add(self, typ, role, value=None):
        self.n += 1
        sid = ("b" if self.scope == "block" else "s") + str(self.n)
        self.roles[role] = self.roles.get(role, 0) + 1
        label = role if self.roles[role] == 1 else f"{role} {self.roles[role]}"
        st = {"type": typ, "id": sid, "label": label}
        if value is not None and typ in ("text", "textarea", "html", "checkbox"):
            st["default"] = value
            self.values[sid] = value
        self.settings.append(st)
        return sid

    def ref(self, sid):
        return "{{ %s.settings.%s }}" % (self.scope, sid)


def ex_pipeline(html, ex, toks):
    """Rewrites one chunk of masked markup, harvesting editables into ex."""
    # films
    def vid(m):
        sid = ex.add("text", "Film URL (mp4)", m.group(2))
        return m.group(1) + ex.ref(sid) + m.group(3)
    html = re.sub(r'(data-src=")([^"]+\.mp4[^"]*)(")', vid, html)

    # responsive pictures -> optional image override, default markup kept
    def pic(m):
        orig = m.group(0)
        img = re.search(r"<img\b[^>]*>", orig)
        if img and " id=" in img.group(0):     # JS-controlled image, leave it
            toks.append(orig)
            return "\x00%d\x00" % (len(toks) - 1)
        cls = re.search(r'class="([^"]*)"', img.group(0)) if img else None
        sid = ex.add("image_picker", "Image (blank = current)")
        sref = "%s.settings.%s" % (ex.scope, sid)
        rep = ("{%% if %s %%}<img%s alt=\"{{ %s.alt | escape }}\" "
               "src=\"{{ %s | image_url: width: 1600 }}\" loading=\"lazy\">"
               "{%% else %%}%s{%% endif %%}"
               % (sref, ' class="%s"' % cls.group(1) if cls else "",
                  sref, sref, orig))
        toks.append(rep)
        return "\x00%d\x00" % (len(toks) - 1)
    html = re.sub(r"<picture>.*?</picture>", pic, html, flags=re.S)
    html = re.sub(r"<img\b[^>]*>", pic, html)

    # link targets on real hrefs (not #anchors)
    def href(m):
        sid = ex.add("text", "Link URL", m.group(2))
        return m.group(1) + ex.ref(sid) + m.group(3)
    html = re.sub(r'(<a\b[^>]*?href=")([^"#{][^"]*)(")', href, html)

    # leaf text elements (no child tags): the copy itself
    def txt(m):
        tag, attrs, text = m.group(1), m.group(2), m.group(3)
        t = text.strip()
        if len(t) < 2 or "\x00" in text:
            return m.group(0)
        typ = "textarea" if len(t) > 90 else "text"
        sid = ex.add(typ, LABELS.get(tag, "Text"), t)
        return "<%s%s>%s</%s>" % (tag, attrs, ex.ref(sid), tag)
    html = re.sub(r"<(%s)\b([^>]*)>([^<>]+)</\1>" % TEXT_TAGS, txt, html)
    html = re.sub(r"<(span|a)\b([^>]*)>([^<>]+)</\1>", txt, html)
    return html


def extract_unit(unit, ex, toks, spec):
    """One repeating block unit through the same pipeline (order fixed so
    setting ids align across structurally identical units)."""
    if spec.get("faq"):
        root = re.match(r"<details\b[^>]*>", unit)
        is_open = " open" in root.group(0)
        unit = unit.replace(root.group(0),
                            "<details{% if block.settings." + "BOPEN" +
                            " %} open{% endif %}>", 1)
        sid = ex.add("checkbox", "Open by default", is_open)
        unit = unit.replace("BOPEN", sid)

        def body(m):
            bid = ex.add("html", "Answer", m.group(1).strip())
            return '<div class="body">%s</div>' % ex.ref(bid)
        unit = re.sub(r'<div class="body">(.*?)</div>', body, unit, flags=re.S)
    return ex_pipeline(unit, ex, toks)


def blockify(html, spec, toks):
    """Repeating units -> {% for block in section.blocks %}; returns
    (html, blocks_schema, per_unit_values) or (html, None, None)."""
    units = list(re.finditer(spec["pat"], html, re.S))
    if len(units) < 2:
        return html, None, None
    bex = Ex("block")
    markup = extract_unit(units[0].group(0), bex, toks, spec)
    root = re.match(r"<[a-z]+\b[^>]*(?<!%)>", markup)
    markup = markup.replace(root.group(0),
                            root.group(0)[:-1] + " {{ block.shopify_attributes }}>", 1)
    loop = ("{% for block in section.blocks %}" + markup + "{% endfor %}")
    bvals = []
    for u in units:
        e2 = Ex("block")
        extract_unit(u.group(0), e2, [], spec)
        bvals.append(e2.values)
    # splice as a mask token so the section-level pipeline can't touch the
    # loop's own block.settings references
    toks.append(loop)
    html = (html[: units[0].start()] + "\x00%d\x00" % (len(toks) - 1)
            + html[units[-1].end():])
    schema = [{"type": "item", "name": spec["name"], "settings": bex.settings}]
    return html, schema, bvals


BLOCK_SPECS = {
    ("home", "creds"): {"pat": r'<figure class="cred rev">.*?</figure>',
                        "name": "Quote"},
    ("faq", "*"): {"pat": r"<details\b.*?</details>", "name": "FAQ item",
                   "faq": True},
}


def split_sections(inner):
    chunks, pos = [], 0
    for m in re.finditer(r"<section\b.*?</section>", inner, re.S):
        pre = inner[pos:m.start()].strip()
        if pre:
            chunks.append(pre)
        chunks.append(m.group(0))
        pos = m.end()
    rest = inner[pos:].strip()
    if rest:
        chunks.append(rest)
    return chunks


def sectionize(tpl_name, prefix, inner, split=True):
    """Emit sections/<prefix>-*.liquid + templates/<tpl_name>.json."""
    chunks = split_sections(inner) if split else [inner]
    entries, seen = [], {}
    for i, chunk in enumerate(chunks):
        m = re.search(r'<section[^>]*class="([a-z]+)', chunk)
        cls = m.group(1) if m else ("content" if not split else "part%d" % i)
        seen[cls] = seen.get(cls, 0) + 1
        stype = prefix + "-" + cls + ("" if seen[cls] == 1 else "-%d" % seen[cls])
        name = SEC_NAMES.get(cls, cls.title())
        if not split:
            name = prefix.replace("-", " ").title() + " content"

        masked, toks = [], []
        def _m(mm):
            toks.append(mm.group(0))
            return "\x00%d\x00" % (len(toks) - 1)
        body = MASK_PAT.sub(_m, chunk)

        spec = BLOCK_SPECS.get((prefix, cls)) or BLOCK_SPECS.get((prefix, "*"))
        blocks_schema = bvals = None
        if spec:
            body, blocks_schema, bvals = blockify(body, spec, toks)

        ex = Ex("section")
        body = ex_pipeline(body, ex, toks)
        while re.search(r"\x00(\d+)\x00", body):
            body = re.sub(r"\x00(\d+)\x00", lambda mm: toks[int(mm.group(1))], body)

        schema = {"name": name[:25], "settings": ex.settings}
        if blocks_schema:
            schema["blocks"] = blocks_schema
            schema["max_blocks"] = 25
        schema["presets"] = [{"name": name[:25]}]
        emit("sections/%s.liquid" % stype,
             body + "\n{% schema %}\n" + json.dumps(schema, indent=1)
             + "\n{% endschema %}\n")
        entries.append((stype, ex.values, bvals))

    sections, order = {}, []
    for stype, values, bvals in entries:
        sec = {"type": stype, "settings": values}
        if bvals:
            bl, bo = {}, []
            for j, v in enumerate(bvals):
                bid = "b%d" % (j + 1)
                bl[bid] = {"type": "item", "settings": v}
                bo.append(bid)
            sec["blocks"] = bl
            sec["block_order"] = bo
        sections[stype] = sec
        order.append(stype)
    emit("templates/%s.json" % tpl_name,
         json.dumps({"sections": sections, "order": order}, indent=1))


def main_of(html):
    a = html.index('<main id="main">') + len('<main id="main">')
    return html[html.index("<main", 0):a], html[a:html.rindex("</main>")]


def emit(path, content):
    p = os.path.join(OUT, path)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        f.write(content)


def build_theme():
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)

    idx = map_assets(map_urls(read("index.html")))

    # ---- layout/theme.liquid --------------------------------------------
    head_end = idx.index("</head>")
    head = idx[: head_end]
    # the per-page title/description/canonical/social block becomes Liquid
    head = re.sub(r"<title>.*?</title>", "", head, flags=re.S)
    head = re.sub(r'<meta name="description"[^>]*>\n?', "", head)
    head = re.sub(r'<link rel="canonical"[^>]*>\n?', "", head)
    head = re.sub(r'<meta (?:property="og:|name="twitter:)[^>]*>\n?', "", head)
    head = re.sub(r'<script type="application/ld\+json">.*?</script>\n?', "",
                  head, flags=re.S)
    head += (
        "<title>{{ page_title }} &middot; Side Story &mdash; Parfums &amp; Oils</title>\n"
        '<meta name="description" content="{{ page_description | escape }}">\n'
        '<link rel="canonical" href="{{ canonical_url }}">\n'
        "{{ content_for_header }}\n</head>"
    )

    body_a = idx.index("<body")
    body_open = idx[body_a: idx.index(">", body_a) + 1]
    main_a = idx.index("<main")
    main_open = idx[main_a: idx.index(">", main_a) + 1]
    chrome_top = idx[idx.index(">", body_a) + 1: main_a]
    tail = idx[idx.rindex("</main>") + 7: idx.rindex("</body>")]
    # the demo bag count becomes the real one at render
    chrome_top = chrome_top.replace('id="bagcount">0<',
                                    'id="bagcount">{{ cart.item_count }}<')
    tail = tail.replace('id="bagcount">0<',
                        'id="bagcount">{{ cart.item_count }}<')

    # Liquid-emitted commerce map: handle -> size key -> variant id/price.
    # Read from the live catalogue at render, so the theme can never disagree
    # with the store about a price or an id.
    varmap = """
<script>
window.SS_VAR = {
{%- for product in collections['the-fragrances'].products %}
  {{ product.handle | json }}: {
  {%- for v in product.variants %}
    {%- assign k = v.option1 %}
    {%- if k == '7.5ml' %}{% assign k = '7-5ml' %}{% endif %}
    {%- if k == '2ml' %}{% assign k = 'sample' %}{% endif %}
    {{ k | json }}: { id: {{ v.id }}, price: {{ v.price }} },
  {%- endfor %} },
{%- endfor %}
  "set": { "full": { id: {{ all_products['discovery-set'].selected_or_first_available_variant.id | default: 0 }}, price: {{ all_products['discovery-set'].price | default: 0 }} } }
};
window.SS_MONEY = {{ shop.money_format | json }};
window.SS_FREE_CENTS = {{ 15000 }};
</script>
"""
    layout = (head + body_open + chrome_top
              + "\n" + main_open + "{{ content_for_layout }}</main>\n"
              + tail + varmap
              + "<script src=\"{{ 'cart.js' | asset_url }}\" defer></script>\n"
              + "<script>if(window.Shopify&&Shopify.designMode){"
              + "document.addEventListener('shopify:section:load',"
              + "function(){location.reload()});}</script>\n"
              + "</body></html>\n")
    # site.js loads in the tail; cart.js overrides its demo bag after it.
    emit("layout/theme.liquid", layout)

    # ---- templates ------------------------------------------------------
    def template_from(page, tpl, extra=""):
        html = map_assets(map_urls(read(page)))
        _, inner = main_of(html)
        emit(f"templates/{tpl}", extra + inner)

    template_from("collection.html", "collection.liquid")
    template_from("bag.html", "cart.liquid")
    template_from("search.html", "search.liquid")
    template_from("404.html", "404.liquid")

    # ---- sectioned templates (theme editor) -----------------------------
    def inner_of(page):
        html = map_assets(map_urls(read(page)))
        return main_of(html)[1]

    sectionize("index", "home", inner_of("index.html"), split=True)
    sectionize("page.our-story", "our-story", inner_of("our-house.html"), split=True)
    sectionize("page.stories", "your-stories", inner_of("stories.html"), split=True)
    sectionize("page.share", "share", inner_of("share.html"), split=True)
    for p in ["faq", "shipping", "stockists", "contact", "legal"]:
        sectionize("page." + p, p, inner_of(p + ".html"), split=False)
    for s in SLUGS:
        sectionize("page.story-" + s, "story-" + s,
                   inner_of(f"story-{s}.html"), split=False)

    # one product template, the exact page per handle
    cases = []
    for s in SLUGS:
        html = map_assets(map_urls(read(f"product-{s}.html")))
        _, inner = main_of(html)
        cases.append("{%% when '%s' %%}\n%s" % (s, inner))
    html = map_assets(map_urls(read("samples.html")))
    _, inner = main_of(html)
    cases.append("{%% when 'discovery-set' %%}\n%s" % inner)
    fallback = ("{% else %}\n<div class=\"inner\"><div class=\"phead\">"
                "<h1>{{ product.title }}</h1></div>{{ product.description }}"
                "</div>\n")
    emit("templates/product.liquid",
         "<script>document.body.dataset.slug={{ product.handle | json }};"
         "</script>\n{% case product.handle %}\n"
         + "\n".join(cases) + fallback + "{% endcase %}")

    # content pages are all sectioned JSON templates now; only the generic
    # fallback for client-created pages stays classic.
    emit("templates/page.liquid",
         '<div class="inner"><div class="phead"><h1>{{ page.title }}</h1>'
         "</div>{{ page.content }}</div>")
    emit("templates/list-collections.liquid",
         '<div class="inner"><div class="phead"><h1>Collections</h1></div>'
         "{% for collection in collections %}"
         '<p><a class="ul" href="{{ collection.url }}">{{ collection.title }}'
         "</a></p>{% endfor %}</div>")
    emit("templates/gift_card.liquid",
         "{% layout none %}<!doctype html><html><head><title>Gift card"
         "</title></head><body><h1>{{ shop.name }}</h1>"
         "<p>{{ gift_card.initial_value | money }}</p>"
         "<p>{{ gift_card.code | format_code }}</p></body></html>")

    # ---- assets ---------------------------------------------------------
    css = read("assets/css/app.css")
    css += (
        "\n/* Shopify section wrappers are layout-transparent, and the two\n"
        "   main>:first-child rules get wrapper-aware twins. */\n"
        "main>.shopify-section{display:contents}\n"
        "main>.shopify-section:first-child>:is(.band,.house,.seven,.show,"
        ".atelier,.feelings,.ways,.making,.mater,.journal,.creds):first-child"
        "{padding-top:var(--space-7)}\n"
        "main>.shopify-section:first-child>:is(.band,.seven):first-child"
        ":has(> .inner > .crumb){padding-top:0}\n")
    emit("assets/app.css", css)
    fonts = read("assets/css/fonts.css")
    fonts = re.sub(r'url\((["\']?)\.\./fonts/', r"url(\1", fonts)
    emit("assets/fonts.css", fonts)

    js = read("assets/js/site.js")
    js = js.replace('a[href$="search.html"]', 'a[href$="/search"]')
    js = js.replace("location.pathname.endsWith('/search.html')",
                    "(location.pathname === '/search')")
    js = js.replace("'product-'+card.dataset.slug+'.html'+(key==='100ml'?'':'?size='+key)",
                    "'/products/'+card.dataset.slug+(key==='100ml'?'':'?size='+key)")
    js = map_urls(js)
    js = re.sub(r"(?<![a-z/])/?assets/img/", CDN + "/assets/img/", js)
    emit("assets/site.js", js)

    emit("assets/cart.js", CART_JS)

    # ---- config / locales ----------------------------------------------
    emit("config/settings_schema.json", json.dumps([{
        "name": "theme_info",
        "theme_name": "Side Story",
        "theme_version": "1.0.0",
        "theme_author": "Side Story Parfums",
        "theme_documentation_url": CDN,
        "theme_support_url": CDN,
    }], indent=2))
    emit("config/settings_data.json", json.dumps({"current": {}}))
    emit("locales/en.default.json", json.dumps({}))

    # ---- zip ------------------------------------------------------------
    zpath = os.path.join(ROOT, "side-story-theme.zip")
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
        for dirpath, _, files in os.walk(OUT):
            for f in files:
                p = os.path.join(dirpath, f)
                z.write(p, os.path.relpath(p, OUT))
        # font binaries ride along so asset_url serves them from Shopify
        fdir = os.path.join(ROOT, "assets/fonts")
        for f in sorted(os.listdir(fdir)):
            if f.endswith(".woff2"):
                z.write(os.path.join(fdir, f), "assets/" + f)
    print("theme/ written,", zpath, os.path.getsize(zpath), "bytes")


# The real cart, over the demo bag. Loads after site.js and overrides its
# three globals; every DOM id and class the drawer and cart page use is
# unchanged, so the UI stays exactly the site's.
CART_JS = r"""
(function(){
  'use strict';
  const fmt = (window.SS_MONEY || 'Dhs. {{amount}}');
  const money = c => fmt.replace(/\{\{\s*amount[^}]*\}\}/,
    (c/100).toLocaleString('en', {minimumFractionDigits:2, maximumFractionDigits:2}));
  const FREE = window.SS_FREE_CENTS || 15000;
  let cart = null;

  function paint(){
    if(!cart) return;
    const n = cart.item_count;
    document.querySelectorAll('#bagcount,[data-bagcount]').forEach(e=>e.textContent=n);
    const line = i => `<div class="ditem">
      <img src="${i.image||''}" alt="" width="112" height="112">
      <div><h3>${i.product_title}${i.variant_title&&i.variant_title!=='Default Title'?' — '+i.variant_title:''}</h3>
        <p class="meta">QTY ${i.quantity}</p>
        <span class="price">${money(i.final_line_price)}</span>
        <button class="ul" data-remove="${i.key}">Remove</button></div></div>`;
    const items = document.getElementById('ditems');
    if(items) items.innerHTML = cart.items.length ? cart.items.map(line).join('')
      : '<p class="crumb" style="padding-block:var(--s-5)">Empty — every story starts somewhere.</p>';
    const wrap = document.getElementById('baglines');
    if(wrap) wrap.innerHTML = cart.items.length ? cart.items.map(i=>`<div class="line">
      <img src="${i.image||''}" alt="" width="112" height="112">
      <div><h3>${i.product_title}${i.variant_title&&i.variant_title!=='Default Title'?' — '+i.variant_title:''}</h3>
        <p class="meta">QTY ${i.quantity}</p>
        <div class="act"><span class="meta">${money(i.final_line_price)}</span>
          <button class="ul" data-remove="${i.key}">Remove</button></div></div></div>`).join('')
      : `<div class="empty"><p class="k">Nothing here yet</p>
         <p>Your bag is empty. The shelf is seven stories long.</p>
         <div class="tagrow"><a href="/collections/the-fragrances">See the fragrances</a><a href="/products/discovery-set">Begin with the set</a></div></div>`;
    const t = cart.total_price;
    ['dtotal','subtotal','bagsub','cosub','grandtotal','bagtotal','cototal']
      .forEach(id=>{const e=document.getElementById(id); if(e) e.textContent=money(t);});
    document.querySelectorAll('[data-bagtotal]').forEach(e=>e.textContent=money(t));
    const pct = Math.min(100, Math.round(t/FREE*100));
    const fill = document.getElementById('tfill'); if(fill) fill.style.width=pct+'%';
    const th = document.getElementById('thresh');
    if(th) th.textContent = t>=FREE ? 'Complimentary delivery — unlocked'
      : 'Complimentary delivery at '+money(FREE)+' — '+money(FREE-t)+' away';
  }

  async function refresh(){
    try{ cart = await (await fetch('/cart.js',{headers:{'Accept':'application/json'}})).json(); }
    catch(e){ return; }
    paint();
  }

  window.addToBag = function(slug, kind, btn){
    const key = kind==='full' ? (slug==='set' ? 'full' : '100ml') : kind;
    const v = window.SS_VAR && window.SS_VAR[slug] && window.SS_VAR[slug][key];
    if(!v || !v.id){ location.href = slug==='set' ? '/products/discovery-set' : '/products/'+slug; return; }
    if(btn){ const t=btn.textContent, w=btn.getBoundingClientRect().width;
      btn.style.minWidth=Math.round(w)+'px'; btn.textContent='In the bag'; btn.disabled=true;
      setTimeout(()=>{btn.textContent=t;btn.disabled=false;btn.style.minWidth='';},1400); }
    fetch('/cart/add.js',{method:'POST',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify({items:[{id:v.id,quantity:1}]})})
      .then(refresh)
      .then(()=>{ const c=document.getElementById('bagcount');
        if(c){c.classList.add('tick');setTimeout(()=>c.classList.remove('tick'),300);}
        setTimeout(window.openDrawer, 420); });
  };
  window.SSremove = function(){ /* superseded by data-remove delegation */ };
  document.addEventListener('click', e=>{
    const b = e.target.closest('[data-remove]'); if(!b) return;
    fetch('/cart/change.js',{method:'POST',
      headers:{'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify({id:b.dataset.remove, quantity:0})}).then(refresh);
  });
  refresh();
})();
"""

if __name__ == "__main__":
    build_theme()
