"""
Icon builder. Run: python3 tools/build-icons.py [concept]
Draws the Stringline mark at 4x and downsamples for clean edges.
Outputs App Store, PWA, Apple touch and favicon sizes into assets/img.
"""
import sys
from PIL import Image, ImageDraw

K = 4
S = 1024 * K
NAVY_TOP = (44, 60, 98)
NAVY_BOT = (27, 36, 62)
BRICK = (205, 86, 52)
BRICK_HI = (235, 128, 92)
BRICK_LO = (160, 58, 32)
BRICK_EDGE = (112, 38, 20)
GOLD = (255, 200, 61)
GOLD_DK = (201, 138, 11)
INK = (18, 24, 42)


def background(size, top=NAVY_TOP, bot=NAVY_BOT):
    img = Image.new("RGB", (size, size))
    d = ImageDraw.Draw(img)
    for y in range(size):
        t = y / (size - 1)
        d.line([(0, y), (size, y)], fill=tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3)))
    return img


def brick(d, x0, y0, x1, y1, s):
    r = int(16 * s)
    d.rounded_rectangle([x0, y0, x1, y1], radius=r, fill=BRICK_EDGE)
    e = int(7 * s)
    d.rounded_rectangle([x0 + e, y0 + e, x1 - e, y1 - e], radius=r - e // 2, fill=BRICK)
    band = int((y1 - y0) * 0.2)
    d.rounded_rectangle([x0 + e * 2, y0 + e * 2, x1 - e * 2, y0 + e * 2 + band], radius=int(8 * s), fill=BRICK_HI)
    d.rounded_rectangle([x0 + e * 2, y1 - e * 2 - int(band * 0.8), x1 - e * 2, y1 - e * 2], radius=int(8 * s), fill=BRICK_LO)


def line(d, x0, x1, y, s, blocks=True):
    w = int(14 * s)
    d.rounded_rectangle([x0, y - w // 2 - int(5 * s), x1, y + w // 2 + int(5 * s)], radius=w, fill=INK)
    d.rounded_rectangle([x0, y - w // 2, x1, y + w // 2], radius=w // 2, fill=GOLD)
    if blocks:
        bw, bh = int(46 * s), int(70 * s)
        for bx in (x0 - bw // 2, x1 - bw // 2):
            d.rounded_rectangle([bx - int(6 * s), y - bh // 2 - int(6 * s), bx + bw + int(6 * s), y + bh // 2 + int(6 * s)], radius=int(14 * s), fill=INK)
            d.rounded_rectangle([bx, y - bh // 2, bx + bw, y + bh // 2], radius=int(10 * s), fill=GOLD)
            d.rectangle([bx, y + bh // 2 - int(16 * s), bx + bw, y + bh // 2], fill=GOLD_DK)


def concept_a(size):
    """Running-bond pyramid 3-2-1, the line pulled level across the top course."""
    s = size / 1024
    img = background(size)
    d = ImageDraw.Draw(img)
    L, H, G = 196 * s, 104 * s, 20 * s
    width = 3 * L + 2 * G
    total_h = 3 * H + 2 * G
    x_left = (size - width) / 2
    y_bottom = size / 2 + total_h / 2 + 40 * s
    for row, n in enumerate([3, 2, 1]):
        y1 = y_bottom - row * (H + G)
        y0 = y1 - H
        start = x_left + row * (L + G) / 2
        for i in range(n):
            x0 = start + i * (L + G)
            brick(d, int(x0), int(y0), int(x0 + L), int(y1), s)
    top_y = int(y_bottom - 2 * (H + G) - H - 34 * s)
    line(d, int(x_left - 6 * s), int(x_left + width + 6 * s), top_y, s)
    return img


def concept_b(size):
    """Wall going up: two full courses, the top course half laid, line on the top course."""
    s = size / 1024
    img = background(size)
    d = ImageDraw.Draw(img)
    L, H, G = 230 * s, 112 * s, 20 * s
    x_left, x_right = 150 * s, size - 150 * s
    y_bottom = 790 * s
    for row in range(3):
        y1 = y_bottom - row * (H + G)
        y0 = y1 - H
        offset = 0 if row % 2 == 0 else -(L + G) / 2
        x = x_left + offset
        laid = 0
        while x < x_right:
            x0 = max(x, x_left)
            x1 = min(x + L, x_right)
            if row == 2 and laid >= 2:
                break
            if x1 - x0 > L * 0.3:
                brick(d, int(x0), int(y0), int(x1), int(y1), s)
                laid += 1
            x += L + G
    top = int(y_bottom - 2 * (H + G) - H - 30 * s)
    line(d, int(x_left), int(x_right), top, s)
    return img


def concept_c(size, transparent=False):
    """Final mark: a wall going up in running bond. Bottom course full, middle course with
    half bricks at the ends, top course half laid, and the line pulled tight above it."""
    s = size / 1024
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0)) if transparent else background(size)
    d = ImageDraw.Draw(img)
    x_left, x_right = 118 * s, size - 118 * s
    G = 22 * s
    L = ((x_right - x_left) - 2 * G) / 3
    H = L * 0.47
    half = (L - G) / 2
    block_h = 3 * H + 2 * G
    y_bottom = size / 2 + block_h / 2 + 34 * s
    rows = [
        [(0, L), (L + G, L), (2 * (L + G), L)],
        [(0, half), (half + G, L), (half + L + 2 * G, L), (half + 2 * L + 3 * G, half)],
        [(0, L), (L + G, L)],
    ]
    for r, bricks in enumerate(rows):
        y1 = y_bottom - r * (H + G)
        y0 = y1 - H
        for (off, w) in bricks:
            x0 = x_left + off
            brick(d, int(x0), int(y0), int(x0 + w), int(y1), s * 1.25)
    top = int(y_bottom - 2 * (H + G) - H - 46 * s)
    line(d, int(x_left + 8 * s), int(x_right - 8 * s), top, s * 1.3)
    return img


def favicon(size):
    """The same mark cut down for 16 to 48 px: two courses in bond, top half laid, the line."""
    k = 8
    S2 = size * k
    img = background(S2)
    d = ImageDraw.Draw(img)
    u = S2 / 32
    def b(x0, y0, x1, y1):
        d.rounded_rectangle([x0 * u, y0 * u, x1 * u, y1 * u], radius=int(1.4 * u), fill=BRICK)
        d.rectangle([x0 * u + 0.9 * u, y0 * u + 0.8 * u, x1 * u - 0.9 * u, y0 * u + 1.9 * u], fill=BRICK_HI)
    # bottom course: half, full, half
    b(3, 20, 9.5, 27)
    b(11, 20, 21, 27)
    b(22.5, 20, 29, 27)
    # top course: one full brick laid from the left, the rest still open
    b(3, 11.5, 14.5, 18.5)
    b(16, 11.5, 27.5, 18.5)
    d.rectangle([2 * u, 7.4 * u, 30 * u, 9.2 * u], fill=GOLD)
    return img.resize((size, size), Image.LANCZOS)


def sheet(make, out):
    big = make(1024 * 2).resize((1024, 1024), Image.LANCZOS)
    canvas = Image.new("RGB", (1500, 560), (238, 238, 242))
    canvas.paste(big.resize((500, 500), Image.LANCZOS), (20, 30))
    def masked(size, shape):
        im = big.resize((size, size), Image.LANCZOS)
        m = Image.new("L", (size, size), 0)
        md = ImageDraw.Draw(m)
        if shape == "ios":
            md.rounded_rectangle([0, 0, size - 1, size - 1], radius=int(size * 0.225), fill=255)
        else:
            md.ellipse([0, 0, size - 1, size - 1], fill=255)
        return im, m
    for i, (size, shape, x, y) in enumerate([(220, "ios", 560, 30), (220, "circle", 820, 30), (120, "ios", 560, 300), (60, "ios", 720, 330), (40, "ios", 800, 340)]):
        im, m = masked(size, shape)
        canvas.paste(im, (x, y), m)
    # tinted mode preview: grayscale luminance tinted
    g = big.convert("L").resize((220, 220), Image.LANCZOS)
    tint = Image.merge("RGB", [g.point(lambda v: int(v * 0.6)), g.point(lambda v: int(v * 0.75)), g.point(lambda v: int(min(255, v * 1.1)))])
    im, m = masked(220, "ios")
    canvas.paste(tint, (1080, 30), m)
    fav = favicon(32)
    canvas.paste(fav.resize((160, 160), Image.NEAREST), (880, 330))
    canvas.paste(fav, (1080, 380))
    canvas.paste(favicon(16), (1130, 388))
    canvas.save(out)


if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "preview":
        sheet(concept_a, sys.argv[2] + "/concept-a.png")
        sheet(concept_b, sys.argv[2] + "/concept-b.png")
        sheet(concept_c, sys.argv[2] + "/concept-c.png")
        sys.exit()
    make = {"a": concept_a, "b": concept_b, "c": concept_c}[sys.argv[1] if len(sys.argv) > 1 else "c"]
    big = make(S).resize((1024, 1024), Image.LANCZOS)
    big.save("assets/img/icon-1024.png", optimize=True)
    for size, name in [(512, "icon-512.png"), (192, "icon-192.png"), (180, "apple-touch-icon.png")]:
        big.resize((size, size), Image.LANCZOS).save("assets/img/" + name, optimize=True)
    # Layers for Xcode Icon Composer (iOS 26 light, dark and tinted icons).
    import os
    os.makedirs("assets/icon-layers", exist_ok=True)
    background(1024).save("assets/icon-layers/background.png", optimize=True)
    make(S, transparent=True).resize((1024, 1024), Image.LANCZOS).save("assets/icon-layers/foreground.png", optimize=True)
    favicon(32).save("assets/img/favicon-32.png", optimize=True)
    favicon(48).save("assets/img/favicon-48.png", optimize=True)
    print("icons written")
