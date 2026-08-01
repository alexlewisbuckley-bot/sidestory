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
         line="It was a ten minutes before 8pm when he arrived, and its resplendence never failed to catch him off guard.",
         img="p-hotel-lobby", badge="Bestseller", read="5 min", family="woods", wear="woods warmed by a polished bar"),
    dict(slug="sibling-rivalry", name="Sibling Rivalry", stone="Leopard Salome", swatch="#8A6A3F",
         notes="grapefruit, vetiver, smoke", story="Story II",  feeling="Mischief",
         line="There is a particular silence that only a brother can make, and she had been listening to it for thirty years.",
         img="p-sibling-rivalry", badge="", read="6 min", family="citrus", wear="grapefruit cut with woodsmoke"),
    dict(slug="pillow-talk",    name="Pillow Talk",    stone="Calacatta",      swatch="#E0DCD0",
         notes="musk, powder, warm skin",    story="Story III", feeling="Comfort",
         line="They had been awake for hours, unspooling the sweet trivialities of their personal histories in sleepy whispers.",
         img="p-pillow-talk", badge="", read="4 min", family="powder", wear="warm skin under cool linen"),
    dict(slug="sunday-service", name="Sunday Service", stone="Verde Jade",     swatch="#3E5147",
         notes="incense, linen, morning air", story="Story IV", feeling="Devotion",
         line="The drive from the city to the country always felt like rolling back time.",
         img="p-sunday-service", badge="", read="7 min", family="incense", wear="cold air held in church oak"),
    dict(slug="third-date",     name="Third Date",     stone="Rosso Levanto",  swatch="#7A2E2A",
         notes="plum, tobacco, candlelight",  story="Story V",  feeling="Attraction",
         line="She hardly knew him, of course—tonight was only the third date. But there was such familiarity between them.",
         img="p-third-date", badge="", read="5 min", family="amber", wear="orange blossom over well-worn leather"),
    dict(slug="road-trip",      name="Road Trip",      stone="Rosso Francia",  swatch="#B5593F",
         notes="amber, leather, warm wind",   story="Story VI", feeling="Escape",
         line="They knew where they were going, but neither seemed to mind the impromptu detour along the way.",
         img="p-road-trip", badge="New story", read="6 min", family="amber", wear="warm leather and wind off an open window"),
    dict(slug="4pm-matinee",    name="4pm Matinee",    stone="Giallo Siena",   swatch="#C99A3F",
         notes="citrus, velvet, dark rooms",  story="Story VII", feeling="Solitude",
         line="She came to the afternoon matinee alone. She liked the rush of independence when the ticket seller looked around for a date.",
         img="p-4pm-matinee", badge="", read="5 min", family="citrus", wear="soft velvet in a darkened theatre"),
]
BY_SLUG = {p["slug"]: p for p in PRODUCTS}

# The PDP story bands. Written per fragrance so the chapter, the margins and the
# stone all speak about the same bottle rather than sharing generic copy.
CHAPTERS = {
  # Hotel Lobby — copy supplied by Alex, 1 Aug. Paragraphs verbatim.
  "hotel-lobby": dict(
    pull="The bar was the kind of place Hemingway might have lingered a little too long.",
    pullref="From Hotel Lobby, Chapter I",
    numeral="I", chapter="Chapter I of IX", title="Ten minutes before eight.", author="Morgan Childs",
    paras=[
      "It was a ten minutes before 8pm when he arrived. He had been there before, but its resplendence never failed to catch him off guard. Modish floors patterned in ebony and ivory marble, deep armchairs in dark, buttery leather, a chocolate Steinway piano, and the amber lights of old-world libraries. The bar was the kind of place Hemingway might have lingered a little too long, lights glittering on the crystal and glass. Hushed conversations, each one layering the next.",
      "He perched on the edge of an armchair to wait, eyes darting about the lobby in anticipation. He checked his watch. Still early.",
      "He felt a rush of cool air on his cheeks as the revolving door swept a white-haired couple, dressed to the nines, into the warmth of the lobby. The man, small but well-built, even in his eighties, wore a pocket square and a raffish grin, like a troublemaking boy who could hardly believe what he was getting away with. On his arm, an impeccably styled, sharp-featured woman with a slash of red lipstick. Her air was regal, but it was clear she was struggling to maintain her composure in the wake of a puerile joke. Her crimson pout was now the sole focus of her husband\u2019s attention. It began to warp into a smirk, and then, much to the woman\u2019s chagrin, into a full-fledged smile.",
      "As they passed him in the lobby, the man gave his knee a paternal tap. \u201cCan you believe she\u2019s with me?\u201d he said, gesturing to the woman by his side. \u201cAlmost sixty years.\u201d",
      "He watched the elevator doors close behind them and then checked his watch \u2014 still a few minutes. A familiar song drifted from the piano. Something from an old romantic, a melody that his father loved and his mother sang to herself in the kitchen. They would have looked at home here. Like a puff of smoke, the lyrics seemed briefly tangible in the air \u2014 something something, gave me a thrill \u2014 and then dissipated, leaving only the fragrance of their wistfulness behind.",
      "Suddenly, a warm voice spoke his name, pulling him out of his reverie and back into the hotel lobby. He looked up to see the face he came for, as familiar as the notes on the piano, and every bit as beguiling. He smiled, rising with purpose and posture. The evening had begun.",
    ],
    scent="antique bergamot poured over ice \u2014 ebony marble, buttery leather, amber light",
    caption="the chapter, photographed as it was written \u2014 box, liner, and the bar\u2019s low light",
    margins=[("Opening","cold air through the revolving door","\u2014 he checks his watch, still early"),
             ("Heart","dark buttery leather, warmed by the room","\u2014 almost sixty years"),
             ("Base","amber light on crystal and glass","\u2014 the evening had begun")],
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

  # Pillow Talk — copy supplied by Alex, 1 Aug. Paragraphs verbatim.
  "pillow-talk": dict(
    pull="It was only Saturday, and neither had anywhere they had to be.",
    pullref="From Pillow Talk, Chapter I",
    numeral="III", chapter="Chapter I of IX", title="Scout\u2019s honor.", author="Iris Vandeleur",
    paras=[
      "They had been awake for hours, drifting in and out of consciousness, unspooling the sweet trivialities of their personal histories in sleepy whispers, and between stolen kisses. Just before noon, he arose to make coffee, making her promise that she\u2019d be in the exact same place when he returned. They would continue the conversation. She raised three fingers in mock solemnity: scout\u2019s honor, she said.",
      "He brought the little bowls of black coffee into the bedroom with a pitcher of cream. She liked to watch her cup become a canvas, the cream and coffee mingling like watercolours before blending into rich caramel. She was waiting in the bed next to the open window, the down duvet ruffled around her like a snow drift. The bed linens were cool against her skin, crisp and clean, the satin white illuminating her face, her violet eyes, her tousled hair.",
      "He knelt on the bed and put his lips to her temple, then her ear, then placed one of the cups in her eager hands. He breathed in her fresh, powdery skin. Gently, he tipped a thimble of cream into her coffee, then another, watching her delight in the dance of dark and light.",
      "He went to the sideboard and pulled a record from its sleeve as she raised the coffee to her lips. She admired the care in his touch, the way he gingerly placed the album on the turntable and slowly lowered the needle: his gentle, deliberate, unhurried way of doing things. She admired the grey on his temples, the stubble on his jawline, the willowy muscles in his neck and shoulders.",
      "He felt her watching him and shifted his gaze back to the bed, narrowing his eyes in faux accusation. As he approached her, she began to giggle, unable to contain her delight, and he matched her laughter with a silly grin. Smitten, neither could believe their good fortune.",
      "Morning light spilled into the bedroom and the melody escaped out of the window and down to they city below. It was only Saturday, and neither had anywhere they had to be. They both knew they might linger there for hours, or the whole day, or two, dissolving into conversation, and pleasure, and one another, as naturally as cream into coffee.",
    ],
    scent="black coffee and cream, cool linen and powdery skin \u2014 a Saturday with nowhere to be",
    caption="the chapter, photographed as it was written \u2014 linen, the open window, the cup half-turned",
    margins=[("Opening","black coffee, and cream folded into it","\u2014 the dance of dark and light"),
             ("Heart","cool linen, crisp against the skin","\u2014 the duvet like a snow drift"),
             ("Base","fresh powdery skin, and morning light","\u2014 neither had anywhere to be")],
    stone_title="Calacatta, cut once.",
    stone_body="One grey seam through a white field, running off-centre because the block decided so \u2014 the lid on your bottle is the only one that will carry that line."),

  # Sunday Service — copy supplied by Alex, 1 Aug. Paragraphs verbatim.
  "sunday-service": dict(
    pull="The music was the same. The cool, oaky air of the church was the same.",
    pullref="From Sunday Service, Chapter I",
    numeral="IV", chapter="Chapter I of IX", title="Rolling back time.", author="Morgan Childs",
    paras=[
      "The drive from the city to the country always felt like rolling back time. The summer faded the colour of the tall grass along the narrow road and inspired a symphony of cicadas and grasshoppers, but the plains of wheat, the cattle and horses, the sunsets and moons on the horizon were always the same, month after month, year after year, just as they had been when he was a boy. Now the leaves were dense and green, hanging heavy over the road and mottling the light on his dashboard. Soon they’d fade and fall, and the cycle would continue.",
      "He passed by the rusted tower and remembered climbing its iron legs with his friends so they could dangle their feet over the ledge, perched high above the town. Rounding the pond, he remembered roughhousing with his classmates and tossing each other in to the still, cold water. He thought back—as he often did—to his first love and their first kiss, sitting side-by-side on the dock, hands trembling, hearts racing.",
      "By the time he pulled onto the gravel road leading to the church, he experienced the strange sensation of both slipping into a younger version of himself and shouldering the weight and wisdom of old age. He still had so much life ahead of him, yet these journeys back to his hometown imbued him with the equanimity of a man beyond his years. He remembered inching along that road in a funeral procession after his mother died, and later, watching his newlywed sister speeding off, her husband in tow, cans rattling off the back bumper, clouds of gravel trailing after them.",
      "His sister had already taken her place at the altar when he arrived, bouncing his pretty niece on her hip in the christening gown they had both worn years ago. As he slipped into the pew, he noted how soft the wood felt beneath his fingers, polished and worn from so many years of human touch. But the music was the same. The cool, oaky air of the church was the same. The smell—ageing paper, freshly mown grass—just the same. As much as time was hurtling by, it felt in the moment that nothing had changed.",
      "And yet. As he rose for the first hymn, he touched the ring in his pocket. Past and present came together in that smooth gold loop. There in the place that made him, he traced it round and round, over and over again.",
    ],
    scent="church oak and beeswax — cold air held in clean linen",
    caption="the chapter, photographed as it was written — stone, polish, and the last of the lilies",
    margins=[("Opening","cold water, cut grass, iron on the hands","— the pond, the dock, the first kiss"),
             ("Heart","linen dried outdoors — the smell of being fifteen","— the tower, and the iron legs of it"),
             ("Base","church oak, beeswax polish, ageing paper","— the music was the same")],
    stone_title="Verde Jade, cut once.",
    stone_body="Green under the polish and almost black away from the light — quarried in a seam that gives perhaps a dozen lids a year, and never the same twice."),

  # Third Date — copy supplied by Alex, 1 Aug. Paragraphs verbatim.
  "third-date": dict(
    pull="There was such familiarity between them, as if they’d known each other a lifetime ago and were simply catching up.",
    pullref="From Third Date, Chapter I",
    numeral="V", chapter="Chapter I of IX", title="Only the third date.", author="Nell Ferreira",
    paras=[
      "What did she like about him? Her friends wanted to know. She raised her tea to her lips as she paused to think, then smiled, feeling rather sheepish. How could she choose any one thing and not list them all? She hardly knew him, of course—tonight was only the third date. But there was such familiarity between them, as if they’d known each other a lifetime ago and were simply catching up.",
      "Across the city, he stood over the bathroom sink brushing his teeth, thinking of her, and noticed something he hadn’t experienced in years: butterflies in his stomach. He shook his head to himself, laughing. They hardly knew each other, yet she’d already made a giddy fool of him. He could hardly wait to see her again.",
      "On the train, she pulled her compact from her purse to check her lipstick one last time. She brushed a few stray hairs into place, then ruffled her hair again, wanting to appear thoughtfully—artfully—effortless. She caught the eye of an auburn-haired lady across the aisle, who clucked to herself, remembering all the trouble she went to as a girl to look untroubled. The two women shared a knowing smile.",
      "His anticipation got the better of him, and he arrived to the restaurant early. As he waited for her—giving his best performance as a levelheaded, self-assured person—he noticed that the orange-blossom clipping in the vase on his table gave off the most bewitching scent.",
      "He was not one to notice the scent of a cut flower, typically, yet recently he’d become attuned to these subtle pleasures. He realised that he’d become acutely observant. The oxidised cufflinks on the elder gentleman that lives in his building, for one. The choir of birdsong emanating from the autumnal foliage, competing with the rustling of leaves. The soft, yet cracked, feel of leather on his well-worn boots. Amused that he’d gotten himself lost in so many little details, since he was not much of a daydreamer, he was hardly one to get lost in a reverie.",
      "Then he felt a delicate hand on his shoulder, and he suddenly understood why.",
    ],
    scent="orange blossom cut and set on the table, over soft, well-worn leather",
    caption="the chapter, photographed as it was written — the vase, the table, the third evening",
    margins=[("Opening","orange blossom, cut and set on the table","— the most bewitching scent"),
             ("Heart","oxidised brass and autumn foliage","— he had become acutely observant"),
             ("Base","soft, cracked leather, well worn","— and he suddenly understood why")],
    stone_title="Rosso Levanto, cut once.",
    stone_body="Deep red run through with white — a stone that looks composed and is entirely accidental. Your lid’s pattern was decided in the block, not by us."),

  # Road Trip — copy supplied by Alex, 1 Aug. Paragraphs verbatim.
  "road-trip": dict(
    pull="Maybe they would return to the map, steer themselves back to their itinerary. Maybe.",
    pullref="From Road Trip, Chapter I",
    numeral="VI", chapter="Chapter I of IX", title="The impromptu detour.", author="Iris Vandeleur",
    paras=[
      "They knew where they were going, but neither seemed to mind the impromptu detour along the way. Undulating fields of sage and lavender tumbled out into the distance before them, the car drifting over the landscape like a ship on the open sea. Uninterrupted sky stretched in every direction.",
      "Leaning back in her seat, she sank her teeth into a ripe peach and remembered the afternoons she used to spend in the backyard as a child, lying on the grass, watching the clouds carousel across the sky. She rarely took the time to look up now, but when she did, she recognised that familiar sense of calm: an old friend that came to visit in the moments when she let herself pause for simple pleasures.",
      "It was good to be away from the city—finally—in a place where the air was crisp, where there were no schedules or obligations. It was easy to be present there, to breathe in the moment and let the feeling of being free release the tension of a long winter.",
      "From the driver’s seat, he noticed her lean back - with a long, contented sigh. He shifted his attention, just for a moment, away from the vast stretch of highway ahead of them and toward his passenger. Her nose and cheeks had picked up a bit of colour since they had left home. The wind had tousled her hair. He told her she looked pretty, and she laughed a little, embarrassed, but hardly protesting.",
      "She twisted the knob of the radio until the static dissipated and they heard a song they had both loved as children—one neither had heard in years, yet still remembered. Turn up the volume, he said, eyes fixated on the long road ahead. She rolled down the windows, and the music spilled out into the early-evening air.",
      "Her hand reached over, brushing his knee. He took it, letting her fingers intertwine with his for just a moment before returning to the steering wheel. She sang along to the music softly, under her breath, charmingly off-key, pulling her bare feet up to the glove compartment and tapping along to the beat. He smiled to himself, and she pretended not to notice.",
      "She pulled her sunglasses down and sunk deeper into the seat. The sun on the horizon bathed the hills in gold. Maybe they would return to the map, steer themselves back to their itinerary. Maybe.",
    ],
    scent="sage and lavender, a ripe peach and warm leather — the road with the windows down",
    caption="the chapter, photographed as it was written — the road, the light, the detour taken",
    margins=[("Opening","sage and lavender, tumbling to the distance","— the detour neither of them minded"),
             ("Heart","a ripe peach, and warm wind through the window","— the music spills out into the air"),
             ("Base","sun-warmed leather, and gold on the hills","— maybe they would return to the map")],
    stone_title="Rosso Francia, cut once.",
    stone_body="A warm red seamed with white, cut from a block that will not repeat — the lid on your bottle is the only one carrying that line."),

  # 4pm Matinee — copy supplied by Alex, 1 Aug. Paragraphs verbatim.
  "4pm-matinee": dict(
    pull="She’d never been afraid of striking out on her own. She’d never been afraid of going to the movies alone.",
    pullref="From 4pm Matinee, Chapter I",
    numeral="VII", chapter="Chapter I of IX", title="Just me.", author="Morgan Childs",
    paras=[
      "She came to the afternoon matinee alone. She liked the rush of independence she got when the ticket seller looked around for a date. “Just me,” she’d say with a playful smile. She took a seat in the middle of the theatre and sank down into the soft velvet chair, folding over the edges of her ticket in anticipation.",
      "From the moment she was a little girl, she adored the movies. She loved the ritual of going to the theatre: the music in the lobby, the smell of buttered popcorn, the hush of the crowd when the lights went down. But as she got older, she began to long to be a part of the experience. She wanted to feel the heat of the studio lights on her face and the rumble of applause beneath her feet. To captivate an audience with her laugh, or bring them to tears. She wanted to stretch beyond her shyness, filling the darkened theatre with her wit and grace.",
      "The film was a classic comedy, a story of a woman caught between three men. The actress in the starring role was beautiful, unconventional. She wore trousers when other ingénues were in skirts, blazed a trail for independent women in Hollywood. Offscreen, she rolled up her shirtsleeves and gardened geraniums and herbs, haggled with spice merchants from Delhi to Istanbul, and read Russian novels in long, luxurious, baths. She spent much of her life proudly, happily, alone.",
      "That afternoon in the matinee, the girl felt her future calling like a siren’s song. Years later, it became clear that the plan was hatched that very day. Countless auditions, hours of dance, singing lessons, late nights working behind a bar, endless sweat and tears—all of these began in a darkened theatre as her dream was taking shape.",
      "She couldn’t know that she’d succeed, but she never doubted it, either. Chasing her dream felt as natural as breathing air. It wasn’t a matter of choice. She had to become the star she knew herself to be.",
      "And once she’d achieved it—the fame, the acclaim—she’d attribute her success to her girlish gumption. She’d never been afraid of striking out on her own. She’d never been afraid of going to the movies alone.",
    ],
    scent="buttered popcorn and soft velvet — the hush of a darkened theatre at four in the afternoon",
    caption="the chapter, photographed as it was written — the ticket, the velvet, the dark",
    margins=[("Opening","the music in the lobby, buttered popcorn","— just me, she’d say"),
             ("Heart","soft velvet, sunk into","— the hush when the lights went down"),
             ("Base","warm dust and studio light","— the star she knew herself to be")],
    stone_title="Giallo Siena, cut once.",
    stone_body="Ochre shot through with white, quarried in Tuscany — no two lids repeat, and the block decides, not us."),

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


# ---------------------------------------------------------------- images ----
_MANIFEST = None


def _manifest():
    global _MANIFEST
    if _MANIFEST is None:
        import json
        path = os.path.join(ROOT, "assets/img/manifest.json")
        _MANIFEST = json.load(open(path)) if os.path.exists(path) else {}
    return _MANIFEST


SIZES_FOR = (
    # most specific first; matched against the tag's class attribute
    ("gal .strip", "88px"),
    ("thumb",      "88px"),
    ("main",       "(min-width:60em) 600px, 92vw"),
    ("plate",      "(min-width:68em) 400px, (min-width:40em) 46vw, 92vw"),
    ("chip",       "16px"),
    ("card",       "(min-width:68em) 300px, (min-width:40em) 46vw, 92vw"),
)


def _sizes_for(tag):
    cls = re.search(r'class="([^"]*)"', tag)
    cls = cls.group(1) if cls else ""
    for key, val in SIZES_FOR:
        if key in cls or key in tag:
            return val
    return "100vw"


def upgrade_images(html):
    """Turn every plain <img> into a <picture> with responsive sources.

    Applied once over the assembled page rather than at 56 call sites, so no
    template has to know about formats. Every raster went out as a single
    full-size JPEG — the 1800px hero delivered intact to a 390px phone — and
    none declared its dimensions, so every page reflowed as it decoded."""
    man = _manifest()

    def one(m):
        tag = m.group(0)
        if "<picture" in tag:
            return tag
        src = re.search(r'src="([^"]+)"', tag)
        if not src:
            return tag
        raw = src.group(1).split("?")[0]
        name = raw.split("/")[-1]
        entry = man.get(name)
        attrs = tag[4:-1].strip()
        if "decoding=" not in attrs:
            attrs += ' decoding="async"'
        if not entry:
            return "<img " + attrs + ">"
        if "width=" not in attrs:
            attrs += ' width="%d" height="%d"' % (entry["w"], entry["h"])
        sizes = _sizes_for(tag)
        if "srcset=" not in attrs and entry.get("jpg"):
            attrs += ' srcset="%s" sizes="%s"' % (
                ", ".join("%s %dw" % (fp("assets/img/" + f), w) for w, f in entry["jpg"]), sizes)
        sources = "".join(
            '<source type="image/%s" srcset="%s" sizes="%s">'
            % (k, ", ".join("%s %dw" % (fp("assets/img/" + f), w) for w, f in entry[k]), sizes)
            for k in ("avif", "webp") if entry.get(k))
        return "<picture>" + sources + "<img " + attrs + "></picture>"

    return re.sub(r"<img\b[^>]*>", one, html)


def head(title, desc, css, body_attr=""):
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
</head><body{body_attr}>
<a class="skip" href="#main">Skip to content</a>
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
    <button class="burger" aria-label="Menu" aria-expanded="false" aria-controls="primary-nav"><i></i><i></i><i></i></button>
    <a class="brand" href="index.html" aria-label="Side Story — Parfums &amp; Oils"><img src="{fp('assets/img/logo.svg')}" alt="Side Story — Parfums &amp; Oils" width="300" height="68"></a>
    <nav class="links" id="primary-nav" aria-label="Primary">
      {items}
    </nav>
    <div class="mega" id="mega" hidden>
      <div class="inner">
        <div>
          <p class="fh">Shop by size</p>
          <a class="ml" href="collection-100ml.html">100 ml &mdash; &pound;160</a>
          <a class="ml" href="collection-7-5ml.html">7.5 ml &mdash; &pound;40</a>
          <a class="ml" href="collection-samples.html">Samples &mdash; &pound;5</a>
          <a class="ml" href="samples.html">The First Lines &mdash; &pound;38</a>
        </div>
        <div>
          <p class="fh">Shop</p>
          <a class="ml" href="collection.html">All seven stories</a>
          <a class="ml" href="collection.html#by-feeling">By feeling</a>
          <a class="ml" href="collection.html#by-stone">By stone</a>
          <a class="ml" href="samples.html">Samples &mdash; &pound;5</a>
          <a class="ml" href="samples.html">The First Lines &mdash; &pound;38</a>
        </div>
        <div>
          <p class="fh">Read</p>
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
        '<div><p class="fh">%s</p>%s</div>' % (h, "".join(f'<a href="{u}">{t}</a>' for u, t in ls))
        for h, ls in FOOTER_COLS)
    return f"""<footer>
  <div class="inner">
    <div class="cols">
      {cols}
    </div>
    <div class="fmid">
      <p class="fcopy">&copy; Side Story Parfums MMXXVI &middot; Made in Grasse</p>
      <div class="fbrand"><img src="{fp('assets/img/logo-ivory.svg')}" alt="Side Story &mdash; Parfums &amp; Oils" width="300" height="68"></div>
    </div>
    <div class="fbot">
      <div class="pay"><i>VISA</i><i>MC</i><i>AMEX</i><i><svg class="i-apple" viewBox="0 0 384 512" aria-hidden="true" focusable="false"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.931.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>Pay</i></div>
      <p class="legal"><a href="legal.html">Privacy</a> &middot; <a href="legal.html">Terms</a> &middot; <a href="legal.html">Cookies</a> &nbsp; United Kingdom (GBP &pound;)</p>
    </div>
  </div>
</footer>
"""


DRAWER = """<div class="scrim" id="scrim" onclick="closeDrawer()"></div>
<aside class="drawer" id="drawer" role="dialog" aria-modal="true"
       aria-labelledby="drawer-title" hidden>
  <div class="dhead"><span id="drawer-title">Your bag &mdash; <span data-bagcount>0</span></span><button onclick="closeDrawer()">Close</button></div>
  <div id="ditems"></div>
  <label class="tryfirst"><input type="checkbox" checked>
    <div><b>Try a second story first</b><span>A complimentary 2ml of another story &mdash; its argument &mdash; tucked into the parcel.</span></div></label>
  <p class="thresh" id="thresh">Complimentary delivery at &pound;100</p>
  <div class="tbar"><div class="tfill" id="tfill"></div></div>
  <div class="dtot"><span>Subtotal</span><b id="dtotal">&pound;0</b></div>
  <a class="btn btn-ink" href="checkout.html">Checkout</a>
  <p class="dfine">Tax included &middot; 30&#8209;day returns &middot; sample cost redeemed</p>
</aside>
"""


# The range is one product per fragrance with three variants. 50ml is gone;
# 7.5ml at £40 replaces it. Only the 100ml carries the carved stone lid and
# the printed story — the 7.5ml and the sample travel in a printed sleeve, so
# the include line is per size and not a sitewide claim.
# Scent families. Seven fragrances, so a filter is only worth having if each
# option returns a real, small set — every product sits in exactly one family
# and selecting more than one widens rather than narrows. Derived from the
# note line each card already shows, which is what a shopper actually reads.
FAMILIES = [
    dict(key="woods",   label="Woods &amp; green"),
    dict(key="citrus",  label="Citrus &amp; fresh"),
    dict(key="powder",  label="Soft &amp; powdery"),
    dict(key="incense", label="Spice &amp; incense"),
    dict(key="amber",   label="Amber &amp; warm"),
]

SIZES = [
    dict(key="100ml",  label="100 ml", short="100ml", price=160,
         incl="The printed story is in the box",
         line="Hand-carved stone lid, and the nine printed pages, in the box."),
    dict(key="7-5ml",  label="7.5 ml", short="7.5ml", price=40,
         incl="Printed sleeve, no story",
         line="The same eau de parfum in a 7.5ml spray, in a printed sleeve."),
    dict(key="sample", label="Sample", short="2ml", price=5,
         incl="2ml, and its opening page",
         line="2ml of the eau de parfum — the cost comes off your first bottle."),
]
BY_SIZE = {z["key"]: z for z in SIZES}


def size_img(p, key):
    """Card image for a fragrance at a given size.

    Each variant shows what actually arrives. Anything not photographed yet
    falls back to the bottle rather than showing the wrong pack."""
    suffix = {"7-5ml": "-75-card", "sample": "-sample-card"}.get(key)
    if suffix:
        cand = "assets/img/p-%s%s.jpg" % (p["slug"], suffix)
        if os.path.exists(os.path.join(ROOT, cand)):
            return cand
    return "assets/img/p-%s-card.jpg" % p["slug"]


def size_main(p, key):
    """Product-page plate for a fragrance at a given size."""
    suffix = {"7-5ml": "-75", "sample": "-sample"}.get(key)
    if suffix:
        cand = "assets/img/p-%s%s.jpg" % (p["slug"], suffix)
        if os.path.exists(os.path.join(ROOT, cand)):
            return cand
    return "assets/img/p-%s-hero.jpg" % p["slug"]


def catalogue_json():
    """The bag reads this instead of carrying its own copy of the product list —
    that duplicate is what left the drawer pointing at image files the photo
    pipeline had stopped producing."""
    import json
    data = {p["slug"]: dict(name=p["name"], stone=p["stone"], col=p["swatch"],
                            notes=p["notes"], price=160,
                            img="assets/img/p-%s-card.jpg" % p["slug"],
                            href="product-%s.html" % p["slug"],
                            sizes={z["key"]: dict(
                                label=z["label"], price=z["price"], incl=z["incl"],
                                img=fp(size_img(p, z["key"])),
                                main=fp(size_main(p, z["key"])))
                                for z in SIZES})
            for p in PRODUCTS}
    data["set"] = dict(name="The First Lines", stone="", col="#3E5147",
                       notes="all seven in miniature", price=38,
                       img="assets/img/set-first-lines.jpg", href="samples.html")
    return json.dumps(data, ensure_ascii=False)


def openline(p, limit=58):
    """The story's opening, cut where a reader would cut it.

    Prefer the first sentence when it is short enough; otherwise fall back to
    the last word boundary before the limit. Never mid-word, which is what the
    old fixed slice was doing."""
    t = p["line"].strip()
    m = re.match(r"(.{20,%d}?[.!?])(\s|$)" % limit, t)
    if m:
        return m.group(1)[:-1]
    if len(t) <= limit:
        return t.rstrip(" ,;:")
    return t[:limit].rsplit(" ", 1)[0].rstrip(" ,;:\u2014-")


def story_plate(q):
    """The editorial plate for a fragrance's story.

    Supplied photography lives at assets/img/story-<slug>.jpg. Any fragrance
    without one yet falls back to its packshot, so the page is never broken
    waiting on a shoot."""
    cand = "assets/img/story-%s.jpg" % q["slug"]
    if os.path.exists(os.path.join(ROOT, cand)):
        return cand
    return plate(q, 2)


def plate(q, n):
    """assets path for shot `n` of a fragrance, falling back to its first.

    Four of the seven have a single master so far. Rather than 404 on a
    missing second plate, fall back — real photography drops straight in
    when it arrives and the fallback stops applying on its own."""
    cand = "assets/img/p-%s-%d.jpg" % (q["slug"], n)
    if os.path.exists(os.path.join(ROOT, cand)):
        return cand
    return "assets/img/p-%s-1.jpg" % q["slug"]


def page(slug, title, desc, body, current=None, css=("assets/css/fonts.css", "assets/css/app.css"), body_attr=""):
    out = head(title, desc, css, body_attr) + topbar(current or (slug + ".html")) \
        + '<main id="main">\n' + body.strip() + "\n</main>\n" \
        + footer() + DRAWER \
        + f'<script>window.SS_CAT={catalogue_json()};</script>\n' \
        + f'<script src="{fp("assets/js/site.js")}"></script>\n</body></html>\n'
    # one pass over the finished page, so the footer wordmark and the drawer
    # are covered too — they are appended after the body and were escaping it
    out = upgrade_images(out)
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
    return f"""      <article class="card{' rev' if reveal else ''}" data-slug="{p['slug']}" data-order="{PRODUCTS.index(p)}" data-feeling="{p['feeling']}" data-stone="{p['stone']}" data-note="{p['notes'].split(',')[0].strip()}" data-family="{p['family']}">
        <div class="ph"><a data-href href="product-{p['slug']}.html"><img data-shot src="{fp('assets/img/' + p['img'] + '-card.jpg')}" alt="{p['name']} eau de parfum" loading="lazy"></a>{badge}
          <div class="quick"><div class="r">
            <button class="btn btn-ink btn-sm" data-buy data-size="100ml" onclick="addToBag('{p['slug']}',this.dataset.size,this)">100 ml &mdash; &pound;160</button>
            <button class="btn btn-ghostink btn-sm" onclick="addToBag('{p['slug']}','sample',this)">Sample &pound;5</button>
          </div><small data-incl>The printed story is in the box</small></div></div>
        <div class="meta"><span class="chip" style="background:{p['swatch']}"></span><span class="stone">{p['stone']}</span>
          <h3>{p['name']}</h3><p class="notes">{p['notes']}</p>
          <p class="price"><span data-priceline>&pound;160 &middot; 100 ml</span><a class="ul" data-href href="product-{p['slug']}.html">View</a></p></div>
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
        "Seven fine fragrances, each begun as a commissioned short story. 100ml £160 beneath a hand-carved stone lid, 7.5ml £40, samples £5.",
        home_body, current="index.html")

    # ---- 02 collection, and one per size ---------------------------------
    #   One product per fragrance with three variants, so the size collections
    #   are the same seven cards with the variant pre-applied — the card price,
    #   plate and link all switch, and the product page opens on that size.
    SHELF = [
        (None, "collection", "The Fragrances", "The collection",
         "Seven stories, worn as scent.",
         "Each began as nine pages of fiction, commissioned before a single note was weighed. "
         "Eau de parfum in three sizes: 100ml at &pound;160 under a hand-carved stone lid with its "
         "printed story in the box, 7.5ml at &pound;40 in a printed sleeve, and samples at &pound;5, "
         "always redeemable against a full bottle."),
        ("100ml", "collection-100ml", "100 ml", "The collection &middot; 100 ml",
         "Seven stories, at 100 ml.",
         "The full bottle, &pound;160. Hand-carved stone lid, and the nine printed pages in the box "
         "&mdash; the only size that carries both."),
        ("7-5ml", "collection-7-5ml", "7.5 ml", "The collection &middot; 7.5 ml",
         "Seven stories, at 7.5 ml.",
         "The same eau de parfum in a 7.5ml spray, &pound;40, in a printed sleeve. No stone lid and "
         "no printed story at this size &mdash; those belong to the 100ml."),
        ("sample", "collection-samples", "Samples", "The collection &middot; samples",
         "Seven stories, to try first.",
         "2ml of any of the seven, &pound;5, and the cost comes off your first full bottle. "
         "Sent in a printed sleeve with the story&rsquo;s opening page."),
    ]
    for key, slug, title, kicker, head, lede in SHELF:
        cards = "\n".join(product_card(p) for p in PRODUCTS)
        if key in (None, "sample"):
            cards += "\n" + PROMO_CARD
        sizerow = "\n".join(
            '          <button type="button" data-size="%s" aria-pressed="%s">'
            '<span class="long">%s</span><span class="short">%s</span></button>'
            % (z["key"], "true" if z["key"] == (key or "100ml") else "false",
               z["label"], z["short"])
            for z in SIZES)
        famrow = "\n".join(
            '          <button type="button" data-family="%s" aria-pressed="false">%s</button>'
            % (f["key"], f["label"]) for f in FAMILIES)
        written[slug] = page(slug, title,
            "Seven stories, worn as scent. Eau de parfum &mdash; 100ml &pound;160, 7.5ml &pound;40, samples &pound;5.", f"""
<section class="seven">
  <div class="inner">
    {crumbs(("Home", "index.html"), ("The Fragrances", "collection.html"), title) if key else crumbs(("Home", "index.html"), "The Fragrances")}
    <div class="phead">
      <p class="k">{kicker}</p>
      <h1>{head}</h1>
      <p class="lede">{lede}</p>
    </div>
    <div class="shelfbar" data-shelf-for=".cards">
      <div class="ctl size">
        <span class="lbl" id="lbl-size">Size</span>
        <div class="seg" role="group" aria-labelledby="lbl-size">
{sizerow}
        </div>
      </div>
      <div class="ctl scent">
        <span class="lbl" id="lbl-scent">Scent</span>
        <button class="disclose" type="button" data-open-scent aria-haspopup="dialog">
          <span>Scent</span><span class="tally" data-tally hidden>0</span></button>
        <div class="chips" id="scentchips" role="group" aria-labelledby="lbl-scent">
{famrow}
        </div>
      </div>
      <p class="shelfcount"><span data-count>Seven stories</span>
        <button type="button" class="clear" data-clear hidden>Clear</button></p>
    </div>
    <div class="sheetscrim" data-scent-scrim hidden></div>
    <div class="sheet" data-scent-sheet role="dialog" aria-modal="true"
         aria-labelledby="sheet-title" hidden>
      <div class="sheethead">
        <h2 id="sheet-title">Scent</h2>
        <button type="button" class="x" data-close-scent aria-label="Close">Close</button>
      </div>
      <div class="sheetlist" data-scent-list></div>
      <div class="sheetfoot">
        <button type="button" class="clear" data-clear>Clear</button>
        <button type="button" class="btn btn-ink" data-close-scent>
          <span>Show <span data-sheetcount>7 stories</span></span></button>
      </div>
    </div>
    <div class="cards" data-size="{key or '100ml'}">
{cards}
    </div>
    <p class="foot rev">Every 100ml ships with its printed story and its carved stone lid &nbsp;&middot;&nbsp; 7.5ml and samples travel in a printed sleeve &nbsp;&middot;&nbsp; complimentary UK delivery over &pound;100</p>
  </div>
</section>
""", current="collection.html")

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
            f"{p['name']} eau de parfum — {p['notes']}. 100ml £160 beneath a {p['stone']} lid with its printed story; 7.5ml £40; samples £5.", f"""
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
      <blockquote>&ldquo;{openline(p)}&hellip;&rdquo; &mdash; nine pages of {p['feeling'].lower()}, worn as {p['wear']}.</blockquote>

      <p class="fieldlabel">Size</p>
      <div class="sizes">
        <button aria-current="true" data-size="100ml" data-price="160">100 ml &mdash; &pound;160</button>
        <button data-size="7-5ml" data-price="40">7.5 ml &mdash; &pound;40</button>
        <button data-size="sample" data-price="5">Sample &mdash; &pound;5</button>
      </div>

      <label class="tryfirst"><input type="checkbox" checked>
        <div><b>Try a second story first &mdash; complimentary</b>
          <span>A 2ml of {second['name']} &mdash; {second['feeling'].lower()} &mdash; tucked into the parcel.</span></div></label>

      <div class="cta">
        <button class="btn btn-ink" data-size="100ml" onclick="addToBag('{p['slug']}',this.dataset.size,this)">Add to bag &mdash; &pound;160</button>
        <button class="btn btn-ghostink applepay" onclick="addToBag('{p['slug']}',document.querySelector('.pdp .cta .btn-ink').dataset.size||'100ml',this)"><svg class="i-apple" viewBox="0 0 384 512" aria-hidden="true" focusable="false"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.931.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg> Apple Pay</button>
      </div>
      <p class="re"><span data-sizeline>Hand-carved stone lid, and the nine printed pages, in the box.</span></p>
      <p class="re">Complimentary UK delivery &middot; 30&#8209;day returns &middot; sample cost redeemed</p>

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
    """, current="collection.html", body_attr=f' data-slug="{p["slug"]}"')

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
    <p>Every parcel arrives gift-ready and there is no plastic in the box. A 100ml brings its stone lid and its printed story; a 7.5ml comes in its printed sleeve. Add the Dedication and a line of yours is typeset on the flyleaf.</p>
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
        <div class="tagrow">
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

    # ---- 07 stories index --------------------------------------------
    #   Frame: P15 "Your Stories — index" (167:2473). Sunday Service is the
    #   featured story; the remaining six run in a three-up grid.
    FEATURED = "sunday-service"
    feat = BY_SLUG[FEATURED]
    fc   = CHAPTERS[FEATURED]
    scards = "\n".join(f"""      <a class="scard rev" href="story-{q['slug']}.html">
        <span class="plate"><img src="{fp(story_plate(q))}" alt="{q['name']}" loading="lazy"></span>
        <span class="sm"><i class="chip" style="background:{q['swatch']}"></i>{q['story']} &middot; {q['read']} read</span>
        <h3>{q['name']}</h3>
        <p>{q['line']}</p>
        <span class="rd">Read &rarr;</span></a>"""
        for q in PRODUCTS if q["slug"] != FEATURED)

    written["stories"] = page("stories", "Your Stories",
        "Every fragrance began as fiction. Read all seven stories in full — the printed edition arrives in the box.", f"""
<section class="ysintro">
  <div class="inner">
    <p class="k">Your stories</p>
    <h1>Seven stories. Read one on us.</h1>
    <p class="lede">Every fragrance we make began as fiction, commissioned before a single note was weighed. Read them here in full &mdash; the printed edition arrives in the box.</p>
  </div>
</section>

<section class="yfeat">
  <img src="{fp(story_plate(feat))}" alt="{feat['name']}">
  <span class="veil" aria-hidden="true"></span>
  <div class="inner">
    <div class="c rev">
      <p class="k">{feat['story']} &middot; {feat['read']} read</p>
      <h2>{feat['name']}</h2>
      <p class="q">&ldquo;{fc['pull']}&rdquo;</p>
      <a class="ul" href="story-{FEATURED}.html">Read the story &rarr;</a>
    </div>
  </div>
</section>

<section class="ygrid">
  <div class="inner">
    <div class="scards">
{scards}
    </div>
  </div>
</section>

<section class="yset">
  <div class="inner">
    <h2>Undecided? Read three, then choose one.</h2>
    <p>The First Lines &mdash; all seven in miniature, &pound;38, credited against your first bottle.</p>
    <a class="btn btn-ivory" href="samples.html">Begin the set</a>
  </div>
</section>
""")

    # ---- 08 the seven stories ------------------------------------------
    #   Frame: P15 "Story — Sunday Service" (167:2596). One template, seven
    #   pages, driven from PRODUCTS + CHAPTERS so new copy and plates drop in.
    order = [q["slug"] for q in PRODUCTS]
    for i, q in enumerate(PRODUCTS):
        c = CHAPTERS[q["slug"]]
        prev = BY_SLUG[order[i - 1]]
        nxt  = BY_SLUG[order[(i + 1) % len(order)]]

        paras = list(c["paras"])
        cut = max(1, min(len(paras) - 1, round(len(paras) * 0.62))) if len(paras) > 1 else 1
        lead_html = '      <p class="dropcap">%s</p>' % paras[0]
        if cut > 1:
            lead_html += "\n" + "\n".join("      <p>%s</p>" % t for t in paras[1:cut])
        tail_html = "\n".join("      <p>%s</p>" % t for t in paras[cut:])

        notes_html = "\n".join(
            '        <p class="marginnote">%s<small>In the margin &mdash; %02d of 09</small></p>'
            % (note, n * 2 + 1)
            for n, (_lab, note, _aside) in enumerate(c["margins"]))

        rows_html = "\n".join(
            '          <div class="nrow"><b>%s</b><span>%s</span></div>' % (lab, note)
            for lab, note, _aside in c["margins"])

        strip_html = "\n".join(
            '        <a class="sv%s" href="story-%s.html">'
            '<i style="background:%s"></i><em>%s</em><b>%s</b>%s</a>'
            % (" on" if r["slug"] == q["slug"] else "", r["slug"], r["swatch"],
               CHAPTERS[r["slug"]]["numeral"], r["name"],
               "<small>You are reading</small>" if r["slug"] == q["slug"] else "")
            for r in PRODUCTS)

        initials = ".".join(w[0] for w in c["author"].split()) + "."

        story_body = f"""
<section class="shead">
  <div class="inner">
    {crumbs(("Home", "index.html"), ("Your Stories", "stories.html"), q["name"])}
    <div class="c">
      <p class="k"><i class="chip" style="background:{q['swatch']}"></i>Your stories &middot; {q['story']} &middot; {q['stone']}</p>
      <h1>{q['name']}</h1>
      <p class="by">Written by {c['author']} &middot; {q['read']} read &middot; the story that became a fragrance</p>
    </div>
  </div>
</section>

<section class="splate">
  <img src="{fp(story_plate(q))}" alt="{q['name']}">
</section>

<section class="sbody">
  <div class="inner">
    <div class="scol">
{lead_html}
    </div>
    <aside class="saside">
{notes_html}
    </aside>
    <blockquote class="spull">&ldquo;{c['pull']}&rdquo;</blockquote>
    <div class="scol">
{tail_html}
      <p class="sig">&mdash; {initials}</p>
    </div>
    <figure class="sfig">
      <img src="{fp(story_plate(q))}" alt="{q['name']}" loading="lazy">
    </figure>
  </div>
</section>

<section class="sbecame stone-{q['slug']}">
  <div class="inner">
    <div class="c">
      <p class="k">The scent this became</p>
      <h2>{q['name']}</h2>
      <p class="lede">{c['scent'][0].upper() + c['scent'][1:]}, beneath a lid of {q['stone']}.</p>
      <div class="notes">
{rows_html}
      </div>
      <div class="actions">
        <button class="btn btn-ivory" onclick="addToBag('{q['slug']}','full',this)">Shop {q['name']} &mdash; &pound;160</button>
        <a class="btn btn-ghost" href="product-{q['slug']}.html">Sample &mdash; &pound;5</a>
      </div>
    </div>
  </div>
  <img class="plate" src="{fp('assets/img/' + q['img'] + '-hero.jpg')}" alt="" loading="lazy">
</section>

<section class="snav">
  <div class="inner">
    <a class="prev" href="story-{prev['slug']}.html">
      <span class="k">&larr; Previous story</span>
      <b>{prev['name']}</b>
      <em>{prev['notes']}</em></a>
    <a class="next" href="story-{nxt['slug']}.html">
      <span class="k">Next story &rarr;</span>
      <b>{nxt['name']}</b>
      <em>{nxt['notes']}</em></a>
  </div>
</section>

<section class="sseven">
  <div class="inner">
    <p class="k">All seven stories</p>
    <h2>Seven to read. Seven to wear.</h2>
    <div class="svs">
{strip_html}
    </div>
  </div>
</section>
"""
        written["story-" + q["slug"]] = page(
            "story-" + q["slug"], q["name"],
            f"{q['name']} — the story that became the fragrance. Written by {c['author']}.",
            story_body, current="stories.html")
        if q["slug"] == FEATURED:
            written["story"] = page("story", q["name"],
                f"{q['name']} — the story that became the fragrance. Written by {c['author']}.",
                story_body, current="stories.html")

    # ---- 09 share your story --------------------------------------------
    #   Frame: P15 "Share your story" (171:2803). Copy is the frame's own.
    STEPS = [
        ("I",   "Write it plainly",
         "No more than 500 words. A moment, not a memoir &mdash; where you were, who was there, what the air was doing."),
        ("II",  "We read everything",
         "Every submission is read by the house. You will hear from us either way, within a month."),
        ("III", "A shortlist goes to Grasse",
         "Four stories a year are sent to Jacques Chabert and the Argeville noses to be read aloud, unattributed."),
        ("IV",  "One becomes a fragrance",
         "Published under your name in the printed edition, with the first bottle of the run sent to you."),
    ]
    POSTBAG = [
        ("With Grasse", "verde", "The Bakery at Five", "Marta L. &middot; Lisbon",
         "It was still dark when the ovens went on, and the whole street smelled of it before anyone was awake. I have never been happier than I was at that hour, poor and warm and covered in flour."),
        ("With Grasse", "verde", "Ward 9, Christmas Eve", "Tom H. &middot; Leeds",
         "Antiseptic, cheap tinsel, and someone&rsquo;s satsuma. Twenty years on I cannot peel one without being nineteen again, holding my mother&rsquo;s hand and pretending to be brave."),
        ("Shortlisted", "brass", "His Jumper", "Priya S. &middot; Glasgow",
         "He left it on the back of my chair in October and never asked for it. By March it had stopped smelling of him, and that was the actual ending &mdash; not the argument."),
    ]
    SMALLPRINT = [
        ("It stays yours", "You keep the copyright to everything you send. Always."),
        ("We ask before we publish", "Nothing appears on this site, in a box, or in a bottle without your written yes."),
        ("No fee to enter, no purchase", "You do not need to have bought anything. Open to anyone over 18."),
        ("If yours is chosen", "You are credited by name in the printed edition, sent the first bottle of the run, and paid a commission fee agreed with you beforehand."),
    ]
    steps_html = "\n".join(
        f"""      <div class="hstep"><em>{n}</em><h3>{t}</h3><p>{b}</p></div>"""
        for n, t, b in STEPS)
    post_html = "\n".join(
        f"""      <article class="pnote">
        <span class="tag {cls}">{tag}</span>
        <h3>{title}</h3>
        <p class="who">{who}</p>
        <blockquote>&ldquo;{quote}&rdquo;</blockquote></article>"""
        for tag, cls, title, who, quote in POSTBAG)
    print_html = "\n".join(
        f"""      <div class="term"><h3>{t}</h3><p>{b}</p></div>"""
        for t, b in SMALLPRINT)

    written["share"] = page("share", "Share Yours",
        "Send us the moment. The eighth fragrance could begin with something that actually happened to you.", f"""
<section class="shero">
  <img src="{fp('assets/img/spine.jpg')}" alt="An open notebook">
  <span class="veil" aria-hidden="true"></span>
  <div class="inner">
    <div class="c">
      <p class="k">Your stories &middot; an open call</p>
      <h1>The eighth story hasn&rsquo;t been written yet.</h1>
      <p class="lede">Seven fragrances began as fiction. The next one could begin with something that actually happened &mdash; to you. Send us the moment; we read every one.</p>
      <div class="cta">
        <a class="btn btn-ivory" href="#tellus">Write yours</a>
        <a class="btn btn-ghost" href="#postbag">Read what others sent</a>
      </div>
    </div>
  </div>
</section>

<section class="invite">
  <div class="inner">
    <p class="k">Why we are asking</p>
    <h2>We have never made a fragrance from a marketing brief. We are not about to start.</h2>
    <p>Every bottle we make was composed against nine pages of writing. Those pages have always come from our own writers &mdash; but the best moments we&rsquo;ve heard this year came from the people wearing them: a bakery at 5am, a hospital corridor at Christmas, a borrowed jumper that still smelled of someone. One of those deserves a bottle.</p>
  </div>
</section>

<section class="howworks">
  <span class="ghost" aria-hidden="true">Eighth</span>
  <div class="inner">
    <p class="k">How it works</p>
    <h2>Four steps, one bottle.</h2>
    <div class="hsteps">
{steps_html}
    </div>
  </div>
</section>

<section class="tellus" id="tellus">
  <div class="inner">
    <div class="hd">
      <p class="k">Send your story</p>
      <h2>Tell us the moment.</h2>
    </div>
    <form class="sform" onsubmit="event.preventDefault();this.hidden=true;var d=this.parentNode.querySelector('.formdone');d.hidden=false;d.setAttribute('tabindex','-1');d.focus();">
      <label class="ffield"><span>Your story&rsquo;s title</span>
        <input name="title" placeholder="e.g. The Bakery at Five" required></label>
      <label class="ffield"><span>Where and when</span>
        <input name="when" placeholder="e.g. Lisbon, the winter I turned thirty" required></label>
      <label class="ffield tall"><span>The moment &mdash; up to 500 words</span>
        <textarea name="story" data-count placeholder="It was still dark when the ovens went on, and the whole street smelled of it before anyone was awake&hellip;" required></textarea></label>
      <p class="count"><span data-countout>0</span> / 500 words</p>
      <div class="frow2">
        <label class="ffield"><span>Your name</span><input name="name" required></label>
        <label class="ffield"><span>Email</span><input type="email" name="email" required></label>
      </div>
      <div class="consent">
        <label><input type="checkbox" required>
          <span>I&rsquo;m happy for Side Story to read my story, and to contact me about it. You keep the copyright &mdash; we will ask again, in writing, before anything is published or set to scent.</span></label>
        <button class="btn btn-ink" type="submit">Send your story</button>
      </div>
    </form>
    <div class="formdone" hidden>
      <div class="r"></div>
      <p class="k">Received</p>
      <h2>It&rsquo;s in the postbag.</h2>
      <p>Someone here will read it &mdash; a person, not a filter &mdash; and you will hear from us within the month, whichever way it goes. Thank you for trusting us with it.</p>
      <p><a class="ul" href="stories.html">Read the seven</a></p>
    </div>
    <aside class="looking">
      <p class="k">What we are looking for</p>
      <p>Air, weather, rooms, hands, hours. The specific over the sweeping &mdash; one Tuesday beats a whole decade.</p>
      <p class="k">And what we are not</p>
      <p class="not">Product reviews, note lists, or anything you would call content. Write it as though no one is buying.</p>
    </aside>
  </div>
</section>

<section class="postbag" id="postbag">
  <div class="inner">
    <p class="k">From the postbag</p>
    <h2>What people have already sent us.</h2>
    <p class="pintro">Published with permission. Three of these are with Grasse now.</p>
    <div class="pnotes">
{post_html}
    </div>
    <a class="ul" href="stories.html">Read the full postbag &rarr;</a>
  </div>
</section>

<section class="smallprint">
  <div class="inner">
    <p class="k">The small print, in plain English</p>
    <div class="terms">
{print_html}
    </div>
  </div>
</section>
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
    <h2 class="vh">Journal</h2>
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
    <div class="tagrow">
      <a href="collection.html">All seven</a><a href="samples.html">Samples</a>
      <a href="gifting.html">Gifting</a><a href="stories.html">Stories</a>
      <a href="collection.html">Woods</a><a href="collection.html">Citrus</a><a href="collection.html">Incense</a>
    </div>
  </div>
</div>

<section class="band">
  <div class="inner">
    <p class="k">Popular this week</p>
    <h2 class="vh">Fragrances</h2>
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
      <div class="tagrow">
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
        <div class="tagrow" style="justify-content:center"><a href="collection.html">See the fragrances</a><a href="samples.html">Begin with samples</a></div>
      </div></div>
      <label class="tryfirst"><input type="checkbox" checked>
        <div><b>Add a Dedication &mdash; complimentary</b><span>A line of yours, typeset on the story&rsquo;s flyleaf, and sent again as a digital edition.</span></div></label>
    </div>
    <div class="summary">
      <h2 class="vh">Order summary</h2><h3>Summary</h3>
      <div class="srow"><span>Subtotal</span><span id="bagsub">&pound;0</span></div>
      <div class="srow"><span>Delivery</span><span>Complimentary</span></div>
      <div class="srow"><span>Sample credit</span><span>&minus;&pound;5</span></div>
      <div class="srow total"><span>Total</span><span id="bagtotal">&pound;0</span></div>
      <a class="btn btn-ink" href="checkout.html" style="width:100%;margin-top:var(--s-4)">Proceed to checkout</a>
      <p class="re">Tax included &middot; 30&#8209;day returns &middot; Visa, Mastercard, Amex, Apple Pay</p>
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
      <h2 class="vh">What happens next</h2>
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
    <h2 class="vh">Where to find us</h2>
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
  <form class="form" onsubmit="event.preventDefault();this.hidden=true;var d=this.parentNode.querySelector('.formdone');d.hidden=false;d.setAttribute('tabindex','-1');d.focus();">
    <div>
      <div class="row2">
        <label class="field"><span>Name</span><input required></label>
        <label class="field"><span>Email</span><input type="email" required></label>
      </div>
      <label class="field"><span>What is it about?</span>
        <select><option>An order</option><option>A return</option><option>Gifting</option><option>Stockists &amp; press</option><option>Something else</option></select></label>
      <label class="field"><span>Message</span><textarea required></textarea></label>
      <div class="actions"><button class="btn btn-ink" type="submit">Send</button></div>
    </div>
    <div class="aside-card">
      <h2 class="vh">How to reach us</h2>
      <h3>Directly</h3>
      <p>contact@sidestoryparfums.com<br>+44 20 7946 0114<br>Monday to Friday, 9&ndash;5 UK</p>
      <p>Side Story Parfums<br>Unit 4, The Bindery<br>London E2 8HD</p>
      <p>Press and wholesale: press@sidestoryparfums.com</p>
    </div>
  </form>
  <div class="formdone" hidden>
    <div class="r"></div>
    <p class="k">Received</p>
    <h2>It has arrived.</h2>
    <p>Two people read this inbox and one of them will write back, within two working days. If it is about an order, quoting the order number will get you a faster answer.</p>
    <p><a class="ul" href="faq.html">Read the questions we are asked most</a></p>
  </div>
</div>
""")

    written["faq"] = page("faq", "FAQ",
        "The questions we are actually asked.", f"""
<div class="inner">
  {crumbs(("Home", "index.html"), "FAQ")}
  <div class="phead"><p class="k">The practical</p><h1>The questions we are actually asked.</h1></div>
  <div class="acc" style="max-width:52rem">
    <details open><summary>Is the story really written first?</summary><div class="body">Yes, and it is the whole point. A novelist is commissioned and paid before any brief goes to Grasse. The perfumer works to the finished pages &mdash; the hour of day in them, the room, the weather &mdash; not to a mood board.</div></details>
    <details><summary>What arrives in the box?</summary><div class="body">A 100ml arrives under its hand-carved stone lid, with the story printed on cotton paper in an edition matched to the run, and a 2ml sample of a second story. The 7.5ml and the samples arrive in a printed sleeve &mdash; no carved lid and no booklet at those sizes. No plastic anywhere in the parcel.</div></details>
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
