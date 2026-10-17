"""Draw the ARCHE wordmark onto the generated splash poster.

Coordinates must match SPLASH in scripts/generate-brand-assets.mjs.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SPLASH = ROOT / "assets" / "splash.png"
GOLD = (0xE8, 0xB8, 0x6D, 255)
MUTED = (0xC4, 0xA0, 0x6A, 255)
CX = 621
CY = 967
OUTER_R = 497
FONTS = [
    Path(r"C:\Windows\Fonts\georgia.ttf"),
    Path(r"C:\Windows\Fonts\times.ttf"),
    Path(r"C:\Windows\Fonts\constan.ttf"),
    Path(r"C:\Windows\Fonts\calibri.ttf"),
]


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in FONTS:
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


def draw_tracked(draw: ImageDraw.ImageDraw, text: str, y: int, font, fill, tracking: int, width: int) -> None:
    glyphs = list(text)
    widths = [draw.textlength(ch, font=font) for ch in glyphs]
    total = sum(widths) + tracking * max(0, len(glyphs) - 1)
    x = (width - total) / 2
    for ch, w in zip(glyphs, widths):
        draw.text((x, y), ch, font=font, fill=fill)
        x += w + tracking


def main() -> None:
    image = Image.open(SPLASH).convert("RGBA")
    width, height = image.size
    draw = ImageDraw.Draw(image)

    title = load_font(max(96, width // 8))
    subtitle = load_font(max(36, width // 22))

    title_y = int(CY + OUTER_R + height * 0.035)
    draw_tracked(draw, "ARCHE", title_y, title, GOLD, tracking=width // 36, width=width)

    sub = "Architect of the Self"
    sub_w = draw.textlength(sub, font=subtitle)
    draw.text(((width - sub_w) / 2, title_y + width // 7), sub, font=subtitle, fill=MUTED)

    image.convert("RGB").save(SPLASH, "PNG")
    print(f"lettered {SPLASH.name} {width}x{height}")


if __name__ == "__main__":
    main()
