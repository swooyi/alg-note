const { chromium } = require('C:/Users/seung/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
(async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const server = require('node:http').createServer((req,res)=>{
    let file = path.join(process.cwd(),decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if (file.endsWith(path.sep)) file += 'index.html';
    try {
      res.setHeader('Content-Type', ({'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'})[path.extname(file)] || 'application/octet-stream');
      res.end(fs.readFileSync(file));
    } catch { res.statusCode=404;res.end(); }
  });
  await new Promise(resolve=>server.listen(8767,'127.0.0.1',resolve));
  const browser = await chromium.launch({headless:true,channel:"msedge"});
  const page = await browser.newPage({viewport:{width:390,height:844}});
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:8767/app/?cfop-check=1');
  await page.waitForTimeout(2000);
  await page.locator('[data-dataset-key="oll"]').waitFor();
  assert.deepEqual(await page.locator('.dataset-puzzle-title').allTextContents(), ['[FTO]', '[SQ1]', '[3x3 CFOP]', '[3x3 ZB]']);
  assert.deepEqual(await page.locator('[data-puzzle="3x3 CFOP"] .dataset-choice-button strong').allTextContents(), ['OLL','PLL']);
  assert.equal(await page.locator('[data-puzzle="3x3 ZB"] .dataset-choice-button').count(), 3);
  await page.screenshot({path:'output/cfop-home-mobile.png',fullPage:true});
  for (const [key,count] of [['oll',57],['pll',21]]) {
    await page.locator(`[data-dataset-key="${key}"]`).click();
    if (await page.locator('#sidebarOpenButton').getAttribute('aria-expanded') === 'true') await page.locator('#sidebarOpenButton').click();
    for (const mode of ['compact','list','full']) {
      await page.locator(`[data-view-mode="${mode}"].view-mode-button`).click();
      await page.waitForTimeout(150);
      assert.equal(await page.locator('#caseGrid [data-case-id]').count(),count);
      assert.equal(await page.locator('#caseGrid .svg-box svg, #caseGrid .svg-box img').count(),0);
      assert.ok((await page.locator('#caseGrid .scramble').first().textContent()).trim().length > 3);
      assert.ok((await page.locator('#caseGrid .algorithm-list').first().textContent()).trim().length > 3);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),`${key} ${mode} horizontal overflow`);
      await page.screenshot({path:`output/cfop-${key}-${mode}-mobile.png`,fullPage:false});
    }
    await page.reload();
    await page.locator(`[data-dataset-key="${key}"]`).click();
    await page.locator('#caseGrid [data-case-id]').first().waitFor();
    assert.equal(await page.locator('#caseGrid').getAttribute('data-view-mode'),'full');
    assert.equal(await page.locator('#caseGrid [data-case-id]').count(),count);
    await page.locator('#homeButton').click();
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.screenshot({path:'output/cfop-home-desktop.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('PASS: home groups, OLL 57 / PLL 21, all three modes, no images, mobile overflow, reload persistence, no JS errors');
  await browser.close();
  server.close();
})().catch(e=>{console.error(e);process.exit(1)});

