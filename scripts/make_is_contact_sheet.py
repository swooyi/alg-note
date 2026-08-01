import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SVG_DIR = ROOT / "output" / "svg"
OUT = ROOT / "output" / "is_1_32_contact_sheet.png"


def parse_svg(path: Path):
    text = path.read_text(encoding="utf-8")
    root = ET.fromstring(text)
    view_box = [float(v) for v in root.attrib["viewBox"].split()]
    polygons = []
    for poly in root.findall(".//{http://www.w3.org/2000/svg}polygon"):
      fill = poly.attrib.get("fill", "#ffffff")
      nums = [float(value) for value in re.findall(r"-?\d+(?:\.\d+)?", poly.attrib["points"])]
      points = list(zip(nums[::2], nums[1::2]))
      polygons.append((fill, points))
    return view_box, polygons


def render_svg(path: Path, size=180):
    view_box, polygons = parse_svg(path)
    _, _, width, height = view_box
    scale = min((size - 14) / width, (size - 14) / height)
    ox = (size - width * scale) / 2
    oy = (size - height * scale) / 2
    image = Image.new("RGB", (size, size), "white")
    draw = ImageDraw.Draw(image)
    for fill, points in polygons:
        scaled = [(ox + x * scale, oy + y * scale) for x, y in points]
        draw.polygon(scaled, fill=fill, outline="black")
    return image


def main():
    files = []
    for path in SVG_DIR.glob("*.svg"):
        match = re.match(r"(\d+)_IS", path.name)
        if match and 1 <= int(match.group(1)) <= 32:
            files.append(path)
    files.sort(key=lambda p: int(p.name.split("_", 1)[0]))

    cell_w, cell_h = 280, 310
    cols = 4
    rows = (len(files) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * cell_w, rows * cell_h), "#f6f7f9")
    draw = ImageDraw.Draw(sheet)

    try:
        font = ImageFont.truetype("arial.ttf", 18)
    except OSError:
        font = ImageFont.load_default()

    for index, path in enumerate(files):
        col = index % cols
        row = index // cols
        x = col * cell_w
        y = row * cell_h
        image = render_svg(path, size=250)
        sheet.paste(image, (x + 15, y + 12))
        label = path.stem.replace("_", " ")
        draw.text((x + 15, y + 268), label, fill="#20242a", font=font)

    OUT.parent.mkdir(exist_ok=True)
    sheet.save(OUT)
    print(OUT)
    print(len(files))


if __name__ == "__main__":
    main()
