import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source"
TARGET = ROOT / "alg" / "fto" / "lbt"


GROUP_IDS = {
    "In Slot": "in-slot",
    "One solved": "one-solved",
    "One wrong": "one-wrong",
    "One middle": "one-middle",
    "All top": "all-top",
}


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data) -> None:
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )


def strip_algset_prefix(name: str, algset: str) -> str:
    prefix = f"{algset} "
    return name[len(prefix) :] if name.startswith(prefix) else name


def case_sort_key(case_id: str) -> int:
    return int(case_id)


def main() -> None:
    TARGET.mkdir(parents=True, exist_ok=True)

    algs = read_json(SOURCE / "algs_info.json")
    algsets = read_json(SOURCE / "algsets_info.json")
    groups = read_json(SOURCE / "groups_info.json")
    scrambles = read_json(SOURCE / "scrambles.json")
    svgs = read_json(SOURCE / "combined.json")

    algset_id = "lbt"
    algset_name = "LBT"

    algset_data = {
        "schemaVersion": 1,
        "puzzle": "FTO",
        "id": algset_id,
        "name": algset_name,
        "source": {
            "legacyPath": "source",
            "url": "https://mihlefeld.github.io/Alg-Trainers/FTO-LBT-Trainer/index.html?select",
        },
        "notes": [
            "The source has 31 In Slot cases. Visible names skip IS21 and continue from IS22 to IS32."
        ],
    }

    group_data = {
        "schemaVersion": 1,
        "puzzle": "FTO",
        "algset": algset_id,
        "groups": [],
    }

    for full_name in algsets[algset_name]:
        display_name = strip_algset_prefix(full_name, algset_name)
        group_data["groups"].append(
            {
                "id": GROUP_IDS[display_name],
                "name": display_name,
                "sourceName": full_name,
                "caseIds": [str(case_id) for case_id in groups[full_name]],
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
        source_group = info["group"]
        group_id = GROUP_IDS[source_group]
        name = info["name"]
        tags = []
        if re.match(r"^IS\d+$", name) and name != f"IS{case_id}":
            tags.append("source-name-gap")

        case_data["cases"].append(
            {
                "id": str(case_id),
                "name": name,
                "group": group_id,
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

    print(f"Migrated {len(case_data['cases'])} cases to {TARGET}")


if __name__ == "__main__":
    main()
