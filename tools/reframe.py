#!/usr/bin/env python3
"""
Reframe the product photography so the bottle is the subject.

The originals are studio shots with a great deal of paper mat around a small
object; at card size the bottle was a detail rather than the point. This finds
the subject, then writes a 4:5 crop in which it occupies roughly two thirds of
the frame height and sits slightly above the optical centre.

    python3 tools/reframe.py           # writes assets/img/p-*-r.jpg
    python3 tools/reframe.py --debug   # also writes a contact sheet
"""
import os, sys
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

IMG = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets/img")
ASPECT = 4 / 5          # portrait, w/h
SUBJECT_H = 0.66        # subject height as a share of the crop
SUBJECT_TOP_BIAS = 0.46 # subject centre sits slightly above the crop centre
MIN_SUBJECT = 0.42      # never trust a detection smaller than this share of the frame


def _blur(arr, r):
    return np.asarray(Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
                      .filter(ImageFilter.GaussianBlur(r))).astype(np.float32)


def subject_box(im):
    """Union of a colour-difference mask and an edge-energy mask, largest blob."""
    W, H = im.size
    a = np.asarray(im).astype(np.float32)
    edge = np.concatenate([a[:20].reshape(-1, 3), a[-20:].reshape(-1, 3),
                           a[:, :20].reshape(-1, 3), a[:, -20:].reshape(-1, 3)])
    bg = np.median(edge, axis=0)
    noise = np.median(np.abs(edge - bg).max(axis=1))
    colour = _blur(np.abs(a - bg).max(axis=2), 5) > max(noise * 2.4, 11)

    g = np.asarray(im.convert("L").filter(ImageFilter.GaussianBlur(1.0))).astype(np.float32)
    gy, gx = np.gradient(g)
    en = _blur(np.hypot(gx, gy), 5)
    grain = np.median(np.concatenate([en[:20].ravel(), en[-20:].ravel(),
                                      en[:, :20].ravel(), en[:, -20:].ravel()]))
    m = colour | (en > max(grain * 2.6, 2.5))

    b = 16
    hh, ww = H // b, W // b
    blocks = m[:hh * b, :ww * b].reshape(hh, b, ww, b).mean(axis=(1, 3)) > 0.42

    lab = np.zeros_like(blocks, dtype=np.int32)
    cur, best = 0, (0, None)
    for sy in range(blocks.shape[0]):
        for sx in range(blocks.shape[1]):
            if blocks[sy, sx] and lab[sy, sx] == 0:
                cur += 1
                stack, n = [(sy, sx)], 0
                lab[sy, sx] = cur
                while stack:
                    y, x = stack.pop(); n += 1
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < blocks.shape[0] and 0 <= nx < blocks.shape[1] \
                           and blocks[ny, nx] and lab[ny, nx] == 0:
                            lab[ny, nx] = cur; stack.append((ny, nx))
                if n > best[0]:
                    best = (n, cur)
    if not best[1]:
        return 0.25 * W, 0.25 * H, 0.75 * W, 0.75 * H
    ys, xs = np.where(lab == best[1])
    x0, y0 = float(xs.min() * b), float(ys.min() * b)
    x1, y1 = float(min((xs.max() + 1) * b, W)), float(min((ys.max() + 1) * b, H))

    # Detection under-reads pale objects against pale paper. Grow the box about
    # its own centre until it is at least MIN_SUBJECT of the frame, so a missed
    # edge cannot produce an over-tight crop.
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    w, h = max(x1 - x0, W * MIN_SUBJECT), max(y1 - y0, H * MIN_SUBJECT)
    return cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2


def reframe(path, out):
    im = Image.open(path).convert("RGB")
    W, H = im.size
    x0, y0, x1, y1 = subject_box(im)
    sw, sh = x1 - x0, y1 - y0
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2

    # crop sized so the subject fills SUBJECT_H of it, wide enough for the subject too
    ch = sh / SUBJECT_H
    cw = max(ch * ASPECT, sw * 1.22)
    ch = max(ch, cw / ASPECT)
    cw = ch * ASPECT

    # clamp to the source, keeping the aspect
    if cw > W: cw = W; ch = cw / ASPECT
    if ch > H: ch = H; cw = ch * ASPECT

    left = cx - cw / 2
    top = cy - ch * SUBJECT_TOP_BIAS
    left = max(0, min(left, W - cw))
    top = max(0, min(top, H - ch))

    crop = im.crop((round(left), round(top), round(left + cw), round(top + ch)))
    # a modest upscale keeps the card crisp on 2x screens without inventing detail
    target_w = 900
    if crop.size[0] < target_w:
        crop = crop.resize((target_w, round(target_w / ASPECT)), Image.LANCZOS)
    crop.save(out, quality=86, optimize=True, progressive=True)
    return crop.size, (round(left), round(top), round(cw), round(ch)), (W, H)


if __name__ == "__main__":
    debug = "--debug" in sys.argv
    tiles = []
    for f in sorted(os.listdir(IMG)):
        if not (f.startswith("p-") and f.endswith(".jpg")) or f.endswith("-r.jpg"):
            continue
        out = os.path.join(IMG, f[:-4] + "-r.jpg")
        size, box, src = reframe(os.path.join(IMG, f), out)
        print(f"  {f:26} {src[0]}x{src[1]} -> crop {box[2]}x{box[3]} at {box[0]},{box[1]}"
              f"  -> {size[0]}x{size[1]}  {round(os.path.getsize(out)/1024)}KB")
        if debug:
            t = Image.open(out).copy(); t.thumbnail((300, 400)); tiles.append(t)
    if debug and tiles:
        cols = 4; rows = (len(tiles) + cols - 1) // cols
        w = max(t.size[0] for t in tiles) + 10; h = max(t.size[1] for t in tiles) + 10
        sheet = Image.new("RGB", (w * cols, h * rows), (255, 255, 255))
        for i, t in enumerate(tiles):
            sheet.paste(t, ((i % cols) * w + 5, (i // cols) * h + 5))
        sheet.save("/home/claude/reframed.png")
        print("  contact sheet -> /home/claude/reframed.png")
