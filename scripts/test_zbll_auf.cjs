const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("app/js/app.js", "utf8");
const context = vm.createContext({
  state: { dataset: { algset: "zbll" }, drill: { aufMode: "random", viewpoints: ["y"] } },
  normalizeDrillAufMode: (mode) => mode,
  normalizeDrillViewpoints: (values) => values,
  randomItem: (values) => values[0],
  randomLeadingAufMove: () => "U",
  t: (key) => key,
});
for (const name of ["isZbll", "simplifyCubeSetup", "makeDrillSetup", "makeDrillResult"]) {
  const match = source.match(new RegExp(`function ${name}\\([^]*?\\n\\}`));
  assert.ok(match, name);
  vm.runInContext(match[0], context);
}

const turns = ["", "U", "U2", "U'"];
for (let a = 0; a < 4; a += 1) {
  for (let b = 0; b < 4; b += 1) {
    assert.equal(context.simplifyCubeSetup(`${turns[a]} ${turns[b]}`), turns[(a + b) % 4]);
  }
}
assert.equal(context.simplifyCubeSetup("R U U' R'"), "");
assert.equal(context.simplifyCubeSetup("F2 F2 L L B' B' D2 D"), "L2 B2 D'");
assert.equal(context.simplifyCubeSetup("R x R' r r' M M'"), "R x R' r r' M M'");
const make = (scramble) => context.makeDrillSetup({ scramble });
assert.equal(make("U L2 R' U'"), "U2 L2 R'");
context.state.drill.currentSetup = make("U L2 R' U'");
assert.equal(context.makeDrillResult({ id: "1", name: "test" }, 100).setup, context.state.drill.currentSetup);
context.state.drill.aufMode = "none";
context.state.drill.viewpoints = ["none"];
assert.equal(make("R U R'"), "R U R'");
assert.equal(make(""), "noSetup");

const cases = JSON.parse(fs.readFileSync("alg/3x3/zbll/cases.json", "utf8")).cases;
let checked = 0;
for (const item of cases) {
  for (const front of turns) {
    context.randomLeadingAufMove = () => front;
    context.state.drill.aufMode = "random";
    for (const viewpoint of ["none", "y", "y2", "y'"]) {
      context.state.drill.viewpoints = [viewpoint];
      const result = make(item.scramble);
      const moves = result.split(" ");
      assert.ok(moves.every((move, i) => !i || move[0] !== moves[i - 1][0]), item.name);
      assert.equal(context.simplifyCubeSetup(result), result);
      checked += 1;
    }
  }
}
console.log(`PASS: AUF arithmetic, cancellation, notation boundaries, result storage, ${checked} ZBLL combinations`);
