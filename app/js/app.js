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
const BOOKMARK_TYPES = new Set(["red-sun", "green-moon", "yellow-star", "blue-cloud"]);

function initialViewMode() {
  const saved = loadJson("viewModeV3", "");
  if (VIEW_MODES.has(saved)) return saved;
  return loadJson("detailModeV2", "compact") === "full" ? "full" : "compact";
}

const elements = {
  datasetLabel: document.getElementById("datasetLabel"),
  datasetSelect: document.getElementById("datasetSelect"),
  homeButton: document.getElementById("homeButton"),
  homeView: document.getElementById("homeView"),
  datasetHomeGrid: document.getElementById("datasetHomeGrid"),
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
  closeExportButton: document.getElementById("closeExportButton"),
  emptyState: document.getElementById("emptyState"),
  summary: document.getElementById("summary"),
  caseGrid: document.getElementById("caseGrid"),
  caseDetail: document.getElementById("caseDetail"),
  caseCardTemplate: document.getElementById("caseCardTemplate"),
  drillStartButton: document.getElementById("drillStartButton"),
  drillOverlay: document.getElementById("drillOverlay"),
  drillProgress: document.getElementById("drillProgress"),
  drillSetupText: document.getElementById("drillSetupText"),
  drillShowAnswerButton: document.getElementById("drillShowAnswerButton"),
  drillNextButton: document.getElementById("drillNextButton"),
  drillCloseButton: document.getElementById("drillCloseButton"),
  drillPreviousBlock: document.getElementById("drillPreviousBlock"),
  drillPreviousSetupText: document.getElementById("drillPreviousSetupText"),
  drillPreviousAnswerButton: document.getElementById("drillPreviousAnswerButton"),
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
    queue: [],
    index: 0,
    currentSetup: "",
    previous: null,
    completed: false,
  },
};


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


function selectionPresetKey() {
  return `selectionPresets.${state.key}`;
}


function loadSelectionPresets() {
  const saved = loadJson(selectionPresetKey(), { presets: [], activePresetId: "" });
  state.selectionPresets = (saved.presets || [])
    .filter((preset) => preset && preset.id && preset.name)
    .map((preset) => ({
      id: String(preset.id),
      name: String(preset.name),
      selectedCards: Array.isArray(preset.selectedCards) ? preset.selectedCards.map(String) : [],
    }));
  state.activeSelectionPresetId = state.selectionPresets.some((preset) => preset.id === saved.activePresetId)
    ? saved.activePresetId
    : "";
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

  for (const preset of state.selectionPresets) {
    const item = document.createElement("div");
    item.className = "preset-item";
    item.classList.toggle("is-active", preset.id === state.activeSelectionPresetId);
    item.dataset.presetId = preset.id;
    item.setAttribute("role", "listitem");

    const applyButton = document.createElement("button");
    applyButton.className = "preset-apply-button";
    applyButton.type = "button";
    applyButton.dataset.presetAction = "apply";

    const name = document.createElement("span");
    name.textContent = preset.name;
    const count = document.createElement("strong");
    count.textContent = preset.selectedCards.length;
    applyButton.append(name, count);

    const deleteButton = document.createElement("button");
    deleteButton.className = "preset-delete-button";
    deleteButton.type = "button";
    deleteButton.dataset.presetAction = "delete";
    deleteButton.setAttribute("aria-label", `${preset.name} 프리셋 삭제`);
    deleteButton.title = "삭제";
    deleteButton.textContent = "×";

    item.append(applyButton, deleteButton);
    elements.favoritePresetList.append(item);
  }

  elements.selectedOnlyButton.classList.toggle("is-active", state.selectedOnly);
  elements.selectedOnlyButton.setAttribute("aria-pressed", state.selectedOnly ? "true" : "false");
}


function makePresetId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
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


function randomUTurn() {
  const values = ["", "U", "U'"];
  return values[Math.floor(Math.random() * values.length)];
}


function makeDrillSetup(item) {
  const setup = (item?.scramble || "").trim();
  if (!setup) return "등록된 setup이 없습니다.";

  return [randomUTurn(), setup, randomUTurn()].filter(Boolean).join(" ");
}


function currentDrillItem() {
  return state.drill.queue[state.drill.index] || null;
}


function updateDrillStartButton() {
  const canStart = !state.isHomeView && state.selectedCards.size > 0;
  elements.drillStartButton.disabled = !canStart;
  elements.drillStartButton.hidden = state.isHomeView || state.drill.active;
  elements.drillStartButton.title = canStart ? "드릴 시작" : "선택한 공식 없음";
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
  const remaining = Math.max(0, total - state.drill.index);
  elements.drillProgress.textContent = `${remaining} / ${total}`;

  if (state.drill.completed) {
    elements.drillSetupText.textContent = "드릴 완료";
    elements.drillShowAnswerButton.disabled = true;
    elements.drillNextButton.textContent = "다시 섞기";
  } else {
    elements.drillSetupText.textContent = state.drill.currentSetup;
    elements.drillShowAnswerButton.disabled = false;
    elements.drillNextButton.textContent = "다음";
  }

  const previous = state.drill.previous;
  elements.drillPreviousBlock.hidden = !previous;
  if (previous) {
    elements.drillPreviousSetupText.textContent = previous.setup;
  }
}


function startDrill() {
  const queue = shuffledItems(selectedDrillCases());
  if (!queue.length) return;

  state.drill.active = true;
  state.drill.queue = queue;
  state.drill.index = 0;
  state.drill.previous = null;
  state.drill.completed = false;
  state.drill.currentSetup = makeDrillSetup(currentDrillItem());
  state.selectedCaseId = "";
  state.editingCaseId = "";
  render();
}


function closeDrill() {
  state.drill.active = false;
  state.drill.queue = [];
  state.drill.index = 0;
  state.drill.currentSetup = "";
  state.drill.previous = null;
  state.drill.completed = false;
  renderDrill();
}


function advanceDrill() {
  if (!state.drill.active) return;
  if (state.drill.completed) {
    startDrill();
    return;
  }

  const current = currentDrillItem();
  if (current) {
    state.drill.previous = {
      caseId: current.id,
      setup: state.drill.currentSetup,
    };
  }

  state.drill.index += 1;
  if (state.drill.index >= state.drill.queue.length) {
    state.drill.completed = true;
    state.drill.currentSetup = "";
  } else {
    state.drill.currentSetup = makeDrillSetup(currentDrillItem());
  }
  renderDrill();
}


function showDrillAnswer(item) {
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
  elements.datasetLabel.textContent = "FTO 공식 노트";
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
  const keys = Object.keys(bundled).sort((a, b) => {
    const nameA = bundled[a]["algset.json"]?.name || a;
    const nameB = bundled[b]["algset.json"]?.name || b;
    return nameA.localeCompare(nameB);
  });

  elements.datasetSelect.replaceChildren();
  elements.datasetHomeGrid.replaceChildren();
  for (const key of keys) {
    const algset = bundled[key]["algset.json"] || {};
    const cases = bundled[key]["cases.json"]?.cases || [];
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

    button.append(name, meta);
    elements.datasetHomeGrid.append(button);
  }

  return keys;
}


function updateDatasetChoiceButtons() {
  for (const button of elements.datasetHomeGrid.querySelectorAll(".dataset-choice-button")) {
    button.classList.toggle("is-active", button.dataset.datasetKey === elements.datasetSelect.value);
  }
}


function loadBundledDataset(key) {
  const bundled = window.AlgNoteBundledData || {};
  if (!bundled[key]) return;
  elements.datasetSelect.value = key;
  showNoteView();
  setDataset(bundled[key]);
  updateDatasetChoiceButtons();
}


elements.datasetSelect.addEventListener("change", (event) => {
  loadBundledDataset(event.target.value);
});

elements.homeButton.addEventListener("click", () => {
  showHomeView();
});

elements.datasetHomeGrid.addEventListener("click", (event) => {
  const button = event.target.closest(".dataset-choice-button");
  if (!button) return;
  loadBundledDataset(button.dataset.datasetKey);
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
    for (const menuButton of elements.filterMenuButtons) {
      const menuPanel = document.getElementById(`${menuButton.dataset.filterMenu}FilterOptions`);
      menuPanel.hidden = true;
      menuButton.setAttribute("aria-expanded", "false");
    }
    panel.hidden = !willOpen;
    button.setAttribute("aria-expanded", willOpen ? "true" : "false");
  });
}

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

  const preset = {
    id: makePresetId(),
    name,
    selectedCards: [...state.selectedCards],
  };
  state.selectionPresets.push(preset);
  state.activeSelectionPresetId = preset.id;
  elements.favoritePresetNameInput.value = "";
  saveSelectionPresets();
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
    render();
    return;
  }

  state.selectedCards = new Set(preset.selectedCards);
  state.selectedOnly = true;
  state.selectedCaseId = "";
  state.activeSelectionPresetId = preset.id;
  saveSelectionPresets();
  render();
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

elements.drillCloseButton.addEventListener("click", () => {
  closeDrill();
});

elements.drillNextButton.addEventListener("click", () => {
  advanceDrill();
});

elements.drillShowAnswerButton.addEventListener("click", () => {
  showDrillAnswer(currentDrillItem());
});

elements.drillPreviousAnswerButton.addEventListener("click", () => {
  const previous = state.drill.previous;
  if (!previous) return;
  showDrillAnswer(state.drill.queue.find((item) => item.id === previous.caseId));
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
    advanceDrill();
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
