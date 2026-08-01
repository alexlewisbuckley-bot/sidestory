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

# Explicit subject boxes, normalised (x0, y0, x1, y1), for masters where the
# detector misreads — a bright fold in the backdrop next to a pale bottle. Three
# out of eighteen; measuring them by eye once is more honest than tuning a
# heuristic until it happens to agree.
MANUAL = {
    "pillow-talk-bottle":  (0.437, 0.330, 0.567, 0.690),
    "third-date-bottle":   (0.437, 0.325, 0.567, 0.685),
    "road-trip-bottle":    (0.443, 0.295, 0.560, 0.640),
}

TIGHT = dict(subject_h=0.58, pad_x=1.30, top_bias=0.50)  # margin enough that an under-read box never clips the cap or base
LOOSE = dict(subject_h=0.72, pad_x=1.16, top_bias=0.48)
# Card frames leave the lower third of the image clear, because the quick-add
# panel slides up over it on hover and must not cover the bottle.
CARD  = dict(subject_h=0.40, pad_x=2.4,  top_bias=0.34)
MIN_SUBJECT = 0.30


def _blur(arr, r):
    return np.asarray(Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
                      .filter(ImageFilter.GaussianBlur(r))).astype(np.float32)


def subject_box(im):
    """
    Locate the object in a studio frame.

    Two things defeat a global background here: the backdrop is lit with a
    vertical gradient, and there is a horizon where the wall meets the table.
    Both vanish if the background is estimated *per row* from that row's own
    left and right margins — a wall row is compared against wall, a table row
    against table. The object is then the only strong residual.

    Extents are taken at the 1st/99th percentile of the mask so a stray fibre
    or a soft shadow edge cannot stretch the box.
    """
    W, H = im.size
    a = np.asarray(im).astype(np.float32)

    m = max(16, int(W * 0.08))
    margins = np.concatenate([a[:, :m], a[:, -m:]], axis=1)   # H x 2m x 3
    bg = np.median(margins, axis=1)[:, None, :]               # H x 1 x 3
    diff = _blur(np.abs(a - bg).max(axis=2), max(2, W // 400))

    floor = float(np.percentile(np.abs(margins - bg).max(axis=2), 99))
    mask = diff > max(floor * 1.8, 9)

    # In every master the product stands in the middle of the frame. Confining
    # the search to the central band and away from the top edge stops a bright
    # patch of wall from being mistaken for it — the one failure mode left.
    band = np.zeros_like(mask)
    band[int(H * 0.10):int(H * 0.94), int(W * 0.22):int(W * 0.78)] = True
    mask &= band

    ys, xs = np.nonzero(mask)
    if len(xs) < mask.size * 0.001:
        return 0.32 * W, 0.28 * H, 0.68 * W, 0.72 * H

    x0, x1 = float(np.percentile(xs, 1)), float(np.percentile(xs, 99))
    y0, y1 = float(np.percentile(ys, 1)), float(np.percentile(ys, 99))
    if (x1 - x0) < W * 0.04 or (y1 - y0) < H * 0.04:
        return 0.32 * W, 0.28 * H, 0.68 * W, 0.72 * H
    return x0, y0, x1, y1


MODES = {"tight": TIGHT, "loose": LOOSE, "card": CARD}


def square_crop(path, out, mode="tight", size=1000):
    cfg = MODES.get(mode, TIGHT)
    im = Image.open(path).convert("RGB")
    W, H = im.size
    key = os.path.splitext(os.path.basename(path))[0]
    if key in MANUAL:
        a, b, c, d = MANUAL[key]
        x0, y0, x1, y1 = a * W, b * H, c * W, d * H
    else:
        x0, y0, x1, y1 = subject_box(im)
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
