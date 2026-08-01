import csv
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "source"
OUTPUT = ROOT / "output"
SVG_DIR = OUTPUT / "svg"


def case_sort_key(case_id: str) -> int:
    return int(case_id)


def safe_name(value: str) -> str:
    return "".join(ch if ch.isalnum() else "_" for ch in value).strip("_")


def main() -> None:
    OUTPUT.mkdir(exist_ok=True)
    SVG_DIR.mkdir(exist_ok=True)

    algs = json.loads((SOURCE / "algs_info.json").read_text(encoding="utf-8"))
    algsets = json.loads((SOURCE / "algsets_info.json").read_text(encoding="utf-8"))
    groups = json.loads((SOURCE / "groups_info.json").read_text(encoding="utf-8"))
    svgs = json.loads((SOURCE / "combined.json").read_text(encoding="utf-8"))

    rows = []
    for case_id in sorted(algs, key=case_sort_key):
        info = algs[case_id]
        name = info.get("name", case_id)
        group = info.get("group", "")
        algset = info.get("algset", "")
        alg_list = info.get("a", [])
        scramble = info.get("s", "")
        svg_file = f"{case_id.zfill(3)}_{safe_name(name)}.svg"

        (SVG_DIR / svg_file).write_text(svgs[case_id], encoding="utf-8", newline="\n")

        rows.append(
            {
                "id": case_id,
                "name": name,
                "algset": algset,
                "group": group,
                "algorithms": alg_list,
                "algorithm_count": len(alg_list),
                "scramble": scramble,
                "svg_file": f"svg/{svg_file}",
            }
        )

    csv_path = OUTPUT / "fto_lbt_set_alg_summary.csv"
    with csv_path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "id",
                "name",
                "algset",
                "group",
                "algorithms",
                "algorithm_count",
                "scramble",
                "svg_file",
            ],
        )
        writer.writeheader()
        for row in rows:
            writer.writerow({**row, "algorithms": " | ".join(row["algorithms"])})

    structured = {
        "source_url": "https://mihlefeld.github.io/Alg-Trainers/FTO-LBT-Trainer/index.html?select",
        "algsets": algsets,
        "groups": groups,
        "cases": rows,
    }
    (OUTPUT / "fto_lbt_set_alg_summary.json").write_text(
        json.dumps(structured, ensure_ascii=False, indent=2),
        encoding="utf-8",
        newline="\n",
    )

    md_lines = [
        "# FTO LBT Set / Alg Summary",
        "",
        f"- Source: {structured['source_url']}",
        f"- Cases: {len(rows)}",
        f"- SVG files: {len(rows)} in `svg/`",
        "",
    ]

    for algset, group_names in algsets.items():
        md_lines.extend([f"## {algset}", ""])
        for full_group_name in group_names:
            group_name = full_group_name.removeprefix(f"{algset} ")
            group_rows = [row for row in rows if row["group"] == group_name]
            md_lines.extend([f"### {full_group_name}", ""])
            md_lines.append("| ID | Name | Alg | Scramble | SVG |")
            md_lines.append("|---:|---|---|---|---|")
            for row in group_rows:
                alg_text = "<br>".join(row["algorithms"])
                md_lines.append(
                    f"| {row['id']} | {row['name']} | {alg_text} | {row['scramble']} | `{row['svg_file']}` |"
                )
            md_lines.append("")

    (OUTPUT / "fto_lbt_set_alg_summary.md").write_text(
        "\n".join(md_lines),
        encoding="utf-8",
        newline="\n",
    )

    print(f"Exported {len(rows)} SVG files")
    print(csv_path)
    print(OUTPUT / "fto_lbt_set_alg_summary.json")
    print(OUTPUT / "fto_lbt_set_alg_summary.md")


if __name__ == "__main__":
    main()
