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
from PIL import Image, ImageFilter

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
]

# Packshots (open box, outer carton) vary in composition and keep the detector.
MANUAL = {}

TIGHT = dict(subject_h=0.62, pad_x=1.25, top_bias=0.50)
LOOSE = dict(subject_h=0.72, pad_x=1.16, top_bias=0.48)
# Card frames leave the lower third of the image clear, because the quick-add
# panel slides up over it on hover and must not cover the bottle.
CARD  = dict(subject_h=0.46, pad_x=2.1,  top_bias=0.38)
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


MODES = {"tight": TIGHT, "loose": LOOSE, "card": CARD}


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
    crop = crop.resize((size, size), Image.LANCZOS)
    crop.save(out, quality=86, optimize=True, progressive=True)
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
            square_crop(p, o, mode, 1000)
            print(f"  p-{slug}-{i+1}.jpg".ljust(30) +
                  f"{mode:5}  {round(os.path.getsize(o)/1024)}KB   <- {src}.jpg")
            if i == 0:
                oc = os.path.join(OUT, f"p-{slug}-card.jpg")
                square_crop(p, oc, "card", 900)
                print(f"  p-{slug}-card.jpg".ljust(30) +
                      f"card   {round(os.path.getsize(oc)/1024)}KB   <- {src}.jpg")
            if debug:
                t = Image.open(o).copy(); t.thumbnail((240, 240)); tiles.append(t)
                if i == 0:
                    t2 = Image.open(os.path.join(OUT, f"p-{slug}-card.jpg")).copy()
                    t2.thumbnail((240, 240)); tiles.append(t2)
    for src, name, w, _ in EDITORIAL:
        p = os.path.join(SRC, src + ".jpg")
        if not os.path.exists(p):
            print(f"  ! missing master {src}.jpg"); continue
        size = wide(p, os.path.join(OUT, name), w)
        print(f"  {name:30}{size[0]}x{size[1]}  "
              f"{round(os.path.getsize(os.path.join(OUT, name))/1024)}KB   <- {src}.jpg")
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
