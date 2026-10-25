"""Import SpeedCubeDB's setup and Standard Alg, without images.

Pass a directory containing OLL.html and PLL.html downloaded from the source
URLs to import a saved snapshot; otherwise fetch the pages directly.
"""
import argparse
import html
import json
import re
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def parse_cases(source, category):
    blocks = re.split(r'<div class="row singlealgorithm[^>]*', source)[1:]
    headers = re.findall(r'<div class="row singlealgorithm[^>]*', source)
    cases, groups = [], {}
    for header, block in zip(headers, blocks):
        name = html.unescape(re.search(r'data-alg="([^"]+)"', header)[1])
        group_name = html.unescape(re.search(r'data-subgroup="([^"]+)"', header)[1])
        setup = re.search(r'class="setup-case[^>]*><div>setup:</div>([^<]+)', block)
        algorithm = re.search(r'Standard Alg:</div>\s*([^<]+)', block)
        if not setup or not algorithm:
            raise ValueError(f"Missing setup or Standard Alg: {name}")
        case_id = str(len(cases) + 1)
        group_id = re.sub(r'[^a-z0-9]+', '-', group_name.lower()).strip('-')
        group = groups.setdefault(group_id, {
            "id": group_id, "name": group_name, "caseIds": [],
        })
        group["caseIds"].append(case_id)
        scramble = " ".join(html.unescape(setup[1]).split())
        cases.append({
            "id": case_id, "name": name, "group": group_id,
            "algorithms": [" ".join(html.unescape(algorithm[1]).split())],
            "scramble": scramble, "scrambles": [scramble], "svgId": None,
            "tags": {"sourceGroup": group_name, "sourceId": name},
        })
    expected = [f"OLL {i}" for i in range(1, 58)] if category == "OLL" else [
        "Aa", "Ab", "E", "F", "Ga", "Gb", "Gc", "Gd", "H", "Ja", "Jb",
        "Na", "Nb", "Ra", "Rb", "T", "Ua", "Ub", "V", "Y", "Z",
    ]
    if [case["name"] for case in cases] != expected:
        raise ValueError(f"Unexpected {category} case names or order")
    return cases, list(groups.values())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("snapshot", nargs="?", type=Path)
    args = parser.parse_args()
    datasets = {}
    for category in ("OLL", "PLL"):
        url = f"https://speedcubedb.com/a/3x3/{category}"
        if args.snapshot:
            source = (args.snapshot / f"{category}.html").read_text(encoding="utf-8")
        else:
            with urllib.request.urlopen(url) as response:
                source = response.read().decode("utf-8")
        cases, groups = parse_cases(source, category)
        key = category.lower()
        common = {"schemaVersion": 1, "puzzle": "3x3", "algset": key}
        datasets[key] = {
            "algset.json": {
                "schemaVersion": 1, "puzzle": "3x3", "id": key, "name": category,
                "source": {"url": url},
                "notes": ["Setup and Standard Alg from SpeedCubeDB. Images intentionally omitted."],
            },
            "groups.json": {**common, "groups": groups},
            "cases.json": {**common, "cases": cases},
            "svgs.json": {**common, "svgs": {}},
        }
    for key, files in datasets.items():
        folder = ROOT / "alg" / "3x3" / key
        folder.mkdir(parents=True, exist_ok=True)
        for name, data in files.items():
            (folder / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Imported {len(files['cases.json']['cases'])} {key.upper()} cases")


if __name__ == "__main__":
    main()
