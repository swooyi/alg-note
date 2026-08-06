import base64
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "alg" / "3x3" / "zbls"
BASE_URL = "https://morganyeh06.github.io/zbls-trainer/"
HOME_URL = BASE_URL
ALGORITHMS_URL = urllib.parse.urljoin(BASE_URL, "Classes%20and%20Data%20Files/algorithms.js")
SCRAMBLES_URL = urllib.parse.urljoin(BASE_URL, "Classes%20and%20Data%20Files/scrambles.js")


def fetch_text(url: str) -> str:
    with urllib.request.urlopen(url) as response:
        return response.read().decode("utf-8")


def fetch_bytes(url: str) -> bytes:
    with urllib.request.urlopen(url) as response:
        return response.read()


def extract_js_array(source: str, name: str) -> list:
    match = re.search(rf"const\s+{name}\s*=\s*(\[.*?\]);", source, re.S)
    if not match:
        raise ValueError(f"Could not find {name}")
    return json.loads(match.group(1))


def convert_count_prefixed_array(items: list) -> list[list[str]]:
    converted = []
    index = 0
    while index < len(items):
        count = items[index]
        if not isinstance(count, int):
            raise ValueError(f"Expected count at index {index}, found {count!r}")
        start = index + 1
        end = start + count
        converted.append(items[start:end])
        index = end
    return converted


def extract_case_keys(home_html: str) -> list[tuple[str, str]]:
    keys = re.findall(r'id="F2L(\d+)-(\d+)"\s+class="F2L\d+"\s+name="case"', home_html)
    return [(group, slot) for group, slot in keys]


def image_to_svg_data_url(image_bytes: bytes) -> str:
    encoded = base64.b64encode(image_bytes).decode("ascii")
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150">'
        f'<image href="data:image/png;base64,{encoded}" width="150" height="150"/>'
        "</svg>"
    )


def write_json(path: Path, data) -> None:
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )


def main() -> None:
    home_html = fetch_text(HOME_URL)
    case_keys = extract_case_keys(home_html)
    algorithms = convert_count_prefixed_array(extract_js_array(fetch_text(ALGORITHMS_URL), "algArray"))
    scrambles = convert_count_prefixed_array(extract_js_array(fetch_text(SCRAMBLES_URL), "scrambleArray"))

    if len(case_keys) != len(algorithms) or len(case_keys) != len(scrambles):
        raise ValueError(
            "Case count mismatch: "
            f"html={len(case_keys)}, algorithms={len(algorithms)}, scrambles={len(scrambles)}"
        )

    TARGET.mkdir(parents=True, exist_ok=True)

    algset = {
        "schemaVersion": 1,
        "puzzle": "3x3",
        "id": "zbls",
        "name": "ZBLS(FR)",
        "source": {
            "url": BASE_URL,
            "spreadsheetUrl": "https://docs.google.com/spreadsheets/d/1UudEP0beD-gQzTklUcA4Wcxd9KieXZ3ROQjFzMxDPMo/edit?gid=1106894307#gid=1106894307",
        },
        "notes": [
            "Images are stored as base64 PNGs wrapped in SVG image elements for compatibility with svgs.json.",
        ],
    }

    group_case_ids = {}
    cases = []
    svgs = {}

    for index, ((group, slot), alg_list, scramble_list) in enumerate(
        zip(case_keys, algorithms, scrambles),
        start=1,
    ):
        case_id = str(index)
        group_id = f"f2l-{group}"
        source_id = f"F2L {group}-{slot}"
        image_path = f"Images/F2L {group}-{slot}.png"
        image_url = urllib.parse.urljoin(BASE_URL, urllib.parse.quote(image_path, safe="/"))

        group_case_ids.setdefault(group_id, []).append(case_id)
        cases.append(
            {
                "id": case_id,
                "name": source_id,
                "group": group_id,
                "algorithms": alg_list,
                "scramble": scramble_list[0] if scramble_list else "",
                "scrambles": scramble_list,
                "svgId": case_id,
                "tags": {
                    "sourceGroup": f"F2L {group}",
                    "sourceId": source_id,
                    "imagePath": image_path,
                },
            }
        )
        svgs[case_id] = image_to_svg_data_url(fetch_bytes(image_url))

    groups = {
        "schemaVersion": 1,
        "puzzle": "3x3",
        "algset": "zbls",
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
        "algset": "zbls",
        "cases": cases,
    }

    svg_data = {
        "schemaVersion": 1,
        "puzzle": "3x3",
        "algset": "zbls",
        "svgs": svgs,
    }

    write_json(TARGET / "algset.json", algset)
    write_json(TARGET / "groups.json", groups)
    write_json(TARGET / "cases.json", cases_data)
    write_json(TARGET / "svgs.json", svg_data)

    print(f"Fetched {len(cases)} ZBLS cases to {TARGET}")


if __name__ == "__main__":
    main()
