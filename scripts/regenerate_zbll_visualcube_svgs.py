import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CASES_PATH = ROOT / "alg" / "3x3" / "zbll" / "cases.json"
SVGS_PATH = ROOT / "alg" / "3x3" / "zbll" / "svgs.json"
CACHE_DIR = ROOT / "source" / "cache" / "visualcube-zbll"
FAILURES_PATH = CACHE_DIR / "failures.json"
VISUALCUBE_URL = "https://visualcube.api.cubing.net/visualcube.php"
REQUEST_DELAY_SECONDS = 0.08
RETRIES = 2


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data) -> None:
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )


def normalize_algorithm(algorithm: str) -> str:
    value = algorithm.replace("\u00a0", " ").strip()
    value = re.sub(r"\((U2?|U')\)", r"\1", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def visualcube_url(algorithm: str) -> str:
    query = urllib.parse.urlencode(
        {
            "fmt": "svg",
            "size": "150",
            "pzl": "3",
            "stage": "ll",
            "view": "plan",
            "case": algorithm,
        }
    )
    return f"{VISUALCUBE_URL}?{query}"


def is_valid_svg(text: str) -> bool:
    stripped = text.lstrip()
    return stripped.startswith("<svg") and "</svg>" in stripped and "<html" not in stripped[:200].lower()


def fetch_svg(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": "alg-note-zbll-visualcube-regenerator/1.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8")


def load_or_fetch_svg(case_id: str, algorithm: str) -> tuple[str | None, str | None]:
    cache_path = CACHE_DIR / f"{case_id}.svg"
    if cache_path.exists():
        cached = cache_path.read_text(encoding="utf-8")
        if is_valid_svg(cached):
            return cached, None
        cache_path.unlink()

    url = visualcube_url(algorithm)
    last_error = ""
    for attempt in range(RETRIES + 1):
        try:
            svg = fetch_svg(url)
            if not is_valid_svg(svg):
                raise ValueError("response is not a valid SVG")
            cache_path.write_text(svg, encoding="utf-8", newline="\n")
            if attempt == 0:
                time.sleep(REQUEST_DELAY_SECONDS)
            return svg, None
        except Exception as exc:
            last_error = str(exc)
            if attempt < RETRIES:
                time.sleep(0.5 * (attempt + 1))

    return None, last_error


def main() -> None:
    cases_data = read_json(CASES_PATH)
    cases = cases_data["cases"]
    CACHE_DIR.mkdir(parents=True, exist_ok=True)

    svgs = {}
    failures = []

    for index, case in enumerate(cases, start=1):
        case_id = str(case["id"])
        algorithms = case.get("algorithms") or []
        if not algorithms:
            failures.append({"caseId": case_id, "error": "missing algorithms"})
            continue

        algorithm = normalize_algorithm(str(algorithms[0]))
        svg, error = load_or_fetch_svg(case_id, algorithm)
        if error:
            failures.append(
                {
                    "caseId": case_id,
                    "name": case.get("name", ""),
                    "algorithm": algorithm,
                    "url": visualcube_url(algorithm),
                    "error": error,
                }
            )
            continue
        svgs[case_id] = svg

        if index % 25 == 0 or index == len(cases):
            print(f"{index}/{len(cases)} cases processed")

    write_json(FAILURES_PATH, failures)
    if failures:
        print(f"Failed to generate {len(failures)} SVGs. See {FAILURES_PATH}")
        raise SystemExit(1)

    expected_ids = {str(case["id"]) for case in cases}
    if set(svgs) != expected_ids:
        missing = sorted(expected_ids - set(svgs), key=int)
        extra = sorted(set(svgs) - expected_ids, key=int)
        raise SystemExit(f"SVG key mismatch: missing={missing[:10]} extra={extra[:10]}")

    svg_data = {
        "schemaVersion": 1,
        "puzzle": "3x3",
        "algset": "zbll",
        "svgs": {case_id: svgs[case_id] for case_id in sorted(svgs, key=int)},
    }
    write_json(SVGS_PATH, svg_data)
    print(f"Generated {len(svgs)} VisualCube SVGs to {SVGS_PATH}")


if __name__ == "__main__":
    main()
