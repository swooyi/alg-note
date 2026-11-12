const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("app/js/app.js", "utf8");
const migration = source.match(/function migrateFto1l3tTrailingAuf\(saved\) \{[^]*?\n\}/);
assert.ok(migration);
const cases = JSON.parse(fs.readFileSync("alg/fto/1l3t/cases.json", "utf8")).cases;
const trailing = cases.filter((item) => / U'?$/.test(item.scramble));
assert.ok(trailing.some((item) => item.name === "Ts-"));

function harness(key = "FTO:1l3t") {
  // Simulate a browser that already ran the previous, incomplete migration.
  const storage = new Map([["migrations.fto1l3tTrailingAuf20261112", true]]);
  const writes = [];
  const context = vm.createContext({
    state: { key, dataset: { cases } },
    loadJson: (name, fallback) => storage.get(name) ?? fallback,
    saveJson: (name, value) => { storage.set(name, value); writes.push(name); },
  });
  vm.runInContext(migration[0], context);
  return { run: context.migrateFto1l3tTrailingAuf, storage, writes };
}

const saved = {
  edits: Object.fromEntries(trailing.map((item) => [item.id, {
    scramble: item.scramble.replace(/ U'?$/, ""),
    algorithms: ["custom algorithm"], recognition: ["custom tag"],
  }])),
  bookmarks: { "152": "yellow-star" },
  algorithmNotes: { "152": { "custom algorithm": "keep this note" } },
};
const expected = JSON.parse(JSON.stringify(saved));
for (const item of trailing) expected.edits[item.id].scramble = item.scramble;
const test = harness();
test.run(saved);
assert.deepEqual(saved, expected, "restore all missing trailing turns while preserving other edits");
assert.equal(test.storage.get("personal.FTO:1l3t"), saved);
const writes = test.writes.length;
test.run(saved);
assert.equal(test.writes.length, writes, "migration runs only once");

const custom = { edits: Object.fromEntries(cases.map((item) => [item.id, {
  scramble: `${item.scramble} R`, algorithms: ["keep"],
}])) };
const customBefore = JSON.stringify(custom);
harness().run(custom);
assert.equal(JSON.stringify(custom), customBefore, "unrelated custom scrambles remain unchanged");
const other = harness("FTO:other");
other.run(saved);
assert.equal(other.writes.length, 0, "other datasets are untouched");
const empty = { edits: {} };
harness().run(empty);
assert.deepEqual(empty, { edits: {} }, "do not create edits for unedited cases");
console.log(`PASS: ${trailing.length} trailing-turn cases, previous migration, preservation, repeat loads, other datasets`);
