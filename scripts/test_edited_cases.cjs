const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('app/js/app.js', 'utf8');
const entries = {
  'algset.json': { id: 'test', name: 'Test', puzzle: 'FTO' },
  'groups.json': { groups: [{ id: 'g', name: 'Group' }] },
  'cases.json': { cases: [
    { id: '1', name: 'A', group: 'g', svgId: 'image1', scramble: "R'2 U", algorithms: ["R'2", 'U'], tags: { recognition: ['a', 'b'] }, algorithmNotes: { "R'2": 'double', U: 'up' } },
    { id: '2', name: 'B', group: 'g', scramble: 'U', algorithms: ["U'"], tags: { recognition: 'a' } },
  ] },
  'svgs.json': { svgs: {} },
};
const context = vm.createContext({ window: {}, Map });
vm.runInContext(fs.readFileSync('app/js/normalize.js', 'utf8'), context);
context.normalizeDataset = context.window.AlgNoteNormalize.normalizeDataset;
for (const name of ['recognitionList', 'notesForAlgorithms', 'editedCasesForDataset']) {
  const match = source.match(new RegExp(`function ${name}\\([^]*?\\n\\}`));
  assert.ok(match, name);
  vm.runInContext(match[0], context);
}
const plain = value => JSON.parse(JSON.stringify(value));
const original = entries['cases.json'].cases[0];
const base = { scramble: original.scramble, algorithms: original.algorithms, recognition: original.tags.recognition };
const result = (edit, notes) => plain(context.editedCasesForDataset(entries,
  new Map(edit ? [['1', edit]] : []), new Map(notes === undefined ? [] : [['1', notes]])));
assert.deepEqual(result(), []);
assert.deepEqual(result(base, original.algorithmNotes), [], 'saved edits already reflected in source are excluded');
assert.deepEqual(result({ ...base, recognition: ['b', 'a', 'a'] }, { U: 'up', "R'2": 'double' }), [], 'tag and note ordering do not create edits');
const oldSpelling = { ...base, scramble: "R2' U", algorithms: ["R2'", 'U'] };
assert.deepEqual(result(oldSpelling, { "R2'": 'double', U: 'up' }), [], 'legacy double-turn spelling is equivalent');
assert.deepEqual(result(oldSpelling, original.algorithmNotes), [], 'source notes survive stale algorithm spelling');
assert.deepEqual(result(oldSpelling), [], 'missing saved notes inherit source notes');
for (const [field, value] of [['scramble', 'F'], ['algorithms', ['U', "R'2"]], ['recognition', ['a']]]) {
  const rows = result({ ...base, [field]: value });
  assert.equal(rows.length, 1, field);
  assert.deepEqual(rows[0][field], value, field);
  assert.equal(rows[0].imageState, undefined);
  assert.equal(rows[0].svgId, 'image1');
}
assert.equal(result(base, { "R'2": 'changed', U: 'up' }).length, 1, 'note changes are exported');
assert.deepEqual(result(base, {})[0].algorithmNotes, {}, 'explicit note deletion is exported');
assert.deepEqual(result(base, { ...original.algorithmNotes, 'obsolete algorithm': 'ignored' }), [], 'notes for removed algorithms are ignored');
const canonical = result({ ...oldSpelling, scramble: "R2' F" }, { "R2'": 'double', U: 'up' })[0];
assert.equal(canonical.scramble, "R'2 F");
assert.deepEqual(canonical.algorithms, ["R'2", 'U']);
assert.deepEqual(canonical.algorithmNotes, original.algorithmNotes);
assert.deepEqual(plain(context.editedCasesForDataset(entries, new Map([['missing', base]]), new Map())), [], 'removed case IDs are not exported');
assert.deepEqual(plain(context.editedCasesForDataset(entries, new Map([['2', { scramble: 'U', algorithms: ["U'"], recognition: ['a'] }]]), new Map())), [], 'single recognition string and array are equivalent');
console.log('PASS: current-source comparison, stale records, notation aliases, notes/deletions, tag ordering, real field changes, removed cases and image exclusion');
