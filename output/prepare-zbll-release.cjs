const fs=require('node:fs'),cp=require('node:child_process'),path=require('node:path');
const root='output/zbll-release';
for(const file of cp.execFileSync('git',['ls-tree','-r','--name-only','HEAD','app'],{encoding:'utf8'}).trim().split('\n')) {
 const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});
 fs.writeFileSync(target,cp.execFileSync('git',['show','HEAD:'+file],{maxBuffer:100*1024*1024}));
}
const target=path.join(root,'app/js/app.js'),head=fs.readFileSync(target,'utf8');
let source=fs.readFileSync('app/js/app.js','utf8');
for(const name of ['nextTrainingCaseId','startNewQuiz','toggleQuizOrderPanel','updateQuizOrderControls','renderQuiz','drillQueue','toggleDrillOrderPanel','updateDrillOrderControls','renderDrill','moveToNextDrillCase','undoDrillResult','drillResultsAtLeast']) {
 const re=new RegExp('function '+name+'\\([^]*?\\n}');
 const original=head.match(re);if(!original) throw Error(name);
 source=source.replace(re,()=>original[0]);
}
fs.writeFileSync(target,source);
const cssFile=path.join(root,'app/css/style.css');
const css=fs.readFileSync('app/css/style.css','utf8');
const block=css.slice(css.indexOf('.drill-viewpoint-label {'),css.indexOf('\n.drill-auf-panel button {'));
fs.writeFileSync(cssFile,fs.readFileSync(cssFile,'utf8').replace('.drill-auf-panel button {',block+'.drill-auf-panel button {'));
for(const file of ['index.html','sw.js']) fs.copyFileSync('app/'+file,path.join(root,'app',file));
let test=fs.readFileSync('output/check-zbll.cjs','utf8').replace("readFileSync('app/js/app.js'", "readFileSync('output/zbll-release/app/js/app.js'").replace("process.cwd(), 'app',", "process.cwd(), 'output/zbll-release/app',");
test=test.replace("page.on('pageerror', error => console.error('PAGE ERROR',error.message));", "const errors=[]; page.on('pageerror', error => errors.push(error.message));");
test=test.replace("await browser.close(); server.close();", "assert.deepEqual(errors,[]); await browser.close(); server.close();");
fs.writeFileSync('output/check-zbll-release.cjs',test);

