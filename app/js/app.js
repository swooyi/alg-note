(() => {
const { normalizeDataset } = window.AlgNoteNormalize;
const { renderCases, renderGroupedCases, renderCaseDetail, renderGroupFilterOptions, renderRecognitionFilterOptions, renderBookmarkFilterOptions, renderSummary } = window.AlgNoteRender;
const { datasetKey, loadJson, saveJson } = window.AlgNoteStorage;

const DEFAULT_COLUMNS = "4";
const DEFAULT_IMAGE_SIZE = 190;
const DEFAULT_SIDEBAR_WIDTH = 288;
const MIN_SIDEBAR_WIDTH = 220;
const MAX_SIDEBAR_WIDTH = 440;
const VIEW_MODES = new Set(["compact", "list", "full"]);
const ACCENT_THEMES = new Set(["red", "yellow", "green", "blue", "purple", "mono"]);
const BOOKMARK_TYPES = new Set(["red-sun", "green-moon", "yellow-star", "blue-cloud"]);

function initialViewMode() {
  const saved = loadJson("viewModeV3", "");
  if (VIEW_MODES.has(saved)) return saved;
  return loadJson("detailModeV2", "compact") === "full" ? "full" : "compact";
}

function initialAccentTheme() {
  const saved = loadJson("accentTheme", "blue");
  return ACCENT_THEMES.has(saved) ? saved : "blue";
}

const elements = {
  datasetLabel: document.getElementById("datasetLabel"),
  datasetSelect: document.getElementById("datasetSelect"),
  homeButton: document.getElementById("homeButton"),
  homeSettingsButton: document.getElementById("homeSettingsButton"),
  homeSettingsPopover: document.getElementById("homeSettingsPopover"),
  accentThemeButtons: [...document.querySelectorAll(".accent-theme-button")],
  homeView: document.getElementById("homeView"),
  datasetHomeGrid: document.getElementById("datasetHomeGrid"),
  presetShortcutSection: document.getElementById("presetShortcutSection"),
  presetShortcutGrid: document.getElementById("presetShortcutGrid"),
  presetShortcutEmpty: document.getElementById("presetShortcutEmpty"),
  searchInput: document.getElementById("searchInput"),
  appSidebar: document.getElementById("appSidebar"),
  sidebarOpenButton: document.getElementById("sidebarOpenButton"),
  sidebarResizeHandle: document.getElementById("sidebarResizeHandle"),
  filterMenuButtons: [...document.querySelectorAll(".filter-menu-button")],
  groupFilterOptions: document.getElementById("groupFilterOptions"),
  recognitionFilterOptions: document.getElementById("recognitionFilterOptions"),
  bookmarkFilterOptions: document.getElementById("bookmarkFilterOptions"),
  viewModeButtons: [...document.querySelectorAll(".view-mode-button")],
  favoritePresetList: document.getElementById("favoritePresetList"),
  favoritePresetNameInput: document.getElementById("favoritePresetNameInput"),
  saveFavoritePresetButton: document.getElementById("saveFavoritePresetButton"),
  selectedOnlyButton: document.getElementById("selectedOnlyButton"),
  selectAllCardsButton: document.getElementById("selectAllCardsButton"),
  clearSelectedCardsButton: document.getElementById("clearSelectedCardsButton"),
  exportJsonButton: document.getElementById("exportJsonButton"),
  exportPanelTitle: document.getElementById("exportPanelTitle"),
  exportPanelDescription: document.getElementById("exportPanelDescription"),
  exportFullButton: document.getElementById("exportFullButton"),
  exportEditsButton: document.getElementById("exportEditsButton"),
  clearFiltersButton: document.getElementById("clearFiltersButton"),
  exportPanel: document.getElementById("exportPanel"),
  exportJsonText: document.getElementById("exportJsonText"),
  copyJsonButton: document.getElementById("copyJsonButton"),
  downloadJsonButton: document.getElementById("downloadJsonButton"),
  resetJsonButton: document.getElementById("resetJsonButton"),
  closeExportButton: document.getElementById("closeExportButton"),
  emptyState: document.getElementById("emptyState"),
  summary: document.getElementById("summary"),
  caseGrid: document.getElementById("caseGrid"),
  caseDetail: document.getElementById("caseDetail"),
  caseCardTemplate: document.getElementById("caseCardTemplate"),
  drillStartButton: document.getElementById("drillStartButton"),
  drillOverlay: document.getElementById("drillOverlay"),
  drillProgress: document.getElementById("drillProgress"),
  drillRecapModeButton: document.getElementById("drillRecapModeButton"),
  drillTrainModeButton: document.getElementById("drillTrainModeButton"),
  drillRandomAufButton: document.getElementById("drillRandomAufButton"),
  drillSetupText: document.getElementById("drillSetupText"),
  drillMain: document.getElementById("drillMain"),
  drillTimerText: document.getElementById("drillTimerText"),
  drillHintText: document.getElementById("drillHintText"),
  drillTimesText: document.getElementById("drillTimesText"),
  drillAverageText: document.getElementById("drillAverageText"),
  drillResultList: document.getElementById("drillResultList"),
  drillShowAnswerButton: document.getElementById("drillShowAnswerButton"),
  drillNextButton: document.getElementById("drillNextButton"),
  drillUndoButton: document.getElementById("drillUndoButton"),
  drillCloseButton: document.getElementById("drillCloseButton"),
};

const state = {
  entries: null,
  dataset: null,
  key: "",
  query: "",
  groupFilters: new Set(),
  recognitionFilters: new Set(),
  bookmarkFilters: new Set(),
  viewMode: initialViewMode(),
  accentTheme: initialAccentTheme(),
  sidebarOpen: loadJson("sidebarOpen", true),
  sidebarWidth: loadJson("sidebarWidth", DEFAULT_SIDEBAR_WIDTH),
  columns: DEFAULT_COLUMNS,
  imagesVisible: true,
  imageSize: DEFAULT_IMAGE_SIZE,
  exportMode: "full",
  editingCaseId: "",
  selectedCaseId: "",
  selectedCards: new Set(),
  selectedOnly: false,
  bookmarks: new Map(),
  edits: new Map(),
  selectionPresets: [],
  activeSelectionPresetId: "",
  pendingScrollY: null,
  scrollSaveTimer: 0,
  isHomeView: true,
  drill: {
    active: false,
    mode: "recap",
    randomAuf: loadJson("drillRandomAuf", false) === true,
    source: [],
    queue: [],
    index: 0,
    currentSetup: "",
    timerStatus: "idle",
    startedAt: 0,
    elapsedMs: 0,
    results: [],
    tickHandle: 0,
    completed: false,
  },
};


function applyAccentTheme() {
  document.documentElement.dataset.accentTheme = state.accentTheme;
  for (const button of elements.accentThemeButtons) {
    const active = button.dataset.accentTheme === state.accentTheme;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }
}


function closeHomeSettings() {
  elements.homeSettingsPopover.hidden = true;
  elements.homeSettingsButton.setAttribute("aria-expanded", "false");
}


function toggleHomeSettings() {
  const willOpen = elements.homeSettingsPopover.hidden;
  elements.homeSettingsPopover.hidden = !willOpen;
  elements.homeSettingsButton.setAttribute("aria-expanded", willOpen ? "true" : "false");
}


function savePersonalState() {
  if (!state.key) return;
  saveJson(`personal.${state.key}`, {
    bookmarks: Object.fromEntries(state.bookmarks),
    edits: Object.fromEntries(state.edits),
  });
}


function loadPersonalState() {
  const saved = loadJson(`personal.${state.key}`, { favorites: [] });
  state.bookmarks = new Map(
    Object.entries(saved.bookmarks || {}).filter(([, value]) => BOOKMARK_TYPES.has(value)),
  );
  for (const id of saved.favorites || []) {
    if (!state.bookmarks.has(id)) state.bookmarks.set(id, "yellow-star");
  }
  state.edits = new Map(Object.entries(saved.edits || {}));
}


function selectionPresetKey(key = state.key) {
  return `selectionPresets.${key}`;
}


function loadSelectionPresets() {
  const saved = loadJson(selectionPresetKey(), { presets: [], activePresetId: "" });
  let migrated = false;
  state.selectionPresets = (saved.presets || [])
    .filter((preset) => preset && preset.name)
    .map((preset) => ({
      id: preset.id ? String(preset.id) : makePresetId(),
      name: String(preset.name),
      selectedCards: Array.isArray(preset.selectedCards) ? preset.selectedCards.map(String) : [],
      pinned: preset.pinned === true,
    }))
    .map((preset, index, presets) => {
      const original = (saved.presets || [])[index];
      if (!original?.id) migrated = true;
      if (original?.pinned !== preset.pinned) migrated = true;
      while (presets.find((entry) => entry !== preset && entry.id === preset.id)) {
        preset.id = makePresetId();
        migrated = true;
      }
      return preset;
    });
  state.activeSelectionPresetId = state.selectionPresets.some((preset) => preset.id === saved.activePresetId)
    ? saved.activePresetId
    : "";
  if (migrated) saveSelectionPresets();
}


function saveSelectionPresets() {
  if (!state.key) return;
  saveJson(selectionPresetKey(), {
    presets: state.selectionPresets,
    activePresetId: state.activeSelectionPresetId,
  });
}


function renderSelectionPresetOptions() {
  elements.favoritePresetList.replaceChildren();

  if (!state.selectionPresets.length) {
    const empty = document.createElement("p");
    empty.className = "preset-empty";
    empty.textContent = "저장한 프리셋 없음";
    elements.favoritePresetList.append(empty);
  }

  const presets = state.selectionPresets
    .map((preset, index) => ({ preset, index }))
    .sort((a, b) => Number(b.preset.pinned) - Number(a.preset.pinned) || a.index - b.index)
    .map((entry) => entry.preset);

  for (const preset of presets) {
    const item = document.createElement("div");
    item.className = "preset-item";
    item.classList.toggle("is-active", preset.id === state.activeSelectionPresetId);
    item.classList.toggle("is-pinned", preset.pinned);
    item.dataset.presetId = preset.id;
    item.setAttribute("role", "listitem");

    const applyButton = document.createElement("button");
    applyButton.className = "preset-apply-button";
    applyButton.type = "button";
    applyButton.dataset.presetAction = "apply";

    const name = document.createElement("span");
    name.textContent = preset.name;
    const count = document.createElement("strong");
    count.textContent = `${preset.selectedCards.length} cases`;
    const text = document.createElement("span");
    text.className = "preset-file-text";
    text.append(name, count);

    const pinButton = document.createElement("button");
    pinButton.className = "preset-file-icon-button";
    pinButton.type = "button";
    pinButton.dataset.presetAction = "pin";
    pinButton.setAttribute("aria-label", `${preset.name} 프리셋 ${preset.pinned ? "고정 해제" : "고정"}`);
    pinButton.setAttribute("aria-pressed", preset.pinned ? "true" : "false");
    pinButton.title = preset.pinned ? "고정 해제" : "고정";
    const icon = document.createElement("span");
    icon.className = "preset-file-icon";
    icon.setAttribute("aria-hidden", "true");
    pinButton.append(icon);
    applyButton.append(text);

    const deleteButton = document.createElement("button");
    deleteButton.className = "preset-delete-button";
    deleteButton.type = "button";
    deleteButton.dataset.presetAction = "delete";
    deleteButton.setAttribute("aria-label", `${preset.name} 프리셋 삭제`);
    deleteButton.title = "삭제";
    deleteButton.textContent = "×";

    item.append(pinButton, applyButton, deleteButton);
    elements.favoritePresetList.append(item);
  }

  elements.selectedOnlyButton.classList.toggle("is-active", state.selectedOnly);
  elements.selectedOnlyButton.setAttribute("aria-pressed", state.selectedOnly ? "true" : "false");
}


function makePresetId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}


function hasDuplicatePresetName(name) {
  const normalized = name.trim().toLocaleLowerCase();
  return state.selectionPresets.some((preset) => preset.name.trim().toLocaleLowerCase() === normalized);
}


function applySelectionPreset(preset) {
  state.selectedCards = new Set(preset.selectedCards);
  state.selectedOnly = true;
  state.selectedCaseId = "";
  state.activeSelectionPresetId = preset.id;
  saveSelectionPresets();
  render();
}


function applySelectionPresetById(presetId) {
  const preset = state.selectionPresets.find((entry) => entry.id === presetId);
  if (!preset) return false;
  applySelectionPreset(preset);
  return true;
}


function recognitionList(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map((item) => String(item));
  return value ? [String(value)] : [];
}


function sameStringArray(a, b) {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}


function recognitionValueForJson(values) {
  if (!values.length) return "";
  return values;
}


function applyCaseEdit(item) {
  const edit = state.edits.get(item.id);
  if (!edit) return item;
  const tags = { ...(typeof item.tags === "object" && !Array.isArray(item.tags) ? item.tags : {}) };
  if (Object.prototype.hasOwnProperty.call(edit, "recognition")) {
    const recognitions = recognitionList(edit.recognition);
    if (recognitions.length) {
      tags.recognition = recognitionValueForJson(recognitions);
    } else {
      delete tags.recognition;
    }
  }
  return {
    ...item,
    scramble: edit.scramble,
    algorithms: edit.algorithms,
    tags,
  };
}


function effectiveCases() {
  return state.dataset.cases.map(applyCaseEdit);
}


function matchesQuery(item, query) {
  if (!query) return true;
  const tagValues = Array.isArray(item.tags) ? item.tags : Object.values(item.tags || {}).flatMap(recognitionList);
  const haystack = [
    item.id,
    item.name,
    item.groupName,
    item.scramble,
    ...item.algorithms,
    ...item.scrambles,
    ...tagValues,
  ].join(" ").toLowerCase();
  return haystack.includes(query);
}


function filteredCases() {
  const query = state.query.trim().toLowerCase();
  return effectiveCases().filter((item) => {
    const groupOk = state.groupFilters.size === 0 || state.groupFilters.has(item.group);
    const recognitionOk =
      state.recognitionFilters.size === 0 ||
      recognitionList(item.tags?.recognition).some((value) => state.recognitionFilters.has(value));
    const bookmarkOk = state.bookmarkFilters.size === 0 || state.bookmarkFilters.has(state.bookmarks.get(item.id));
    const queryOk = matchesQuery(item, query);
    const selectedOk = !state.selectedOnly || state.selectedCards.has(item.id);
    return groupOk && recognitionOk && bookmarkOk && queryOk && selectedOk;
  });
}


function visibleCases() {
  const savedSelectedOnly = state.selectedOnly;
  state.selectedOnly = false;
  const rows = filteredCases();
  state.selectedOnly = savedSelectedOnly;
  return rows;
}


function selectedDrillCases() {
  if (!state.dataset) return [];
  const selectedIds = new Set(state.selectedCards);
  return effectiveCases().filter((item) => selectedIds.has(item.id));
}


function shuffledItems(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}


function randomItem(values) {
  return values[Math.floor(Math.random() * values.length)];
}


function randomAufMove() {
  const puzzle = String(state.dataset?.puzzle || "").toLowerCase();
  const values = puzzle.includes("fto") ? ["U", "U'"] : ["U", "U'", "U2"];
  return randomItem(values);
}


function makeDrillSetup(item) {
  const setup = (item?.scramble || "").trim();
  if (!setup) return "등록된 setup이 없습니다.";
  if (!state.drill.randomAuf) return setup;

  return Math.random() < 0.5
    ? `${randomAufMove()} ${setup}`
    : `${setup} ${randomAufMove()}`;
}


function currentDrillItem() {
  return state.drill.queue[state.drill.index] || null;
}


function setDrillMode(mode) {
  if (!["recap", "train"].includes(mode) || state.drill.mode === mode) return;
  state.drill.mode = mode;
  if (!state.drill.active) return;

  const source = state.drill.source.length ? state.drill.source : selectedDrillCases();
  state.drill.source = source;
  state.drill.queue = mode === "recap" ? shuffledItems(source) : [source[Math.floor(Math.random() * source.length)]].filter(Boolean);
  state.drill.index = 0;
  state.drill.currentSetup = makeDrillSetup(currentDrillItem());
  state.drill.completed = false;
  resetDrillTimer();
  renderDrill();
}


function formatDrillTime(ms) {
  return (Math.max(0, ms) / 1000).toFixed(2);
}


function averageDrillMs() {
  if (!state.drill.results.length) return 0;
  const total = state.drill.results.reduce((sum, result) => sum + result.elapsedMs, 0);
  return total / state.drill.results.length;
}


function stopDrillTicker() {
  if (!state.drill.tickHandle) return;
  window.cancelAnimationFrame(state.drill.tickHandle);
  state.drill.tickHandle = 0;
}


function updateDrillTimerDisplay() {
  if (state.drill.timerStatus === "running") {
    state.drill.elapsedMs = performance.now() - state.drill.startedAt;
  }
  elements.drillTimerText.textContent = formatDrillTime(state.drill.elapsedMs);
}


function tickDrillTimer() {
  if (!state.drill.active || state.drill.timerStatus !== "running") return;
  updateDrillTimerDisplay();
  state.drill.tickHandle = window.requestAnimationFrame(tickDrillTimer);
}


function resetDrillTimer() {
  stopDrillTicker();
  state.drill.timerStatus = "idle";
  state.drill.startedAt = 0;
  state.drill.elapsedMs = 0;
}


function makeDrillResult(item, elapsedMs) {
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    caseId: item.id,
    caseName: item.name || item.id,
    groupName: item.groupName || "",
    setup: state.drill.currentSetup,
    elapsedMs,
    createdAt: Date.now(),
  };
}


function drillItemById(caseId) {
  return state.drill.queue.find((item) => item.id === caseId)
    || state.drill.source.find((item) => item.id === caseId)
    || null;
}


function renderDrillResults() {
  elements.drillResultList.replaceChildren();

  const results = [...state.drill.results].reverse();
  if (!results.length) {
    const empty = document.createElement("p");
    empty.className = "drill-result-empty";
    empty.textContent = "아직 기록 없음";
    elements.drillResultList.append(empty);
    return;
  }

  for (const result of results) {
    const row = document.createElement("div");
    row.className = "drill-result-row";
    const body = document.createElement("div");
    body.className = "drill-result-body";
    const top = document.createElement("div");
    top.className = "drill-result-top";
    const name = document.createElement("span");
    name.textContent = result.groupName ? `${result.groupName} ${result.caseName}` : result.caseName;
    const time = document.createElement("strong");
    time.textContent = formatDrillTime(result.elapsedMs);
    const setup = document.createElement("p");
    setup.textContent = result.setup;
    top.append(name, time);
    body.append(top, setup);

    const detailButton = document.createElement("button");
    detailButton.className = "drill-detail-button";
    detailButton.type = "button";
    detailButton.dataset.resultId = result.id;
    detailButton.textContent = "세부정보";

    row.append(body, detailButton);
    elements.drillResultList.append(row);
  }
}


function updateDrillStartButton() {
  const canShow = !state.isHomeView;
  elements.drillStartButton.disabled = false;
  elements.drillStartButton.hidden = state.isHomeView || state.drill.active;
  elements.drillStartButton.title = canShow && state.selectedCards.size > 0 ? "드릴 시작" : "케이스를 선택하세요.";
  elements.drillStartButton.setAttribute("aria-label", elements.drillStartButton.title);
}


function renderDrill() {
  if (!state.drill.active) {
    elements.drillOverlay.hidden = true;
    updateDrillStartButton();
    return;
  }

  elements.drillOverlay.hidden = false;
  updateDrillStartButton();

  const total = state.drill.queue.length;
  elements.drillRecapModeButton.classList.toggle("is-active", state.drill.mode === "recap");
  elements.drillTrainModeButton.classList.toggle("is-active", state.drill.mode === "train");
  elements.drillRandomAufButton.classList.toggle("is-active", state.drill.randomAuf);
  elements.drillRecapModeButton.setAttribute("aria-pressed", state.drill.mode === "recap" ? "true" : "false");
  elements.drillTrainModeButton.setAttribute("aria-pressed", state.drill.mode === "train" ? "true" : "false");
  elements.drillRandomAufButton.setAttribute("aria-pressed", state.drill.randomAuf ? "true" : "false");

  if (state.drill.mode === "recap") {
    elements.drillProgress.textContent = `Recap · ${Math.min(state.drill.index + 1, total)}/${total} cases`;
  } else {
    elements.drillProgress.textContent = `Train · ${state.drill.source.length} cases`;
  }

  if (state.drill.completed) {
    elements.drillSetupText.textContent = "드릴 완료";
    elements.drillShowAnswerButton.disabled = true;
    elements.drillNextButton.textContent = "다시 섞기";
    elements.drillHintText.textContent = "Space로 다시 섞기";
  } else {
    elements.drillSetupText.textContent = state.drill.currentSetup;
    elements.drillShowAnswerButton.disabled = false;
    elements.drillNextButton.textContent = "스킵";
    elements.drillHintText.textContent = state.drill.timerStatus === "running" ? "Space로 정지" : "Space로 시작";
  }

  updateDrillTimerDisplay();
  elements.drillTimesText.textContent = `Times ${state.drill.results.length}`;
  elements.drillAverageText.textContent = state.drill.results.length ? `Avg ${formatDrillTime(averageDrillMs())}` : "Avg -";
  elements.drillUndoButton.disabled = state.drill.timerStatus === "running" || state.drill.results.length === 0;
  renderDrillResults();
}


function startDrill() {
  const source = selectedDrillCases();
  if (!source.length) {
    window.alert("케이스를 선택하세요.");
    return;
  }
  const queue = state.drill.mode === "recap"
    ? shuffledItems(source)
    : [source[Math.floor(Math.random() * source.length)]];

  state.drill.active = true;
  state.drill.source = source;
  state.drill.queue = queue;
  state.drill.index = 0;
  resetDrillTimer();
  state.drill.results = [];
  state.drill.completed = false;
  state.drill.currentSetup = makeDrillSetup(currentDrillItem());
  state.selectedCaseId = "";
  state.editingCaseId = "";
  render();
}


function closeDrill() {
  stopDrillTicker();
  state.drill.active = false;
  state.drill.source = [];
  state.drill.queue = [];
  state.drill.index = 0;
  state.drill.currentSetup = "";
  state.drill.results = [];
  state.drill.completed = false;
  resetDrillTimer();
  renderDrill();
}


function moveToNextDrillCase() {
  if (!state.drill.active) return;

  if (state.drill.mode === "train") {
    const source = state.drill.source.length ? state.drill.source : selectedDrillCases();
    state.drill.source = source;
    state.drill.queue = source.length ? [source[Math.floor(Math.random() * source.length)]] : [];
    state.drill.index = 0;
    state.drill.currentSetup = makeDrillSetup(currentDrillItem());
    state.drill.completed = false;
    resetDrillTimer();
    renderDrill();
    return;
  }

  state.drill.index += 1;
  if (state.drill.index >= state.drill.queue.length) {
    state.drill.completed = true;
    state.drill.currentSetup = "";
  } else {
    state.drill.currentSetup = makeDrillSetup(currentDrillItem());
  }
  resetDrillTimer();
  renderDrill();
}


function skipDrillCase() {
  if (!state.drill.active) return;
  if (state.drill.completed) {
    startDrill();
    return;
  }
  moveToNextDrillCase();
}


function toggleDrillTimer() {
  if (!state.drill.active) return;
  if (state.drill.completed) {
    startDrill();
    return;
  }

  if (state.drill.timerStatus !== "running") {
    state.drill.timerStatus = "running";
    state.drill.startedAt = performance.now() - state.drill.elapsedMs;
    stopDrillTicker();
    tickDrillTimer();
    renderDrill();
    return;
  }

  stopDrillTicker();
  updateDrillTimerDisplay();
  const item = currentDrillItem();
  const result = item ? makeDrillResult(item, state.drill.elapsedMs) : null;
  if (result) state.drill.results.push(result);
  moveToNextDrillCase();
}


function undoDrillResult() {
  if (!state.drill.active || state.drill.timerStatus === "running" || !state.drill.results.length) return;
  const last = state.drill.results.pop();
  const lastItem = drillItemById(last.caseId);
  if (state.drill.mode === "train" && lastItem) {
    state.drill.queue = [lastItem];
    state.drill.index = 0;
    state.drill.currentSetup = last.setup;
    state.drill.completed = false;
  }
  const index = state.drill.queue.findIndex((item) => item.id === last.caseId);
  if (index !== -1) {
    state.drill.index = index;
    state.drill.currentSetup = last.setup;
    state.drill.completed = false;
  }
  resetDrillTimer();
  renderDrill();
}


function toggleDrillAnswer() {
  const item = currentDrillItem();
  if (!item || state.drill.completed) return;
  state.selectedCaseId = item.id;
  state.editingCaseId = "";
  render();
}


function showDrillResultDetail(resultId) {
  const result = state.drill.results.find((item) => item.id === resultId);
  const item = result ? drillItemById(result.caseId) : null;
  if (!item) return;
  state.selectedCaseId = item.id;
  state.editingCaseId = "";
  render();
}


function clampSidebarWidth(value) {
  const width = Number(value);
  if (!Number.isFinite(width)) return DEFAULT_SIDEBAR_WIDTH;
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, Math.round(width)));
}


function updateSidebarLayout() {
  state.sidebarWidth = clampSidebarWidth(state.sidebarWidth);
  document.documentElement.style.setProperty("--sidebar-width", `${state.sidebarWidth}px`);
  document.body.classList.toggle("sidebar-closed", state.isHomeView || !state.sidebarOpen);
  elements.sidebarOpenButton.setAttribute("aria-expanded", state.sidebarOpen ? "true" : "false");
  elements.sidebarOpenButton.setAttribute("aria-label", state.sidebarOpen ? "패널 닫기" : "패널 열기");
  elements.sidebarOpenButton.title = state.sidebarOpen ? "패널 닫기" : "패널 열기";
}


function showHomeView() {
  saveCurrentViewState();
  closeDrill();
  state.isHomeView = true;
  state.selectedCaseId = "";
  state.editingCaseId = "";
  elements.homeView.hidden = false;
  elements.homeButton.hidden = true;
  elements.datasetLabel.textContent = "";
  renderPresetShortcuts();
  document.body.classList.add("is-home-view");
  updateSidebarLayout();
  updateDrillStartButton();
  window.scrollTo({ top: 0, left: 0 });
}


function showNoteView() {
  state.isHomeView = false;
  elements.homeView.hidden = true;
  elements.exportPanel.hidden = true;
  elements.homeButton.hidden = false;
  closeHomeSettings();
  document.body.classList.remove("is-home-view");
  updateSidebarLayout();
  updateDrillStartButton();
}

function updateFilterMenuButtons() {
  const counts = {
    group: state.groupFilters.size,
    recognition: state.recognitionFilters.size,
    bookmark: state.bookmarkFilters.size,
  };
  const labels = {
    group: "group",
    recognition: "recog",
    bookmark: "bookmark",
  };
  for (const button of elements.filterMenuButtons) {
    const type = button.dataset.filterMenu;
    const count = counts[type] || 0;
    button.textContent = count ? `${labels[type]} · ${count}` : labels[type];
    button.classList.toggle("is-active", count > 0);
  }
}


function closeFilterMenus() {
  for (const button of elements.filterMenuButtons) {
    const panel = document.getElementById(`${button.dataset.filterMenu}FilterOptions`);
    panel.hidden = true;
    button.setAttribute("aria-expanded", "false");
  }
}


function updateViewModeButtons() {
  for (const button of elements.viewModeButtons) {
    const active = button.dataset.viewMode === state.viewMode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }
}


function viewStateKey(key = state.key) {
  return `viewState.${key}`;
}


function saveCurrentViewState() {
  if (!state.key) return;
  saveJson(viewStateKey(), {
    query: state.query,
    groupFilters: [...state.groupFilters],
    recognitionFilters: [...state.recognitionFilters],
    bookmarkFilters: [...state.bookmarkFilters],
    viewMode: state.viewMode,
    selectedCaseId: state.selectedCaseId,
    scrollY: Math.max(0, Math.round(window.scrollY || 0)),
  });
}


function restoreCurrentViewState() {
  const saved = loadJson(viewStateKey(), {});
  const groupIds = new Set(state.dataset.groups.map((group) => group.id));
  const availableRecognitions = new Set(effectiveCases().flatMap((item) => recognitionList(item.tags?.recognition)));

  state.query = typeof saved.query === "string" ? saved.query : "";
  const savedGroups = Array.isArray(saved.groupFilters) ? saved.groupFilters : (groupIds.has(saved.group) ? [saved.group] : []);
  state.groupFilters = new Set(savedGroups.filter((value) => groupIds.has(value)));
  state.recognitionFilters = new Set((Array.isArray(saved.recognitionFilters) ? saved.recognitionFilters : []).filter((value) => availableRecognitions.has(value)));
  state.bookmarkFilters = new Set((Array.isArray(saved.bookmarkFilters) ? saved.bookmarkFilters : []).filter((value) => BOOKMARK_TYPES.has(value)));
  state.viewMode = VIEW_MODES.has(saved.viewMode) ? saved.viewMode : state.viewMode;
  state.selectedCaseId = typeof saved.selectedCaseId === "string" ? saved.selectedCaseId : "";
  state.pendingScrollY = Number.isFinite(saved.scrollY) ? saved.scrollY : null;

  elements.searchInput.value = state.query;
}


function closeCaseDetail() {
  state.selectedCaseId = "";
  state.editingCaseId = "";
  render();
}


function openCaseDetail(caseId) {
  state.selectedCaseId = caseId;
  state.editingCaseId = "";
  render();
}


function moveSelectedCase(delta) {
  const rows = filteredCases();
  const currentIndex = rows.findIndex((item) => item.id === state.selectedCaseId);
  if (currentIndex === -1) return;

  const nextIndex = currentIndex + delta;
  if (nextIndex < 0 || nextIndex >= rows.length) return;

  state.selectedCaseId = rows[nextIndex].id;
  state.editingCaseId = "";
  render();
}


function refreshRecognitionFilters() {
  const available = new Set(effectiveCases().flatMap((item) => recognitionList(item.tags?.recognition)));
  state.recognitionFilters = new Set([...state.recognitionFilters].filter((value) => available.has(value)));
  renderRecognitionFilterOptions(elements.recognitionFilterOptions, effectiveCases(), state.recognitionFilters);
}


function render() {
  if (!state.dataset) return;

  const rows = filteredCases();
  const selectedCase = rows.find((item) => item.id === state.selectedCaseId)
    || (state.drill.active ? effectiveCases().find((item) => item.id === state.selectedCaseId) : null);
  if (state.selectedCaseId && !selectedCase) state.selectedCaseId = "";

  elements.emptyState.hidden = true;
  elements.summary.hidden = false;
  elements.caseGrid.hidden = false;
  refreshRecognitionFilters();
  elements.caseGrid.dataset.columns = state.columns;
  elements.caseGrid.dataset.viewMode = state.viewMode;
  elements.caseGrid.classList.toggle("is-grouped", state.viewMode === "compact");
  elements.caseGrid.style.setProperty("--image-size", `${state.imageSize}px`);
  elements.caseDetail.style.setProperty("--image-size", `${state.imageSize}px`);
  elements.datasetLabel.textContent = `${state.dataset.puzzle} · ${state.dataset.name}`;
  renderSelectionPresetOptions();
  renderGroupFilterOptions(elements.groupFilterOptions, state.dataset.groups, state.groupFilters);
  renderBookmarkFilterOptions(elements.bookmarkFilterOptions, state.bookmarkFilters);
  updateFilterMenuButtons();
  updateViewModeButtons();

  renderSummary(elements.summary, state.dataset, rows, state);
  if (state.viewMode === "compact") {
    renderGroupedCases(elements.caseGrid, elements.caseCardTemplate, rows, state);
  } else {
    renderCases(elements.caseGrid, elements.caseCardTemplate, rows, state);
  }

  if (state.selectedCaseId) {
    const selectedIndex = rows.findIndex((item) => item.id === state.selectedCaseId);
    renderCaseDetail(
      elements.caseDetail,
      elements.caseCardTemplate,
      selectedCase,
      {
        ...state,
        detailNav: {
          hasPrev: selectedIndex > 0,
          hasNext: selectedIndex >= 0 && selectedIndex < rows.length - 1,
        },
      },
    );
  } else {
    elements.caseDetail.hidden = true;
    elements.caseDetail.replaceChildren();
  }

  if (state.pendingScrollY !== null) {
    const scrollY = state.pendingScrollY;
    state.pendingScrollY = null;
    requestAnimationFrame(() => window.scrollTo({ top: scrollY, left: 0 }));
  }
  renderDrill();
}


function setDataset(entries) {
  closeDrill();
  saveCurrentViewState();
  state.entries = entries;
  state.dataset = normalizeDataset(entries);
  state.key = datasetKey(state.dataset);
  state.query = "";
  state.groupFilters = new Set();
  state.recognitionFilters = new Set();
  state.bookmarkFilters = new Set();
  state.editingCaseId = "";
  state.selectedCaseId = "";
  state.selectedCards = new Set();
  state.selectedOnly = false;
  elements.searchInput.value = "";
  elements.exportPanel.hidden = true;
  elements.exportJsonText.value = "";
  loadPersonalState();
  loadSelectionPresets();
  refreshRecognitionFilters();
  restoreCurrentViewState();
  saveJson("lastDataset", state.key);
  render();
}


function makeMergedCasesJson() {
  const source = state.entries?.["cases.json"];
  const cases = (source?.cases || []).map((item) => {
    const edit = state.edits.get(item.id);
    if (!edit) return item;
    const tags = { ...(typeof item.tags === "object" && !Array.isArray(item.tags) ? item.tags : {}) };
    if (Object.prototype.hasOwnProperty.call(edit, "recognition")) {
      const recognitions = recognitionList(edit.recognition);
      if (recognitions.length) {
        tags.recognition = recognitionValueForJson(recognitions);
      } else {
        delete tags.recognition;
      }
    }
    return {
      ...item,
      scramble: edit.scramble,
      algorithms: edit.algorithms,
      tags,
    };
  });

  return {
    ...source,
    cases,
  };
}


function makeEditedCasesJson() {
  const cases = [...state.edits.entries()].map(([id, edit]) => {
    const original = state.dataset.cases.find((item) => item.id === id) || {};
    return {
      id,
      name: original.name || "",
      group: original.group || "",
      groupName: original.groupName || "",
      scramble: edit.scramble,
      algorithms: edit.algorithms || [],
      recognition: recognitionList(edit.recognition),
    };
  });

  return {
    dataset: {
      key: state.key,
      algset: state.dataset.algset,
      name: state.dataset.name,
      puzzle: state.dataset.puzzle,
    },
    editedCount: cases.length,
    cases,
  };
}


function editedCasesForDataset(entries, savedEdits) {
  const dataset = normalizeDataset(entries);
  return [...savedEdits.entries()].map(([id, edit]) => {
    const original = dataset.cases.find((item) => item.id === id) || {};
    return {
      id,
      name: original.name || "",
      group: original.group || "",
      groupName: original.groupName || "",
      scramble: edit.scramble,
      algorithms: edit.algorithms || [],
      recognition: recognitionList(edit.recognition),
    };
  });
}


function makeAllEditedCasesJson() {
  const bundled = window.AlgNoteBundledData || {};
  const datasets = [];

  for (const [bundleKey, entries] of Object.entries(bundled)) {
    const dataset = normalizeDataset(entries);
    const key = datasetKey(dataset);
    const saved = loadJson(`personal.${key}`, { edits: {} });
    const edits = key === state.key
      ? state.edits
      : new Map(Object.entries(saved.edits || {}));
    const cases = editedCasesForDataset(entries, edits);
    if (!cases.length) continue;

    datasets.push({
      key,
      bundleKey,
      algset: dataset.algset,
      name: dataset.name,
      puzzle: dataset.puzzle,
      editedCount: cases.length,
      cases,
    });
  }

  return {
    editedCount: datasets.reduce((total, dataset) => total + dataset.editedCount, 0),
    datasets,
  };
}


function exportJsonForMode() {
  if (state.exportMode === "allEdits") return makeAllEditedCasesJson();
  return state.exportMode === "edits" ? makeEditedCasesJson() : makeMergedCasesJson();
}


function updateExportPanel() {
  const isAllEdits = state.exportMode === "allEdits";
  const isEdits = state.exportMode === "edits";
  elements.exportPanelTitle.textContent = isAllEdits ? "수정 json" : (isEdits ? "편집분만 출력" : "cases.json 출력");
  elements.exportPanelDescription.textContent = isAllEdits
    ? "모든 해법에서 브라우저에 저장된 수정 내용만 모은 결과입니다."
    : isEdits
    ? "브라우저에 저장된 편집 케이스만 모은 결과입니다."
    : "브라우저에 저장된 편집 내용을 현재 데이터에 병합한 결과입니다.";
  elements.exportFullButton.parentElement.hidden = isAllEdits;
  elements.exportFullButton.classList.toggle("is-active", !isEdits && !isAllEdits);
  elements.exportEditsButton.classList.toggle("is-active", isEdits);
  elements.exportJsonText.value = JSON.stringify(exportJsonForMode(), null, 2);
  elements.exportPanel.hidden = false;
  elements.exportJsonText.focus();
}


function downloadExportJson() {
  const blob = new Blob([elements.exportJsonText.value], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = state.exportMode === "allEdits"
    ? "alg-note-edited-cases.json"
    : state.exportMode === "edits"
      ? `${state.dataset.algset}-edited-cases.json`
      : `${state.dataset.algset}-cases.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}


function resetSavedJsonEdits() {
  const bundled = window.AlgNoteBundledData || {};
  let changed = false;

  for (const entries of Object.values(bundled)) {
    const dataset = normalizeDataset(entries);
    const key = datasetKey(dataset);
    const saved = loadJson(`personal.${key}`, null);
    if (!saved?.edits || !Object.keys(saved.edits).length) continue;
    saved.edits = {};
    saveJson(`personal.${key}`, saved);
    changed = true;
  }

  state.edits = new Map();
  state.editingCaseId = "";
  state.selectedCaseId = "";
  updateExportPanel();
  if (state.dataset) {
    if (changed) refreshRecognitionFilters();
    render();
  }
}


function saveCardEdit(card) {
  const caseId = card.dataset.caseId;
  const original = state.dataset.cases.find((item) => item.id === caseId);
  if (!original) return;

  const scramble = card.querySelector(".setup-editor")?.value.trim() || "";
  const algorithms = [...card.querySelectorAll(".algorithm-editor")]
    .map((textarea) => textarea.value.trim())
    .filter(Boolean);
  const recognitions = [...card.querySelectorAll(".recognition-editor:checked")].map((input) => input.value);
  const originalTags = typeof original.tags === "object" && !Array.isArray(original.tags) ? original.tags : {};
  const originalRecognitions = recognitionList(originalTags.recognition);

  const originalAlgorithms = original.algorithms || [];
  const unchanged =
    scramble === (original.scramble || "") &&
    sameStringArray(recognitions, originalRecognitions) &&
    algorithms.length === originalAlgorithms.length &&
    algorithms.every((value, index) => value === originalAlgorithms[index]);

  if (unchanged) {
    state.edits.delete(caseId);
  } else {
    state.edits.set(caseId, { scramble, algorithms, recognition: recognitions });
  }

  state.editingCaseId = "";
  savePersonalState();
  refreshRecognitionFilters();
  render();
}


function renderDatasetOptions() {
  const bundled = window.AlgNoteBundledData || {};
  const puzzleOrder = ["FTO", "SQ1", "3x3"];
  const keys = Object.keys(bundled).sort((a, b) => {
    const algsetA = bundled[a]["algset.json"] || {};
    const algsetB = bundled[b]["algset.json"] || {};
    const puzzleA = algsetA.puzzle || "FTO";
    const puzzleB = algsetB.puzzle || "FTO";
    const puzzleCompare =
      (puzzleOrder.indexOf(puzzleA) === -1 ? puzzleOrder.length : puzzleOrder.indexOf(puzzleA)) -
      (puzzleOrder.indexOf(puzzleB) === -1 ? puzzleOrder.length : puzzleOrder.indexOf(puzzleB));
    if (puzzleCompare !== 0) return puzzleCompare;
    return (algsetA.name || a).localeCompare(algsetB.name || b);
  });

  elements.datasetSelect.replaceChildren();
  elements.datasetHomeGrid.replaceChildren();

  const puzzleSections = new Map();
  for (const key of keys) {
    const algset = bundled[key]["algset.json"] || {};
    const cases = bundled[key]["cases.json"]?.cases || [];
    const previewCase = normalizeDataset(bundled[key]).cases.find((item) => (item.svg || "").trim());
    const option = document.createElement("option");
    option.value = key;
    option.textContent = algset.name || key;
    elements.datasetSelect.append(option);

    const button = document.createElement("button");
    button.className = "dataset-choice-button";
    button.type = "button";
    button.dataset.datasetKey = key;

    const name = document.createElement("strong");
    name.textContent = algset.name || key;
    const meta = document.createElement("span");
    meta.textContent = `${algset.puzzle || "FTO"} · ${cases.length}개`;

    const preview = document.createElement("div");
    preview.className = "dataset-choice-preview";
    if (previewCase?.svg) {
      preview.innerHTML = previewCase.svg;
    } else {
      preview.classList.add("is-missing");
      preview.textContent = "이미지없음";
    }

    const textBlock = document.createElement("div");
    textBlock.className = "dataset-choice-text";
    textBlock.append(name, meta);

    button.append(preview, textBlock);

    const puzzle = algset.puzzle || "FTO";
    if (!puzzleSections.has(puzzle)) {
      const section = document.createElement("section");
      section.className = "dataset-puzzle-section";

      const title = document.createElement("h3");
      title.className = "dataset-puzzle-title";
      title.textContent = `[${puzzle}]`;

      const grid = document.createElement("div");
      grid.className = "dataset-puzzle-grid";

      section.append(title, grid);
      elements.datasetHomeGrid.append(section);
      puzzleSections.set(puzzle, grid);
    }
    puzzleSections.get(puzzle).append(button);
  }

  renderPresetShortcuts();
  return keys;
}


function collectPinnedPresetShortcuts() {
  const bundled = window.AlgNoteBundledData || {};
  const keys = Object.keys(bundled).sort((a, b) => {
    const nameA = bundled[a]["algset.json"]?.name || a;
    const nameB = bundled[b]["algset.json"]?.name || b;
    return nameA.localeCompare(nameB);
  });
  const shortcuts = [];

  for (const key of keys) {
    const dataset = normalizeDataset(bundled[key]);
    const algset = bundled[key]["algset.json"] || {};
    const saved = loadJson(selectionPresetKey(datasetKey(dataset)), { presets: [] });
    for (const preset of saved.presets || []) {
      if (!preset?.id || !preset.name || preset.pinned !== true) continue;
      shortcuts.push({
        datasetKey: key,
        presetId: String(preset.id),
        presetName: String(preset.name),
        selectedCount: Array.isArray(preset.selectedCards) ? preset.selectedCards.length : 0,
        datasetName: algset.name || key,
        puzzle: algset.puzzle || "FTO",
      });
    }
  }

  return shortcuts;
}


function renderPresetShortcuts() {
  const shortcuts = collectPinnedPresetShortcuts();
  elements.presetShortcutGrid.replaceChildren();
  elements.presetShortcutEmpty.hidden = shortcuts.length > 0;
  if (!shortcuts.length) return;

  const fragment = document.createDocumentFragment();
  for (const shortcut of shortcuts) {
    const button = document.createElement("button");
    button.className = "preset-shortcut-button";
    button.type = "button";
    button.dataset.datasetKey = shortcut.datasetKey;
    button.dataset.presetId = shortcut.presetId;

    const icon = document.createElement("span");
    icon.className = "preset-shortcut-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "★";

    const text = document.createElement("span");
    text.className = "preset-shortcut-text";
    const name = document.createElement("strong");
    name.textContent = shortcut.presetName;
    const meta = document.createElement("span");
    meta.textContent = `${shortcut.puzzle} · ${shortcut.datasetName} · ${shortcut.selectedCount} cases`;
    text.append(name, meta);

    button.append(icon, text);
    fragment.append(button);
  }

  elements.presetShortcutGrid.append(fragment);
}


function updateDatasetChoiceButtons() {
  for (const button of elements.datasetHomeGrid.querySelectorAll(".dataset-choice-button")) {
    button.classList.toggle("is-active", button.dataset.datasetKey === elements.datasetSelect.value);
  }
}


function loadBundledDataset(key, options = {}) {
  const bundled = window.AlgNoteBundledData || {};
  if (!bundled[key]) return;
  elements.datasetSelect.value = key;
  showNoteView();
  setDataset(bundled[key]);
  if (options.presetId) applySelectionPresetById(options.presetId);
  updateDatasetChoiceButtons();
}


elements.datasetSelect.addEventListener("change", (event) => {
  loadBundledDataset(event.target.value);
});

elements.homeButton.addEventListener("click", () => {
  showHomeView();
});

elements.homeSettingsButton.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleHomeSettings();
});

elements.homeSettingsPopover.addEventListener("click", (event) => {
  event.stopPropagation();
});

for (const button of elements.accentThemeButtons) {
  button.addEventListener("click", () => {
    const nextTheme = button.dataset.accentTheme;
    if (!ACCENT_THEMES.has(nextTheme) || state.accentTheme === nextTheme) return;
    state.accentTheme = nextTheme;
    saveJson("accentTheme", state.accentTheme);
    applyAccentTheme();
  });
}

elements.datasetHomeGrid.addEventListener("click", (event) => {
  const button = event.target.closest(".dataset-choice-button");
  if (!button) return;
  loadBundledDataset(button.dataset.datasetKey);
  saveJson("lastBundledDataset", button.dataset.datasetKey);
});

elements.presetShortcutGrid.addEventListener("click", (event) => {
  const button = event.target.closest(".preset-shortcut-button");
  if (!button) return;
  loadBundledDataset(button.dataset.datasetKey, { presetId: button.dataset.presetId });
  saveJson("lastBundledDataset", button.dataset.datasetKey);
});

elements.searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  state.selectedCaseId = "";
  render();
});

for (const button of elements.filterMenuButtons) {
  button.addEventListener("click", () => {
    const panel = document.getElementById(`${button.dataset.filterMenu}FilterOptions`);
    const willOpen = panel.hidden;
    closeFilterMenus();
    panel.hidden = !willOpen;
    button.setAttribute("aria-expanded", willOpen ? "true" : "false");
  });
}

document.addEventListener("click", (event) => {
  if (event.target instanceof Element && event.target.closest(".home-settings-wrapper")) return;
  closeHomeSettings();
  if (event.target instanceof Element && event.target.closest(".filter-menu")) return;
  closeFilterMenus();
});

function toggleFilterValue(set, value) {
  if (set.has(value)) {
    set.delete(value);
  } else {
    set.add(value);
  }
  state.selectedCaseId = "";
  render();
}

elements.groupFilterOptions.addEventListener("change", (event) => {
  if (event.target.matches("input[type='checkbox']")) toggleFilterValue(state.groupFilters, event.target.value);
});

elements.recognitionFilterOptions.addEventListener("click", (event) => {
  const button = event.target.closest(".filter-choice-button");
  if (button) toggleFilterValue(state.recognitionFilters, button.dataset.value);
});

elements.bookmarkFilterOptions.addEventListener("click", (event) => {
  const button = event.target.closest(".filter-choice-button");
  if (button) toggleFilterValue(state.bookmarkFilters, button.dataset.value);
});

for (const button of elements.viewModeButtons) {
  button.addEventListener("click", () => {
    const nextMode = button.dataset.viewMode;
    if (!VIEW_MODES.has(nextMode) || state.viewMode === nextMode) return;
    state.viewMode = nextMode;
    state.editingCaseId = "";
    state.selectedCaseId = "";
    saveJson("viewModeV3", state.viewMode);
    render();
  });
}

elements.saveFavoritePresetButton.addEventListener("click", () => {
  const name = elements.favoritePresetNameInput.value.trim();
  if (!name) return;
  if (hasDuplicatePresetName(name)) {
    window.alert("같은 해법셋 안에 같은 이름의 프리셋이 이미 있습니다.");
    elements.favoritePresetNameInput.focus();
    return;
  }

  const preset = {
    id: makePresetId(),
    name,
    selectedCards: [...state.selectedCards],
    pinned: false,
  };
  state.selectionPresets.push(preset);
  state.activeSelectionPresetId = preset.id;
  elements.favoritePresetNameInput.value = "";
  saveSelectionPresets();
  renderPresetShortcuts();
  render();
});

elements.favoritePresetList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-preset-action]");
  const item = event.target.closest(".preset-item");
  if (!button || !item) return;

  const preset = state.selectionPresets.find((entry) => entry.id === item.dataset.presetId);
  if (!preset) return;

  if (button.dataset.presetAction === "delete") {
    if (!window.confirm(`"${preset.name}" 프리셋을 삭제할까요?`)) return;
    state.selectionPresets = state.selectionPresets.filter((entry) => entry.id !== preset.id);
    if (state.activeSelectionPresetId === preset.id) state.activeSelectionPresetId = "";
    saveSelectionPresets();
    renderPresetShortcuts();
    render();
    return;
  }

  if (button.dataset.presetAction === "pin") {
    preset.pinned = !preset.pinned;
    saveSelectionPresets();
    renderPresetShortcuts();
    render();
    return;
  }

  applySelectionPreset(preset);
});

elements.selectedOnlyButton.addEventListener("click", () => {
  state.selectedOnly = !state.selectedOnly;
  state.selectedCaseId = "";
  render();
});

elements.selectAllCardsButton.addEventListener("click", () => {
  for (const item of visibleCases()) {
    state.selectedCards.add(item.id);
  }
  state.activeSelectionPresetId = "";
  saveSelectionPresets();
  render();
});

elements.clearSelectedCardsButton.addEventListener("click", () => {
  state.selectedCards = new Set();
  state.selectedOnly = false;
  state.selectedCaseId = "";
  state.activeSelectionPresetId = "";
  saveSelectionPresets();
  render();
});

elements.drillStartButton.addEventListener("click", () => {
  startDrill();
});

elements.drillRecapModeButton.addEventListener("click", () => {
  setDrillMode("recap");
});

elements.drillTrainModeButton.addEventListener("click", () => {
  setDrillMode("train");
});

elements.drillRandomAufButton.addEventListener("click", () => {
  state.drill.randomAuf = !state.drill.randomAuf;
  saveJson("drillRandomAuf", state.drill.randomAuf);
  if (state.drill.active && state.drill.timerStatus === "idle" && !state.drill.completed) {
    state.drill.currentSetup = makeDrillSetup(currentDrillItem());
  }
  renderDrill();
});

elements.drillCloseButton.addEventListener("click", () => {
  closeDrill();
});

elements.drillNextButton.addEventListener("click", () => {
  skipDrillCase();
});

elements.drillShowAnswerButton.addEventListener("click", () => {
  toggleDrillAnswer();
});

elements.drillMain.addEventListener("click", () => {
  toggleDrillTimer();
});

elements.drillUndoButton.addEventListener("click", () => {
  undoDrillResult();
});

elements.drillResultList.addEventListener("click", (event) => {
  const button = event.target.closest(".drill-detail-button");
  if (!button) return;
  showDrillResultDetail(button.dataset.resultId);
});

elements.sidebarOpenButton.addEventListener("click", () => {
  state.sidebarOpen = !state.sidebarOpen;
  saveJson("sidebarOpen", state.sidebarOpen);
  updateSidebarLayout();
});

elements.sidebarResizeHandle.addEventListener("pointerdown", (event) => {
  if (window.matchMedia("(max-width: 720px)").matches) return;
  event.preventDefault();
  elements.sidebarResizeHandle.setPointerCapture(event.pointerId);
  document.body.classList.add("is-resizing-sidebar");

  const handleMove = (moveEvent) => {
    state.sidebarWidth = clampSidebarWidth(moveEvent.clientX);
    updateSidebarLayout();
  };

  const handleUp = () => {
    saveJson("sidebarWidth", state.sidebarWidth);
    document.body.classList.remove("is-resizing-sidebar");
    elements.sidebarResizeHandle.removeEventListener("pointermove", handleMove);
    elements.sidebarResizeHandle.removeEventListener("pointerup", handleUp);
    elements.sidebarResizeHandle.removeEventListener("pointercancel", handleUp);
  };

  elements.sidebarResizeHandle.addEventListener("pointermove", handleMove);
  elements.sidebarResizeHandle.addEventListener("pointerup", handleUp);
  elements.sidebarResizeHandle.addEventListener("pointercancel", handleUp);
});

elements.exportJsonButton.addEventListener("click", () => {
  state.exportMode = "allEdits";
  updateExportPanel();
});

elements.exportFullButton.addEventListener("click", () => {
  state.exportMode = "full";
  updateExportPanel();
});

elements.exportEditsButton.addEventListener("click", () => {
  state.exportMode = "edits";
  updateExportPanel();
});

elements.copyJsonButton.addEventListener("click", async () => {
  await navigator.clipboard.writeText(elements.exportJsonText.value);
});

elements.downloadJsonButton.addEventListener("click", () => {
  downloadExportJson();
});

elements.resetJsonButton.addEventListener("click", () => {
  if (!window.confirm("브라우저에 저장된 수정 JSON을 초기화할까요? 북마크와 프리셋은 유지됩니다.")) return;
  resetSavedJsonEdits();
});

elements.closeExportButton.addEventListener("click", () => {
  elements.exportPanel.hidden = true;
});

elements.clearFiltersButton.addEventListener("click", () => {
  state.query = "";
  state.groupFilters = new Set();
  state.recognitionFilters = new Set();
  state.bookmarkFilters = new Set();
  state.selectedCaseId = "";
  elements.searchInput.value = "";
  render();
});

function handleCaseAction(event) {
  if (event.target.closest(".close-detail-button")) {
    closeCaseDetail();
    return;
  }

  if (event.target.closest(".prev-detail-button")) {
    moveSelectedCase(-1);
    return;
  }

  if (event.target.closest(".next-detail-button")) {
    moveSelectedCase(1);
    return;
  }

  const groupTitle = event.target.closest(".case-group-title");
  if (groupTitle) {
    const groupCards = [...groupTitle.closest(".case-group-section").querySelectorAll(".case-card")];
    const groupIds = groupCards.map((card) => card.dataset.caseId).filter(Boolean);
    const shouldClear = groupIds.length > 0 && groupIds.every((id) => state.selectedCards.has(id));
    for (const id of groupIds) {
      if (shouldClear) {
        state.selectedCards.delete(id);
      } else {
        state.selectedCards.add(id);
      }
    }
    state.activeSelectionPresetId = "";
    saveSelectionPresets();
    render();
    return;
  }

  const card = event.target.closest(".case-card");
  if (!card) return;

  const caseId = card.dataset.caseId;
  if (event.target.closest(".edit-button")) {
    state.editingCaseId = state.editingCaseId === caseId ? "" : caseId;
    render();
    return;
  }

  if (event.target.closest(".add-algorithm-button")) {
    const list = card.querySelector(".algorithm-editor-list");
    const row = document.createElement("div");
    row.className = "algorithm-editor-row";

    const moveUpButton = document.createElement("button");
    moveUpButton.className = "move-algorithm-button move-algorithm-up-button icon-button";
    moveUpButton.type = "button";
    moveUpButton.dataset.direction = "up";
    moveUpButton.textContent = "↑";
    moveUpButton.setAttribute("aria-label", "알고리즘 위로 이동");
    moveUpButton.title = "알고리즘 위로 이동";

    const moveDownButton = document.createElement("button");
    moveDownButton.className = "move-algorithm-button move-algorithm-down-button icon-button";
    moveDownButton.type = "button";
    moveDownButton.dataset.direction = "down";
    moveDownButton.textContent = "↓";
    moveDownButton.setAttribute("aria-label", "알고리즘 아래로 이동");
    moveDownButton.title = "알고리즘 아래로 이동";

    const textarea = document.createElement("textarea");
    textarea.className = "algorithm-editor";
    textarea.rows = 2;
    textarea.setAttribute("aria-label", "알고리즘 편집");

    const removeButton = document.createElement("button");
    removeButton.className = "remove-algorithm-button icon-button";
    removeButton.type = "button";
    removeButton.textContent = "×";
    removeButton.setAttribute("aria-label", "알고리즘 삭제");
    removeButton.title = "알고리즘 삭제";

    row.append(moveUpButton, moveDownButton, textarea, removeButton);
    list.insertBefore(row, card.querySelector(".edit-actions"));
    row.querySelector(".algorithm-editor").focus();
    return;
  }

  const moveAlgorithmButton = event.target.closest(".move-algorithm-button");
  if (moveAlgorithmButton) {
    const row = moveAlgorithmButton.closest(".algorithm-editor-row");
    const direction = moveAlgorithmButton.dataset.direction;
    if (direction === "up" && row.previousElementSibling?.classList.contains("algorithm-editor-row")) {
      row.parentNode.insertBefore(row, row.previousElementSibling);
      row.querySelector(".algorithm-editor").focus();
    }
    if (direction === "down" && row.nextElementSibling?.classList.contains("algorithm-editor-row")) {
      row.parentNode.insertBefore(row.nextElementSibling, row);
      row.querySelector(".algorithm-editor").focus();
    }
    return;
  }

  const removeAlgorithmButton = event.target.closest(".remove-algorithm-button");
  if (removeAlgorithmButton) {
    const rows = card.querySelectorAll(".algorithm-editor-row");
    if (rows.length > 1) {
      removeAlgorithmButton.closest(".algorithm-editor-row").remove();
    } else {
      removeAlgorithmButton.closest(".algorithm-editor-row").querySelector(".algorithm-editor").value = "";
    }
    return;
  }

  if (event.target.closest(".save-edit-button")) {
    saveCardEdit(card);
    return;
  }

  if (event.target.closest(".cancel-edit-button")) {
    state.editingCaseId = "";
    render();
    return;
  }

  if (event.target.closest(".setup-editor, .algorithm-editor, .recognition-edit-section")) {
    return;
  }

  const bookmarkButton = event.target.closest(".bookmark-button");
  if (bookmarkButton) {
    const nextBookmark = bookmarkButton.dataset.bookmark;
    if (state.bookmarks.get(caseId) === nextBookmark) {
      state.bookmarks.delete(caseId);
    } else {
      state.bookmarks.set(caseId, nextBookmark);
    }
    savePersonalState();
    render();
    return;
  }

  if (card.closest("#caseDetail")) {
    return;
  }

  if (state.selectedCards.has(caseId)) {
    state.selectedCards.delete(caseId);
  } else {
    state.selectedCards.add(caseId);
  }
  state.activeSelectionPresetId = "";
  saveSelectionPresets();
  render();

}


elements.caseGrid.addEventListener("click", handleCaseAction);
elements.caseDetail.addEventListener("click", handleCaseAction);
elements.caseGrid.addEventListener("contextmenu", (event) => {
  const card = event.target.closest(".case-card");
  if (!card) return;
  event.preventDefault();
  openCaseDetail(card.dataset.caseId);
});
document.addEventListener("keydown", (event) => {
  if (event.target instanceof Element && event.target.closest("input, select, textarea, [contenteditable='true']")) return;

  if (state.drill.active && event.code === "Space") {
    event.preventDefault();
    toggleDrillTimer();
    return;
  }

  if (!state.selectedCaseId) return;

  if (event.key === "Escape") {
    event.preventDefault();
    closeCaseDetail();
    return;
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    moveSelectedCase(-1);
    return;
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    moveSelectedCase(1);
  }
});
const datasetKeys = renderDatasetOptions();
applyAccentTheme();
updateSidebarLayout();
updateViewModeButtons();
if (datasetKeys.length) {
  const lastKey = loadJson("lastBundledDataset", datasetKeys[0]);
  elements.datasetSelect.value = datasetKeys.includes(lastKey) ? lastKey : datasetKeys[0];
  updateDatasetChoiceButtons();
  showHomeView();
  elements.datasetSelect.addEventListener("change", (event) => {
    saveJson("lastBundledDataset", event.target.value);
  });
} else {
  elements.emptyState.hidden = true;
  showHomeView();
}
window.addEventListener("beforeunload", saveCurrentViewState);
window.addEventListener("scroll", () => {
  if (!state.key || state.pendingScrollY !== null) return;
  window.clearTimeout(state.scrollSaveTimer);
  state.scrollSaveTimer = window.setTimeout(saveCurrentViewState, 150);
}, { passive: true });
})();
