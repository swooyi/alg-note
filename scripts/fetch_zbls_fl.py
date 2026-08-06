import base64
import csv
import io
import json
import re
import urllib.request
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "alg" / "3x3" / "zbls-fl"
FR_CASES = ROOT / "alg" / "3x3" / "zbls" / "cases.json"
SPREADSHEET_ID = "1UudEP0beD-gQzTklUcA4Wcxd9KieXZ3ROQjFzMxDPMo"
GID = "1772488318"
SHEET_NAME = "ZBLS(FL) NEW"
CSV_URL = (
    f"https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/"
    f"export?format=csv&gid={GID}"
)
XLSX_URL = f"https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/export?format=xlsx"
SPREADSHEET_URL = (
    f"https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/"
    f"edit?gid={GID}#gid={GID}"
)

NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
    "officeRel": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "xdr": "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
}

FACE_MAP = {
    "R": "F",
    "F": "L",
    "L": "B",
    "B": "R",
    "r": "f",
    "f": "l",
    "l": "b",
    "b": "r",
}


def fetch_bytes(url: str) -> bytes:
    with urllib.request.urlopen(url) as response:
        return response.read()


def fetch_text(url: str) -> str:
    return fetch_bytes(url).decode("utf-8-sig")


def write_json(path: Path, data) -> None:
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )


def col_to_name(index: int) -> str:
    name = ""
    while index:
        index, rem = divmod(index - 1, 26)
        name = chr(65 + rem) + name
    return name


def cell_name(row: int, col: int) -> str:
    return f"{col_to_name(col)}{row}"


def split_algorithms(value: str) -> list[str]:
    return [line.strip() for line in value.splitlines() if line.strip()]


def transform_move_token(token: str) -> str:
    match = re.match(r"^([RFLBrflb])([wW]?)(.*)$", token)
    if not match:
        return token
    face, wide, suffix = match.groups()
    return FACE_MAP[face] + wide + suffix


def transform_setup(setup: str) -> str:
    return " ".join(transform_move_token(token) for token in setup.split())


def image_to_svg_data_url(image_bytes: bytes) -> str:
    encoded = base64.b64encode(image_bytes).decode("ascii")
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150">'
        f'<image href="data:image/png;base64,{encoded}" width="150" height="150"/>'
        "</svg>"
    )


def read_csv_grid() -> list[list[str]]:
    text = fetch_text(CSV_URL)
    return list(csv.reader(io.StringIO(text)))


def get_cell(rows: list[list[str]], row: int, col: int) -> str:
    row_index = row - 1
    col_index = col - 1
    if row_index >= len(rows) or col_index >= len(rows[row_index]):
        return ""
    return rows[row_index][col_index].strip()


def load_fr_cases_by_source_id() -> dict[str, dict]:
    data = json.loads(FR_CASES.read_text(encoding="utf-8"))
    return {
        case["tags"]["sourceId"]: case
        for case in data["cases"]
        if case.get("tags", {}).get("sourceId")
    }


def relationship_map(xml_bytes: bytes) -> dict[str, str]:
    root = ET.fromstring(xml_bytes)
    return {rel.attrib["Id"]: rel.attrib["Target"] for rel in root}


def find_sheet_path(zf: zipfile.ZipFile, sheet_name: str) -> str:
    workbook = ET.fromstring(zf.read("xl/workbook.xml"))
    workbook_rels = relationship_map(zf.read("xl/_rels/workbook.xml.rels"))
    for sheet in workbook.findall(".//main:sheet", NS):
        if sheet.attrib.get("name") == sheet_name:
            rel_id = sheet.attrib[f"{{{NS['officeRel']}}}id"]
            return "xl/" + workbook_rels[rel_id]
    raise ValueError(f"Could not find sheet {sheet_name}")


def drawing_path_for_sheet(zf: zipfile.ZipFile, sheet_path: str) -> str:
    rels_path = sheet_path.replace("xl/worksheets/", "xl/worksheets/_rels/") + ".rels"
    rels = relationship_map(zf.read(rels_path))
    for target in rels.values():
        if target.startswith("../drawings/"):
            return target.replace("../", "xl/")
    raise ValueError(f"Could not find drawing for {sheet_path}")


def image_anchors(zf: zipfile.ZipFile, drawing_path: str) -> dict[tuple[int, int], bytes]:
    rels_path = drawing_path.replace("xl/drawings/", "xl/drawings/_rels/") + ".rels"
    drawing_rels = relationship_map(zf.read(rels_path))
    root = ET.fromstring(zf.read(drawing_path))
    anchors = {}

    for anchor in root.findall("xdr:twoCellAnchor", NS) + root.findall("xdr:oneCellAnchor", NS):
        start = anchor.find("xdr:from", NS)
        row = int(start.find("xdr:row", NS).text) + 1
        col = int(start.find("xdr:col", NS).text) + 1
        blip = anchor.find(".//a:blip", NS)
        if blip is None:
            continue
        rel_id = blip.attrib.get(f"{{{NS['officeRel']}}}embed")
        target = drawing_rels[rel_id].replace("../", "xl/")
        anchors[(row, col)] = zf.read(target)

    return anchors


def load_sheet_images() -> dict[tuple[int, int], bytes]:
    xlsx_bytes = fetch_bytes(XLSX_URL)
    with zipfile.ZipFile(io.BytesIO(xlsx_bytes)) as zf:
        sheet_path = find_sheet_path(zf, SHEET_NAME)
        drawing_path = drawing_path_for_sheet(zf, sheet_path)
        return image_anchors(zf, drawing_path)


def iter_case_cells(rows: list[list[str]]):
    for row_index, row in enumerate(rows, start=1):
        if row_index >= 92:
            continue
        for header_col in (1, 7):
            header = get_cell(rows, row_index, header_col)
            if not header.startswith("F2L "):
                continue
            group_number = header.split(" ", 1)[1]
            for offset in range(4):
                yield {
                    "source_id": f"F2L {group_number}-{offset + 1}",
                    "group": group_number,
                    "slot": offset + 1,
                    "row": row_index + 1 + offset,
                    "alg_col": header_col + 2,
                    "image_col": header_col + 1,
                }
            for offset in range(4):
                yield {
                    "source_id": f"F2L {group_number}-{offset + 5}",
                    "group": group_number,
                    "slot": offset + 5,
                    "row": row_index + 1 + offset,
                    "alg_col": header_col + 5,
                    "image_col": header_col + 4,
                }

    special_cells = [
        ("37", 1, 93, 3),
        ("37", 2, 93, 6),
        ("38", 1, 93, 9),
        ("38", 2, 94, 9),
        ("38", 3, 95, 9),
        ("38", 4, 96, 9),
        ("39", 1, 93, 12),
        ("39", 2, 94, 12),
        ("39", 3, 95, 12),
        ("39", 4, 96, 12),
        ("40", 1, 95, 3),
        ("40", 2, 96, 3),
        ("41", 1, 95, 6),
        ("41", 2, 96, 6),
    ]
    for group_number, slot, row, alg_col in special_cells:
        yield {
            "source_id": f"F2L {group_number}-{slot}",
            "group": group_number,
            "slot": slot,
            "row": row,
            "alg_col": alg_col,
            "image_col": alg_col - 1,
        }


def main() -> None:
    rows = read_csv_grid()
    fr_cases = load_fr_cases_by_source_id()
    images = load_sheet_images()

    TARGET.mkdir(parents=True, exist_ok=True)

    group_case_ids = {}
    cases = []
    svgs = {}

    for cell in iter_case_cells(rows):
        alg_text = get_cell(rows, cell["row"], cell["alg_col"])
        image_bytes = images.get((cell["row"], cell["image_col"]))
        if not alg_text and not image_bytes:
            continue

        source_id = cell["source_id"]
        fr_case = fr_cases.get(source_id)
        if not fr_case:
            raise ValueError(f"Missing FR case for {source_id}")
        if not image_bytes:
            raise ValueError(f"Missing image for {source_id} at {cell_name(cell['row'], cell['image_col'])}")

        case_id = str(len(cases) + 1)
        group_id = f"f2l-{cell['group']}"
        algorithms = split_algorithms(alg_text)
        scrambles = [transform_setup(scramble) for scramble in fr_case.get("scrambles", [])]

        group_case_ids.setdefault(group_id, []).append(case_id)
        cases.append(
            {
                "id": case_id,
                "name": source_id,
                "group": group_id,
                "algorithms": algorithms,
                "scramble": scrambles[0] if scrambles else "",
                "scrambles": scrambles,
                "svgId": case_id,
                "tags": {
                    "sourceGroup": f"F2L {cell['group']}",
                    "sourceId": source_id,
                    "sourceCell": cell_name(cell["row"], cell["alg_col"]),
                    "imageCell": cell_name(cell["row"], cell["image_col"]),
                    "setupSourceAlgset": "zbls",
                    "setupTransform": "R->F, F->L, L->B, B->R; U/D and suffixes preserved",
                },
            }
        )
        svgs[case_id] = image_to_svg_data_url(image_bytes)

    algset = {
        "schemaVersion": 1,
        "puzzle": "3x3",
        "id": "zbls-fl",
        "name": "ZBLS(FL)",
        "source": {
            "spreadsheetUrl": SPREADSHEET_URL,
            "sheetName": SHEET_NAME,
        },
        "notes": [
            "Algorithms and images are extracted from the Google Sheet.",
            "Setups are transformed from ZBLS(FR) by preserving U/D and suffix direction, with R->F, F->L, L->B, B->R.",
            "Images are stored as base64 PNGs wrapped in SVG image elements for compatibility with svgs.json.",
        ],
    }

    groups = {
        "schemaVersion": 1,
        "puzzle": "3x3",
        "algset": "zbls-fl",
        "groups": [
            {
                "id": group_id,
                "name": group_id.replace("f2l-", "F2L "),
                "sourceName": group_id.replace("f2l-", "F2L "),
                "caseIds": case_ids,
            }
            for group_id, case_ids in group_case_ids.items()
        ],
    }

    cases_data = {
        "schemaVersion": 1,
        "puzzle": "3x3",
        "algset": "zbls-fl",
        "cases": cases,
    }

    svg_data = {
        "schemaVersion": 1,
        "puzzle": "3x3",
        "algset": "zbls-fl",
        "svgs": svgs,
    }

    write_json(TARGET / "algset.json", algset)
    write_json(TARGET / "groups.json", groups)
    write_json(TARGET / "cases.json", cases_data)
    write_json(TARGET / "svgs.json", svg_data)

    print(f"Fetched {len(cases)} ZBLS(FL) cases to {TARGET}")


if __name__ == "__main__":
    main()
