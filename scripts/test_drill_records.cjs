const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("C:/Users/seung/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  const file = path.join(process.cwd(), "app", pathname === "/" ? "index.html" : pathname);
  try {
    res.setHeader("Content-Type", ({ ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".svg": "image/svg+xml" })[path.extname(file)] || "application/octet-stream");
    res.end(fs.readFileSync(file));
  } catch {
    res.writeHead(404).end();
  }
});

(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport, hasTouch: true, serviceWorkers: "block" });
      const page = await context.newPage();
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "serviceWorker", { value: { addEventListener() {}, register: async () => ({ update() {} }) } });
      });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      let acceptDialog = true;
      page.on("dialog", (dialog) => acceptDialog ? dialog.accept() : dialog.dismiss());
      await page.goto(`http://127.0.0.1:${server.address().port}`);
      await page.locator('[data-dataset-key="zbll"]').click();
      if (await page.locator("#sidebarOpenButton").getAttribute("aria-expanded") === "true") await page.locator("#sidebarOpenButton").click();
      for (let i = 0; i < 3; i += 1) await page.locator("#caseGrid .case-card").nth(i).click();
      await page.locator("#drillStartButton").click();
      const initial = await page.evaluate(() => JSON.parse(localStorage.getItem("algNote.drillState.3x3:zbll")));
      assert.equal(initial.sourceIds.length, 3);
      const [a, b, c] = initial.sourceIds;
      await page.evaluate(({ initial, a, b }) => {
        initial.historyExpanded = true;
        initial.results = [
          { id: "a1", caseId: a, caseName: "A", setup: "R U", elapsedMs: 1000, rating: "good" },
          { id: "a2", caseId: a, caseName: "A", setup: "R U", elapsedMs: 3000, rating: "bad" },
          { id: "b1", caseId: b, caseName: "B", setup: "F U", elapsedMs: 4000, rating: "bad" },
        ];
        localStorage.setItem("algNote.drillState.3x3:zbll", JSON.stringify(initial));
      }, { initial, a, b });
      const reopen = async () => {
        await page.reload();
        if (await page.locator('[data-dataset-key="zbll"]').isVisible()) await page.locator('[data-dataset-key="zbll"]').click();
        await page.locator("#drillStartButton").click();
      };
      await reopen();
      const personal = () => page.evaluate(() => JSON.parse(localStorage.getItem("algNote.personal.3x3:zbll")));
      const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem("algNote.drillState.3x3:zbll")));
      const queue = async () => (await saved()).queueIds.slice().sort();
      assert.equal(await page.locator("#drillMinResultSecondsInput").count(), 0);
      assert.equal(await page.locator("[data-result-exclude-case-id]").count(), 0);
      await page.locator("#drillStatsTab").click();
      const rows = await page.locator("#drillStatsPanel tbody tr").allTextContents();
      assert.equal(rows.length, 3);
      const cells = await page.locator("#drillStatsPanel tbody tr").evaluateAll((rows) => rows.map((row) => [...row.cells].map((cell) => cell.textContent)));
      assert.ok(cells.some((row) => row.slice(1).join(",") === "2,2.00,1,1"));
      assert.ok(cells.some((row) => row.slice(1).join(",") === "0,—,0,0"));
      await page.locator('[data-stats-sort="average"]').click();
      assert.equal(await page.locator("#drillStatsPanel tbody tr").first().locator("td").nth(2).textContent(), "4.00");
      await page.locator("#drillFilterPanel summary").click();
      await page.locator("#drillExcludeGoodInput").check();
      assert.deepEqual(await queue(), [b, c].sort());
      assert.equal(await page.locator(".drill-good-filter").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(220, 252, 231)");
      assert.equal(await page.locator(".drill-good-filter .drill-rating-icon").evaluate((el) => getComputedStyle(el).color), "rgb(22, 163, 74)");
      await page.locator('input[name="drillTarget"][value="bad"]').check();
      assert.deepEqual(await queue(), [b]);
      assert.equal(await page.locator(".drill-target-options label.is-bad").evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(254, 226, 226)");
      assert.equal(await page.locator(".drill-target-options .drill-rating-icon").evaluate((el) => getComputedStyle(el).color), "rgb(220, 38, 38)");
      await page.screenshot({ path: `output/drill-filters-${viewport.width}.png` });
      assert.deepEqual((await saved()).sourceIds, initial.sourceIds);
      await reopen();
      assert.deepEqual(await queue(), [b]);
      assert.equal(await page.locator("#drillStatsTab").getAttribute("aria-selected"), "true");
      assert.equal(await page.locator("#drillExcludeGoodInput").isChecked(), true);
      await page.locator("#drillSessionTab").click();
      await page.locator('[data-result-rating-id="b1"][data-rating="bad"]').click();
      assert.deepEqual(await queue(), []);
      assert.match(await page.locator("#drillHintText").textContent(), /필터/);
      await page.keyboard.press("Space");
      assert.equal((await saved()).results.length, 3);
      await reopen();
      assert.deepEqual(await queue(), []);
      await page.locator("#drillResetFilterButton").click();
      assert.deepEqual(await queue(), [a, b, c].sort());
      await page.locator('[data-result-rating-id="b1"][data-rating="good"]').click();
      assert.equal((await saved()).results.find((r) => r.id === "b1").rating, "good");
      await page.locator('[data-result-rating-id="b1"][data-rating="bad"]').click();
      assert.equal(await page.locator('[data-result-rating-id="b1"][data-rating="good"]').getAttribute("aria-pressed"), "false");
      const beforeDelete = await saved(), ratingsBeforeDelete = await personal();
      acceptDialog = false;
      await page.locator('[data-result-delete-id="a1"]').click();
      assert.deepEqual(await saved(), beforeDelete);
      assert.deepEqual(await personal(), ratingsBeforeDelete);
      acceptDialog = true;
      await page.locator('[data-result-delete-id="a1"]').click();
      await page.locator("#drillStatsTab").click();
      assert.ok((await page.locator("#drillStatsPanel tbody tr").allTextContents()).some((text) => text.includes("3.00")));
      if (!await page.locator("#drillFilterPanel").getAttribute("open")) await page.locator("#drillFilterPanel summary").click();
      await page.locator('input[name="drillTarget"][value="unpracticed"]').check();
      assert.deepEqual(await queue(), [c]);
      await page.locator("#drillSessionTab").click();
      await page.locator("#drillMain").click();
      assert.equal(await page.locator('input[name="drillTarget"]').first().isDisabled(), false);
      await page.locator("#drillMain").tap();
      assert.equal(await page.locator('input[name="drillTarget"]').first().isDisabled(), true);
      await page.locator("#drillMain").tap();
      assert.deepEqual(await queue(), []);
      await page.locator("#drillUndoButton").click();
      assert.deepEqual(await queue(), [c]);
      await page.locator("#drillResetFilterButton").click();
      await page.locator("#drillMain").click();
      await page.keyboard.press("Space");
      await page.keyboard.press("Space");
      assert.equal((await saved()).results.length, 3);
      await page.locator("#drillStatsTab").click();
      assert.equal(await page.locator("#drillStatsTab").getAttribute("aria-selected"), "true");
      assert.equal(await page.locator("#drillSessionTab").getAttribute("aria-selected"), "false");
      await page.screenshot({ path: `output/drill-records-${viewport.width}.png` });
      await page.locator("#drillSessionTab").click();
      await page.screenshot({ path: `output/drill-session-${viewport.width}.png` });
      const panel = await page.locator(".drill-history-panel").boundingBox();
      assert.ok(panel.x >= 0 && panel.x + panel.width <= viewport.width + 1);
      assert.ok(panel.y + panel.height <= viewport.height + 1);
      await page.locator("#drillCloseButton").click();
      if (!await page.locator('button[data-view-mode="compact"]').isVisible()) await page.locator("#toolbarToggleButton").click();
      for (const mode of ["compact", "list", "full"]) {
        await page.locator(`button[data-view-mode="${mode}"]`).click();
        assert.equal(await page.locator("#caseGrid .case-card.is-active-card").count(), 3);
      }
      const detail = page.locator("#caseDetail");
      const openCase = async (id) => page.locator(`#caseGrid .case-card[data-case-id="${id}"]`).click({ button: "right" });

      assert.deepEqual((await personal()).caseRatings[a], { good: 0, bad: 1 });
      await openCase(a);
      assert.match(await detail.locator(".case-rating-count.is-bad").textContent(), /1$/);
      const longNote = "첫 번째 공식의 핑거트릭 메모\n".repeat(8).trim();
      assert.equal(await detail.locator(".edit-algorithm-note").count(), 0);
      assert.equal(await detail.locator(".algorithm-note").count(), 0);
      await detail.locator(".edit-button").click();
      assert.equal(await detail.locator(".card-algorithm-note-editor").first().isVisible(), false);
      await detail.locator(".toggle-card-algorithm-note").first().click();
      await detail.locator(".card-algorithm-note-editor").first().fill(longNote);
      await page.screenshot({ path: `output/case-note-editor-${viewport.width}.png` });
      await detail.locator(".toggle-card-algorithm-note").first().click();
      assert.equal(await detail.locator(".card-algorithm-note-editor").first().isVisible(), false);
      await page.screenshot({ path: `output/case-note-collapsed-${viewport.width}.png` });
      await detail.locator(".save-edit-button").click();
      assert.equal(await detail.locator(".algorithm-note-text").first().textContent(), longNote);
      await detail.locator(".toggle-algorithm-note").first().click();
      assert.equal(await detail.locator(".toggle-algorithm-note").first().getAttribute("aria-expanded"), "true");
      assert.equal(await detail.locator(".edit-algorithm-note").count(), 0);
      await detail.locator(".edit-button").click();
      assert.equal(await detail.locator(".card-algorithm-note-editor").first().isVisible(), false);
      await detail.locator(".toggle-card-algorithm-note").first().click();
      await detail.locator(".card-algorithm-note-editor").first().fill("저장하지 않은 메모");
      await detail.locator(".cancel-edit-button").first().click();
      assert.equal(await detail.locator(".algorithm-note-text").first().textContent(), longNote);
      await detail.locator(".edit-button").click();
      await detail.locator(".add-algorithm-button").click();
      await detail.locator(".algorithm-editor").last().fill("R U R'");
      await detail.locator(".toggle-card-algorithm-note").last().click();
      await detail.locator(".card-algorithm-note-editor").last().fill("두 번째 공식 메모");
      await detail.locator(".save-edit-button").click();
      await detail.locator(".edit-button").click();
      const addedRow = detail.locator(`.algorithm-editor-row:has(textarea[data-original-algorithm="R U R'"])`);
      const rowCount = await detail.locator(".algorithm-editor-row").count();
      for (let i = 1; i < rowCount; i += 1) await addedRow.locator(".move-algorithm-up-button").click();
      await detail.locator(".algorithm-editor").first().fill("R U2 R'");
      await detail.locator(".save-edit-button").click();
      assert.equal(await detail.locator(".algorithm-note-text").first().textContent(), "두 번째 공식 메모");
      assert.equal(await detail.locator(".algorithm-note-text").last().textContent(), longNote);
      await page.screenshot({ path: `output/case-notes-${viewport.width}.png` });
      await detail.evaluate((el) => { el.scrollTop = 0; });
      await page.screenshot({ path: `output/case-detail-${viewport.width}.png` });
      const meta = await detail.locator(".case-rating-counts").boundingBox();
      assert.ok(meta.x >= 0 && meta.x + meta.width <= viewport.width);
      await detail.locator(".close-detail-button").click();
      for (const mode of ["compact", "list", "full"]) {
        await page.locator(`button[data-view-mode="${mode}"]`).click();
        const card = page.locator(`#caseGrid .case-card[data-case-id="${a}"]`);
        assert.equal(await card.locator(".case-note-indicator").count(), mode === "full" ? 0 : 1);
        assert.equal(await card.locator(".reset-case-ratings").count(), mode === "full" ? 1 : 0);
        assert.equal(await card.locator(".case-rating-counts").count(), 1);
        assert.equal(await card.locator(".case-rating-count.is-bad").textContent(), "1");
        assert.equal(await card.locator(".case-rating-count.is-good").count(), 0);
        const unratedCard = page.locator(`#caseGrid .case-card[data-case-id="${c}"]`);
        assert.equal(await unratedCard.locator(".case-rating-count").count(), 0);
        assert.equal(await unratedCard.locator(".case-rating-counts").isVisible(), false);
        if (mode === "full") {
          assert.equal(await card.locator(".algorithm-note-text").count(), 2);
          assert.equal(await card.locator(".algorithm-note-text").first().textContent(), "두 번째 공식 메모");
        } else {
          assert.equal(await card.locator(".algorithm-note").count(), 0);
        }
        await card.scrollIntoViewIfNeeded();
        await page.screenshot({ path: `output/case-${mode}-${viewport.width}.png` });
        if (mode === "compact") {
          const bounds = await card.boundingBox();
          const counts = await card.locator(".case-rating-counts").boundingBox();
          const image = await card.locator(".svg-box").boundingBox();
          assert.ok(counts.y >= image.y + image.height, "ratings must not overlap the puzzle image");
          assert.ok(Math.abs(bounds.x + bounds.width - counts.x - counts.width - 8) < 2);
          assert.ok(Math.abs(bounds.y + bounds.height - counts.y - counts.height - 6) < 2);
        }
        assert.equal(await page.locator("#caseGrid .case-card.is-active-card").count(), 3);
        if (mode === "list") {
          for (const selector of [".setup-section", ".alg-section"]) {
            const positions = await page.locator(`#caseGrid .case-card ${selector}`).evaluateAll((nodes) => nodes.slice(0, 3).map((node) => node.getBoundingClientRect().x));
            assert.ok(positions.every((x) => Math.abs(x - positions[0]) < 1));
          }
        }
      }
      await page.reload();
      await page.locator('[data-dataset-key="zbll"]').click();
      await openCase(a);
      assert.equal(await detail.locator(".algorithm-note-text").first().textContent(), "두 번째 공식 메모");
      assert.deepEqual((await personal()).caseRatings[a], { good: 0, bad: 1 });
      await detail.locator(".reset-case-ratings").click();
      assert.equal((await personal()).caseRatings[a], undefined);
      assert.equal(await detail.locator(".case-rating-counts").isVisible(), false);
      assert.deepEqual((await personal()).caseRatings[b], { good: 0, bad: 1 });
      assert.equal((await saved()).results.find((result) => result.id === "a2").rating, "");
      assert.equal(await detail.locator(".algorithm-note-text").first().textContent(), "두 번째 공식 메모");
      assert.equal(await detail.locator(".edit-algorithm-note").count(), 0);
      await detail.locator(".edit-button").click();
      assert.equal(await detail.locator(".card-algorithm-note-editor").first().isVisible(), false);
      await detail.locator(".toggle-card-algorithm-note").first().click();
      await detail.locator(".card-algorithm-note-editor").first().fill("");
      await detail.locator(".save-edit-button").click();
      assert.equal(await detail.locator(".algorithm-note-text").count(), 1);
      await detail.locator(".close-detail-button").click();
      if (!await page.locator("#drillFilterButton").isVisible()) await page.locator("#toolbarToggleButton").click();
      await page.locator("#drillFilterButton").click();
      await page.locator('#drillFilterOptions [data-value="bad"]').click();
      assert.equal(await page.locator("#caseGrid .case-card").count(), 1);
      await page.locator('#drillFilterOptions [data-value="good"]').click();
      assert.equal(await page.locator("#caseGrid .case-card").count(), 0);
      await page.locator('#drillFilterOptions [data-value="unrated"]').click();
      assert.equal(await page.locator("#caseGrid .case-card").count(), 471);
      await page.reload();
      await page.locator('[data-dataset-key="zbll"]').click();
      assert.equal(await page.locator("#caseGrid .case-card").count(), 471);
      if (!await page.locator("#clearFiltersButton").isVisible()) await page.locator("#toolbarToggleButton").click();
      await page.locator("#clearFiltersButton").click();
      assert.equal(await page.locator("#caseGrid .case-card").count(), 472);
      // A fresh session retains accumulated ratings from the prior session.
      await page.locator(`#caseGrid .case-card[data-case-id="${c}"]`).click();
      await page.locator("#drillStartButton").click();
      assert.equal((await saved()).results.length, 0);
      assert.deepEqual((await personal()).caseRatings[b], { good: 0, bad: 1 });
      assert.deepEqual(errors, []);
      console.log(`PASS ${viewport.width}x${viewport.height}: statistics, ratings, deletion, combined filters, empty targets, reset, reload, timer mouse/touch/Space, three views`);
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; server.close(); });

