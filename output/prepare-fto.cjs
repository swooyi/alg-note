const fs = require('node:fs');
const cp = require('node:child_process');
const head = cp.execFileSync('git', ['show', 'HEAD:app/js/app.js'], {encoding:'utf8'});
const working = fs.readFileSync('app/js/app.js','utf8');
const helper = working.match(/function mergeFtoBoundaryAuf\([^]*?\n\}/)[0];
const original = head.match(/function makeDrillSetup\([^]*?\n\}/)[0];
const updated = original.replace('  const back = mode === "random" ? randomAufMove() : DRILL_AUF_FIXED_MOVES[mode];', `  const isFto = String(state.dataset?.puzzle || "").toLowerCase().includes("fto");
  const hasTrailingFtoAuf = isFto && /(?:^|\\s)U'?$/.test(setup);
  const back = mode === "random"
    ? (hasTrailingFtoAuf ? "" : randomAufMove())
    : DRILL_AUF_FIXED_MOVES[mode];`).replace('  return [front, setup, back].filter(Boolean).join(" ");', '  const combined = [front, setup, back].filter(Boolean).join(" ");\n  return isFto ? mergeFtoBoundaryAuf(combined) : combined;');
fs.mkdirSync('output/fto-release/app', {recursive:true});
const files = cp.execFileSync('git',['ls-tree','-r','--name-only','HEAD','app'],{encoding:'utf8'}).trim().split('\n');
for(const file of files) {
  const target = 'output/fto-release/'+file;
  fs.mkdirSync(require('node:path').dirname(target),{recursive:true});
  fs.writeFileSync(target,cp.execFileSync('git',['show','HEAD:'+file],{maxBuffer:100*1024*1024}));
}
fs.writeFileSync('output/fto-release/app/js/app.js',head.replace(original,helper+'\n\n\n'+updated));
fs.copyFileSync('app/sw.js','output/fto-release/app/sw.js');
