const fs=require('node:fs'),cp=require('node:child_process'),path=require('node:path');
const root='output/groups-release';
for(const file of cp.execFileSync('git',['ls-tree','-r','--name-only','HEAD','app'],{encoding:'utf8'}).trim().split('\n')) {
  const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,cp.execFileSync('git',['show','HEAD:'+file],{maxBuffer:100*1024*1024}));
}
const file=path.join(root,'app/js/app.js');
const pattern=/function renderDatasetOptions\([^]*?\n\}/;
fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace(pattern,fs.readFileSync('app/js/app.js','utf8').match(pattern)[0]));
fs.copyFileSync('app/sw.js',path.join(root,'app/sw.js'));
let test=fs.readFileSync('output/check-cfop.cjs','utf8');
test=test.replace('path.join(process.cwd(),','path.join(process.cwd(),"output/groups-release",');
test=test.replace('res.end(fs.readFileSync(file));',`let data=fs.readFileSync(file); if(file.endsWith('index.html')) data=data.toString().replace('"serviceWorker" in navigator','false'); res.end(data);`);
test=test.replace("assert.equal(await page.locator('[data-puzzle=\"3x3 ZB\"] .dataset-choice-button').count(), 3);", "assert.deepEqual(await page.locator('[data-puzzle=\"3x3 ZB\"] .dataset-choice-button strong').allTextContents(), ['ZBLL','ZBLS(FL)','ZBLS(FR)']);");
fs.writeFileSync('output/check-groups.cjs',test);
