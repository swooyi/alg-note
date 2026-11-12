const assert = require('node:assert/strict');

(async () => {
  const { compileFtoSimulation, ftoSimulationState, applyFtoSimulationStep } = await import('../image-simulator-engine/src/fto-eif.js');
  const { applyTokens, parseNotation, identityState, invertTokens } = await import('../image-simulator-engine/src/fto-engine.js');
  const finish = notation => {
    const plan = compileFtoSimulation(notation);
    return ftoSimulationState(plan, plan.steps.length).values;
  };
  for (const [mixed, canonical] of [
    ["Br Bl' Brw Blw2", "BR BL' BRw BLw2"],
    ["{Br,U} Bl Br'", "{BR,U} BL BR'"],
    ["[Br:Bl U Bl']", "[BR:BL U BL']"],
  ]) {
    assert.deepEqual(finish(mixed), finish(canonical));
    assert.deepEqual(compileFtoSimulation(mixed).ranges, compileFtoSimulation(canonical).ranges);
  }
  assert.deepEqual(parseNotation("Br Bl' Brw Blw2"), parseNotation("BR BL' BRw BLw2"));
  const vm = require('node:vm'), fs = require('node:fs');
  const angleSource = fs.readFileSync('image-simulator-engine/src/simulator-fto.js', 'utf8').match(/function simTokenAngle\(token\) \{[^]*?\n\}/)[0];
  const angles = vm.createContext({});
  vm.runInContext(angleSource, angles);
  const doubleSetup = applyTokens(identityState(), parseNotation('R U B'));
  for (const move of ['R', 'U', 'BL', 'Rw', 'Us', 'Br', '{Ro}']) {
    const notation = suffix => move.startsWith('{') ? move.replace('}', `${suffix}}`) : move + suffix;
    for (const [suffix, equivalent, direction] of [['2', "'", -1], ["'2", '', 1], ["2'", '', 1], ['′2', '', 1]]) {
      const input = notation(suffix), plan = compileFtoSimulation(input);
      assert.equal(plan.steps.length, 1, input);
      assert.equal(plan.steps[0].end, input.length, 'highlight includes full suffix');
      assert.deepEqual(finish(input), finish(notation(equivalent)), input);
      assert.deepEqual(parseNotation(input), parseNotation(notation(equivalent)), 'image parser keeps canonical state');
      assert.ok(Math.abs(angles.simTokenAngle(plan.steps[0].physical) - direction * Math.PI * 4 / 3) < 1e-10, input);
      const inverse = invertTokens([plan.steps[0].physical])[0];
      assert.ok(Math.abs(angles.simTokenAngle(inverse) + direction * Math.PI * 4 / 3) < 1e-10, 'inverse preserves two turns');
      const end = applyFtoSimulationStep(doubleSetup, plan.steps[0]);
      assert.deepEqual(applyFtoSimulationStep(end, plan.steps[0], true), doubleSetup);
    }
  }
  assert.deepEqual(finish("[R2,U'2]"), finish("R2 U'2 R'2 U2"));
  assert.deepEqual(finish("{B,U} R'2"), finish('{B,U} R'));
  assert.deepEqual(finish("T'2"), finish('T2'));
  for (const [bracket, expanded] of [
    ['[U] S', 'U S'],
    ["[L : R B R']", "L R B R' L'"],
    ['[R,U]', "R U R' U'"],
    ['[R:[U,F]]', "R U F U' F' R'"],
    ["{B,U} [R,U]", "{B,U} R U R' U'"],
  ]) assert.deepEqual(finish(bracket), finish(expanded), bracket);
  assert.throws(() => compileFtoSimulation('[R,U'), /대괄호/);
  assert.throws(() => compileFtoSimulation('[{B,U}:R]'), /시점변환/);
  const setup = finish('R U B');
  const plan = compileFtoSimulation("{B,U} R U' S");
  assert.deepEqual(ftoSimulationState(plan, 0, 'setup', setup).values, setup);
  assert.notDeepEqual(setup, identityState());
  let expected = { ...setup };
  for (let index = 0; index < plan.steps.length; index++) {
    expected = applyFtoSimulationStep(expected, plan.steps[index]);
    assert.deepEqual(ftoSimulationState(plan, index + 1, 'setup', setup).values, expected);
    const step = plan.steps[index];
    assert.ok(step.start >= 0 && step.end <= "{B,U} R U' S".length);
  }
  assert.deepEqual(ftoSimulationState(plan, 0, 'setup', setup).values, setup, 'rewind preserves supplied setup');
  const plain = compileFtoSimulation('U R');
  assert.deepEqual(ftoSimulationState(plain, 2).values, applyTokens(identityState(), parseNotation('U R')), 'standalone simulator is unchanged');
  console.log('PASS: case setup, signed double turns, inverse animation, playback steps, rewind, EIF offsets, brackets and standalone compatibility');
})().catch(error => { console.error(error); process.exitCode = 1; });
