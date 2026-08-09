import json
import re
from pathlib import Path
from urllib.request import urlopen


ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "alg" / "fto" / "1l3t"
LEGACY = ROOT / "source" / "legacy" / "1l3t"
BASE_URL = "https://mihlefeld.github.io/Alg-Trainers/FTO-L3T-Trainer"
FILES = (
    "selected_algsets.json",
    "algsets_info.json",
    "groups_info.json",
    "algs_info.json",
    "scrambles.json",
    "combined.json",
)

RECOGNITION_BY_TYPE_CODE = {
    "s0": "E_noT",
    "s+": "E_noT",
    "s-": "E_noT",
    "c0": "E_onlyT",
    "a0": "E_onlyT",
    "c+": "E_same",
    "a-": "E_same",
    "c-": "E_opp",
    "a+": "E_opp",
    "b0": "O_back",
    "b+": "O_back",
    "b-": "O_back",
    "r0": "O_side",
    "l0": "O_side",
    "r+": "O_same",
    "l-": "O_same",
    "r-": "O_opp",
    "l+": "O_opp",
}


def read_url_json(file_name: str):
    with urlopen(f"{BASE_URL}/{file_name}") as response:
        return json.loads(response.read().decode("utf-8-sig"))


def write_json(path: Path, data) -> None:
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )


def group_id(name: str) -> str:
    value = name.lower()
    value = value.replace("+", "plus").replace("-", "-")
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def l3t_family_name(source_group: str) -> str:
    return source_group.split("-", 1)[0]


def l3t_display_group_name(source_group: str) -> str:
    name = source_group
    if "/" in name:
        name = name.split("/", 1)[0]
    return name


def l3t_case_tags(source_group: str) -> dict[str, str | bool]:
    tags = {
        "sourceGroup": source_group,
    }
    lower = source_group.lower()
    if "even" in lower:
        tags["parity"] = "even"
    elif "odd" in lower:
        tags["parity"] = "odd"
    if "tcp" in lower:
        tags["tcp"] = True
    return tags


def l3t_type_code(case_name: str) -> str:
    return case_name[1:] if len(case_name) > 1 else ""


def case_sort_key(case_id: str) -> int:
    return int(case_id)


def strip_algset_prefix(name: str, algset: str) -> str:
    prefix = f"{algset} "
    return name[len(prefix) :] if name.startswith(prefix) else name


def main() -> None:
    TARGET.mkdir(parents=True, exist_ok=True)
    LEGACY.mkdir(parents=True, exist_ok=True)

    source = {file_name: read_url_json(file_name) for file_name in FILES}
    for file_name, data in source.items():
        write_json(LEGACY / file_name, data)

    algset_name = "1L3T"
    algset_id = "1l3t"
    algsets = source["algsets_info.json"]
    groups = source["groups_info.json"]
    algs = source["algs_info.json"]
    scrambles = source["scrambles.json"]
    svgs = source["combined.json"]

    group_order = []
    group_case_ids = {}
    for full_name in algsets[algset_name]:
        display_name = strip_algset_prefix(full_name, algset_name)
        group_name = l3t_display_group_name(display_name)
        if group_name not in group_case_ids:
            group_order.append(group_name)
            group_case_ids[group_name] = []
        group_case_ids[group_name].extend(str(case_id) for case_id in groups[full_name])

    algset_data = {
        "schemaVersion": 1,
        "puzzle": "FTO",
        "id": algset_id,
        "name": algset_name,
        "source": {
            "legacyPath": "source/legacy/1l3t",
            "url": f"{BASE_URL}/?select",
        },
        "notes": [],
    }

    group_data = {
        "schemaVersion": 1,
        "puzzle": "FTO",
        "algset": algset_id,
        "groups": [],
    }

    for display_name in group_order:
        group_data["groups"].append(
            {
                "id": group_id(display_name),
                "name": display_name,
                "sourceName": display_name,
                "caseIds": group_case_ids[display_name],
            }
        )

    case_data = {
        "schemaVersion": 1,
        "puzzle": "FTO",
        "algset": algset_id,
        "cases": [],
    }

    for case_id in sorted(algs, key=case_sort_key):
        info = algs[case_id]
        source_group = info.get("group", "")
        display_group = l3t_display_group_name(source_group)
        name = info.get("name", str(case_id))
        tags = l3t_case_tags(source_group)
        type_code = l3t_type_code(name)
        tags["typeCode"] = type_code
        if type_code in RECOGNITION_BY_TYPE_CODE:
            tags["recognition"] = RECOGNITION_BY_TYPE_CODE[type_code]
        case_data["cases"].append(
            {
                "id": str(case_id),
                "name": name,
                "group": group_id(display_group),
                "algorithms": info.get("a", []),
                "scramble": info.get("s", ""),
                "scrambles": scrambles.get(case_id, []),
                "svgId": str(case_id),
                "tags": tags,
            }
        )

    svg_data = {
        "schemaVersion": 1,
        "puzzle": "FTO",
        "algset": algset_id,
        "svgs": {str(case_id): svgs[str(case_id)] for case_id in sorted(svgs, key=case_sort_key)},
    }

    write_json(TARGET / "algset.json", algset_data)
    write_json(TARGET / "groups.json", group_data)
    write_json(TARGET / "cases.json", case_data)
    write_json(TARGET / "svgs.json", svg_data)

    print(f"Fetched and migrated {len(case_data['cases'])} cases to {TARGET}")
    print(f"Saved legacy source files to {LEGACY}")


if __name__ == "__main__":
    main()
