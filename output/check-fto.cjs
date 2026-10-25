const { chromium } = require('C:/Users/seung/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
(async () => {
  const root = path.resolve('output/fto-release');
  const server = require('node:http').createServer((req,res)=>{
    let file = path.join(root, new URL(req.url,'http://localhost').pathname);
    if(file.endsWith(path.sep)) file += 'index.html';
    try {
      let data = fs.readFileSync(file);
      if(file.endsWith('index.html')) data=data.toString().replace('\"serviceWorker\" in navigator','false');
      if(file.endsWith(path.join('js','app.js'))) data = data.toString().replace(/\}\)\(\);\s*$/, 'window.ftoTest = { state, startDrill, saveDrillAufMode, makeDrillSetup, renderDrill, selectedDrillCases };\n})();');
      res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');
      res.end(data);
    } catch {res.statusCode=404;res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,channel:'msedge'});
  try {
    const page=await browser.newPage({viewport:{width:390,height:844}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const url=`http://127.0.0.1:${server.address().port}/app/`;
    await page.goto(url);
    await page.locator('[data-dataset-key]').first().click();
    assert.match(await page.evaluate(()=>ftoTest.state.dataset.puzzle),/fto/i);
    if(await page.locator('#sidebarOpenButton').getAttribute('aria-expanded')==='true') await page.locator('#sidebarOpenButton').click();
    for(const mode of ['compact','list','full']) {
      await page.locator(`[data-view-mode="${mode}"].view-mode-button`).click();
      assert.ok(await page.locator('#caseGrid [data-case-id]').count());
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    }
    const id=await page.locator('#caseGrid [data-case-id]').first().getAttribute('data-case-id');
    await page.evaluate(id=>{
      ftoTest.state.selectedCards=new Set([id]);
      ftoTest.saveDrillAufMode('u');
      ftoTest.startDrill();
      const item=ftoTest.state.drill.queue[0];
      ftoTest.state.drill.currentSetup=ftoTest.makeDrillSetup({...item,scramble:"L' B' BR' B L B' BR B' L' B' L U"});
      ftoTest.renderDrill();
    },id);
    const setup=await page.locator('#drillSetupText').textContent();
    assert.ok(setup.endsWith("L U'"),setup);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.waitForTimeout(400);
    await page.screenshot({path:'output/fto-mobile.png'});
    await page.evaluate(()=>ftoTest.renderDrill());
    assert.equal(await page.locator('#drillSetupText').textContent(),setup);
    await page.reload();
    await page.locator('[data-dataset-key]').first().click();
    assert.equal(await page.evaluate(()=>ftoTest.state.drill.currentSetup),setup);
    assert.equal(await page.evaluate(()=>ftoTest.state.drill.aufMode),'u');
    await page.setViewportSize({width:1440,height:900});
    await page.evaluate(()=>ftoTest.startDrill());
    await page.waitForTimeout(400);
    await page.screenshot({path:'output/fto-desktop.png'});
    assert.deepEqual(errors,[]);
    console.log('PASS: release snapshot, 390x844 three views, drill merge, rerender/reload persistence, desktop, no JS errors');
  } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1)});


