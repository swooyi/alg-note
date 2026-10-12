import argparse
import html
import json
import re
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "alg" / "3x3" / "zbll"
CACHE_DIR = ROOT / "source" / "cache" / "solved-zbll"
COMPARISON = ROOT / "docs" / "zbll-solved-no-comparison.json"
BASE_URL = "https://solved.no/algs/3x3"
SUBSETS = {
    "ZBLLT": "zbllt",
    "ZBLLU": "zbllu",
    "ZBLLL": "zblll",
    "ZBLLH": "zbllh",
    "ZBLLP": "zbllp",
    "ZBLLS": "zblls",
    "ZBLLA": "zblla",
}
SERVER_DATA_RE = re.compile(
    r'<script[^>]+id=["\']algs-template-server-data["\'][^>]*>(.*?)</script>',
    re.IGNORECASE | re.DOTALL,
)
PAREN_RE = re.compile(r"[()]")


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )


def load_subset(prefix: str, refresh: bool):
    slug = SUBSETS[prefix]
    cache_path = CACHE_DIR / f"{slug}.json"
    if cache_path.exists() and not refresh:
        return read_json(cache_path)

    url = f"{BASE_URL}/{slug}/{prefix}01"
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "alg-note-zbll-text-importer/1.0"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        page = response.read().decode("utf-8")
    match = SERVER_DATA_RE.search(page)
    if not match:
        raise ValueError(f"Missing server data in {url}")
    data = json.loads(html.unescape(match.group(1)).strip())
    write_json(cache_path, data)
    return data


def inverse_algorithm(value: str) -> str:
    tokens = PAREN_RE.sub("", value).split()
    inverse = []
    for token in reversed(tokens):
        if token.endswith("'"):
            inverse.append(token[:-1])
        elif token.endswith("2"):
            inverse.append(token)
        else:
            inverse.append(token + "'")
    return " ".join(inverse)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Apply solved.no ZBLL text data while preserving the existing SVG data."
    )
    parser.add_argument("--refresh", action="store_true")
    args = parser.parse_args()

    cases_doc = read_json(TARGET / "cases.json")
    algset_doc = read_json(TARGET / "algset.json")
    comparison = read_json(COMPARISON)
    mapping = {entry["id"]: entry for entry in comparison["cases"]}
    cases = cases_doc["cases"]
    if len(cases) != 472 or set(mapping) != {case["id"] for case in cases}:
        raise ValueError("Expected a complete 472-case comparison mapping")

    sources = {prefix: load_subset(prefix, args.refresh) for prefix in SUBSETS}
    seen_solved_ids = set()
    for case in cases:
        mapped = mapping[case["id"]]
        solved_id = mapped["solvedCaseId"]
        prefix = next((value for value in SUBSETS if solved_id.startswith(value)), None)
        if prefix is None:
            raise ValueError(f"Unknown solved.no case ID: {solved_id}")
        source = sources[prefix]
        algorithm_ids = source["caseAlgorithms"].get(solved_id)
        if not algorithm_ids:
            raise ValueError(f"Missing algorithms for {solved_id}")
        algorithms = [source["algorithmsDict"][str(algorithm_id)]["alg"] for algorithm_id in algorithm_ids]
        user_counts = [source["algorithmsDict"][str(algorithm_id)]["usercount"] for algorithm_id in algorithm_ids]
        setup = inverse_algorithm(algorithms[0])

        old_scrambles = case.get("scrambles") or [case.get("scramble", "")]
        case["name"] = solved_id
        case["algorithms"] = algorithms
        case["scramble"] = setup
        case["scrambles"] = list(dict.fromkeys([setup, *filter(None, old_scrambles)]))
        case.setdefault("tags", {})["recognition"] = mapped["proposedRecognition"]
        case["tags"]["solvedCaseId"] = solved_id
        case["tags"]["solvedUrl"] = mapped["sourceUrl"]
        case["tags"]["solvedAlgorithmUserCounts"] = user_counts
        seen_solved_ids.add(solved_id)

    if len(seen_solved_ids) != 472:
        raise ValueError(f"Expected 472 unique solved.no IDs, found {len(seen_solved_ids)}")

    legacy_url = algset_doc.get("source", {}).get("legacyUrl") or algset_doc.get("source", {}).get("url")
    algset_doc["source"] = {
        "url": "https://solved.no/algs/3x3/",
        "legacyUrl": legacy_url,
    }
    algset_doc["notes"] = [
        "Algorithms, case identifiers, and primary-algorithm-derived setups are imported from solved.no.",
        "Stable local IDs, SVG IDs, groups, and the original SVG artwork are preserved.",
        "Recognition tags contain the top-level ZBLL set and the existing subgroup label.",
    ]

    write_json(TARGET / "cases.json", cases_doc)
    write_json(TARGET / "algset.json", algset_doc)
    print("Applied solved.no text data to 472 cases; svgs.json was not modified.")


if __name__ == "__main__":
    main()
