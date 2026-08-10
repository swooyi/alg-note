import json
import re
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "alg" / "3x3" / "zbll"
BASE_URL = "https://mihlefeld.github.io/Alg-Trainers/3x3-ZBLL-Trainer/"
TRAINER_URL = urllib.parse.urljoin(BASE_URL, "index.html?select")
FILES = (
    "selected_algsets.json",
    "algsets_info.json",
    "groups_info.json",
    "algs_info.json",
    "scrambles.json",
    "combined.json",
)

SET_LABELS = {
    "T-ZBLL": "T",
    "U-ZBLL": "U",
    "L-ZBLL": "L",
    "H-ZBLL": "H",
    "Pi-ZBLL": "Pi",
    "Sune-ZBLL": "Sune",
    "Antisune-ZBLL": "Antisune",
}


def fetch_json(file_name: str):
    url = urllib.parse.urljoin(BASE_URL, file_name)
    with urllib.request.urlopen(url) as response:
        return json.loads(response.read().decode("utf-8-sig"))


def write_json(path: Path, data) -> None:
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )


def group_id(name: str) -> str:
    value = name.lower()
    value = value.replace("+", "plus")
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def case_sort_key(case_id: str) -> int:
    return int(case_id)


def group_display_name(algset_name: str, source_group: str) -> str:
    label = SET_LABELS.get(algset_name, algset_name.replace("-ZBLL", ""))
    prefix = f"{algset_name} "
    suffix = source_group[len(prefix):] if source_group.startswith(prefix) else source_group
    return f"{label} {suffix}"


def case_name(label: str, source_name: str, group_names: dict[str, int]) -> str:
    normalized = str(source_name).strip() or "Case"
    count = group_names.get(normalized, 0) + 1
    group_names[normalized] = count
    if count > 1 or not re.search(r"\d$", normalized):
        return f"{label} {normalized}-{count}"
    return f"{label} {normalized}"


def main() -> None:
    source = {file_name: fetch_json(file_name) for file_name in FILES}
    selected = source["selected_algsets.json"]
    algsets = source["algsets_info.json"]
    groups_info = source["groups_info.json"]
    algs_info = source["algs_info.json"]
    scrambles = source["scrambles.json"]
    svgs = source["combined.json"]

    TARGET.mkdir(parents=True, exist_ok=True)

    algset_data = {
        "schemaVersion": 1,
        "puzzle": "3x3",
        "id": "zbll",
        "name": "ZBLL",
        "source": {
            "url": TRAINER_URL,
        },
        "notes": [
            "Algorithms, scrambles, and SVGs are extracted from Mihlefeld's 3x3 ZBLL trainer JSON files.",
            "Recognition tags use the top-level ZBLL set: T, U, L, H, Pi, Sune, or Antisune.",
        ],
    }

    groups = []
    cases = []
    output_svgs = {}

    for algset_name, source_groups in algsets.items():
        if selected.get(algset_name) is not True:
            continue
        recognition = SET_LABELS.get(algset_name, algset_name.replace("-ZBLL", ""))

        for source_group in source_groups:
            case_ids = [str(case_id) for case_id in groups_info[source_group]]
            display_name = group_display_name(algset_name, source_group)
            group_slug = group_id(display_name)
            output_case_ids = []
            names_in_group = {}

            for source_case_id in sorted(case_ids, key=case_sort_key):
                alg_info = algs_info[source_case_id]
                algorithm_list = alg_info.get("a", [])
                scramble_list = scrambles.get(source_case_id, [])
                if not algorithm_list:
                    raise ValueError(f"Missing algorithms for case {source_case_id}")
                if not scramble_list:
                    raise ValueError(f"Missing scrambles for case {source_case_id}")
                if source_case_id not in svgs:
                    raise ValueError(f"Missing SVG for case {source_case_id}")

                output_case_ids.append(source_case_id)
                output_svgs[source_case_id] = svgs[source_case_id]
                cases.append(
                    {
                        "id": source_case_id,
                        "name": case_name(recognition, alg_info.get("name", source_case_id), names_in_group),
                        "group": group_slug,
                        "algorithms": algorithm_list,
                        "scramble": scramble_list[0],
                        "scrambles": scramble_list,
                        "svgId": source_case_id,
                        "tags": {
                            "sourceAlgset": algset_name,
                            "sourceGroup": source_group,
                            "sourceName": alg_info.get("name", ""),
                            "sourceCaseId": source_case_id,
                            "recognition": recognition,
                        },
                    }
                )

            groups.append(
                {
                    "id": group_slug,
                    "name": display_name,
                    "sourceName": source_group,
                    "caseIds": output_case_ids,
                }
            )

    groups_data = {
        "schemaVersion": 1,
        "puzzle": "3x3",
        "algset": "zbll",
        "groups": groups,
    }
    cases_data = {
        "schemaVersion": 1,
        "puzzle": "3x3",
        "algset": "zbll",
        "cases": cases,
    }
    svg_data = {
        "schemaVersion": 1,
        "puzzle": "3x3",
        "algset": "zbll",
        "svgs": output_svgs,
    }

    write_json(TARGET / "algset.json", algset_data)
    write_json(TARGET / "groups.json", groups_data)
    write_json(TARGET / "cases.json", cases_data)
    write_json(TARGET / "svgs.json", svg_data)

    print(f"Fetched {len(cases)} ZBLL cases in {len(groups)} groups to {TARGET}")


if __name__ == "__main__":
    main()
