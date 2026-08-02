#!/usr/bin/env python3
"""
Side Story — static site builder.

Every page is emitted from here so the head, announcement bar, navigation,
footer and bag drawer are byte-identical across the site. Change the nav in one
place and all 21 pages follow. Asset URLs are fingerprinted with a content hash
so a stale stylesheet can never be served against fresh markup.

    python3 tools/build.py
"""
import hashlib, html, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import photos

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def typeset(html):
    """Hand-setting the breaks that a line-breaking algorithm cannot.

    `text-wrap:balance` evens the lengths of a heading's lines; it will still
    happily end one on "a" or leave the last word of a paragraph alone on its
    own line. Two rules, applied to display type and to the ledes only:

      · a single-letter word never ends a line — it binds to what follows,
        so "commissioned before a / single note" becomes "before / a single
        note";
      · the last two words of a heading never separate, unless together they
        are long enough that binding them could push a narrow screen into an
        overflow.

    Interface text, prices and captions are left alone: a non-breaking space
    inside a 10px tracked label is a way to make a column overflow on a phone.
    """
    import re as _re

    def bind(text):
        # single-letter words bind forward
        text = _re.sub(r'(?<=\s)([aAI])\s+(?=[A-Za-z\u2018\u201c])', r'\1&nbsp;', text)
        # A lone + or & standing as a conjunction binds backward, to the word
        # before it. Left to itself it will start a line at some widths and end
        # one at others, and a symbol opening a line reads as a bullet. Bound
        # this way it can only ever end one, which is what a continuation mark
        # should do.
        text = _re.sub(r'\s+([+&])\s+(?=\S)', r'&nbsp;\1 ', text)
        # and the last two words hold together when they are short enough
        m = _re.search(r'\s+(\S+)\s+(\S+)\s*$', text)
        if m and len(m.group(1)) + len(m.group(2)) <= 14 and '&nbsp;' not in m.group(0):
            text = text[:m.start()] + ' ' + m.group(1) + '&nbsp;' + m.group(2) + text[m.end():]
        return text

    def walk(m):
        open_tag, inner, close_tag = m.group(1), m.group(2), m.group(3)
        if '<' in inner:            # leave anything with nested markup alone
            return m.group(0)
        return open_tag + bind(inner) + close_tag

    html = _re.sub(r'(<(?:h1|h2|h3|blockquote)\b[^>]*>)([^<]+)(</(?:h1|h2|h3|blockquote)>)',
                   walk, html)
    html = _re.sub(r'(<p class="lede"[^>]*>)([^<]+)(</p>)', walk, html)
    return html


def fp(path):
    """Content hash for cache-busting."""
    full = os.path.join(ROOT, path)
    if not os.path.exists(full):
        return path
    h = hashlib.md5(open(full, "rb").read()).hexdigest()[:8]
    return f"{path}?v={h}"


# ---------------------------------------------------------------- data ----

PRODUCTS = [
    dict(slug="hotel-lobby",    name="Hotel Lobby",    stone="Nero Marquina",  swatch="var(--stone-hotel-lobby)",
         notes="Woods. Green.",        story="Story I",   feeling="Anticipation",
         line="It was a ten minutes before 8pm when he arrived, and its resplendence never failed to catch him off guard.",
         img="p-hotel-lobby", badge="Bestseller", read="5 min", family="woods", wear="FILLER \u2014 wear line to come", theme="Anticipation + Attraction", style="Woods. Green.", origin="Nero Marquina, Basque Country",
         top="Fig Leaf / Oud", mid="Pepper / Patchouli / Cypriol", base="Sandalwood / Coconut / Vanilla"),
    dict(slug="sibling-rivalry", name="Sibling Rivalry", stone="Leopard Salome", swatch="var(--stone-sibling-rivalry)",
         notes="FILLER \u2014 style to come", story="Story II",  feeling="FILLER",
         line="There is a particular silence that only a brother can make, and she had been listening to it for thirty years.",
         img="p-sibling-rivalry", badge="", read="6 min", family="citrus", wear="FILLER \u2014 wear line to come", theme="FILLER \u2014 story theme to come", style="FILLER \u2014 style to come", origin="FILLER \u2014 stone origin to come",
         top="FILLER \u2014 top notes to come", mid="FILLER \u2014 middle notes to come", base="FILLER \u2014 base notes to come"),
    dict(slug="pillow-talk",    name="Pillow Talk",    stone="Calacatta",      swatch="var(--stone-pillow-talk)",
         notes="Powder. Citrus. Spice.",    story="Story III", feeling="Intimacy",
         line="They had been awake for hours, unspooling the sweet trivialities of their personal histories in sleepy whispers.",
         img="p-pillow-talk", badge="", read="4 min", family="powder", wear="FILLER \u2014 wear line to come", theme="Intimacy + Desire", style="Powder. Citrus. Spice.", origin="Calacatta, Tuscany",
         top="Bergamot / Orange / Cinnamon", mid="Ylang Ylang / Orris / Amyris Bark", base="Gaiacwood / Patchouli / Peru Balsam / Musk"),
    dict(slug="sunday-service", name="Sunday Service", stone="Verde Jade",     swatch="var(--stone-sunday-service)",
         notes="Spice. Floral. Woods.", story="Story IV", feeling="Introspection",
         line="The drive from the city to the country always felt like rolling back time.",
         img="p-sunday-service", badge="", read="7 min", family="incense", wear="FILLER \u2014 wear line to come", theme="Introspection + Reflection", style="Spice. Floral. Woods.", origin="Verde Jade, Rajasthan",
         top="Saffron / Pepper", mid="Rose / Patchouli", base="Ciste Labdanum / Frankincense / Gurjum Balsam"),
    dict(slug="third-date",     name="Third Date",     stone="Rosso Levanto",  swatch="var(--stone-third-date)",
         notes="Green. Floral.",  story="Story V",  feeling="Fervour",
         line="She hardly knew him, of course—tonight was only the third date. But there was such familiarity between them.",
         img="p-third-date", badge="", read="5 min", family="amber", wear="FILLER \u2014 wear line to come", theme="Fervour + Connection", style="Green. Floral.", origin="Rosso Levanto, Liguria",
         top="Plum / Ginger", mid="Tuberose / Patchouli", base="Vanilla / Musk"),
    dict(slug="road-trip",      name="Road Trip",      stone="Rosso Francia",  swatch="var(--stone-road-trip)",
         notes="Amber. Woods.",   story="Story VI", feeling="Escaping",
         line="They knew where they were going, but neither seemed to mind the impromptu detour along the way.",
         img="p-road-trip", badge="New story", read="6 min", family="amber", wear="FILLER \u2014 wear line to come", theme="Escaping + Dreaming", style="Amber. Woods.", origin="Rosso Francia, Languedoc",
         top="Petitgrain (bitter orange) / Peach", mid="Neroli / Pepper / Clary Sage", base="Vetiver / Sandalwood / Coconut / Vanilla"),
    dict(slug="4pm-matinee",    name="4pm Matinee",    stone="Giallo Siena",   swatch="var(--stone-4pm-matinee)",
         notes="Green. Woods. Amber.",  story="Story VII", feeling="Ambition",
         line="She came to the afternoon matinee alone. She liked the rush of independence when the ticket seller looked around for a date.",
         img="p-4pm-matinee", badge="", read="5 min", family="citrus", wear="FILLER \u2014 wear line to come", theme="Ambition + Realisation", style="Green. Woods. Amber.", origin="Giallo Siena, Tuscany",
         top="Bergamot / Cardamom / Nutmeg / Thyme", mid="Geranium / Lavender", base="Vanilla / Styrax / Vetiver / Musk"),
]
BY_SLUG = {p["slug"]: p for p in PRODUCTS}

# The PDP story bands. Written per fragrance so the chapter, the margins and the
# stone all speak about the same bottle rather than sharing generic copy.
CHAPTERS = {
  # Hotel Lobby — copy supplied by Alex, 1 Aug. Paragraphs verbatim.
  "hotel-lobby": dict(
    summary="It was a ten minutes before 8pm when he arrived. He had been there before, but its resplendence never failed to catch him off guard. Modish floors patterned in ebony and ivory marble, deep armchairs in dark, buttery leather, a chocolate Steinway piano, and the amber lights of old-world libraries. The bar was the kind of place Hemingway might have lingered a little too long, lights glittering on the crystal and glass. Hushed conversations, each one layering the next.",
    pull="The bar was the kind of place Hemingway might have lingered a little too long.",
    pullref="From Hotel Lobby, Chapter I",
    numeral="I", chapter="Chapter I of IX", title="Ten minutes before eight.", author="[author to be credited]",
    paras=[
      "It was a ten minutes before 8pm when he arrived. He had been there before, but its resplendence never failed to catch him off guard. Modish floors patterned in ebony and ivory marble, deep armchairs in dark, buttery leather, a chocolate Steinway piano, and the amber lights of old-world libraries. The bar was the kind of place Hemingway might have lingered a little too long, lights glittering on the crystal and glass. Hushed conversations, each one layering the next.",
      "He perched on the edge of an armchair to wait, eyes darting about the lobby in anticipation. He checked his watch. Still early.",
      "He felt a rush of cool air on his cheeks as the revolving door swept a white-haired couple, dressed to the nines, into the warmth of the lobby. The man, small but well-built, even in his eighties, wore a pocket square and a raffish grin, like a troublemaking boy who could hardly believe what he was getting away with. On his arm, an impeccably styled, sharp-featured woman with a slash of red lipstick. Her air was regal, but it was clear she was struggling to maintain her composure in the wake of a puerile joke. Her crimson pout was now the sole focus of her husband\u2019s attention. It began to warp into a smirk, and then, much to the woman\u2019s chagrin, into a full-fledged smile.",
      "As they passed him in the lobby, the man gave his knee a paternal tap. \u201cCan you believe she\u2019s with me?\u201d he said, gesturing to the woman by his side. \u201cAlmost sixty years.\u201d",
      "He watched the elevator doors close behind them and then checked his watch \u2014 still a few minutes. A familiar song drifted from the piano. Something from an old romantic, a melody that his father loved and his mother sang to herself in the kitchen. They would have looked at home here. Like a puff of smoke, the lyrics seemed briefly tangible in the air \u2014 something something, gave me a thrill \u2014 and then dissipated, leaving only the fragrance of their wistfulness behind.",
      "Suddenly, a warm voice spoke his name, pulling him out of his reverie and back into the hotel lobby. He looked up to see the face he came for, as familiar as the notes on the piano, and every bit as beguiling. He smiled, rising with purpose and posture. The evening had begun.",
    ],
    scent="FILLER \u2014 scent line to come",
    caption="FILLER \u2014 caption to come",
    margins=[("Opening","FILLER \u2014 note to come","FILLER \u2014 line to come"),
             ("Heart","FILLER \u2014 note to come","FILLER \u2014 line to come"),
             ("Base","FILLER \u2014 note to come","FILLER \u2014 line to come")],
    stone_title="Nero Marquina, cut once.",
    stone_body="FILLER \u2014 stone note to come"),

  # SIBLING RIVALRY — NO STORY SUPPLIED. Everything below marked FILLER is
  # placeholder Latin standing in for copy that does not exist yet: this was
  # the one fragrance with no commissioned text, and what stood here before
  # was invented to fill the hole, which is worse than an obvious gap because
  # it reads as finished. The author credit is a placeholder too. Replace the
  # whole block when the real chapter arrives; nothing else references it.
  "sibling-rivalry": dict(
    summary="FILLER \u2014 story summary to come.",
    pull="Sed ut perspiciatis unde omnis iste natus error sit voluptatem.", pullref="FILLER \u2014 story to come",
    numeral="II", chapter="Chapter I of IX", title="Lorem ipsum dolor sit amet.", author="[author to be credited]",
    paras=["Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
           "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."],
    scent="FILLER \u2014 scent line to come",
    caption="FILLER \u2014 caption to come",
    margins=[("Opening","FILLER \u2014 note to come","FILLER \u2014 line to come"),
             ("Heart","FILLER \u2014 note to come","FILLER \u2014 line to come"),
             ("Base","FILLER \u2014 note to come","FILLER \u2014 line to come")],
    stone_title="Leopard Salome, cut once.",
    stone_body="FILLER \u2014 stone note to come"),

  # Pillow Talk — copy supplied by Alex, 1 Aug. Paragraphs verbatim.
  "pillow-talk": dict(
    summary="Morning light spilled into the bedroom and the melody escaped out of the window and down to the city below. It was only Saturday, and neither had anywhere they had to be. They both knew they might linger there for hours, or the whole day, or two, dissolving into conversation, and pleasure, and one another, as naturally as cream into coffee.",
    pull="It was only Saturday, and neither had anywhere they had to be.",
    pullref="From Pillow Talk, Chapter I",
    numeral="III", chapter="Chapter I of IX", title="Scout\u2019s honor.", author="[author to be credited]",
    paras=[
      "They had been awake for hours, drifting in and out of consciousness, unspooling the sweet trivialities of their personal histories in sleepy whispers, and between stolen kisses. Just before noon, he arose to make coffee, making her promise that she\u2019d be in the exact same place when he returned. They would continue the conversation. She raised three fingers in mock solemnity: scout\u2019s honor, she said.",
      "He brought the little bowls of black coffee into the bedroom with a pitcher of cream. She liked to watch her cup become a canvas, the cream and coffee mingling like watercolours before blending into rich caramel. She was waiting in the bed next to the open window, the down duvet ruffled around her like a snow drift. The bed linens were cool against her skin, crisp and clean, the satin white illuminating her face, her violet eyes, her tousled hair.",
      "He knelt on the bed and put his lips to her temple, then her ear, then placed one of the cups in her eager hands. He breathed in her fresh, powdery skin. Gently, he tipped a thimble of cream into her coffee, then another, watching her delight in the dance of dark and light.",
      "He went to the sideboard and pulled a record from its sleeve as she raised the coffee to her lips. She admired the care in his touch, the way he gingerly placed the album on the turntable and slowly lowered the needle: his gentle, deliberate, unhurried way of doing things. She admired the grey on his temples, the stubble on his jawline, the willowy muscles in his neck and shoulders.",
      "He felt her watching him and shifted his gaze back to the bed, narrowing his eyes in faux accusation. As he approached her, she began to giggle, unable to contain her delight, and he matched her laughter with a silly grin. Smitten, neither could believe their good fortune.",
      "Morning light spilled into the bedroom and the melody escaped out of the window and down to they city below. It was only Saturday, and neither had anywhere they had to be. They both knew they might linger there for hours, or the whole day, or two, dissolving into conversation, and pleasure, and one another, as naturally as cream into coffee.",
    ],
    scent="FILLER \u2014 scent line to come",
    caption="FILLER \u2014 caption to come",
    margins=[("Opening","FILLER \u2014 note to come","FILLER \u2014 line to come"),
             ("Heart","FILLER \u2014 note to come","FILLER \u2014 line to come"),
             ("Base","FILLER \u2014 note to come","FILLER \u2014 line to come")],
    stone_title="Calacatta, cut once.",
    stone_body="FILLER \u2014 stone note to come"),

  # Sunday Service — copy supplied by Alex, 1 Aug. Paragraphs verbatim.
  "sunday-service": dict(
    summary="As he slipped into the pew, he noted how soft the wood felt beneath his fingers, polished and worn from so many years of human touch. But the music was the same. The cool, oaky air of the church was the same. The smell\u2014ageing paper, freshly mown grass\u2014just the same. As much as time was hurtling by, it felt in the moment that nothing had changed.",
    pull="The music was the same. The cool, oaky air of the church was the same.",
    pullref="From Sunday Service, Chapter I",
    numeral="IV", chapter="Chapter I of IX", title="Rolling back time.", author="[author to be credited]",
    paras=[
      "The drive from the city to the country always felt like rolling back time. The summer faded the colour of the tall grass along the narrow road and inspired a symphony of cicadas and grasshoppers, but the plains of wheat, the cattle and horses, the sunsets and moons on the horizon were always the same, month after month, year after year, just as they had been when he was a boy. Now the leaves were dense and green, hanging heavy over the road and mottling the light on his dashboard. Soon they’d fade and fall, and the cycle would continue.",
      "He passed by the rusted tower and remembered climbing its iron legs with his friends so they could dangle their feet over the ledge, perched high above the town. Rounding the pond, he remembered roughhousing with his classmates and tossing each other in to the still, cold water. He thought back—as he often did—to his first love and their first kiss, sitting side-by-side on the dock, hands trembling, hearts racing.",
      "By the time he pulled onto the gravel road leading to the church, he experienced the strange sensation of both slipping into a younger version of himself and shouldering the weight and wisdom of old age. He still had so much life ahead of him, yet these journeys back to his hometown imbued him with the equanimity of a man beyond his years. He remembered inching along that road in a funeral procession after his mother died, and later, watching his newlywed sister speeding off, her husband in tow, cans rattling off the back bumper, clouds of gravel trailing after them.",
      "His sister had already taken her place at the altar when he arrived, bouncing his pretty niece on her hip in the christening gown they had both worn years ago. As he slipped into the pew, he noted how soft the wood felt beneath his fingers, polished and worn from so many years of human touch. But the music was the same. The cool, oaky air of the church was the same. The smell—ageing paper, freshly mown grass—just the same. As much as time was hurtling by, it felt in the moment that nothing had changed.",
      "And yet. As he rose for the first hymn, he touched the ring in his pocket. Past and present came together in that smooth gold loop. There in the place that made him, he traced it round and round, over and over again.",
    ],
    scent="FILLER \u2014 scent line to come",
    caption="FILLER \u2014 caption to come",
    margins=[("Opening","FILLER \u2014 note to come","FILLER \u2014 line to come"),
             ("Heart","FILLER \u2014 note to come","FILLER \u2014 line to come"),
             ("Base","FILLER \u2014 note to come","FILLER \u2014 line to come")],
    stone_title="Verde Jade, cut once.",
    stone_body="FILLER \u2014 stone note to come"),

  # Third Date — copy supplied by Alex, 1 Aug. Paragraphs verbatim.
  "third-date": dict(
    summary="What did she like about him? Her friends wanted to know. She raised her tea to her lips as she paused to think, then smiled, feeling rather sheepish. How could she choose any one thing and not list them all? She hardly knew him, of course\u2014tonight was only the third date. But there was such familiarity between them, as if they\u2019d known each other a lifetime ago and were simply catching up.",
    pull="There was such familiarity between them, as if they’d known each other a lifetime ago and were simply catching up.",
    pullref="From Third Date, Chapter I",
    numeral="V", chapter="Chapter I of IX", title="Only the third date.", author="[author to be credited]",
    paras=[
      "What did she like about him? Her friends wanted to know. She raised her tea to her lips as she paused to think, then smiled, feeling rather sheepish. How could she choose any one thing and not list them all? She hardly knew him, of course—tonight was only the third date. But there was such familiarity between them, as if they’d known each other a lifetime ago and were simply catching up.",
      "Across the city, he stood over the bathroom sink brushing his teeth, thinking of her, and noticed something he hadn’t experienced in years: butterflies in his stomach. He shook his head to himself, laughing. They hardly knew each other, yet she’d already made a giddy fool of him. He could hardly wait to see her again.",
      "On the train, she pulled her compact from her purse to check her lipstick one last time. She brushed a few stray hairs into place, then ruffled her hair again, wanting to appear thoughtfully—artfully—effortless. She caught the eye of an auburn-haired lady across the aisle, who clucked to herself, remembering all the trouble she went to as a girl to look untroubled. The two women shared a knowing smile.",
      "His anticipation got the better of him, and he arrived to the restaurant early. As he waited for her—giving his best performance as a levelheaded, self-assured person—he noticed that the orange-blossom clipping in the vase on his table gave off the most bewitching scent.",
      "He was not one to notice the scent of a cut flower, typically, yet recently he’d become attuned to these subtle pleasures. He realised that he’d become acutely observant. The oxidised cufflinks on the elder gentleman that lives in his building, for one. The choir of birdsong emanating from the autumnal foliage, competing with the rustling of leaves. The soft, yet cracked, feel of leather on his well-worn boots. Amused that he’d gotten himself lost in so many little details, since he was not much of a daydreamer, he was hardly one to get lost in a reverie.",
      "Then he felt a delicate hand on his shoulder, and he suddenly understood why.",
    ],
    scent="FILLER \u2014 scent line to come",
    caption="FILLER \u2014 caption to come",
    margins=[("Opening","FILLER \u2014 note to come","FILLER \u2014 line to come"),
             ("Heart","FILLER \u2014 note to come","FILLER \u2014 line to come"),
             ("Base","FILLER \u2014 note to come","FILLER \u2014 line to come")],
    stone_title="Rosso Levanto, cut once.",
    stone_body="FILLER \u2014 stone note to come"),

  # Road Trip — copy supplied by Alex, 1 Aug. Paragraphs verbatim.
  "road-trip": dict(
    summary="They knew where they were going, but neither seemed to mind the impromptu detour along the way. Undulating fields of sage and lavender tumbled out into the distance before them, the car drifting over the landscape like a ship on the open sea. Uninterrupted sky stretched in every direction.",
    pull="Maybe they would return to the map, steer themselves back to their itinerary. Maybe.",
    pullref="From Road Trip, Chapter I",
    numeral="VI", chapter="Chapter I of IX", title="The impromptu detour.", author="[author to be credited]",
    paras=[
      "They knew where they were going, but neither seemed to mind the impromptu detour along the way. Undulating fields of sage and lavender tumbled out into the distance before them, the car drifting over the landscape like a ship on the open sea. Uninterrupted sky stretched in every direction.",
      "Leaning back in her seat, she sank her teeth into a ripe peach and remembered the afternoons she used to spend in the backyard as a child, lying on the grass, watching the clouds carousel across the sky. She rarely took the time to look up now, but when she did, she recognised that familiar sense of calm: an old friend that came to visit in the moments when she let herself pause for simple pleasures.",
      "It was good to be away from the city—finally—in a place where the air was crisp, where there were no schedules or obligations. It was easy to be present there, to breathe in the moment and let the feeling of being free release the tension of a long winter.",
      "From the driver’s seat, he noticed her lean back - with a long, contented sigh. He shifted his attention, just for a moment, away from the vast stretch of highway ahead of them and toward his passenger. Her nose and cheeks had picked up a bit of colour since they had left home. The wind had tousled her hair. He told her she looked pretty, and she laughed a little, embarrassed, but hardly protesting.",
      "She twisted the knob of the radio until the static dissipated and they heard a song they had both loved as children—one neither had heard in years, yet still remembered. Turn up the volume, he said, eyes fixated on the long road ahead. She rolled down the windows, and the music spilled out into the early-evening air.",
      "Her hand reached over, brushing his knee. He took it, letting her fingers intertwine with his for just a moment before returning to the steering wheel. She sang along to the music softly, under her breath, charmingly off-key, pulling her bare feet up to the glove compartment and tapping along to the beat. He smiled to himself, and she pretended not to notice.",
      "She pulled her sunglasses down and sunk deeper into the seat. The sun on the horizon bathed the hills in gold. Maybe they would return to the map, steer themselves back to their itinerary. Maybe.",
    ],
    scent="FILLER \u2014 scent line to come",
    caption="FILLER \u2014 caption to come",
    margins=[("Opening","FILLER \u2014 note to come","FILLER \u2014 line to come"),
             ("Heart","FILLER \u2014 note to come","FILLER \u2014 line to come"),
             ("Base","FILLER \u2014 note to come","FILLER \u2014 line to come")],
    stone_title="Rosso Francia, cut once.",
    stone_body="FILLER \u2014 stone note to come"),

  # 4pm Matinee — copy supplied by Alex, 1 Aug. Paragraphs verbatim.
  "4pm-matinee": dict(
    summary="She came to the afternoon matinee alone. She liked the rush of independence she got when the ticket seller looked around for a date. \u201cJust me,\u201d she\u2019d say with a playful smile. She took a seat in the middle of the theatre and sank down into the soft velvet chair, folding over the edges of her ticket in anticipation.",
    pull="She’d never been afraid of striking out on her own. She’d never been afraid of going to the movies alone.",
    pullref="From 4pm Matinee, Chapter I",
    numeral="VII", chapter="Chapter I of IX", title="Just me.", author="[author to be credited]",
    paras=[
      "She came to the afternoon matinee alone. She liked the rush of independence she got when the ticket seller looked around for a date. “Just me,” she’d say with a playful smile. She took a seat in the middle of the theatre and sank down into the soft velvet chair, folding over the edges of her ticket in anticipation.",
      "From the moment she was a little girl, she adored the movies. She loved the ritual of going to the theatre: the music in the lobby, the smell of buttered popcorn, the hush of the crowd when the lights went down. But as she got older, she began to long to be a part of the experience. She wanted to feel the heat of the studio lights on her face and the rumble of applause beneath her feet. To captivate an audience with her laugh, or bring them to tears. She wanted to stretch beyond her shyness, filling the darkened theatre with her wit and grace.",
      "The film was a classic comedy, a story of a woman caught between three men. The actress in the starring role was beautiful, unconventional. She wore trousers when other ingénues were in skirts, blazed a trail for independent women in Hollywood. Offscreen, she rolled up her shirtsleeves and gardened geraniums and herbs, haggled with spice merchants from Delhi to Istanbul, and read Russian novels in long, luxurious, baths. She spent much of her life proudly, happily, alone.",
      "That afternoon in the matinee, the girl felt her future calling like a siren’s song. Years later, it became clear that the plan was hatched that very day. Countless auditions, hours of dance, singing lessons, late nights working behind a bar, endless sweat and tears—all of these began in a darkened theatre as her dream was taking shape.",
      "She couldn’t know that she’d succeed, but she never doubted it, either. Chasing her dream felt as natural as breathing air. It wasn’t a matter of choice. She had to become the star she knew herself to be.",
      "And once she’d achieved it—the fame, the acclaim—she’d attribute her success to her girlish gumption. She’d never been afraid of striking out on her own. She’d never been afraid of going to the movies alone.",
    ],
    scent="FILLER \u2014 scent line to come",
    caption="FILLER \u2014 caption to come",
    margins=[("Opening","FILLER \u2014 note to come","FILLER \u2014 line to come"),
             ("Heart","FILLER \u2014 note to come","FILLER \u2014 line to come"),
             ("Base","FILLER \u2014 note to come","FILLER \u2014 line to come")],
    stone_title="Giallo Siena, cut once.",
    stone_body="FILLER \u2014 stone note to come"),

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


# ------------------------------------------------------- running order ----
# Alex's numbering, and the only place it is written down. The shelf order,
# the roman numerals on the story pages, the "Story N" label on every card and
# the prev/next at the foot of each chapter all read from this list, so they
# cannot disagree with each other the way they did — Hotel Lobby was Story I
# on its card and cited as Chapter IV in its own pull quote.
STORY_ORDER = ["hotel-lobby", "sunday-service", "sibling-rivalry", "third-date",
               "road-trip", "4pm-matinee", "pillow-talk"]
ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"]
assert sorted(STORY_ORDER) == sorted(p["slug"] for p in PRODUCTS), "running order must name every fragrance once"
PRODUCTS.sort(key=lambda p: STORY_ORDER.index(p["slug"]))
BY_SLUG = {p["slug"]: p for p in PRODUCTS}
for _i, _p in enumerate(PRODUCTS):
    _p["story"] = "Story " + ROMAN[_i]
    _c = CHAPTERS[_p["slug"]]
    _c["numeral"] = ROMAN[_i]
    if not _c["pullref"].startswith("FILLER"):
        _c["pullref"] = "From %s, Chapter %s" % (_p["name"], ROMAN[_i])

# ------------------------------------------------------------- chrome ----

# only The Fragrances opens the mega panel; the rest are plain links
MEGA_FOR = "collection.html"

# The buyable formats, in ascending price. Written once because the desktop
# mega panel and the phone menu both list them, and they had drifted: the
# phone menu called the set "The Discovery Set" while the nav beside it called
# the same page "Discovery Sets", and the two blocks disagreed on order.
MENU_SIZES = [
    ("collection-100ml.html",   "100 ml",         "&pound;160"),
    ("collection-7-5ml.html",   "7.5 ml",         "&pound;40"),
    ("collection-samples.html", "Samples",        "&pound;5"),
    ("samples.html",            "Discovery Sets", "&pound;38"),
]
SIZE_HREFS = {h for h, _, _ in MENU_SIZES}

NAV_LINKS = [
    ("collection.html", "The Fragrances"),
    ("stories.html",    "Your Stories"),
    ("share.html",      "Share Yours"),
    ("collection-samples.html", "Samples"),
    ("samples.html",    "Discovery Sets"),
    ("our-house.html",  "Our Story"),
]

FOOTER_COLS = [
    # Samples points at the 2ml shelf, not the set page; the set has its own
    # entry, and Gifting is gone because the house does not offer it.
    ("The Shelf",     [("collection.html", "The Fragrances"),
                       ("collection-samples.html", "Samples"),
                       ("samples.html", "Discovery Sets")]),
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


def srcsets(path):
    """The three srcsets a <picture> would be built from, for one image.

    `upgrade_images` builds these when it rewrites the finished page, which is
    the right place for markup — but an image the shelf swaps at runtime is
    not in the markup when the page is written. The catalogue carries them so
    the browser can be given a whole picture, not just a new `src`: setting
    `src` alone on an <img> inside a <picture> changes nothing, because the
    <source> above it still wins. That is exactly what had been happening —
    changing the size on the collection updated the price, the link and the
    caption, dissolved the plate, and put the same photograph back."""
    man = _manifest()
    entry = man.get(path.split("?")[0].split("/")[-1])
    if not entry:
        return None
    out = {}
    for k in ("avif", "webp", "jpg"):
        if entry.get(k):
            out[k] = ", ".join("%s %dw" % (fp("assets/img/" + f), w) for w, f in entry[k])
    return out or None


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


# The deployed origin. Canonicals and social cards need absolute URLs, and
# Vercel serves cleanUrls, so the canonical form of product-hotel-lobby.html
# is /product-hotel-lobby — one URL per page, not two.
SITE_URL = "https://sidestory-rho.vercel.app"


def canonical_url(slug):
    return SITE_URL + ("/" if slug == "index" else "/" + slug)


def head(title, desc, css, body_attr="", slug=None, og_image=None, jsonld=None):
    links = "\n".join(f'<link rel="stylesheet" href="{fp(c)}">' for c in css)
    # Descriptions are written as prose, and prose has ampersands and quotation
    # marks in it. Both were going into an attribute raw — tolerated by a
    # browser, invalid all the same, and exactly the sort of thing a validator
    # or a link-preview scraper is entitled to disagree about. Anything already
    # written as an entity is left alone rather than double-escaped.
    def attr(s):
        s = re.sub(r"&(?!#?\w+;)", "&amp;", s)
        return s.replace("<", "&lt;").replace('"', "&quot;")
    title, desc = attr(title), attr(desc)
    # Every page gets a canonical and a social card; pages that know their
    # own photograph pass it, the rest fall back to the hero flatlay.
    seo = ""
    if slug is not None:
        url = canonical_url(slug)
        img = SITE_URL + "/" + (og_image or "assets/img/hero.jpg")
        seo = (f'<link rel="canonical" href="{url}">\n'
               f'<meta property="og:site_name" content="Side Story Parfums">\n'
               f'<meta property="og:type" content="website">\n'
               f'<meta property="og:title" content="{title}">\n'
               f'<meta property="og:description" content="{desc}">\n'
               f'<meta property="og:url" content="{url}">\n'
               f'<meta property="og:image" content="{img}">\n'
               f'<meta name="twitter:card" content="summary_large_image">\n')
        if jsonld:
            seo += '<script type="application/ld+json">' + json.dumps(jsonld, separators=(",", ":")) + '</script>\n'
    return f"""<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<script>document.documentElement.className+=" js"</script>
<title>{title} · Side Story — Parfums &amp; Oils</title>
<meta name="description" content="{desc}">
{seo}<meta name="theme-color" content="#2B2E2D">
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


# One number, six places. The threshold was typed out in the drawer, the shelf
# footnote, the product details, the shipping table and the bag maths, which is
# five chances for them to disagree the next time it moves.
FREE_GBP = 40
FREE_AED = 400

ANNOUNCEMENTS = [
    "Complimentary delivery over &pound;%d / AED&nbsp;%d" % (FREE_GBP, FREE_AED),
    "A second story&rsquo;s sample, complimentary with every bottle",
    "Every 100&nbsp;ml under a hand-carved stone lid, with its printed story",
]


def _path_bbox(d):
    """Bounding box of one path. The mark uses M, L, H, V, C and Z only, and
    every one of those takes its coordinates as x,y pairs except H and V, which
    take a single axis — so the pairs cannot simply be read off the number
    stream. Control points are included, which overstates a curve's box very
    slightly and does not matter here: this is used to sort paths into two
    bands that are sixty units apart."""
    x = y = 0.0
    xs, ys = [], []
    for cmd, args in re.findall(r'([MLHVCZmlhvcz])([^MLHVCZmlhvcz]*)', d):
        n = [float(v) for v in re.findall(r'-?\d*\.?\d+(?:e-?\d+)?', args)]
        c = cmd.upper()
        if c == 'H':
            for v in n: x = v; xs.append(x); ys.append(y)
        elif c == 'V':
            for v in n: y = v; xs.append(x); ys.append(y)
        elif c in ('M', 'L', 'C'):
            for i in range(0, len(n) - 1, 2):
                x, y = n[i], n[i + 1]; xs.append(x); ys.append(y)
    if not xs:
        return None
    return min(xs), min(ys), max(xs), max(ys)


def align_logo(src, dst, edge):
    """The wordmark is a two-line lockup: SIDE STORY across the full width of
    the artwork, and PARFUMS & OILS centred underneath it. In the header that
    is right — it is a mark standing on its own, and a centred second line is
    the whole point of a lockup.

    In the footer it is not standing on its own. On a phone it sits at the top
    of a hard-left column of links and the copyright line, so a centred second
    line reads as a mark that has slipped; on a desktop the block is flush
    right against the page edge, and the same centring leaves the second line
    hanging a hundred and twenty pixels short of it. Both looked like a
    mistake, for the same reason: the sub-line was not aligned to the edge its
    own block was aligned to.

    So the footer gets two derived files rather than one hand-drawn variant
    beside the original. The lower band is found by its own geometry and
    shifted until it meets the wordmark's left or right edge. If the mark is
    ever redrawn, this re-derives the offset instead of carrying a stale
    number that nobody will think to check.
    """
    svg = open(os.path.join(ROOT, src)).read()
    paths = re.findall(r'<path [^>]*?d="([^"]+)"[^>]*/>', svg)
    boxes = [(p, _path_bbox(p)) for p in paths]
    boxes = [(p, b) for p, b in boxes if b]
    if not boxes:
        return src
    # the gap between the two lines is the widest empty horizontal band
    tops = sorted(b[1] for _, b in boxes)
    mid = (min(b[3] for _, b in boxes) + max(b[1] for _, b in boxes)) / 2
    lower = [(p, b) for p, b in boxes if b[1] >= mid]
    upper = [(p, b) for p, b in boxes if b[1] < mid]
    if not lower or not upper:
        return src
    if edge == "right":
        shift = max(b[2] for _, b in lower) - max(b[2] for _, b in upper)
    else:
        shift = min(b[0] for _, b in lower) - min(b[0] for _, b in upper)
    if abs(shift) <= 1:
        return src
    out = svg
    for p, _ in lower:
        out = out.replace('d="%s"' % p, 'd="%s" data-sub="1"' % p, 1)
    # wrap every marked path in one translated group, in place
    marked = re.findall(r'<path [^>]*data-sub="1"[^>]*/>', out)
    for m in marked:
        out = out.replace(m, '', 1)
    out = out.replace('</svg>',
                      '<g transform="translate(%.3f,0)">%s</g>\n</svg>'
                      % (-shift, "".join(m.replace(' data-sub="1"', '') for m in marked)))
    open(os.path.join(ROOT, dst), 'w').write(out)
    return dst


def excerpt_paras(paras, cap=130, lo=1, hi=2):
    """The opening of a chapter, not the chapter.

    The product page was printing all of it — up to four hundred words of
    fiction between the buy button and the notes, which is a page you scroll
    past rather than read, and it left the story page with nothing to offer.

    The cap is what governs, not the paragraph count: these paragraphs run
    anywhere from 23 to 125 words, so "the first two" is 59 words on one
    fragrance and 200 on another, and the section changes size as you move
    between them. Whole paragraphs up to 130 words gives every one of the
    seven between 59 and 128 — one paragraph where the opening is long, two
    where it is short, and the same weight on the page either way."""
    out, n = [], 0
    for p in paras:
        w = len(p.split())
        if len(out) >= hi: break
        if len(out) >= lo and n + w > cap: break
        out.append(p); n += w
    return out


def spine_section(current=None):
    """The seven, as a row of stone colours. On a story page it marks the one
    being read; anywhere else it is simply the shelf, which is what makes it
    worth repeating at the foot of a page about the house."""
    items = "\n".join(
        '        <a class="sv%s" href="story-%s.html">'
        '<i style="background:%s"></i><em>%s</em><b>%s</b>%s</a>'
        % (" on" if r["slug"] == current else "", r["slug"], r["swatch"],
           CHAPTERS[r["slug"]]["numeral"], r["name"],
           "<small>You are reading</small>" if r["slug"] == current else "")
        for r in PRODUCTS)
    return f"""<section class="sseven">
  <div class="inner">
    <p class="k">All seven stories</p>
    <h2>Seven to read. Seven to wear.</h2>
    <div class="svs">
{items}
    </div>
  </div>
</section>"""


def atelier_section():
    """The house's position, in the two-column form Why Side Story uses.

    Same components as that section — band, kicker, heading, .grid-2 of
    figures and .cols-2 of prose — because it is the same shape of argument:
    a claim, then two halves of it side by side. No new CSS."""
    return f"""<section class="band" id="atelier">
  <div class="inner">
    <p class="k">FILLER &mdash; eyebrow to come</p>
    <h2>Ateliers Journey</h2>
    <div class="grid-2">
      <figure><img class="figfull" src="{fp('assets/img/founders.jpg')}" alt="The workshop" loading="lazy"><figcaption class="hint">FILLER &mdash; caption to come</figcaption></figure>
      <figure><img class="figfull" style="object-position:center 34%" src="{fp('assets/img/atelier-bench.jpg')}" alt="A Road Trip bottle on a workbench beside a glazed jar and a twin-lens camera" loading="lazy"><figcaption class="hint">FILLER &mdash; caption to come</figcaption></figure>
    </div>
    <div class="cols cols-2">
      <p>We create fragrances based on stories, rather than stories composed for arbitrary fragrances. Perfume should be one of life&rsquo;s unremitting addictions, one that necessitates feeding, and one that lasts until the next day, like it did on our grandmothers.</p>
      <p>We believe the best craftsmen work alone, with aged tools and in dimly lit workshops. We endorse cultural coalescence as the only way forward, favour fewer choices, less iteration and lengthier ownership, and are never guided by compulsions or passing trends.</p>
    </div>
  </div>
</section>"""


def making_section():
    """The making, on Our Story and on the homepage.

    The homepage had its own: three plates in a side-scrolling rail with
    captions about arguing a story into its final line, and a credit naming
    a perfumer, a writer and six countries — none of it Alex's, and all of
    it contradicted by the section on Our Story that says what actually
    happens. One section, written once, on both pages."""
    return f"""<section class="band tint" id="making">
  <div class="inner">
    <p class="k">The making</p>
    <h2>Begun in Grasse. Finished by hand.</h2>
    <div class="grid-3">
      <figure><img class="figfull" src="{fp('assets/img/plants.jpg')}" alt="Botanicals for the compositions" loading="lazy"><figcaption class="hint">clean botanicals, carefully composed</figcaption></figure>
      <figure><img class="figfull" src="{fp('assets/img/founders.jpg')}" alt="The house at work" loading="lazy"><figcaption class="hint">crafted with intention</figcaption></figure>
      <figure><img class="figfull" src="{fp('assets/img/spine.jpg')}" alt="Stone meeting glass" loading="lazy"><figcaption class="hint">made to last, designed to be reused</figcaption></figure>
    </div>
    <div class="cols cols-3">
      <p>All Side Story fragrances begin with clean, natural ingredients, selected for their purity and character. Our farm-to-fragrance approach preserves every botanical, using synthetics only when they provide the most sustainable solution, without compromising the integrity of each scent.</p>
      <p>Every bottle and lid is crafted by hand in Italy, designed to be treasured long after the fragrance is finished. Made from recyclable materials and presented in entirely plastic-free packaging, every detail reflects thoughtful design and enduring craftsmanship.</p>
      <p>Every parfum is created to linger beautifully on skin and fabric, leaving a lasting impression long after it is worn. Inspired by stories instead of seasons or trends, each fragrance is composed with depth, purpose and timeless character.</p>
    </div>
  </div>
</section>"""


SHOW_SLUG = "hotel-lobby"          # the chapter of the season


def show_copy():
    """The homepage's featured chapter, from the product data.

    It was hand-written: a style line reading "Woods, spice, green" months
    after the shelf said something else, a stone credited correctly by luck, a
    blockquote that rewrote the story's own opening — "It was ten minutes
    before eight when she arrived", where the story says he did — and a link
    to story.html, which is Sunday Service. Four separate ways for the most
    prominent product block on the site to be wrong about the product."""
    p = BY_SLUG[SHOW_SLUG]
    ch = CHAPTERS[SHOW_SLUG]
    return f"""      <p class="k">The chapter of the season</p>
      <h2>{p['name']}</h2>
      <blockquote>&ldquo;{ch['pull']}&rdquo;</blockquote>
      <div class="spec"><b>Story</b><span>{p['theme']}</span></div>
      <div class="spec"><b>Style</b><span>{p['style']}</span></div>
      <div class="spec"><b>Stone</b><span>{p['origin']}</span></div>
      <div class="cta"><button class="btn btn-ink" onclick="addToBag('{p['slug']}','full',this)">Add to bag &mdash; &pound;160</button>
        <a class="btn btn-ghostink" href="story-{p['slug']}.html">Read the story</a></div>
      <p class="re">Complimentary UK delivery over &pound;{FREE_GBP} &middot; signed for, two to four working days</p>"""


def style_row():
    """All seven styles, from the product data.

    These were five hand-written cards naming a feeling each — Anticipation,
    Comfort, Escape, Devotion, Mischief — none of which came from Alex and
    four of which disagreed with the themes he has now supplied. They are the
    supplied Style line now, generated, so they cannot drift from the shelf
    again.

    Two of the seven used to be missing, because the row was written as five
    cards and the slice was never revisited when the shelf became a shelf of
    seven. It reads the whole list now. The stone chip sits on the same line
    as the name, because a colour with no name attached is a decoration —
    the reader is choosing a bottle, and the bottle should say so first."""
    return "\n".join(
        '      <a class="feel rev" href="product-%s.html">'
        '<p class="fn"><span class="chip" style="background:%s"></span>%s</p>'
        '<h3>%s</h3><p class="ft">%s</p></a>'
        % (p["slug"], p["swatch"], p["name"], p["style"], p["theme"])
        for p in PRODUCTS)


def gift_module(kicker="Kept &amp; given",
                head="A story is a serious gift.",
                body="Every parcel arrives gift-ready &mdash; the stone lid, the printed story, no plastic in the box. Add the Dedication: a line of yours, typeset on the story&rsquo;s flyleaf, and sent again as a digital edition.",
                extras=True, ident="gifting",
                img="assets/img/unboxing.jpg", tail=None):
    """The wide image-and-copy panel, on the homepage and on Our Story.

    Written once. The last time a block appeared on two pages it was
    hand-copied — the homepage's seven cards against the catalogue — and the
    two drifted until one of them was pointing at image files the photo
    pipeline had stopped producing. The id travels with it, which is correct:
    ids are unique within a page, and a deep link to the gifting panel should
    work on whichever page the reader is on.

    The panel is the same object on both pages and the copy is an argument
    to it, not a second copy of the markup — so a change to the layout still
    only has to be made once."""
    if tail is None:
        tail = """    <div class="ded">for A. &mdash; who was late</div>
    <div class="cta"><a class="btn btn-ivory" href="collection.html">Explore gifting</a>
      <a class="btn btn-ghost" href="share.html">Add a dedication</a></div>
""" if extras else ""
    return f"""<section class="gift{' bare' if not extras else ''}" id="{ident}">
  <img src="{fp(img)}" alt="" loading="lazy">
  <div class="fade"></div>
  <div class="c rev">
    <p class="k">{kicker}</p>
    <h2>{head}</h2>
    <p>{body}</p>
{tail}  </div>
</section>"""


def announcement():
    """A continuous ticker rather than one fixed line.

    Two identical copies of the message list sit side by side in one track,
    and the track is translated by exactly half its own width. At the end of
    that translation the second copy is standing where the first one started,
    the animation restarts, and nothing on screen moves — which is what makes
    the loop seamless rather than a jump you have learned to ignore.

    The second copy is aria-hidden, so a screen reader is read the messages
    once. The whole strip is a labelled region and not a live region: it
    changes constantly by design, and announcing every change would make the
    page unusable with a screen reader on.
    """
    items = "".join(
        '<span class="anni">%s</span><i class="anns" aria-hidden="true"></i>' % m
        for m in ANNOUNCEMENTS)
    return ('<div class="ann" role="region" aria-label="Announcements">\n'
            '  <div class="anntrack" data-ann>\n'
            '    <div class="anngroup">%s</div>\n'
            '    <div class="anngroup" aria-hidden="true">%s</div>\n'
            '  </div>\n'
            '</div>' % (items, items))


def topbar(current):
    # the panel used to offer five ways to slice the shelf; there are seven
    # fragrances, so the shelf itself is the shorter list
    storylinks = "\n".join(
        '          <a class="ml" href="product-%s.html">%s</a>' % (p["slug"], p["name"])
        for p in PRODUCTS)
    cur = ' aria-current="page"'
    items = "\n      ".join(
        '<a href="%s"%s%s>%s</a>' % (href, ' data-mega="1"' if href == MEGA_FOR else "",
                                     cur if href == current else "", label)
        for href, label in NAV_LINKS)
    # The phone menu is its own panel, not the desktop nav re-flowed. The desktop
    # links carry data-mega and open the shop panel on focus — moving focus into
    # them on a phone opened the mega menu underneath the burger menu, which is
    # the whole reason the old one felt broken. A separate element also lets the
    # panel own its scrolling and its stacking without fighting the header row.
    #
    # Explore drops anything the size block above it already carries. Stacked
    # on a phone you see both lists at once, and Samples appeared twice and
    # the set appeared twice under two different names — on the desktop the
    # same overlap is invisible because the size block lives behind a hover.
    mob = "\n        ".join(
        '<a href="%s"%s>%s</a>' % (href, cur if href == current else "", label)
        for href, label in NAV_LINKS if href not in SIZE_HREFS)
    megasizes = "\n".join(
        '          <a class="ml" href="%s">%s &mdash; %s</a>' % (h, label, price)
        for h, label, price in MENU_SIZES)
    mobsizes = "\n".join(
        '      <a href="%s">%s<span>%s</span></a>' % (h, label, price)
        for h, label, price in MENU_SIZES)
    return f"""<div class="enter-veil" aria-hidden="true"></div>
<div class="menu-dim" id="menudim"></div>
{announcement()}
<div class="topbar">
<header class="nav">
  <div class="inner">
    <button class="burger" aria-label="Menu" aria-expanded="false" aria-controls="menupanel"><i></i><i></i><i></i></button>
    <a class="brand" href="index.html" aria-label="Side Story — Parfums &amp; Oils"><img src="{fp('assets/img/logo.svg')}" alt="Side Story — Parfums &amp; Oils" width="300" height="68"></a>
    <nav class="links" id="primary-nav" aria-label="Primary">
      {items}
    </nav>
    <div class="mega" id="mega" hidden>
      <div class="inner">
        <div>
          <p class="fh">Shop by size</p>
{megasizes}
        </div>
        <div>
          <p class="fh">Shop by stories</p>
{storylinks}
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
          <img src="{fp('assets/img/set-first-lines.jpg')}" alt="The Discovery Set discovery set" loading="lazy">
          <span>Begin here &mdash; The Discovery Set, &pound;38</span></a>
      </div>
    </div>
    <div class="util">
      <a href="search.html">Search</a><a class="u-account" href="account.html">Account</a>
      <button class="bagbtn" onclick="openDrawer()">Bag (<span id="bagcount">0</span>)</button>
    </div>
  </div>
</header>
</div>
<nav class="menupanel" id="menupanel" aria-label="Menu" hidden>
  <div class="mpin">
    <p class="mpfh">Shop by size</p>
    <div class="mpsizes">
{mobsizes}
    </div>
    <p class="mpfh">Explore</p>
    <div class="mplinks">
      {mob}
    </div>
    <div class="mputil">
      <a href="search.html">Search</a>
      <a href="account.html">Account</a>
      <a href="journal.html">Journal</a>
      <a href="contact.html">Contact</a>
    </div>
  </div>
</nav>
"""


FOOTER_LOGO = "assets/img/logo-ivory.svg"        # phone: flush left
FOOTER_LOGO_R = "assets/img/logo-ivory.svg"      # desktop: flush right


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
      <div class="fbrand"><picture>
        <source media="(min-width:48em)" srcset="{fp(FOOTER_LOGO_R)}">
        <img src="{fp(FOOTER_LOGO)}" alt="Side Story &mdash; Parfums &amp; Oils" width="300" height="68" decoding="async"></picture></div>
    </div>
    <div class="fbot">
      <div class="pay"><i>VISA</i><i>MC</i><i>AMEX</i><i><svg class="i-apple" viewBox="0 0 384 512" aria-hidden="true" focusable="false"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.931.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>Pay</i></div>
      <div class="legalwrap">
        <nav class="legal" aria-label="Legal"><a href="legal.html">Privacy</a><a href="legal.html">Terms</a><a href="legal.html">Cookies</a></nav>
        <p class="locale">United Kingdom (GBP &pound;)</p>
      </div>
    </div>
  </div>
</footer>
"""


DRAWER = f"""<div class="scrim" id="scrim" onclick="closeDrawer()"></div>
<aside class="drawer" id="drawer" role="dialog" aria-modal="true"
       aria-labelledby="drawer-title" hidden>
  <div class="dhead"><span id="drawer-title">Your bag &mdash; <span data-bagcount>0</span></span><button onclick="closeDrawer()">Close</button></div>
  <div id="ditems"></div>
  <p class="thresh" id="thresh">Complimentary delivery at &pound;{FREE_GBP}</p>
  <div class="tbar"><div class="tfill" id="tfill"></div></div>
  <div class="dtot"><span>Subtotal</span><b id="dtotal">&pound;0</b></div>
  <a class="btn btn-ink" href="checkout.html">Checkout</a>
  <p class="dfine">Tax included &middot; complimentary UK delivery over &pound;{FREE_GBP}</p>
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
         line="2ml of the eau de parfum, in a printed sleeve with its opening page."),
]
BY_SIZE = {z["key"]: z for z in SIZES}


# ------------------------------------------------------------- filters ----
# One declaration, three renderings: the inline row on a wide screen, the
# sheet on a phone, and the applied-filter summary under both. Adding an axis
# — feeling, price, in-stock — is one entry in this list and nothing else;
# nothing downstream names a specific filter.
#
# `mode` is the whole reason the old bar felt wrong. Size and scent were drawn
# identically and behaved differently: choosing 7.5 ml never removed a card,
# because all seven exist in all three sizes — it changes what you are buying,
# not what you can see. Size is `one` (a choice, exactly one always active,
# radio semantics); scent is `many` (a filter, none active by default,
# checkbox semantics). The two now look as different as they behave.
FILTERS = [
    dict(key="size", attr="size", label="Size", mode="one",
         note="All seven come in every size. This changes the price and the pack, not the shelf.",
         options=[dict(v=z["key"], label=z["label"], short=z["short"],
                       hint="&pound;%d &middot; %s" % (z["price"], z["incl"])) for z in SIZES]),
    dict(key="family", attr="family", label="Scent", mode="many",
         note="Choose as many as you like. More families, more stories.",
         options=[dict(v=f["key"], label=f["label"], short=f["label"], hint="") for f in FAMILIES]),
]


def filter_title():
    """"Size & scent" today. Written from the list rather than typed, so a
    third axis renames the button and the sheet without anyone remembering
    to — a label that goes stale is how a control starts lying."""
    names = [g["label"] for g in FILTERS]
    names = [names[0]] + [n[0].lower() + n[1:] for n in names[1:]]
    if len(names) == 1:
        return names[0]
    return ", ".join(names[:-1]) + " &amp; " + names[-1]


def filter_inline(active_size):
    """The row a wide screen gets: every group laid out in the open."""
    out = []
    for g in FILTERS:
        opts = []
        for o in g["options"]:
            if g["mode"] == "one":
                on = "true" if o["v"] == active_size else "false"
                opts.append(
                    '            <button type="button" role="radio" aria-checked="%s"'
                    ' tabindex="%s" data-filter="%s" data-value="%s">'
                    '<span class="long">%s</span><span class="short">%s</span></button>'
                    % (on, "0" if on == "true" else "-1", g["key"], o["v"], o["label"], o["short"]))
            else:
                opts.append(
                    '            <button type="button" aria-pressed="false"'
                    ' data-filter="%s" data-value="%s">%s</button>'
                    % (g["key"], o["v"], o["label"]))
        role = 'role="radiogroup"' if g["mode"] == "one" else 'role="group"'
        out.append(
            '        <div class="fgroup fgroup-%s">\n'
            '          <span class="lbl" id="lbl-%s">%s</span>\n'
            '          <div class="opts" %s aria-labelledby="lbl-%s">\n%s\n          </div>\n'
            '        </div>' % (g["mode"], g["key"], g["label"], role, g["key"], "\n".join(opts)))
    return "\n".join(out)


def filter_sheet(active_size):
    """The same groups as full-width rows, for a thumb."""
    out = []
    for g in FILTERS:
        rows = []
        for o in g["options"]:
            hint = ('<span class="shint">%s</span>' % o["hint"]) if o["hint"] else ""
            if g["mode"] == "one":
                on = "true" if o["v"] == active_size else "false"
                rows.append(
                    '          <button type="button" class="srow srow-one" role="radio"'
                    ' aria-checked="%s" tabindex="%s" data-filter="%s" data-value="%s">'
                    '<span class="slab">%s%s</span><i aria-hidden="true"></i></button>'
                    % (on, "0" if on == "true" else "-1", g["key"], o["v"], o["label"], hint))
            else:
                rows.append(
                    '          <button type="button" class="srow" aria-pressed="false"'
                    ' data-filter="%s" data-value="%s">'
                    '<span class="slab">%s</span><i aria-hidden="true"></i></button>'
                    % (g["key"], o["v"], o["label"]))
        role = 'role="radiogroup"' if g["mode"] == "one" else 'role="group"'
        out.append(
            '      <section class="sgroup">\n'
            '        <h3 class="sgh" id="sh-%s">%s</h3>\n'
            '        <p class="sgn">%s</p>\n'
            '        <div class="sgrows" %s aria-labelledby="sh-%s">\n%s\n        </div>\n'
            '      </section>' % (g["key"], g["label"], g["note"], role, g["key"], "\n".join(rows)))
    return "\n".join(out)


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
                                main=fp(size_main(p, z["key"])),
                                set=srcsets(size_img(p, z["key"])),
                                mainset=srcsets(size_main(p, z["key"])))
                                for z in SIZES})
            for p in PRODUCTS}
    data["set"] = dict(name="The Discovery Set", stone="", col="#3E5147",
                       notes="all seven in miniature", price=38,
                       img="assets/img/set-first-lines.jpg", href="samples.html")
    return json.dumps(data, ensure_ascii=False)


def story_line(p, limit=118):
    """The opening of the fragrance's own story, quoted rather than retold.

    Two of the seven card lines were a tidied-up version of the real opening —
    Hotel Lobby's story reads "It was a ten minutes before 8pm when he arrived.
    He had been there before, but its resplendence never failed to catch him
    off guard", and the card had spliced those two sentences into one that
    appears nowhere in the book. Close enough to look right, not close enough
    to be a quotation. This takes whole sentences off the front of the real
    first paragraph instead, so the line on the shelf is a line from the
    story."""
    txt = CHAPTERS[p["slug"]]["paras"][0].strip()
    out = ""
    for m in re.finditer(r'.+?[.!?](?:["\u201d\u2019]?)(?:\s|$)', txt):
        s = m.group(0).strip()
        if out and len(out) + 1 + len(s) > limit:
            break
        out = (out + " " + s).strip()
        if len(out) >= limit * 0.6:
            break
    if not out or len(out) > limit + 40:
        # a single opening sentence longer than the card can hold: cut it at a
        # word and mark the cut, rather than quietly quoting half a sentence
        return txt[:limit].rsplit(" ", 1)[0].rstrip(" ,;:\u2014-") + "\u2026"
    return out


def openline(p, limit=58):
    """The story's opening, cut where a reader would cut it.

    Prefer the first sentence when it is short enough; otherwise fall back to
    the last word boundary before the limit. Never mid-word, which is what the
    old fixed slice was doing."""
    t = story_line(p).strip()
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


def search_index():
    """Everything the overlay can find, as one small array shipped on every
    page. Forty-odd entries is nothing to send and nothing to score, so the
    results are synchronous — no request, no spinner, no empty frame between
    the keystroke and the answer.

    `t` is what is shown, `s` the line under it, `k` the group heading, `h`
    the destination, and `x` the haystack: everything worth matching on,
    lower-cased and space-padded so a term can be tested for a word start.
    Notes, feelings, stones and the story's opening line are all in there,
    because "something smoky", "for my sister" and "green marble" are how
    people actually look for a perfume."""
    import json
    rows = []

    def add(t, s, k, h, *words):
        blob = " ".join([t, s] + [w for w in words if w]).lower()
        # the full stop stays: it is inside "7.5 ml", which is a thing people
        # type. £ goes, so "160" is a word rather than the tail of one.
        for ch in ",;:·—–…!?()’'\"£&":
            blob = blob.replace(ch, " ")
        rows.append(dict(t=t, s=s, k=k, h=h, x=" " + " ".join(blob.split()) + " "))

    for p in PRODUCTS:
        add(p["name"], f'{p["style"]} · {p["origin"]}', "Fragrances",
            f'product-{p["slug"]}.html',
            p["feeling"], p["family"], p["theme"], p["story"], p["top"], p["mid"], p["base"],
            "eau de parfum perfume bottle 100ml notes")
    for p in PRODUCTS:
        add(f'{p["name"]} — the story', f'{p["story"]} · {p["feeling"]} · {p["read"]}', "Stories",
            f'story-{p["slug"]}.html', story_line(p), "short story fiction read")

    # Sizes are how a lot of people arrive — "100ml", "7.5", "travel size",
    # "2ml" — and none of those match "100 ml" on their own, because the space
    # in the label is a typographic decision and nobody types it. Each size
    # carries every way it gets written.
    add("The Fragrances", "All seven, filtered by feeling, stone or note", "Shop",
        "collection.html", "collection shop everything browse all sizes")
    add("100 ml", "The full bottle, carved stone lid, printed story — £160", "Shop",
        "collection-100ml.html",
        "100ml 100 ml 100 large full size big bottle full-size price 160")
    add("7.5 ml", "Travel size in a printed sleeve — £40", "Shop",
        "collection-7-5ml.html",
        "7.5ml 7.5 ml 75ml 7ml 7 5 small travel purse handbag mini miniature size price 40")
    add("Samples", "2 ml of any story — £5", "Shop",
        "collection-samples.html",
        "2ml 2 ml sample samples try tester trial discovery decant vial smallest size price 5")
    add("The Discovery Set", "All seven in miniature — £38", "Shop",
        "samples.html", "discovery set sets sampler starter bundle try first gift present")

    for j in JOURNAL:
        add(j["title"], j["sub"], "Journal", f'journal.html#{j["slug"]}', j["kicker"])
    add("Atelier journal", "Campaigns, founders' notes, and lid diaries", "Journal",
        "journal.html", "blog news writing articles")

    add("Your Stories", "The seven commissioned stories, in full", "The house",
        "stories.html", "read fiction writers")
    add("Share Yours", "Send us the story a scent belongs to", "The house",
        "share.html", "submit write postbag community")
    add("Our Story", "Sandalwood, a grandfather's plantations, and a house built on what a scent brings back", "The house",
        "our-house.html", "about founders history brand our house rana")
    add("The Making", "Brief, story, scent, stone — in that order", "The house",
        "our-house.html#making", "process craft perfumer grasse")
    add("The Stones", "Seven marbles, one lid each", "The house",
        "our-house.html#stones", "marble lid carving quarry nero calacatta verde rosso giallo")

    add("Shipping & Returns", "Delivery times, costs and how returns work", "Practical",
        "shipping.html", "delivery postage refund exchange tracking free")
    add("Stockists", "Where to smell them in person", "Practical",
        "stockists.html", "shops stores counters find near")
    add("Contact", "Ask us anything", "Practical", "contact.html", "email phone help support")
    add("FAQ", "The questions we are asked most", "Practical",
        "faq.html", "questions answers help longevity sillage vegan cruelty ingredients")
    add("Account", "Orders, dedications, and the stories you have unlocked", "Practical",
        "account.html", "login sign in profile orders")
    add("Privacy, Terms & Cookies", "The legal pages", "Practical",
        "legal.html", "policy gdpr data cookies terms conditions")
    return json.dumps(rows, ensure_ascii=False, separators=(",", ":"))


def search_overlay():
    quick = "".join(
        f'<a href="product-{p["slug"]}.html"><span>{p["name"]}</span>'
        f'<span class="sm">{p["notes"]}</span></a>'
        for p in PRODUCTS[:4])
    return f"""<div class="srchscrim" id="srchscrim" hidden></div>
<div class="srch" id="srch" role="dialog" aria-modal="true" aria-labelledby="srch-title" hidden>
  <div class="srchin">
    <div class="srchhead">
      <h2 id="srch-title">Search</h2>
      <button type="button" class="srchclose" id="srchclose">Close</button>
    </div>
    <div class="srchbar">
      <input id="srchq" class="srchq" type="search" autocomplete="off" autocorrect="off"
             autocapitalize="none" spellcheck="false" enterkeyhint="search"
             placeholder="A fragrance, a feeling, a stone&hellip;" aria-label="Search"
             role="combobox" aria-expanded="false" aria-controls="srchres" aria-autocomplete="list">
      <button type="button" class="srchclear" id="srchclear" aria-label="Clear search" hidden>Clear</button>
    </div>
    <div class="srchbody">
      <div class="srchidle" id="srchidle">
        <p class="mpfh">Popular this week</p>
        <div class="srchlist">{quick}</div>
        <p class="mpfh">Or start here</p>
        <div class="srchlist">
          <a href="collection.html"><span>All seven stories</span></a>
          <a href="samples.html"><span>The Discovery Set</span><span class="sm">&pound;38</span></a>
          <a href="collection-samples.html"><span>Samples</span><span class="sm">&pound;5</span></a>
          <a href="stories.html"><span>Your Stories</span></a>
        </div>
      </div>
      <div class="srchres" id="srchres" hidden></div>
      <p class="srchnone" id="srchnone" hidden></p>
    </div>
    <p class="srchsr vh" id="srchsr" role="status" aria-live="polite"></p>
  </div>
</div>
"""


def page(slug, title, desc, body, current=None, css=("assets/css/fonts.css", "assets/css/app.css"), body_attr="", og_image=None, jsonld=None):
    out = head(title, desc, css, body_attr, slug=slug, og_image=og_image, jsonld=jsonld) + topbar(current or (slug + ".html")) \
        + '<main id="main">\n' + body.strip() + "\n</main>\n" \
        + footer() + DRAWER + search_overlay() \
        + f'<script>window.SS_CAT={catalogue_json()};</script>\n' \
        + f'<script>window.SS_IDX={search_index()};window.SS_FREE={FREE_GBP};</script>\n' \
        + f'<script src="{fp("assets/js/site.js")}"></script>\n</body></html>\n'
    # one pass over the finished page, so the footer wordmark and the drawer
    # are covered too — they are appended after the body and were escaping it
    out = upgrade_images(out)
    out = typeset(out)
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
    return f"""      <article class="card{' rev' if reveal else ''}" data-slug="{p['slug']}" data-order="{PRODUCTS.index(p)}" data-feeling="{p['feeling']}" data-stone="{p['stone']}" data-note="{p['style'].split('.')[0].strip()}" data-family="{p['family']}">
        <div class="ph"><a data-href href="product-{p['slug']}.html"><img data-shot src="{fp('assets/img/' + p['img'] + '-card.jpg')}" alt="{p['name']} eau de parfum" loading="lazy"></a>{badge}
          <div class="quick"><div class="r">
            <button class="btn btn-ink btn-sm" data-buy data-size="100ml" onclick="addToBag('{p['slug']}',this.dataset.size,this)">100 ml &mdash; &pound;160</button>
            <button class="btn btn-ghostink btn-sm" data-buy data-size="7-5ml" onclick="addToBag('{p['slug']}',this.dataset.size,this)">7.5 ml &mdash; &pound;40</button>
          </div><small data-incl>The printed story is in the box</small></div></div>
        <div class="meta"><span class="chip" style="background:{p['swatch']}"></span><span class="stone">{p['stone']}</span>
          <h3>{p['name']}</h3><p class="notes">{p['notes']}</p>
          <p class="price"><span data-priceline>&pound;160 &middot; 100 ml</span><a class="ul" data-href href="product-{p['slug']}.html">View</a></p></div>
      </article>"""


# Background film behind the pull-quote band, by slug — Hotel Lobby only for
# now. Referenced where it lives rather than mirrored into assets/: this build
# host cannot reach cdn.shopify.com, and a video is the one asset where a CDN
# origin is the ordinary answer anyway. Nothing depends on it arriving. The
# still underneath is what paints, what the poster would have been, and what
# stays if the file is slow, blocked, or the reader has asked for less motion.
STORY_FILM = {
    "hotel-lobby": "https://cdn.shopify.com/videos/c/o/v/5ed609fbb758465785fa28bbe7706264.mp4",
    "pillow-talk": "https://cdn.shopify.com/videos/c/o/v/1b0f3a71f5e8482186211527f13198cb.mp4",
    "sunday-service": "https://cdn.shopify.com/videos/c/o/v/da03d65c57264c91882acb2f5f947d66.mp4",
}


PROMO_CARD = """      <article class="promo rev">
        <p class="k">Undecided?</p><h3>The Discovery Set</h3>
        <p>All seven stories in miniature &mdash; read them on your own skin. &pound;38.</p>
        <div><a class="btn btn-ghost btn-sm" href="samples.html">Begin the set</a></div>
      </article>"""


# --------------------------------------------------------------- pages ----

def build():
    written = {}

    # the footer's two lockups, both derived from the header's artwork: the
    # sub-line meets whichever edge the block itself is aligned to
    global FOOTER_LOGO, FOOTER_LOGO_R
    FOOTER_LOGO = align_logo("assets/img/logo-ivory.svg",
                             "assets/img/logo-ivory-left.svg", "left")
    FOOTER_LOGO_R = align_logo("assets/img/logo-ivory.svg",
                               "assets/img/logo-ivory-right.svg", "right")

    # ---- 01 home (body kept in tools/parts/home.html) --------------------
    # The fragment is authored with plain asset paths; fingerprint them here so
    # the homepage cannot serve a stale image while every generated page serves
    # a fresh one. That mismatch is exactly what made the homepage cards look
    # unfixed after the crops were corrected.
    home_body = open(os.path.join(ROOT, "tools/parts/home.html")).read()
    # The homepage's seven cards were a hand-written copy of the catalogue, and
    # it had drifted: the badge that the data (and every collection page, and
    # the homepage's own signature strip) puts on Road Trip was sitting on
    # 4pm Matinee. Same class of problem as the three records of the stone
    # colours. It renders from product_card now, so it cannot drift again.
    home_cards = ('<div class="cards">\n'
                  + "\n".join(product_card(p) for p in PRODUCTS)
                  + "\n" + '<article class="promo rev">\n        <p class="k">Undecided?</p><h3>The Discovery Set</h3>\n        <p>All seven stories in miniature — read them on your own skin. £38.</p>\n        <div><button class="btn btn-ghost btn-sm" onclick="addToBag(\'set\',\'full\',this)">Begin the set</button></div>\n      </article>' + "\n    </div>")
    home_body = home_body.replace("<!--SS_CARDS-->", home_cards)
    # The panel here used to sell gifting and the Dedication. The house does
    # neither, so it sells the one thing a first-time reader should actually
    # buy: the set. Copy is lifted from samples.html rather than written
    # again, so the two cannot disagree about the price or the credit.
    home_body = home_body.replace("<!--SS_GIFT-->", gift_module(
        kicker="The discovery set",
        head="Read first. Decide later.",
        body="All seven stories in miniature &mdash; 2ml of each, and the opening page of every one. "
             "Wear one a day for a week, then choose the bottle you keep.",
        ident="set",
        img="assets/img/set-first-lines.jpg",
        tail="""    <div class="cta"><button class="btn btn-ivory" onclick="addToBag('set','full',this)">Add the set &mdash; &pound;38</button>
      <a class="btn btn-ghost" href="samples.html">What&rsquo;s in it</a></div>
"""))
    home_body = home_body.replace("<!--SS_STYLES-->", style_row())
    home_body = home_body.replace("<!--SS_SHOW-->", show_copy())
    home_body = home_body.replace("<!--SS_MAKING-->", making_section())
    home_body = home_body.replace("<!--SS_ATELIER-->", atelier_section())
    # the homepage fragment is hand-written, so the threshold has to be
    # substituted into it like everywhere else — it was the one place still
    # quoting £100 after the number moved
    home_body = home_body.replace("<!--SS_FREE-->", str(FREE_GBP))
    home_body = re.sub(r'(href|src)="(assets/(?:img|css|js)/[^"?]+)"',
                       lambda m: '%s="%s"' % (m.group(1), fp(m.group(2))), home_body)
    # the gallery swaps images from an inline handler, so hash those paths too
    home_body = re.sub(r"'(assets/img/[^'?]+)'",
                       lambda m: "'%s'" % fp(m.group(1)), home_body)
    # The title and the description are the hero, restated for a search result
    # and a shared link. They were the old hero verbatim, so leaving them would
    # have put the replaced copy back in the one place nobody looks at while
    # editing a page — the tab, the Google listing and every WhatsApp preview.
    written["index"] = page("index", "Short narratives + deliberate scents",
        "Crafted with fine & broad-ranging ingredients, the scents inspire nostalgia, expression and memory. "
        "100ml £160 beneath a hand-carved stone lid, 7.5ml £40, samples £5.",
        home_body, current="index.html",
        jsonld={"@context": "https://schema.org", "@graph": [
            {"@type": "Organization", "name": "Side Story Parfums",
             "url": SITE_URL, "logo": SITE_URL + "/assets/img/logo.svg"},
            {"@type": "WebSite", "name": "Side Story Parfums", "url": SITE_URL,
             "potentialAction": {"@type": "SearchAction",
               "target": SITE_URL + "/search?q={search_term_string}",
               "query-input": "required name=search_term_string"}}]})

    # ---- 02 collection, and one per size ---------------------------------
    #   One product per fragrance with three variants, so the size collections
    #   are the same seven cards with the variant pre-applied — the card price,
    #   plate and link all switch, and the product page opens on that size.
    SHELF = [
        (None, "collection", "The Fragrances", "The collection",
         "Seven stories, worn as scent.",
         "Each began as nine pages of fiction, commissioned before a single note was weighed. "
         "Eau de parfum in three sizes: 100ml at &pound;160 under a hand-carved stone lid with its "
         "printed story in the box, 7.5ml at &pound;40 in a printed sleeve, and samples at &pound;5 "
         "in a printed sleeve with the story&rsquo;s opening page."),
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
         "2ml of any of the seven, &pound;5. "
         "Sent in a printed sleeve with the story&rsquo;s opening page."),
    ]
    for key, slug, title, kicker, head, lede in SHELF:
        cards = "\n".join(product_card(p) for p in PRODUCTS)
        if key in (None, "sample"):
            cards += "\n" + PROMO_CARD
        inline = filter_inline(key or "100ml")
        sheetgroups = filter_sheet(key or "100ml")
        ftitle = filter_title()
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
      <button class="filterbtn" type="button" data-open-filters aria-haspopup="dialog"
              aria-expanded="false"><span>{ftitle}</span><span class="tally" data-tally hidden>0</span></button>
      <div class="finline">
{inline}
      </div>
      <p class="shelfcount"><span data-count>Seven stories</span></p>
    </div>
    <div class="applied" data-applied hidden>
      <span class="alab">Showing</span>
      <span class="achips" data-applied-chips></span>
      <button type="button" class="clear" data-clear>Clear all</button>
    </div>
    <div class="sheetscrim" data-scent-scrim hidden></div>
    <div class="sheet" data-scent-sheet role="dialog" aria-modal="true"
         aria-labelledby="sheet-title" hidden>
      <div class="sheethead">
        <h2 id="sheet-title">{ftitle}</h2>
        <button type="button" class="x" data-close-scent aria-label="Close">Close</button>
      </div>
      <div class="sheetlist">
{sheetgroups}
      </div>
      <div class="sheetfoot">
        <button type="button" class="clear" data-clear>Clear all</button>
        <button type="button" class="btn btn-ink" data-close-scent>
          <span>Show <span data-sheetcount>7 stories</span></span></button>
      </div>
    </div>
    <div class="cards" data-size="{key or '100ml'}">
{cards}
    </div>
    <p class="foot rev">Every 100ml ships with its printed story and its carved stone lid &nbsp;&middot;&nbsp; 7.5ml and samples travel in a printed sleeve &nbsp;&middot;&nbsp; complimentary UK delivery over &pound;{FREE_GBP}</p>
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
        # The size selector, generated from SIZES so the labels, prices and
        # what's-included lines are the catalogue's own. Rendered twice: full
        # rows in the buy column, and the same buttons compressed to chips in
        # the sticky bar — one control, one state, two densities. The rows
        # replaced three underlined text marks that read as decoration on a
        # phone; a bordered row with a radio dot and a price is unmistakably
        # a choice.
        def _size_btn(z, i, pad, bar=False):
            # the chip is a third of a phone; "Sample — 2 ml" only fits the row
            name = z["label"] if bar or z["key"] != "sample" else "Sample &mdash; 2 ml"
            return (pad + '<button%s data-size="%s" data-price="%d">'
                    '<span class="szl">%s</span><span class="szp">&pound;%d</span>'
                    '<span class="szi">%s</span></button>'
                    % (' aria-current="true"' if i == 0 else "", z["key"], z["price"],
                       name, z["price"], z["incl"]))
        size_rows = "\n".join(_size_btn(z, i, "        ") for i, z in enumerate(SIZES))
        bar_rows = "\n".join(_size_btn(z, i, "          ", bar=True) for i, z in enumerate(SIZES))
        # The pyramid is the note list Alex supplied, one tier per row. It used
        # to be three invented sensory lines with a second invented line
        # annotating each — six pieces of copy per fragrance, none of it ours,
        # and it disagreed with the Notes accordion further up the same page.
        pyramid = "\n".join(
            f"      <div><b>{a}</b><em>{b}</em></div>"
            for a, b in (("Top", p["top"]), ("Middle", p["mid"]), ("Base", p["base"])))
        paras = "\n".join(f"        <p>{t}</p>" for t in excerpt_paras(ch["paras"]))
        film = STORY_FILM.get(p["slug"])
        filmtag = ('\n      <video class="bandfilm" data-src="%s" muted loop playsinline '
                   'preload="none" aria-hidden="true" tabindex="-1"></video>' % film) if film else ""
        bands = f"""
    <section class="storyband{' hasfilm' if film else ''}">
      <img src="{fp('assets/img/' + p['img'] + '-2.jpg') if len(gal) > 1 else fp('assets/img/unboxing.jpg')}" alt=""{' loading="lazy" fetchpriority="low"' if film else ''}>{filmtag}
      <div class="c">
        <blockquote>&ldquo;{ch['pull']}&rdquo;</blockquote>
        <p>{ch['pullref']} &middot; <a href="story-{p['slug']}.html">Read the full story</a></p>
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
            <a class="btn btn-ghostink" href="story-{p['slug']}.html">Read the full story</a>
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
        <img src="{fp('assets/img/stone-shelf.jpg')}" alt="{p['origin']}, hand-cut" loading="lazy">
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
      <p class="sub"><span class="chip" style="background:{p['swatch']}"></span>{p['origin']} &middot; {p['style']}</p>
      <blockquote>&ldquo;{openline(p)}&hellip;&rdquo; &mdash; nine pages of {p['theme'].lower()}.</blockquote>

      <p class="fieldlabel">Size</p>
      <div class="sizes" role="radiogroup" aria-label="Size">
{size_rows}
      </div>

      <div class="cta">
        <button class="btn btn-ink" data-size="100ml" onclick="addToBag('{p['slug']}',this.dataset.size,this)">Add to bag &mdash; &pound;160</button>
        <button class="btn btn-ghostink applepay" onclick="addToBag('{p['slug']}',document.querySelector('.pdp .cta .btn-ink').dataset.size||'100ml',this)"><svg class="i-apple" viewBox="0 0 384 512" aria-hidden="true" focusable="false"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.931.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg> Apple Pay</button>
      </div>
      <p class="re"><span data-sizeline>Hand-carved stone lid, and the nine printed pages, in the box.</span></p>
      <p class="re">Complimentary UK delivery over &pound;{FREE_GBP} &middot; signed for, two to four working days</p>

      <!-- On a phone the Add button starts below the fold and is gone by the
           second screen. The bar stands in for it whenever the real button is
           not on screen — including on arrival — and carries the size row, so
           changing your mind never means scrolling back up. Its size buttons
           drive the real row; one controller, one state. -->
      <div class="pdpbar" id="pdpbar" hidden>
        <div class="barsizes sizes" role="radiogroup" aria-label="Size">
{bar_rows}
        </div>
        <div class="r">
          <div class="t"><b>{p['name']}</b><span data-barprice>&pound;160 &middot; 100 ml</span></div>
          <button class="btn btn-ink" data-size="100ml" onclick="addToBag('{p['slug']}',this.dataset.size,this)">Add to bag</button>
        </div>
      </div>

      <div class="acc">
            <details open><summary>The story</summary><div class="body">{ch['summary']} <br><br>{p['story']}, in nine pages, printed and boxed with the bottle; the digital edition arrives with your confirmation.</div></details>
            <details><summary>Notes</summary><div class="body"><div class="notelist"><p><b>Top</b><span>{p['top']}</span></p><p><b>Middle</b><span>{p['mid']}</span></p><p><b>Base</b><span>{p['base']}</span></p></div><p class="hint">FILLER &mdash; perfumer to be confirmed.</p></div></details>
            <details><summary>The stone</summary><div class="body">{p['origin']}, hand-cut. Veining is decided by the block, so no two lids repeat. The lid lifts free of the glass and keeps its weight in the hand.</div></details>
            <details><summary>Delivery &amp; returns</summary><div class="body">Complimentary UK delivery over &pound;{FREE_GBP}, otherwise &pound;5. Two to four working days, signed for. FILLER &mdash; returns window to come. Samples are non-returnable.</div></details>
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
    """, current="collection.html", body_attr=f' data-slug="{p["slug"]}"',
        og_image="assets/img/" + p["img"] + "-card.jpg",
        jsonld={
            "@context": "https://schema.org", "@type": "Product",
            "name": p["name"], "brand": {"@type": "Brand", "name": "Side Story Parfums"},
            "description": f"{p['name']} eau de parfum — {p['style']} {p['theme']}.",
            "image": SITE_URL + "/assets/img/" + p["img"] + "-card.jpg",
            "url": canonical_url("product-" + p["slug"]),
            "offers": [{"@type": "Offer", "price": str(z["price"]), "priceCurrency": "GBP",
                        "availability": "https://schema.org/InStock",
                        "url": canonical_url("product-" + p["slug"]) + "?size=" + z["key"]}
                       for z in SIZES]})

    # ---- 04 samples ------------------------------------------------------
    written["samples"] = page("samples", "Samples & The Discovery Set",
        "The Discovery Set — all seven stories in miniature, £38.", f"""
<section class="banner">
  <img src="{fp('assets/img/set-first-lines.jpg')}" alt="The Discovery Set discovery set">
  <div class="c">
    <p class="k">The discovery set</p>
    <h1>The Discovery Set.</h1>
    <p>All seven stories in miniature &mdash; 2ml of each, and the opening page of every one. &pound;38.</p>
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
        <p>Wear one a day for a week, then choose the bottle you keep. A single sample is &pound;5 and arrives the same way, with its opening page.</p>
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
      <div class="tile"><h3>&pound;38 for the set</h3><p>Seven 2ml vials and seven first pages, together in one stone-grey folder.</p></div>
    </div>
  </div>
</section>
""")

    # ---- 05 gifting: removed. The house offers neither gifting nor
    # customisation, nothing has linked here since the nav rename, and a live
    # page selling a service that does not exist is a refund conversation
    # waiting to happen.

    # ---- 06 our house ----------------------------------------------------
    written["our-house"] = page("our-house", "Our Story",
        "It began with sandalwood, and a question about which stories run through a life. Composed in Grasse, sealed under hand-carved marble.", f"""
<section class="banner">
  <img src="{fp('assets/img/founders.jpg')}" alt="The founders in the studio">
  <div class="c">
    <p class="k">Our story</p>
    <h1>It&rsquo;s a story left behind in an elevator, or carried gently on a breeze.</h1>
    <p>The kiss of fragrance on a lapel, in the yellowed pages of a diary, or folded into a handkerchief.</p>
  </div>
</section>

<section class="band">
  <div class="inner">
    {crumbs(("Home", "index.html"), "Our Story")}
    <div class="artgrid">
      <div class="col">
        <p class="dropcap">My childhood memories are tinged with the scent of sandalwood. My grandfather owned plantations in India, which were the source of the soft, balsamic wood my childhood toys and trinkets were made from. Today, sandalwood is my Proustian madeleine: it instantly transports me to another time and place. I&rsquo;m obsessed with sensory experiences like these.</p>
        <p>I thought deeply about the different stories that ran through our lives and how they had impacted our senses, such as work, love, companionships, pleasure, travel. Since then, everything has been about capturing a story in a fragrance, and creating something that would evoke and transport a wearer to their own version of that story.</p>
        <p>Today, each bottle of Side Story perfume begins its journey in Grasse, Provence, and is produced alongside a network of independent artisans. The fragrances are bottled in soda glass and sealed with hand-carved marble lids. Our century-old production facility, farmers, distillers, compounders, stonemasons, label makers, and designers are scattered across the globe.</p>
        <p class="signoff">Rana.</p>
      </div>
      <div class="artaside">
        <p class="marginnote">Seven writers. Seven stones. One perfumer.<small>The house, in short</small></p>
        <p class="marginnote">Every writer is paid a fee and a royalty on the fragrance their story becomes.<small>How we commission</small></p>
      </div>
    </div>
  </div>
</section>

{gift_module(kicker="Our promise", head="We take responsibility",
                 body="Ensuring that the high standards we set for ourselves are maintained, from the craftsmanship behind the bottle and packaging, the balance and sillage of the scents, and to the quality and sustainability of the ingredients. None of these elements are ever compromised.",
                 extras=False, ident="promise")}

{making_section()}

<section class="band" id="stones">
  <div class="inner">
    <p class="k">Why Side Story?</p>
    <h2>Perfumers</h2>
    <p class="lede">Side Story strikes a fine balance between luxury and accessibility that is largely missing in the perfume market.</p>
    <div class="grid-2">
      <figure><img class="figfull" src="{fp('assets/img/stone-shelf.jpg')}" alt="Raw materials and a carved stone lid" loading="lazy"><figcaption class="hint">fine raw materials from Grasse, Provence</figcaption></figure>
      <figure><img class="figfull" src="{fp('assets/img/set-first-lines.jpg')}" alt="The Discovery Set discovery set" loading="lazy"><figcaption class="hint">a more reachable price</figcaption></figure>
    </div>
    <div class="cols cols-2">
      <p>On one hand, we use fine raw materials from Grasse, Provence, and other exceptional sources, and we collaborate with skilled master perfumers such as Jacques Chabert and Argeville who elevate the concept behind each fragrance to a form of high art.</p>
      <p>On the other, each of our &lsquo;stories&rsquo; is meant to resonate with consumers on a universal level and we have consciously decided to price the fragrances at a more reachable price than brands with similarly high manufacturing standards.</p>
    </div>
  </div>
</section>

{spine_section()}
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
        <p>{story_line(q)}</p>
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
    <p>The Discovery Set &mdash; all seven in miniature, &pound;38.</p>
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

{spine_section(q["slug"])}
"""
        written["story-" + q["slug"]] = page(
            "story-" + q["slug"], q["name"],
            f"{q['name']} — the story that became the fragrance. Written by {c['author']}.",
            story_body, current="stories.html")
        # story.html (the old ?s= page) is gone: it was a byte-identical copy
        # of the featured story at a second URL, which is duplicate content.

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
    # FILLER — the postbag ran three invented letters attributed to named
    # members of the public, which is fabricated social proof. Swap in real,
    # permissioned submissions before launch.
    POSTBAG = [
        ("FILLER", "verde", "Lorem ipsum dolor", "FILLER &middot; name to come",
         "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."),
        ("FILLER", "verde", "Sit amet consectetur", "FILLER &middot; name to come",
         "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."),
        ("FILLER", "brass", "Adipiscing elit", "FILLER &middot; name to come",
         "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur."),
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
  <img src="{fp('assets/img/share-hero.jpg')}" alt="Two people either side of a dark table, three bottles standing between them" fetchpriority="high">
  <span class="veil" aria-hidden="true"></span>
  <div class="inner">
    <div class="c">
      <p class="k">Your stories &middot; an open call</p>
      <h1>We base our scents on life&rsquo;s stories and narratives.</h1>
      <p class="lede">Inspire us with yours, and write to us with as much or as little as you wish. A moment in time, an experience, an excerpt to a longer chapter. Those which we can capture into a scent, we will.</p>
      <div class="cta">
        <a class="btn btn-ivory" href="#tellus">Write yours</a>
        <a class="btn btn-ghost" href="#postbag">Read what others sent</a>
      </div>
    </div>
  </div>
</section>

<section class="invite">
  <div class="inner">
    <p class="k">Share your story</p>
    <h2>A fine fragrance tells a story in a whisper, beckoning a listener to come closer.</h2>
    <p>We catch wind of it indirectly: in stolen moments, chance encounters, strokes of serendipity. These side stories stimulate our senses and tease our imaginations. They are the prologues to adventures, romances, and life&rsquo;s little stories. They seduce and enchant, captivate and embolden, promising something not soon forgotten.</p>
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
    <p class="pintro">FILLER &mdash; real, permissioned submissions to come.</p>
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
    <form class="searchbar" role="search" action="search.html" method="get">
      <input type="search" name="q" autocomplete="off" autocapitalize="none" spellcheck="false"
             enterkeyhint="search" placeholder="A fragrance, a feeling, a stone&hellip;" aria-label="Search">
      <button class="btn btn-ink" type="submit">Search</button>
    </form>
    <div class="tagrow">
      <a href="collection.html">All seven</a><a href="collection-samples.html">Samples</a>
      <a href="samples.html">Discovery Sets</a><a href="stories.html">Stories</a>
      <a href="collection.html">Woods</a><a href="collection.html">Citrus</a><a href="collection.html">Incense</a>
    </div>
  </div>
  <div class="srchres pagesearch" id="pagesearchres" hidden></div>
</div>

<section class="band" id="pagesearchidle">
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
        "Your orders and the stories you have unlocked.", f"""
<div class="inner">
  {crumbs(("Home", "index.html"), "Account")}
  <div class="phead"><p class="k">Account &middot; FILLER &mdash; demo preview</p><h1>Welcome back.</h1>
    <p class="lede">FILLER &mdash; the orders and editions below are sample data, shown so the layout can be judged. Accounts arrive with the launch.</p></div>
  <div class="acct">
    <nav class="acctnav" aria-label="Account">
      <a href="account.html" aria-current="page">Orders</a>
      <a href="account.html">Your stories</a>
      <a href="account.html">Addresses</a>
      <a href="account.html">Details</a>
      <a href="index.html">Sign out</a>
    </nav>
    <div>
      <h2 class="sechead">Orders</h2>
      <div class="scrollx">
        <table class="table" role="table">
          <thead><tr role="row"><th role="columnheader" scope="col">Order</th><th role="columnheader" scope="col">Placed</th><th role="columnheader" scope="col">Contents</th><th role="columnheader" scope="col">Status</th><th role="columnheader" scope="col">Total</th></tr></thead>
          <tbody>
            <tr role="row"><td role="cell" data-label="Order">SS-2114</td><td role="cell" data-label="Placed">28 July 2026</td><td role="cell" data-label="Contents">Sunday Service, 100ml</td><td role="cell" data-label="Status">Preparing</td><td role="cell" data-label="Total">&pound;160</td></tr>
            <tr role="row"><td role="cell" data-label="Order">SS-1980</td><td role="cell" data-label="Placed">2 May 2026</td><td role="cell" data-label="Contents">The Discovery Set</td><td role="cell" data-label="Status">Delivered</td><td role="cell" data-label="Total">&pound;38</td></tr>
            <tr role="row"><td role="cell" data-label="Order">SS-1642</td><td role="cell" data-label="Placed">14 February 2026</td><td role="cell" data-label="Contents">Hotel Lobby, 100ml</td><td role="cell" data-label="Status">Delivered</td><td role="cell" data-label="Total">&pound;160</td></tr>
          </tbody>
        </table>
      </div>
      <h2 class="sechead">Your stories</h2>
      <p class="hint">Digital editions unlocked by your orders. They stay in your account whatever happens to the paper.</p>
      <div class="tagrow">
        <a href="story-sunday-service.html">Sunday Service</a>
        <a href="stories.html">Hotel Lobby</a>
        <a href="stories.html">The Discovery Set &mdash; seven openings</a>
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
        <div class="tagrow"><a href="collection.html">See the fragrances</a><a href="samples.html">Begin with samples</a></div>
      </div></div>
    </div>
    <div class="summary">
      <h2 class="vh">Order summary</h2><h3>Summary</h3>
      <div class="srow"><span>Subtotal</span><span id="bagsub">&pound;0</span></div>
      <div class="srow"><span>Delivery</span><span>Complimentary</span></div>
      <div class="srow total"><span>Total</span><span id="bagtotal">&pound;0</span></div>
      <a class="btn btn-ink cta-wide" href="checkout.html">Proceed to checkout</a>
      <p class="re">Tax included &middot; Visa, Mastercard, Amex, Apple Pay</p>
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
      <p class="hint">Payment is handled by our payment processor &mdash; your card details never touch our servers. UK VAT included.</p>
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
    <p class="hint center">A confirmation letter is on its way &middot; arrives Thursday, signed for</p>
    <div class="grid-3">
      <h2 class="vh">What happens next</h2>
      <div class="tile"><h3>Read while you wait</h3><p>The digital edition of your story is already in your account.</p><p><a class="ul" href="stories.html">Read the stories</a></p></div>
      <div class="tile"><h3>Track the parcel</h3><p>We will write again the moment it leaves the bindery.</p><p><a class="ul" href="account.html">See the order</a></p></div>
      <div class="tile"><h3>The digital edition</h3><p>Every story in your parcel, unlocked in your account and sent with your confirmation email.</p></div>
    </div>
  </div>
</section>
""", current="bag.html")

    # ---- 16-20 practical pages -------------------------------------------
    written["shipping"] = page("shipping", "Shipping & Returns",
        "Delivery times, costs and how returns work.", f"""
<div class="inner">
  {crumbs(("Home", "index.html"), "Shipping &amp; Returns")}
  <div class="phead"><p class="k">The practical</p><h1>Shipping &amp; returns.</h1>
    <p class="lede">Everything ships signed-for and without plastic. If a bottle is not for you, thirty days is plenty of time to say so.</p></div>
  <div class="scrollx">
    <table class="table" role="table">
      <thead><tr role="row"><th role="columnheader" scope="col">Destination</th><th role="columnheader" scope="col">Service</th><th role="columnheader" scope="col">Time</th><th role="columnheader" scope="col">Cost</th></tr></thead>
      <tbody>
        <tr role="row"><td role="cell" data-label="Destination">United Kingdom</td><td role="cell" data-label="Service">Tracked, signed for</td><td role="cell" data-label="Time">2&ndash;4 working days</td><td role="cell" data-label="Cost">&pound;5, complimentary over &pound;{FREE_GBP}</td></tr>
        <tr role="row"><td role="cell" data-label="Destination">Ireland &amp; EU</td><td role="cell" data-label="Service">Tracked, duties paid</td><td role="cell" data-label="Time">4&ndash;7 working days</td><td role="cell" data-label="Cost">&pound;12, complimentary over &pound;180</td></tr>
        <tr role="row"><td role="cell" data-label="Destination">United States</td><td role="cell" data-label="Service">Tracked, duties paid</td><td role="cell" data-label="Time">5&ndash;8 working days</td><td role="cell" data-label="Cost">&pound;18</td></tr>
        <tr role="row"><td role="cell" data-label="Destination">Rest of world</td><td role="cell" data-label="Service">Tracked</td><td role="cell" data-label="Time">7&ndash;14 working days</td><td role="cell" data-label="Cost">From &pound;22</td></tr>
      </tbody>
    </table>
  </div>
  <div class="acc">
    <details open><summary>Returns</summary><div class="body">FILLER &mdash; returns window to come. Unopened bottles may be returned for a full refund. Email contact@sidestoryparfums.com and we send a prepaid label. Refunds are issued to the original payment method within five working days of arrival.</div></details>
    <details><summary>Samples</summary><div class="body">Samples and The Discovery Set are not returnable, for reasons we hope are obvious.</div></details>
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
  <!-- FILLER: the five stockists here were invented — real department stores,
       no actual relationship. Swap in the true list before launch. -->
  <div class="grid-3">
    <h2 class="vh">Where to find us</h2>
      <div class="tile"><h3>FILLER &mdash; stockist to come</h3><p>Lorem ipsum dolor sit amet<br>Consectetur adipiscing elit</p></div>
    <div class="tile"><h3>FILLER &mdash; stockist to come</h3><p>Lorem ipsum dolor sit amet<br>Consectetur adipiscing elit</p></div>
    <div class="tile"><h3>FILLER &mdash; stockist to come</h3><p>Lorem ipsum dolor sit amet<br>Consectetur adipiscing elit</p></div>
  </div>
  <div class="grid-3">
    <div class="tile"><h3>FILLER &mdash; stockist to come</h3><p>Lorem ipsum dolor sit amet<br>Consectetur adipiscing elit</p></div>
    <div class="tile"><h3>FILLER &mdash; stockist to come</h3><p>Lorem ipsum dolor sit amet<br>Consectetur adipiscing elit</p></div>
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
        <select><option>An order</option><option>A return</option><option>Stockists &amp; press</option><option>Something else</option></select></label>
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
  <div class="acc narrow qa">
    <details open><summary>Is the story really written first?</summary><div class="body">Yes, and it is the whole point. A novelist is commissioned and paid before any brief goes to Grasse. The perfumer works to the finished pages &mdash; the hour of day in them, the room, the weather &mdash; not to a mood board.</div></details>
    <details><summary>What arrives in the box?</summary><div class="body">A 100ml arrives under its hand-carved stone lid, with the story printed on cotton paper in an edition matched to the run, and a 2ml sample of a second story. The 7.5ml and the samples arrive in a printed sleeve &mdash; no carved lid and no booklet at those sizes. No plastic anywhere in the parcel.</div></details>
    <details><summary>Are the lids really all different?</summary><div class="body">Every lid is cut from a block chosen for its seam. We do not select for consistency or correct the veining, so no two repeat. We do not engrave or mark them.</div></details>
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
      <p>Prices include UK VAT and are shown in pounds sterling. A contract is formed when we email to say the parcel has shipped. FILLER &mdash; returns window to come. Unopened bottles may be returned; samples are not returnable.</p>
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

    # ---- robots + sitemap ------------------------------------------------
    # Generated from what was actually written, so a page cannot ship without
    # appearing here or appear here without shipping. Checkout-flow and
    # account pages are crawlable dead weight and are kept out.
    PRIVATE = {"bag", "checkout", "confirmation", "account", "404", "search"}
    # search stays crawlable — the home page's SearchAction points at it —
    # it just does not belong in the sitemap
    with open(os.path.join(ROOT, "robots.txt"), "w") as f:
        f.write("User-agent: *\n"
                + "".join(f"Disallow: /{p}\n" for p in sorted(PRIVATE - {"search"}))
                + f"Sitemap: {SITE_URL}/sitemap.xml\n")
    with open(os.path.join(ROOT, "sitemap.xml"), "w") as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n'
                '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                + "".join(f"  <url><loc>{canonical_url(k)}</loc></url>\n"
                          for k in sorted(written) if k not in PRIVATE)
                + "</urlset>\n")

    return written


if __name__ == "__main__":
    w = build()
    for k in sorted(w):
        print(f"  {k+'.html':22} {w[k]:>7,} bytes")
    print(f"\n{len(w)} pages written")
