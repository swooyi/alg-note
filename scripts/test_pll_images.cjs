const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

(async () => {
  const { applyTokens, identityState, parseNotation } = await import('../image-simulator-engine/src/cube-engine.js');
  const cases = JSON.parse(fs.readFileSync('alg/3x3/pll/cases.json', 'utf8')).cases;
  const svgs = JSON.parse(fs.readFileSync('alg/3x3/pll/svgs.json', 'utf8')).svgs;
  const bundled = { window: {} };
  vm.runInNewContext(fs.readFileSync('app/js/data.js', 'utf8'), bundled);
  assert.equal(cases.length, 21);
  assert.equal(JSON.stringify(bundled.window.AlgNoteBundledData.pll['cases.json'].cases), JSON.stringify(cases));
  assert.equal(JSON.stringify(bundled.window.AlgNoteBundledData.pll['svgs.json'].svgs), JSON.stringify(svgs));
  const stateAtSource = fs.readFileSync('image-simulator-engine/src/simulator-3x3.js', 'utf8').match(/function cubeStateAt\(index\) \{[^]*?\n\}/)[0];
  for (const item of cases) {
    const image = item.imageState.settings.image;
    assert.equal(item.imageState.view, 'll');
    assert.equal(image.singleView, 'll');
    assert.equal(image.batchView, 'll');
    assert.equal(image.palette.Blank, '#2c2d2d');
    assert.equal(image.notation, item.scramble);
    const setup = parseNotation(item.scramble), steps = parseNotation(item.algorithms[0]);
    const initial = applyTokens(identityState(), setup);
    const colors = applyTokens(image.base, setup);
    const svg = svgs[item.svgId || item.id];
    const stickers = [...svg.matchAll(/fill="(#[\da-f]+)" data-sticker="([URFDLB]\d+)"/gi)];
    assert.equal(stickers.length, 21, `${item.id}: LL sticker count`);
    for (const [, color, sticker] of stickers) assert.equal(color, colors[sticker], `${item.id}: ${sticker}`);
    const finish = applyTokens(colors, steps);
    for (const face of ['U', 'D']) for (let i = 0; i < 9; i++) assert.equal(finish[face + i], image.base[face + i], `${item.id}: oriented ${face}`);
    for (const face of ['R', 'F', 'L', 'B']) {
      for (let i = 0; i < 3; i++) assert.equal(finish[face + i], finish[face + '4']);
      for (let i = 3; i < 9; i++) assert.equal(finish[face + i], finish[face + '4'], `${item.id}: F2L preserved`);
    }
    const context = vm.createContext({ applyTokens, identityState, cubeCaseSources: initial, state: { size: 3, mode: 'setup' }, cubeSteps: steps });
    vm.runInContext(stateAtSource, context);
    for (const index of [0, 1, steps.length, 0]) assert.deepEqual(context.cubeStateAt(index), applyTokens(initial, steps.slice(0, index)));
    // A different selected ALG must keep the case's saved setup.
    context.cubeSteps = parseNotation('R');
    assert.deepEqual(context.cubeStateAt(0), initial);
    assert.deepEqual(context.cubeStateAt(1), applyTokens(initial, parseNotation('R')));
  }
  console.log('PASS: 21 PLL LL settings, SVG colors, bundled data, oriented finish, F2L, setup playback and rewind');
})().catch(error => { console.error(error); process.exitCode = 1; });
