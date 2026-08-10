import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ALG_ROOT = ROOT / "alg"
OUT = ROOT / "app" / "js" / "data.js"
SW = ROOT / "app" / "sw.js"
REQUIRED_FILES = ("algset.json", "groups.json", "cases.json", "svgs.json")
CACHE_NAME_RE = re.compile(r'const CACHE_NAME = "alg-note-v(\d+)";')


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def bump_service_worker_cache() -> bool:
    source = SW.read_text(encoding="utf-8")
    match = CACHE_NAME_RE.search(source)
    if not match:
        raise ValueError(f"Missing CACHE_NAME in {SW}")

    next_version = int(match.group(1)) + 1
    updated = CACHE_NAME_RE.sub(f'const CACHE_NAME = "alg-note-v{next_version}";', source, count=1)
    SW.write_text(updated, encoding="utf-8", newline="\n")
    return True


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

    bundled = "window.AlgNoteBundledData = " + json.dumps(datasets, ensure_ascii=False, indent=2) + ";\n"
    previous = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
    OUT.write_text(bundled, encoding="utf-8", newline="\n")
    if previous != bundled:
        bump_service_worker_cache()
    print(f"Bundled {len(datasets)} datasets to {OUT}")


if __name__ == "__main__":
    main()
