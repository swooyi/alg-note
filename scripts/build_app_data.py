import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ALG_ROOT = ROOT / "alg"
OUT = ROOT / "app" / "js" / "data.js"
REQUIRED_FILES = ("algset.json", "groups.json", "cases.json", "svgs.json")


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    datasets = {}
    folders = sorted(
        folder
        for puzzle_folder in ALG_ROOT.iterdir()
        if puzzle_folder.is_dir()
        for folder in puzzle_folder.iterdir()
        if folder.is_dir()
    )
    for folder in folders:
        missing = [name for name in REQUIRED_FILES if not (folder / name).exists()]
        if missing:
            continue
        datasets[folder.name] = {
            name: read_json(folder / name)
            for name in REQUIRED_FILES
        }

    OUT.write_text(
        "window.AlgNoteBundledData = "
        + json.dumps(datasets, ensure_ascii=False, indent=2)
        + ";\n",
        encoding="utf-8",
        newline="\n",
    )
    print(f"Bundled {len(datasets)} datasets to {OUT}")


if __name__ == "__main__":
    main()
