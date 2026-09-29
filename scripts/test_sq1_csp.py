"""Source reconciliation and offline image checks for the CSP import."""
import base64
import json
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

from validate_alg_json import validate

ROOT = Path(__file__).resolve().parents[1]
FOLDER = ROOT / "alg/sq1/csp"
NS = "{http://www.w3.org/2000/svg}"


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


class CspImportTests(unittest.TestCase):
    def setUp(self):
        self.cases = read(FOLDER / "cases.json")["cases"]
        self.svgs = read(FOLDER / "svgs.json")["svgs"]
        self.source = read(ROOT / "source/cache/sq1-csp/sheet.json")["records"]

    def test_all_rows_preserve_source_and_parity_order(self):
        self.assertEqual(len(self.cases), 90)
        self.assertEqual(len(self.source), 90)
        for case, source in zip(self.cases, self.source):
            info, values = case["csp"], source["values"]
            self.assertEqual(info["sourceRow"], source["row"])
            self.assertEqual(info["u"]["name"], " ".join(values[2].split()))
            self.assertEqual(info["d"]["name"], " ".join(values[3].split()))
            self.assertEqual(case["algorithms"], [v.strip() for v in values[8:10]])
            self.assertEqual(info["probability"], values[5])
            self.assertEqual(info["notes"], (values[10] or "").strip())
            self.assertEqual(info["extraCount"], source["extraCount"])
            self.assertEqual(case["scramble"], "")
            self.assertEqual(case["scrambles"], [])

    def test_common_counting_and_unique_pairs(self):
        self.assertEqual(sum(c["csp"]["extraCount"] for c in self.cases), 28)
        self.assertEqual(sum(c["csp"]["extraCount"] == 1 and not c["csp"]["notes"] for c in self.cases), 6)
        pairs = [(c["csp"]["u"]["id"], c["csp"]["d"]["id"]) for c in self.cases]
        self.assertEqual(len({tuple(sorted(p)) for p in pairs}), 90)
        self.assertEqual(sum(u == d for u, d in pairs), 10)

    def test_images_are_complete_and_self_contained(self):
        self.assertEqual(len(list((FOLDER / "shapes").glob("*.svg"))), 29)
        for case in self.cases:
            root = ET.fromstring(self.svgs[case["svgId"]])
            images = root.findall(f"{NS}image")
            self.assertEqual(len(images), 2)
            for image in images:
                href = image.attrib["href"]
                self.assertTrue(href.startswith("data:image/svg+xml;base64,"))
                shape = ET.fromstring(base64.b64decode(href.split(",", 1)[1]))
                self.assertTrue(list(shape.iter(f"{NS}path")))
                self.assertEqual(shape.attrib["viewBox"].split()[-2:], ["200", "200"])
        mapping = {c["csp"]["u"]["label"]: c["csp"]["u"]["file"] for c in self.cases}
        self.assertEqual(mapping["1/7"], "7-1.svg")
        self.assertEqual(mapping["3/5"], "[2C 8e] 5-3.svg")
        self.assertEqual(mapping["2-6"], "[2C 8e] 6-2.svg")

    def test_bundle_matches_source_and_schema(self):
        self.assertEqual(validate(FOLDER), [])
        bundle = (ROOT / "app/js/data.js").read_text(encoding="utf-8")
        datasets = json.loads(bundle.removeprefix("window.AlgNoteBundledData = ").strip().removesuffix(";"))
        for filename in ("algset.json", "groups.json", "cases.json", "svgs.json"):
            self.assertEqual(datasets["csp"][filename], read(FOLDER / filename))


if __name__ == "__main__":
    unittest.main()
