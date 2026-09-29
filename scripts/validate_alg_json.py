import argparse
import json
from pathlib import Path


REQUIRED_FILES = ("algset.json", "groups.json", "cases.json", "svgs.json")


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def validate(folder: Path) -> list[str]:
    errors = []

    for name in REQUIRED_FILES:
        if not (folder / name).exists():
            errors.append(f"Missing file: {name}")

    if errors:
        return errors

    algset = read_json(folder / "algset.json")
    groups = read_json(folder / "groups.json")
    cases = read_json(folder / "cases.json")
    svgs = read_json(folder / "svgs.json")

    algset_id = algset.get("id")
    is_csp = algset_id == "csp" and algset.get("puzzle") == "SQ1"
    for name, data in (("groups.json", groups), ("cases.json", cases), ("svgs.json", svgs)):
        if data.get("algset") != algset_id:
            errors.append(f"{name}: algset does not match algset.json id")

    group_ids = {group.get("id") for group in groups.get("groups", [])}
    case_ids = {case.get("id") for case in cases.get("cases", [])}
    svg_ids = set(svgs.get("svgs", {}).keys())

    for group in groups.get("groups", []):
        for case_id in group.get("caseIds", []):
            if case_id not in case_ids:
                errors.append(f"groups.json: group {group.get('id')} references missing case {case_id}")

    grouped_case_ids = {
        case_id
        for group in groups.get("groups", [])
        for case_id in group.get("caseIds", [])
    }
    for case_id in sorted(case_ids - grouped_case_ids, key=int):
        errors.append(f"cases.json: case {case_id} is not referenced by any group")

    for case in cases.get("cases", []):
        case_id = case.get("id")
        if case.get("group") not in group_ids:
            errors.append(f"cases.json: case {case_id} has unknown group {case.get('group')}")
        if not case.get("algorithms"):
            errors.append(f"cases.json: case {case_id} has no algorithms")
        if not case.get("scramble") and not is_csp:
            errors.append(f"cases.json: case {case_id} has no representative scramble")
        if is_csp:
            info = case.get("csp", {})
            if len(case.get("algorithms", [])) != 2 or not all(case.get("algorithms", [])):
                errors.append(f"cases.json: CSP case {case_id} needs Odd and Even explanations")
            if info.get("extraCount") not in (0, 1):
                errors.append(f"cases.json: CSP case {case_id} needs a common counting correction")
            probability = info.get("probability")
            if not isinstance(probability, (int, float)) or not 0 < probability <= 1:
                errors.append(f"cases.json: CSP case {case_id} has an invalid probability")
            for layer in ("u", "d"):
                shape = info.get(layer, {})
                if not shape.get("id") or not shape.get("file") or not (folder / "shapes" / shape["file"]).is_file():
                    errors.append(f"cases.json: CSP case {case_id} has a missing {layer} shape")
        svg_id = case.get("svgId", case_id)
        if svg_id not in svg_ids:
            errors.append(f"cases.json: case {case_id} references missing svg {svg_id}")

    for svg_id in sorted(svg_ids - case_ids, key=int):
        errors.append(f"svgs.json: svg {svg_id} has no matching case")

    return errors


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("folder", nargs="?", default="alg/fto/lbt")
    args = parser.parse_args()

    folder = Path(args.folder)
    errors = validate(folder)
    if errors:
        for error in errors:
            print(error)
        raise SystemExit(1)

    print(f"OK: {folder}")


if __name__ == "__main__":
    main()
