#!/usr/bin/env python3
"""
Side Story — photography pipeline.

Derives every image the site uses from the masters in assets/photos-src/.
Nothing in assets/img/ is hand-edited; re-run this after a shoot and the whole
site updates.

    python3 tools/photos.py            # write assets/img/*
    python3 tools/photos.py --debug    # also write a contact sheet

Bottle shots are studio frames with a great deal of paper mat around a small
object, so each is cropped square around the detected subject. Packshots (the
outer carton, the open box) are cropped more loosely — the composition is the
point in those, not the bottle alone.
"""
import os, sys
import numpy as np
try:
    import pillow_avif  # noqa: F401  — registers the AVIF encoder with Pillow
except ImportError:
    pillow_avif = None
from PIL import Image, ImageFilter

# Responsive derivatives. Every raster the site shows is emitted at three widths
# in AVIF and WebP alongside the JPEG, so a phone is never sent a 1800px plate.
# The JPEG stays as the last fallback; <picture> picks the rest.
WIDTHS = (480, 960, 1600)


def derivatives(path):
    """Write width variants of `path` in avif/webp beside it. Returns a manifest."""
    im = Image.open(path).convert("RGB")
    base, _ = os.path.splitext(path)
    out = {"w": im.size[0], "h": im.size[1], "avif": [], "webp": [], "jpg": []}
    for w in WIDTHS:
        if w > im.size[0] * 1.02:      # never upscale
            continue
        r = im if w == im.size[0] else im.resize(
            (w, round(w * im.size[1] / im.size[0])), Image.LANCZOS)
        for fmt, q in (("avif", 52), ("webp", 74), ("jpg", 82)):
            if fmt == "avif" and pillow_avif is None:
                continue
            f = "%s-%d.%s" % (base, w, fmt)
            if fmt == "jpg":
                r.save(f, quality=q, optimize=True, progressive=True)
            else:
                r.save(f, quality=q)
            out[fmt].append((w, os.path.basename(f)))
    return out

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets/photos-src")
OUT = os.path.join(ROOT, "assets/img")

# slug -> ordered gallery. The first entry is the card and PDP hero image.
# `tight` fills the frame with the subject; `loose` keeps the composition.
PRODUCTS = {
    "hotel-lobby":     [("hotel-lobby-bottle", "tight"), ("hotel-lobby-open", "loose"),
                        ("hotel-lobby-box", "loose"),   ("hotel-lobby-group", "loose")],
    "sibling-rivalry": [("sibling-rivalry-bottle", "tight")],
    "pillow-talk":     [("pillow-talk-bottle", "tight")],
    "sunday-service":  [("sunday-service-bottle", "tight"), ("sunday-service-open", "loose"),
                        ("sunday-service-box", "loose")],
    "third-date":      [("third-date-bottle", "tight")],
    "road-trip":       [("road-trip-bottle", "tight"), ("road-trip-open", "loose"),
                        ("road-trip-box", "loose"),    ("road-trip-detail", "loose")],
    "4pm-matinee":     [("4pm-matinee-bottle", "tight")],
}

# editorial images, kept at their own aspect
EDITORIAL = [
    ("hero-flatlay",    "hero.jpg",           1800, None),
    ("our-story-lead",  "founders.jpg",       1600, None),
    ("our-story-ledge", "stone-shelf.jpg",    1800, None),
    ("hotel-lobby-open", "unboxing.jpg",      1400, None),
    ("hotel-lobby-group", "set-first-lines.jpg", 1200, None),
    ("road-trip-detail", "spine.jpg",         1200, None),
    ("sunday-service-open", "plants.jpg",     1200, None),
    # supplied at 1950 wide and used full-bleed behind the open call, so it
    # keeps its own width rather than being pulled down to the 1200 the
    # smaller editorial plates use
    ("share-hero",      "share-hero.jpg",     1950, None),
]

# Story plates. Supplied editorial photography, one per fragrance, used
# full-bleed under the story title and as the 5:3 card on the Your Stories
# index. Kept at their own aspect and only downscaled — never cropped here,
# because the crop is a layout decision the CSS makes per placement.
STORY = ["hotel-lobby", "sibling-rivalry", "pillow-talk", "sunday-service",
         "third-date", "road-trip", "4pm-matinee"]

# The 7.5ml packs. Six frames from one set-up, the pack small and centred in a
# 1512x1008 frame. Boxes below were measured against a blurred background model
# — the saturation detector is built for a coloured bottle on paper and cannot
# see a white box on a white backdrop. Values are fractions of the frame.
# One box for all six, not six measured boxes. They are frames from a single
# set-up with the pack in the same place, so per-image detection only
# introduces the differences it thinks it sees — a lighter inner sleeve reads
# as a wider pack — and the cards then sit at visibly different scales. This
# is the median of the six measurements, and it makes them a set.
PACK_BOX = (0.432, 0.344, 0.549, 0.655)
SEVENFIVE = {slug: PACK_BOX for slug in
             ("hotel-lobby", "pillow-talk", "sunday-service",
              "third-date", "road-trip", "4pm-matinee")}
# The pack is only about a third of the frame, so a tight square would have to
# be small. The card takes the tight crop where 296px is plenty; the product
# page takes a looser one so it still holds up on a 2x screen.
PACK_CARD = dict(subject_h=0.46, pad_x=2.4, top_bias=0.46)
PACK_MAIN = dict(subject_h=0.34, pad_x=3.2, top_bias=0.50)

# The 2ml sample cartons. Shot filling the frame, where the bottles and the
# 7.5ml packs were shot small in it — so a straight square crop would put the
# sample at 78% of the card against the bottle's 46%, and the shelf would stop
# reading as a set. The backdrop is a smooth paper sweep, so the frame is
# extended above and below by replicating its own edge rows before cropping.
# That is the only way to make the two shoots agree without faking a
# background: nothing is painted, the sweep is simply continued.
SAMPLE_BOX = (0.380, 0.191, 0.573, 0.940)
SAMPLES = ("hotel-lobby", "pillow-talk", "sunday-service", "third-date", "road-trip")
SAMPLE_FILL = 0.56          # carton height as a fraction of the square


def extend_sweep(im, need_top, need_bottom):
    """Continue a smooth paper sweep past the top and bottom of the frame.

    The edge rows are taken from a horizontally softened copy, not from the
    frame itself: repeating a literal row repeats its per-column paper fibre
    too, and that reads as vertical streaking down the extension. Softening
    across the row first leaves only the sweep's own tone."""
    W, H = im.size
    a = np.asarray(im).astype(np.float32)
    soft = np.asarray(im.filter(ImageFilter.GaussianBlur(28))).astype(np.float32)
    parts = []
    if need_top > 0:
        parts.append(soft[0:1].repeat(need_top, axis=0))
    parts.append(a)
    if need_bottom > 0:
        parts.append(soft[H - 1:H].repeat(need_bottom, axis=0))
    out = np.concatenate(parts, axis=0)
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def sample_crop(path, out, size):
    im = Image.open(path).convert("RGB")
    W, H = im.size
    x0, y0, x1, y1 = (SAMPLE_BOX[0] * W, SAMPLE_BOX[1] * H,
                      SAMPLE_BOX[2] * W, SAMPLE_BOX[3] * H)
    side = round((y1 - y0) / SAMPLE_FILL)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    top = round(cy - side * 0.44)
    left = round(min(max(0, cx - side / 2), max(0, W - side)))
    need_top = max(0, -top)
    need_bottom = max(0, top + side - H)
    canvas = extend_sweep(im, need_top, need_bottom)
    crop = canvas.crop((left, top + need_top, left + side, top + need_top + side))
    native = crop.size[0]
    target = min(size, native)
    if native != target:
        crop = crop.resize((target, target), Image.LANCZOS)
    crop.save(out, quality=92, optimize=True, progressive=True, subsampling=0)
    return crop.size


# Packshots (open box, outer carton) vary in composition and keep the detector.
MANUAL = {}

TIGHT = dict(subject_h=0.62, pad_x=1.25, top_bias=0.50)
LOOSE = dict(subject_h=0.72, pad_x=1.16, top_bias=0.48)
# Card frames leave the lower third of the image clear, because the quick-add
# panel slides up over it on hover and must not cover the bottle.
CARD  = dict(subject_h=0.46, pad_x=2.1,  top_bias=0.38)
# The product page has no panel rising over the image, so the bottle sits in the
# middle of the frame there. Same crop size as the card, so the same detail.
HERO  = dict(subject_h=0.46, pad_x=2.1,  top_bias=0.50)
# The subject boxes are reliable now, so the old width floor is not only
# unnecessary but harmful: it inflated the crop for the narrow-bottle masters
# and made those cards read smaller than the rest.
MIN_SUBJECT = 0.0


def _blur(arr, r):
    return np.asarray(Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
                      .filter(ImageFilter.GaussianBlur(r))).astype(np.float32)


def subject_box(im):
    """
    Locate the object in a studio frame.

    The backdrop is neutral paper — near-zero saturation — and it is the only
    neutral thing in the frame. Every bottle is coloured liquid under a stone
    cap. So saturation alone separates them, and unlike a brightness or
    edge-energy test it is completely immune to the lighting gradient and the
    wall/table horizon that defeated the earlier attempts. Darkness is unioned
    in for the near-white caps, and the search is confined to the middle of the
    frame where the product always stands.

    Measured this way the seven bottle masters agree to within 2.5% of frame
    height, which is what makes the cards read as a set.
    """
    W, H = im.size
    hsv = np.asarray(im.convert("HSV")).astype(np.float32)
    sat, val = hsv[..., 1], hsv[..., 2]
    paper = float(np.percentile(val, 80))

    mask = (sat > 38) | (val < paper - 42)
    core = np.zeros_like(mask)
    core[int(H * 0.10):int(H * 0.96), int(W * 0.30):int(W * 0.70)] = True
    mask &= core

    ys, xs = np.nonzero(mask)
    if len(xs) < 200:
        return 0.32 * W, 0.28 * H, 0.68 * W, 0.72 * H
    x0, x1 = np.percentile(xs, [0.5, 99.5])
    y0, y1 = np.percentile(ys, [0.5, 99.5])
    if (x1 - x0) < W * 0.02 or (y1 - y0) < H * 0.04:
        return 0.32 * W, 0.28 * H, 0.68 * W, 0.72 * H
    return float(x0), float(y0), float(x1), float(y1)


MODES = {"tight": TIGHT, "loose": LOOSE, "card": CARD, "hero": HERO,
         "pack-card": PACK_CARD, "pack-main": PACK_MAIN}


def square_crop(path, out, mode="tight", size=1000):
    cfg = MODES.get(mode, TIGHT)
    im = Image.open(path).convert("RGB")
    W, H = im.size
    key = os.path.splitext(os.path.basename(path))[0]
    if key in MANUAL:
        a, b, c, d = MANUAL[key]
    else:
        a = b = c = d = None
    if a is None:
        x0, y0, x1, y1 = subject_box(im)
    else:
        x0, y0, x1, y1 = a * W, b * H, c * W, d * H
    sw, sh = x1 - x0, y1 - y0
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2

    side = max(sh / cfg["subject_h"], sw * cfg["pad_x"])
    side = min(side, W, H)
    left = min(max(0, cx - side / 2), W - side)
    top = min(max(0, cy - side * cfg["top_bias"]), H - side)

    crop = im.crop((round(left), round(top), round(left + side), round(top + side)))
    # Never upscale. Enlarging a crop past its native pixels adds softness and no
    # detail — that is what made the product images look blurry. Downscale to the
    # target when the crop is larger, otherwise ship it at native size.
    native = crop.size[0]
    target = min(size, native)
    if native != target:
        crop = crop.resize((target, target), Image.LANCZOS)
    crop.save(out, quality=92, optimize=True, progressive=True, subsampling=0)
    return crop.size


def wide(path, out, width):
    im = Image.open(path).convert("RGB")
    if im.size[0] != width:
        im = im.resize((width, round(width * im.size[1] / im.size[0])), Image.LANCZOS)
    im.save(out, quality=84, optimize=True, progressive=True)
    return im.size


def manifest():
    """slug -> list of image filenames, for the site builder."""
    return {slug: [f"p-{slug}-{i+1}.jpg" for i in range(len(shots))]
            for slug, shots in PRODUCTS.items()}


if __name__ == "__main__":
    debug = "--debug" in sys.argv
    tiles = []
    for slug, shots in PRODUCTS.items():
        for i, (src, mode) in enumerate(shots):
            p = os.path.join(SRC, src + ".jpg")
            if not os.path.exists(p):
                print(f"  ! missing master {src}.jpg"); continue
            o = os.path.join(OUT, f"p-{slug}-{i+1}.jpg")
            square_crop(p, o, mode, 1600)
            print(f"  p-{slug}-{i+1}.jpg".ljust(30) +
                  f"{mode:5}  {round(os.path.getsize(o)/1024)}KB   <- {src}.jpg")
            if i == 0:
                for m, tgt in (("card", 1200), ("hero", 1400)):
                    om = os.path.join(OUT, f"p-{slug}-{m}.jpg")
                    square_crop(p, om, m, tgt)
                    print(f"  p-{slug}-{m}.jpg".ljust(30) +
                          f"{m:5}  {round(os.path.getsize(om)/1024)}KB   <- {src}.jpg")
            if debug:
                t = Image.open(o).copy(); t.thumbnail((240, 240)); tiles.append(t)
                if i == 0:
                    t2 = Image.open(os.path.join(OUT, f"p-{slug}-card.jpg")).copy()
                    t2.thumbnail((240, 240)); tiles.append(t2)
    for slug in SAMPLES:
        q = os.path.join(SRC, slug + "-sample.jpg")
        if not os.path.exists(q):
            print("  - no sample carton for %s yet" % slug); continue
        for name, tgt in (("p-%s-sample-card.jpg" % slug, 900),
                          ("p-%s-sample.jpg" % slug, 1200)):
            o = os.path.join(OUT, name)
            size = sample_crop(q, o, tgt)
            print(("  " + name).ljust(30) + "%dx%d  %dKB   <- %s-sample.jpg"
                  % (size[0], size[1], round(os.path.getsize(o) / 1024), slug))
    for slug, box in SEVENFIVE.items():
        q = os.path.join(SRC, slug + "-75.jpg")
        if not os.path.exists(q):
            print("  - no 7.5ml pack for %s yet" % slug); continue
        MANUAL[slug + "-75"] = box
        for mode, name, tgt in (("pack-card", "p-%s-75-card.jpg" % slug, 900),
                                ("pack-main", "p-%s-75.jpg" % slug, 1200)):
            o = os.path.join(OUT, name)
            size = square_crop(q, o, mode, tgt)
            print(("  " + name).ljust(30) + "%dx%d  %dKB   <- %s-75.jpg"
                  % (size[0], size[1], round(os.path.getsize(o) / 1024), slug))
    for slug in STORY:
        q = os.path.join(SRC, slug + "-story.jpg")
        if not os.path.exists(q):
            print("  - no story plate for %s yet" % slug); continue
        size = wide(q, os.path.join(OUT, "story-%s.jpg" % slug), 1800)
        print(("  story-%s.jpg" % slug).ljust(30) +
              "%dx%d  %dKB   <- %s-story.jpg"
              % (size[0], size[1],
                 round(os.path.getsize(os.path.join(OUT, "story-%s.jpg" % slug)) / 1024), slug))
    for src, name, w, _ in EDITORIAL:
        p = os.path.join(SRC, src + ".jpg")
        if not os.path.exists(p):
            print(f"  ! missing master {src}.jpg"); continue
        size = wide(p, os.path.join(OUT, name), w)
        print(f"  {name:30}{size[0]}x{size[1]}  "
              f"{round(os.path.getsize(os.path.join(OUT, name))/1024)}KB   <- {src}.jpg")
    # ---- responsive derivatives + a manifest the builder can read ----------
    import json
    man = {}
    for f in sorted(os.listdir(OUT)):
        if not f.lower().endswith((".jpg", ".jpeg")):
            continue
        if any(("-%d." % w) in f for w in WIDTHS):
            continue                              # already a derivative
        d = derivatives(os.path.join(OUT, f))
        man[f] = d
    with open(os.path.join(ROOT, "assets/img/manifest.json"), "w") as fh:
        json.dump(man, fh, indent=0, sort_keys=True)
    n_av = sum(len(v["avif"]) for v in man.values())
    n_wb = sum(len(v["webp"]) for v in man.values())
    print("  %d masters -> %d avif + %d webp + %d jpg derivatives"
          % (len(man), n_av, n_wb, sum(len(v["jpg"]) for v in man.values())))

    if debug and tiles:
        cols = 6
        rows = (len(tiles) + cols - 1) // cols
        cw = max(t.size[0] for t in tiles) + 8
        ch = max(t.size[1] for t in tiles) + 8
        sheet = Image.new("RGB", (cw * cols, ch * rows), (255, 255, 255))
        for i, t in enumerate(tiles):
            sheet.paste(t, ((i % cols) * cw + 4, (i // cols) * ch + 4))
        sheet.save("/home/claude/photos.png")
        print("  contact sheet -> /home/claude/photos.png")
