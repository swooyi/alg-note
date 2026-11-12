const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("app/js/app.js", "utf8");
const entries = {
  "algset.json": { id: "test", puzzle: "3x3", name: "Test" },
  "groups.json": { groups: [{ id: "g", name: "Group" }] },
  "cases.json": { algset: "test", cases: [
    { id: "1", name: "A", group: "g", svgId: "old", scramble: "R", algorithms: ["R'"] },
    { id: "2", name: "B", group: "g", svgId: "second", scramble: "U", algorithms: ["U'"] },
  ] },
  "svgs.json": { svgs: { old: "<svg>original</svg>", second: "<svg>second</svg>" } },
};
const imageState = { view: "ll", settings: { image: { base: { U: "#112233" } } } };
const image = { svg: "<svg>edited</svg>", imageState };
const context = vm.createContext({
  window: { AlgNoteBundledData: { test: entries } },
  datasetKey: (dataset) => `${dataset.puzzle}:${dataset.algset}`,
  loadJson: () => ({}),
});
vm.runInContext(fs.readFileSync("app/js/normalize.js", "utf8"), context);
context.normalizeDataset = context.window.AlgNoteNormalize.normalizeDataset;
context.state = {
  entries, dataset: context.normalizeDataset(entries), key: "3x3:test",
  edits: new Map(), algorithmNotes: new Map(), imageOverrides: new Map([["1", image]]),
  allImageOverrides: new Map(),
};
for (const name of ["recognitionList", "recognitionValueForJson", "applyCaseEdit", "effectiveCases", "notesForAlgorithms", "imageStateForJson", "editedCasesForDataset", "makeAllEditedCasesJson"]) {
  const match = source.match(new RegExp(`function ${name}\\([^]*?\\n\\}`));
  assert.ok(match, name);
  vm.runInContext(match[0], context);
}
const plain = value => JSON.parse(JSON.stringify(value));
// Image settings remain active even though edited JSON excludes image data.
assert.equal(context.effectiveCases()[0].svg, image.svg);
assert.deepEqual(plain(context.effectiveCases()[0].imageState), imageState);
assert.equal(context.makeAllEditedCasesJson().editedCount, 0, "image-only changes are not exported");
context.state.key = "3x3:other";
context.state.allImageOverrides.set("3x3:test", context.state.imageOverrides);
assert.equal(context.makeAllEditedCasesJson().editedCount, 0, "other datasets' image-only changes are excluded");
context.state.key = "3x3:test";
context.state.edits.set("1", { scramble: "F", algorithms: ["F'"], recognition: [] });
const edited = plain(context.makeAllEditedCasesJson());
assert.equal(edited.editedCount, 1);
assert.equal(edited.datasets[0].cases[0].svgId, "old", "keep the stable image reference");
assert.equal(edited.datasets[0].cases[0].scramble, "F");
assert.equal(edited.datasets[0].cases[0].imageState, undefined);
assert.equal(edited.datasets[0].svgs, undefined);
assert.ok(!JSON.stringify(edited).includes('"imageState"'));
context.state.imageOverrides.set("1", { svg: "<svg>upload</svg>", imageState: undefined });
assert.equal(context.effectiveCases()[0].svg, "<svg>upload</svg>");
assert.equal(context.effectiveCases()[0].imageState, undefined);
assert.equal(context.makeAllEditedCasesJson().editedCount, 1, "image changes do not add export entries");
const legacy = structuredClone(entries);
legacy["cases.json"].cases[0].imageState = { ...imageState, svg: image.svg };
context.state.dataset = context.normalizeDataset(legacy);
context.state.imageOverrides = new Map();
assert.equal(context.effectiveCases()[0].svg, image.svg, "legacy embedded images remain readable");
assert.deepEqual(plain(context.imageStateForJson(legacy["cases.json"].cases[0].imageState)), imageState);
console.log("PASS: edited JSON excludes imageState/SVG and image-only cases; runtime images, uploads, stable references and legacy settings preserved");
