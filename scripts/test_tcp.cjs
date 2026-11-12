const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('app/js/app.js', 'utf8');
const context = vm.createContext({ window: {}, localStorage: {
  values: new Map(),
  getItem(key) { return this.values.get(key); },
  setItem(key, value) { this.values.set(key, value); },
} });
for (const file of ['storage', 'data', 'normalize']) {
  vm.runInContext(fs.readFileSync(`app/js/${file}.js`, 'utf8'), context);
}
Object.assign(context, context.window.AlgNoteStorage, context.window.AlgNoteNormalize);
const bundled = context.window.AlgNoteBundledData;
const original = bundled['1l3t'];
const tcp = bundled.tcp;
assert.equal(tcp['cases.json'].cases.length, 18);
assert.deepEqual(Array.from(tcp['groups.json'].groups, group => group.id), ['t-even', 't-odd']);
for (const item of tcp['cases.json'].cases) assert.equal(item, original['cases.json'].cases.find(c => c.id === item.id));
assert.equal(tcp['svgs.json'], original['svgs.json']);
context.BOOKMARK_TYPES = new Set(['yellow-star']);
for (const name of ['recognitionList', 'savePersonalState', 'loadPersonalState', 'migrateFto1l3tTrailingAuf', 'notesForAlgorithms', 'imageStateForJson', 'editedCasesForDataset', 'makeAllEditedCasesJson', 'selectionPresetKey', 'quizStateKey', 'quizOrderModeKey', 'drillStateKey', 'drillAufModeKey', 'drillOrderModeKey', 'viewStateKey']) {
  const match = source.match(new RegExp(`function ${name}\\([^]*?\\n\\}`));
  assert.ok(match, name);
  vm.runInContext(match[0], context);
}
const plain = value => JSON.parse(JSON.stringify(value));
const edit = { scramble: 'R', algorithms: ["R'"], recognition: [] };
context.saveJson('personal.FTO:1l3t', {
  edits: { '1': edit, '150': edit }, algorithmNotes: { '150': { "R'": 'shared note' } },
  bookmarks: { '150': 'yellow-star' }, caseRatings: { '150': { good: 4 } },
});
context.state = { key: 'FTO:tcp', dataset: context.normalizeDataset(tcp) };
context.loadPersonalState();
assert.deepEqual(plain(context.state.edits.get('150')), edit);
assert.equal(context.state.edits.has('1'), false);
assert.equal(context.state.bookmarks.size, 0);
assert.equal(context.state.caseRatings.size, 0);
context.state.edits.delete('150');
context.state.edits.set('151', edit);
context.state.algorithmNotes.set('151', { "R'": 'from TCP' });
context.state.bookmarks.set('151', 'yellow-star');
context.state.caseRatings.set('151', { good: 2, bad: 1 });
context.savePersonalState();
const shared = context.loadJson('personal.FTO:1l3t');
assert.deepEqual(plain(shared.edits), { '1': edit, '151': edit });
assert.equal(shared.algorithmNotes['151']["R'"], 'from TCP');
assert.deepEqual(plain(shared.bookmarks), { '150': 'yellow-star' });
assert.equal(shared.caseRatings['150'].good, 4);
assert.equal(context.loadJson('personal.FTO:tcp').edits, undefined);
context.state.allImageOverrides = new Map();
const exported = plain(context.makeAllEditedCasesJson());
assert.equal(exported.datasets.length, 1, 'shared edits exported once under 1L3T');
assert.equal(exported.datasets[0].key, 'FTO:1l3t');
assert.ok(exported.datasets[0].cases.some(item => item.id === '151'));
context.state = { key: 'FTO:1l3t', dataset: context.normalizeDataset(original) };
context.loadPersonalState();
assert.deepEqual(plain(context.state.edits.get('151')), edit);
context.state.algorithmNotes.set('151', { "R'": 'from 1L3T' });
context.savePersonalState();
context.state = { key: 'FTO:tcp', dataset: context.normalizeDataset(tcp) };
context.loadPersonalState();
assert.equal(context.state.algorithmNotes.get('151')["R'"], 'from 1L3T');
assert.equal(context.state.bookmarks.get('151'), 'yellow-star');
assert.equal(context.state.caseRatings.get('151').good, 2);
for (const name of ['selectionPresetKey', 'quizStateKey', 'quizOrderModeKey', 'drillStateKey', 'drillAufModeKey', 'drillOrderModeKey', 'viewStateKey']) {
  assert.notEqual(context[name]('FTO:tcp'), context[name]('FTO:1l3t'), name);
}
console.log('PASS: TCP 18 shared cases, bidirectional edits/notes, deletion, unrelated edits, independent learning state, canonical export');
