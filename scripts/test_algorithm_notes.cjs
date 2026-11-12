const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("app/js/app.js", "utf8");
const entries = {
  "algset.json": { id: "test", puzzle: "3x3", name: "Test" },
  "groups.json": { groups: [{ id: "g", name: "Group" }] },
  "cases.json": { algset: "test", cases: [
    { id: "1", name: "A", group: "g", svgId: "image1", algorithms: ["R U", "F U"], scramble: "R'", tags: { recognition: "T" } },
    { id: "2", name: "B", group: "g", svgId: "image2", algorithms: ["L U"], scramble: "L'" },
  ] },
  "svgs.json": { svgs: {} },
};
const context = vm.createContext({
  window: { AlgNoteBundledData: { test: entries } },
  BOOKMARK_TYPES: new Set(),
  recognitionList: (value) => value ? [value] : [],
  recognitionValueForJson: (values) => values[0],
  datasetKey: (dataset) => `${dataset.puzzle}:${dataset.algset}`,
  loadJson: () => ({}),
});
vm.runInContext(fs.readFileSync("app/js/normalize.js", "utf8"), context);
context.normalizeDataset = context.window.AlgNoteNormalize.normalizeDataset;
context.state = {
  entries, dataset: context.normalizeDataset(entries), key: "3x3:test",
  edits: new Map(), algorithmNotes: new Map([["1", { "R U": "first\nsecond" }]]),
};
for (const name of ["applyCaseEdit", "notesForAlgorithms", "editedCasesForDataset", "makeAllEditedCasesJson", "migrateFto1l3tTrailingAuf", "loadPersonalState"]) {
  const match = source.match(new RegExp(`function ${name}\\([^]*?\\n\\}`));
  assert.ok(match, name);
  vm.runInContext(match[0], context);
}
const plain = (value) => JSON.parse(JSON.stringify(value));
const exported = () => plain(context.makeAllEditedCasesJson());
const edited = exported().datasets[0];
assert.equal(edited.editedCount, 1, "notes-only cases must be exported");
assert.deepEqual(edited.cases[0].algorithmNotes, { "R U": "first\nsecond" });
assert.equal(context.makeAllEditedCasesJson().editedCount, 1);
// Round-trip through source JSON, without relying on local browser storage.
const full = { ...entries["cases.json"], cases: entries["cases.json"].cases.map(item => ({ ...item, algorithmNotes: context.state.algorithmNotes.get(item.id) || {} })) };
const imported = { ...entries, "cases.json": full };
context.window.AlgNoteBundledData.test = imported;
context.state.dataset = context.normalizeDataset(imported);
context.state.algorithmNotes = new Map();
context.loadPersonalState();
assert.deepEqual(plain(context.state.algorithmNotes.get("1")), { "R U": "first\nsecond" });
context.state.entries = imported;
assert.equal(exported().editedCount, 0, "source notes are not local edits");
// An explicit empty mapping removes a source note instead of resurrecting it.
context.state.algorithmNotes.set("1", {});
assert.deepEqual(exported().datasets[0].cases[0].algorithmNotes, {});
assert.equal(exported().editedCount, 1);
context.loadJson = () => ({ algorithmNotes: { "1": {} } });
context.loadPersonalState();
assert.deepEqual(plain(context.state.algorithmNotes.get("1")), {});
console.log("PASS: notes-only edited exports, metadata preservation, JSON round-trip, source defaults, deletion overrides");
