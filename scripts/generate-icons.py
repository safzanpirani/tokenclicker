#!/usr/bin/env python3
from pathlib import Path
import subprocess
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "icons"
SVG_OUT = OUT / "svg"
DARK_OUT = OUT / "dark"

INK = "#141414"
DARK_INK = "#EDEDED"
ORANGE = "#F97316"
BLUE = "#4C97F8"
STROKE = 20


def attrs(**kwargs):
    return " ".join(f'{k.replace("_", "-")}="{v}"' for k, v in kwargs.items() if v is not None)


def el(name, **kwargs):
    return f"<{name} {attrs(**kwargs)} />"


def path(d, stroke=INK, fill="none", sw=STROKE, extra=""):
    return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round" {extra}/>'


def line(x1, y1, x2, y2, stroke=INK, sw=STROKE):
    return el("line", x1=x1, y1=y1, x2=x2, y2=y2, stroke=stroke, stroke_width=sw, stroke_linecap="round")


def rect(x, y, w, h, rx=12, stroke=INK, fill="none", sw=STROKE):
    return el("rect", x=x, y=y, width=w, height=h, rx=rx, fill=fill, stroke=stroke, stroke_width=sw, stroke_linejoin="round")


def circle(cx, cy, r, stroke=INK, fill="none", sw=STROKE):
    return el("circle", cx=cx, cy=cy, r=r, fill=fill, stroke=stroke, stroke_width=sw)


def poly(points, stroke=INK, fill="none", sw=STROKE):
    pts = " ".join(f"{x},{y}" for x, y in points)
    return el("polyline", points=pts, fill=fill, stroke=stroke, stroke_width=sw, stroke_linecap="round", stroke_linejoin="round")


def polygon(points, stroke=INK, fill="none", sw=STROKE):
    pts = " ".join(f"{x},{y}" for x, y in points)
    return el("polygon", points=pts, fill=fill, stroke=stroke, stroke_width=sw, stroke_linecap="round", stroke_linejoin="round")


def marker_defs():
    return f"""
    <defs>
      <marker id="arrow-ink" markerWidth="28" markerHeight="28" refX="22" refY="14" orient="auto" markerUnits="userSpaceOnUse">
        <path d="M7,6 L22,14 L7,22" fill="none" stroke="{INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      </marker>
      <marker id="arrow-orange" markerWidth="28" markerHeight="28" refX="22" refY="14" orient="auto" markerUnits="userSpaceOnUse">
        <path d="M7,6 L22,14 L7,22" fill="none" stroke="{ORANGE}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      </marker>
    </defs>
    """


def arrow(d, color=INK, sw=STROKE):
    marker = "arrow-orange" if color == ORANGE else "arrow-ink"
    return path(d, stroke=color, sw=sw, extra=f'marker-end="url(#{marker})"')


def svg(body):
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  {marker_defs()}
  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
    {body}
  </g>
</svg>
"""


def icon_01_intern():
    return svg("\n".join([
        circle(205, 178, 32),
        path("M190 218 C176 244 176 274 194 300"),
        line(204, 238, 252, 264),
        line(168, 300, 232, 300),
        rect(250, 238, 116, 62, 8),
        line(78, 320, 406, 320),
        line(118, 320, 92, 404),
        line(360, 320, 390, 404),
        line(174, 330, 174, 396),
        line(208, 300, 246, 376),
        rect(378, 266, 42, 42, 8),
        path("M420 280 C444 282 444 306 420 308"),
        path("M386 232 C374 214 404 212 392 194", stroke=ORANGE, sw=16),
        path("M412 232 C400 214 430 212 418 194", stroke=ORANGE, sw=16),
    ]))


def icon_02_autocomplete():
    return svg("\n".join([
        rect(130, 262, 252, 118, 16),
        line(166, 318, 346, 318),
        line(184, 348, 326, 348),
        rect(116, 196, 128, 50, 20),
        rect(194, 134, 146, 54, 20),
        rect(286, 72, 130, 56, 20, fill=ORANGE, stroke=ORANGE),
        line(238, 196, 278, 180),
        line(318, 134, 348, 126),
    ]))


def icon_03_markov_chain():
    return svg("\n".join([
        circle(160, 208, 44),
        circle(304, 154, 44),
        circle(356, 312, 44),
        circle(178, 344, 44),
        arrow("M203 195 C236 178 250 170 260 166"),
        arrow("M319 198 C334 236 342 258 348 270", ORANGE),
        arrow("M312 326 C268 340 244 345 222 346"),
        arrow("M152 300 C142 270 142 252 148 230"),
        arrow("M284 120 C250 74 336 54 344 112"),
    ]))


def icon_04_ngram_model():
    parts = []
    xs = [78, 144, 210, 276, 342]
    for i, x in enumerate(xs):
        fill = ORANGE if i in (1, 2, 3) else "none"
        stroke = ORANGE if i in (1, 2, 3) else INK
        parts.append(rect(x, 224, 58, 58, 8, stroke=stroke, fill=fill))
    parts.extend([
        rect(126, 196, 242, 116, 10, stroke=ORANGE),
        line(126, 196, 126, 166, ORANGE),
        line(368, 196, 368, 166, ORANGE),
        line(126, 312, 126, 346, ORANGE),
        line(368, 312, 368, 346, ORANGE),
        line(74, 342, 438, 342),
    ])
    return svg("\n".join(parts))


def icon_05_rnn():
    return svg("\n".join([
        circle(256, 276, 72),
        circle(256, 276, 20, fill=ORANGE, stroke=ORANGE),
        arrow("M160 276 H184"),
        arrow("M328 276 H376"),
        arrow("M222 210 C162 136 350 98 310 210", ORANGE, 22),
    ]))


def icon_06_lstm():
    return svg("\n".join([
        rect(116, 172, 280, 168, 18),
        line(74, 256, 116, 256),
        line(396, 256, 438, 256),
        rect(148, 138, 54, 68, 12),
        rect(229, 138, 54, 68, 12, stroke=ORANGE, fill=ORANGE),
        rect(310, 138, 54, 68, 12),
        line(175, 206, 175, 238),
        line(256, 206, 256, 238, ORANGE),
        line(337, 206, 337, 238),
        line(164, 294, 348, 294),
        circle(178, 256, 15),
        circle(256, 256, 15, stroke=ORANGE, fill=ORANGE),
        circle(334, 256, 15),
    ]))


def icon_07_transformer_block():
    return svg("\n".join([
        rect(148, 132, 216, 64, 12),
        rect(130, 216, 252, 64, 12),
        rect(148, 300, 216, 64, 12),
        circle(256, 248, 20, stroke=ORANGE, fill=ORANGE),
        line(256, 248, 174, 164, ORANGE, 16),
        line(256, 248, 256, 164, ORANGE, 16),
        line(256, 248, 338, 164, ORANGE, 16),
        line(256, 248, 174, 332),
        line(256, 248, 256, 332),
        line(256, 248, 338, 332),
    ]))


def icon_08_gpu():
    return svg("\n".join([
        rect(96, 164, 320, 184, 14),
        rect(416, 218, 42, 78, 8),
        line(136, 348, 136, 386),
        line(172, 348, 172, 386),
        line(208, 348, 208, 386),
        circle(240, 256, 62),
        circle(240, 256, 18, stroke=ORANGE, fill=ORANGE),
        path("M240 194 C268 216 272 238 240 256"),
        path("M302 256 C274 278 252 282 240 256"),
        path("M240 318 C212 296 208 274 240 256"),
        rect(332, 206, 44, 100, 8),
    ]))


def icon_09_gpu_cluster():
    parts = []
    ys = [122, 194, 266, 338]
    for i, y in enumerate(ys):
        parts.append(rect(124, y, 264, 52, 10))
        parts.append(circle(168, y + 26, 13))
        parts.append(line(210, y + 26, 326, y + 26))
    parts.extend([
        circle(356, 220, 12, stroke=ORANGE, fill=ORANGE),
        line(96, 104, 96, 408),
        line(416, 104, 416, 408),
        line(96, 104, 416, 104),
        line(96, 408, 416, 408),
    ])
    return svg("\n".join(parts))


def icon_10_tpu_pod():
    parts = [
        rect(142, 142, 228, 228, 16),
        rect(180, 180, 152, 152, 8),
    ]
    for x in [206, 256, 306]:
        parts.append(line(x, 104, x, 142))
        parts.append(line(x, 370, x, 408))
    for y in [206, 256, 306]:
        parts.append(line(104, y, 142, y))
        parts.append(line(370, y, 408, y))
    for row, y in enumerate([190, 226, 262, 298]):
        for col, x in enumerate([190, 226, 262, 298]):
            active = (row, col) in {(0, 2), (2, 1), (3, 3)}
            parts.append(rect(x, y, 28, 28, 4, stroke=ORANGE if active else INK, fill=ORANGE if active else "none", sw=10))
    return svg("\n".join(parts))


def icon_11_data_center():
    return svg("\n".join([
        polygon([(92, 230), (256, 126), (420, 230), (420, 386), (92, 386)]),
        line(130, 240, 382, 240),
        rect(132, 270, 56, 90, 6),
        rect(212, 270, 56, 90, 6, stroke=ORANGE),
        rect(292, 270, 56, 90, 6),
        line(148, 296, 172, 296),
        line(228, 296, 252, 296, ORANGE),
        line(308, 296, 332, 296),
        circle(240, 332, 8, stroke=ORANGE, fill=ORANGE, sw=8),
    ]))


def icon_12_foundation_model():
    return svg("\n".join([
        polygon([(170, 150), (284, 104), (350, 144), (238, 190)], fill=INK),
        polygon([(238, 190), (350, 144), (350, 366), (238, 410)], fill=INK),
        polygon([(170, 150), (238, 190), (238, 410), (170, 366)], fill=INK),
        poly([(170, 150), (284, 104), (350, 144), (350, 366), (238, 410), (170, 366), (170, 150)]),
        line(238, 190, 350, 144),
        line(238, 190, 238, 410),
        circle(260, 274, 20, stroke=ORANGE, fill=ORANGE),
        line(260, 232, 260, 214, ORANGE, 14),
        line(260, 316, 260, 334, ORANGE, 14),
        line(218, 274, 200, 274, ORANGE, 14),
        line(302, 274, 320, 274, ORANGE, 14),
        line(230, 244, 216, 230, ORANGE, 14),
        line(290, 304, 304, 318, ORANGE, 14),
    ]))


def icon_13_moe():
    return svg("\n".join([
        circle(148, 256, 36),
        rect(286, 126, 112, 58, 10),
        rect(286, 226, 112, 58, 10, stroke=ORANGE),
        rect(286, 326, 112, 58, 10),
        arrow("M184 242 C218 206 244 170 286 156"),
        arrow("M184 256 C222 256 246 256 286 256", ORANGE),
        arrow("M184 270 C218 306 244 350 286 356"),
        line(96, 256, 112, 256),
        circle(148, 256, 10, fill=ORANGE, stroke=ORANGE),
    ]))


def icon_14_multimodal():
    return svg("\n".join([
        path("M70 182 C112 132 182 132 224 182 C182 232 112 232 70 182"),
        circle(147, 182, 22),
        path("M330 148 C350 174 350 210 330 236"),
        path("M374 122 C408 164 408 220 374 262"),
        line(94, 330, 208, 330),
        line(116, 364, 190, 364),
        circle(260, 256, 24, stroke=ORANGE, fill=ORANGE),
        line(194, 210, 240, 242, ORANGE, 14),
        line(330, 236, 282, 250, ORANGE, 14),
        line(208, 330, 246, 278, ORANGE, 14),
    ]))


def icon_15_reasoning_model():
    return svg("\n".join([
        circle(138, 256, 22, stroke=ORANGE, fill=ORANGE),
        circle(226, 180, 20, stroke=ORANGE, fill=ORANGE),
        circle(226, 332, 20),
        circle(326, 136, 20),
        circle(326, 224, 20, stroke=ORANGE, fill=ORANGE),
        circle(326, 300, 20),
        circle(326, 388, 20),
        circle(414, 224, 22, stroke=ORANGE, fill=ORANGE),
        line(160, 248, 208, 194, ORANGE, 14),
        line(160, 264, 208, 318),
        line(246, 176, 306, 140),
        line(246, 184, 306, 222, ORANGE, 14),
        line(246, 328, 306, 304),
        line(246, 336, 306, 386),
        line(346, 224, 392, 224, ORANGE, 14),
    ]))


def icon_16_research_lab():
    return svg("\n".join([
        line(210, 96, 302, 96),
        line(232, 96, 232, 194),
        line(280, 96, 280, 194),
        path("M232 194 L146 350 C132 378 154 410 186 410 H326 C358 410 380 378 366 350 L280 194"),
        path("M180 334 C220 306 268 364 334 326 L366 350 C380 378 358 410 326 410 H186 C154 410 132 378 146 350 Z", stroke=ORANGE, fill=ORANGE, sw=0),
        circle(356, 156, 18),
        circle(414, 202, 16),
        circle(386, 282, 16, stroke=ORANGE, fill=ORANGE),
        line(370, 168, 400, 192),
        line(408, 218, 392, 266, ORANGE, 14),
        line(348, 294, 300, 344, ORANGE, 14),
    ]))


def icon_17_agi():
    return svg("\n".join([
        path("M238 136 C174 116 112 162 124 230 C80 258 96 338 160 348 C176 398 240 390 256 342"),
        path("M208 154 C178 174 178 210 204 226"),
        path("M150 234 C186 232 206 254 202 286"),
        path("M174 340 C192 310 226 306 256 324"),
        rect(256, 150, 122, 212, 16),
        line(296, 190, 338, 190),
        line(296, 236, 338, 236),
        line(296, 282, 338, 282),
        circle(338, 190, 8, stroke=ORANGE, fill=ORANGE, sw=8),
        circle(296, 236, 8, stroke=ORANGE, fill=ORANGE, sw=8),
        circle(338, 282, 8, stroke=ORANGE, fill=ORANGE, sw=8),
        line(256, 180, 226, 180),
        line(256, 230, 226, 230),
        line(256, 280, 226, 280),
        line(256, 330, 226, 330),
        line(256, 112, 256, 82, ORANGE, 14),
        line(342, 126, 364, 104, ORANGE, 14),
        line(398, 214, 430, 214, ORANGE, 14),
        line(342, 386, 364, 408, ORANGE, 14),
    ]))


def icon_18_superintelligence():
    return svg("\n".join([
        circle(256, 256, 30, stroke=ORANGE, fill=ORANGE),
        circle(256, 256, 76, stroke=ORANGE),
        circle(256, 256, 128),
        circle(256, 256, 176),
        path("M128 256 C152 172 216 128 292 132"),
        path("M384 256 C360 340 296 384 220 380"),
        circle(188, 152, 10, fill=ORANGE, stroke=ORANGE, sw=8),
        circle(354, 174, 10, fill=ORANGE, stroke=ORANGE, sw=8),
        circle(142, 326, 10),
        circle(406, 296, 10),
        line(256, 76, 256, 48, ORANGE, 12),
        line(256, 464, 256, 436, ORANGE, 12),
        line(76, 256, 48, 256, ORANGE, 12),
        line(464, 256, 436, 256, ORANGE, 12),
    ]))


def icon_t1_token():
    return svg("\n".join([
        rect(104, 180, 304, 152, 34),
        line(166, 224, 250, 224),
        line(166, 288, 224, 288),
        line(306, 220, 306, 292, ORANGE, 24),
        circle(362, 256, 14, stroke=ORANGE, fill=ORANGE),
    ]))


def icon_t2_parameter():
    return svg("\n".join([
        circle(256, 256, 118),
        circle(256, 256, 32),
        path("M256 138 A118 118 0 0 1 374 256"),
        line(256, 256, 330, 184, ORANGE, 24),
        circle(330, 184, 16, stroke=ORANGE, fill=ORANGE),
        line(184, 328, 154, 358),
        line(328, 328, 358, 358),
        line(256, 374, 256, 418),
    ]))


ICONS = [
    ("01-intern", icon_01_intern),
    ("02-autocomplete", icon_02_autocomplete),
    ("03-markov-chain", icon_03_markov_chain),
    ("04-n-gram-model", icon_04_ngram_model),
    ("05-rnn", icon_05_rnn),
    ("06-lstm", icon_06_lstm),
    ("07-transformer-block", icon_07_transformer_block),
    ("08-gpu", icon_08_gpu),
    ("09-gpu-cluster", icon_09_gpu_cluster),
    ("10-tpu-pod", icon_10_tpu_pod),
    ("11-data-center", icon_11_data_center),
    ("12-foundation-model", icon_12_foundation_model),
    ("13-mixture-of-experts", icon_13_moe),
    ("14-multimodal-model", icon_14_multimodal),
    ("15-reasoning-model", icon_15_reasoning_model),
    ("16-research-lab", icon_16_research_lab),
    ("17-agi", icon_17_agi),
    ("18-superintelligence", icon_18_superintelligence),
    ("t1-token", icon_t1_token),
    ("t2-parameter", icon_t2_parameter),
]


def render_png(svg_path, png_path):
    subprocess.run([
        "rsvg-convert",
        "--format", "png",
        "--width", "512",
        "--height", "512",
        "--output", str(png_path),
        str(svg_path),
    ], check=True)


def render_icons():
    OUT.mkdir(parents=True, exist_ok=True)
    SVG_OUT.mkdir(parents=True, exist_ok=True)
    DARK_OUT.mkdir(parents=True, exist_ok=True)
    for name, fn in ICONS:
        svg_text = fn()
        svg_path = SVG_OUT / f"{name}.svg"
        png_path = OUT / f"{name}.png"
        svg_path.write_text(svg_text, encoding="utf-8")
        render_png(svg_path, png_path)

        dark_svg_path = DARK_OUT / f"{name}.svg"
        dark_png_path = DARK_OUT / f"{name}.png"
        dark_svg_path.write_text(svg_text.replace(INK, DARK_INK), encoding="utf-8")
        render_png(dark_svg_path, dark_png_path)
        dark_svg_path.unlink()


def contact_sheet():
    cols, rows = 5, 4
    cell = 192
    pad = 28
    sheet = Image.new("RGBA", (cols * cell, rows * cell * 2), (255, 255, 255, 255))
    draw = ImageDraw.Draw(sheet)
    decks = [
        (OUT, 0, (250, 250, 250, 255), (230, 230, 230, 255)),
        (DARK_OUT, rows * cell, (10, 10, 10, 255), (38, 38, 38, 255)),
    ]
    for icon_dir, y_offset, bg, outline in decks:
        for idx, (name, _) in enumerate(ICONS):
            x = (idx % cols) * cell
            y = (idx // cols) * cell + y_offset
            draw.rectangle([x, y, x + cell, y + cell], fill=bg)
            draw.rectangle([x, y, x + cell, y + cell], outline=outline, width=1)
            icon = Image.open(icon_dir / f"{name}.png").convert("RGBA").resize((cell - pad * 2, cell - pad * 2), Image.Resampling.LANCZOS)
            sheet.alpha_composite(icon, (x + pad, y + pad))
    sheet.save(OUT / "contact-sheet.png")


def validate():
    expected = {f"{name}.png" for name, _ in ICONS} | {"contact-sheet.png"}
    actual = {p.name for p in OUT.glob("*.png")}
    missing = sorted(expected - actual)
    if missing:
        raise SystemExit(f"Missing output files: {missing}")
    for name, _ in ICONS:
        img = Image.open(OUT / f"{name}.png")
        if img.size != (512, 512) or img.mode != "RGBA":
            raise SystemExit(f"Bad PNG export: {name} {img.mode} {img.size}")
        if img.getpixel((0, 0))[3] != 0:
            raise SystemExit(f"Corner is not transparent: {name}")
        dark = Image.open(DARK_OUT / f"{name}.png")
        if dark.size != (512, 512) or dark.mode != "RGBA":
            raise SystemExit(f"Bad dark PNG export: {name} {dark.mode} {dark.size}")
        if dark.getpixel((0, 0))[3] != 0:
            raise SystemExit(f"Dark corner is not transparent: {name}")


def main():
    render_icons()
    contact_sheet()
    validate()
    print(f"Wrote {len(ICONS)} icons and contact-sheet.png to {OUT}")


if __name__ == "__main__":
    main()
