const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync(process.argv[2] || "app/js/app.js", "utf8");
const context = vm.createContext({
  state: { dataset: { puzzle: "FTO" }, drill: { aufMode: "u" } },
  normalizeDrillAufMode: (mode) => mode,
  supportsDrillAuf: () => true,
  isZbll: () => false,
  randomLeadingAufMove: () => "",
  randomAufMove: () => "U",
  DRILL_AUF_FIXED_MOVES: { u: "U", up: "U'", u2: "U2" },
  t: (key) => key,
});
for (const name of ["mergeFtoBoundaryAuf", "makeDrillSetup"]) {
  const match = source.match(new RegExp(`function ${name}\\([^]*?\\n\\}`));
  assert.ok(match, name);
  vm.runInContext(match[0], context);
}
const make = (scramble) => context.makeDrillSetup({ scramble });
for (const front of ["", "U", "U'"]) {
  context.randomLeadingAufMove = () => front;
  for (const mode of ["u", "up", "random"]) {
    context.state.drill.aufMode = mode;
    for (let leading = 0; leading < 5; leading += 1) {
      for (let trailing = 0; trailing < 5; trailing += 1) {
        const input = [...Array(leading).fill("U"), "L", "U", "U", "B", ...Array(trailing).fill("U'")].join(" ");
        const back = mode === "random" && trailing ? 0 : mode === "up" ? 2 : 1;
        const expected = [["", "U", "U'"][(leading + (front === "U" ? 1 : front ? 2 : 0)) % 3],
          "L U U B", ["", "U", "U'"][(trailing * 2 + back) % 3]].filter(Boolean).join(" ");
        assert.equal(make(input), expected);
      }
    }
  }
}
context.randomLeadingAufMove = () => "";
context.state.drill.aufMode = "u";
assert.equal(make("L' B' BR' B L B' BR B' L' B' L U"), "L' B' BR' B L B' BR B' L' B' L U'");
assert.equal(make("U'"), "");
assert.equal(context.mergeFtoBoundaryAuf("U U U"), "");
assert.equal(context.mergeFtoBoundaryAuf("U' U'"), "U");
context.state.drill.aufMode = "none";
assert.equal(make("U U L U U"), "U U L U U");
context.state.drill.aufMode = "u";
context.state.dataset.puzzle = "3x3";
assert.equal(make("R U"), "R U U");
assert.equal(make(""), "noSetup");
console.log("PASS: 225 FTO boundary combinations, screenshot regression, cancellation, AUF off, 3x3 unchanged");
