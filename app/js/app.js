(() => {
const { normalizeDataset } = window.AlgNoteNormalize;
const { renderCases, renderGroupedCases, renderCaseDetail, renderGroupOptions, renderRecognitionFilterTags, renderSummary } = window.AlgNoteRender;
const { datasetKey, loadJson, saveJson } = window.AlgNoteStorage;

const DEFAULT_COLUMNS = "4";
const DEFAULT_IMAGE_SIZE = 190;

const elements = {
  datasetLabel: document.getElementById("datasetLabel"),
  datasetSelect: document.getElementById("datasetSelect"),
  searchInput: document.getElementById("searchInput"),
  groupSelect: document.getElementById("groupSelect"),
  statusSelect: document.getElementById("statusSelect"),
  recognitionFilterTags: document.getElementById("recognitionFilterTags"),
  detailModeToggle: document.getElementById("detailModeToggle"),
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
};

const state = {
  entries: null,
  dataset: null,
  key: "",
  query: "",
  group: "all",
  statusFilter: "all",
  recognitionFilters: new Set(),
  detailMode: loadJson("detailModeV2", "compact"),
  columns: DEFAULT_COLUMNS,
  imagesVisible: true,
  imageSize: DEFAULT_IMAGE_SIZE,
  exportMode: "full",
  editingCaseId: "",
  selectedCaseId: "",
  favorites: new Set(),
  statuses: new Map(),
  edits: new Map(),
};


function savePersonalState() {
  if (!state.key) return;
  saveJson(`personal.${state.key}`, {
    favorites: [...state.favorites],
    statuses: Object.fromEntries(state.statuses),
    edits: Object.fromEntries(state.edits),
  });
}


function loadPersonalState() {
  const saved = loadJson(`personal.${state.key}`, { favorites: [], statuses: {} });
  state.favorites = new Set(saved.favorites || []);
  state.statuses = new Map(Object.entries(saved.statuses || {}));
  state.edits = new Map(Object.entries(saved.edits || {}));
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
    const groupOk = state.group === "all" || item.group === state.group;
    const recognitionOk =
      state.recognitionFilters.size === 0 ||
      recognitionList(item.tags?.recognition).some((value) => state.recognitionFilters.has(value));
    const queryOk = matchesQuery(item, query);
    const favoriteOk = state.statusFilter !== "favorite" || state.favorites.has(item.id);
    const statusOk =
      state.statusFilter === "all" ||
      state.statusFilter === "favorite" ||
      state.statuses.get(item.id) === state.statusFilter;
    return groupOk && recognitionOk && queryOk && favoriteOk && statusOk;
  });
}


function refreshRecognitionFilters() {
  const available = new Set(effectiveCases().flatMap((item) => recognitionList(item.tags?.recognition)));
  state.recognitionFilters = new Set([...state.recognitionFilters].filter((value) => available.has(value)));
  renderRecognitionFilterTags(elements.recognitionFilterTags, effectiveCases(), state.recognitionFilters);
}


function render() {
  if (!state.dataset) return;

  const rows = filteredCases();
  const selectedCase = rows.find((item) => item.id === state.selectedCaseId);
  if (state.selectedCaseId && !selectedCase) state.selectedCaseId = "";

  elements.emptyState.hidden = true;
  elements.summary.hidden = false;
  elements.caseGrid.hidden = false;
  refreshRecognitionFilters();
  elements.caseGrid.dataset.columns = state.columns;
  delete elements.caseGrid.dataset.viewMode;
  elements.caseGrid.dataset.detailMode = state.detailMode;
  elements.caseGrid.style.setProperty("--image-size", `${state.imageSize}px`);
  elements.caseDetail.style.setProperty("--image-size", `${state.imageSize}px`);
  elements.datasetLabel.textContent = `${state.dataset.puzzle} · ${state.dataset.name}`;

  renderSummary(elements.summary, state.dataset, rows, state);
  if (state.detailMode === "compact") {
    renderGroupedCases(elements.caseGrid, elements.caseCardTemplate, rows, state);
  } else {
    renderCases(elements.caseGrid, elements.caseCardTemplate, rows, state);
  }

  if (state.detailMode === "compact" && state.selectedCaseId) {
    renderCaseDetail(
      elements.caseDetail,
      elements.caseCardTemplate,
      rows.find((item) => item.id === state.selectedCaseId),
      state,
    );
  } else {
    elements.caseDetail.hidden = true;
    elements.caseDetail.replaceChildren();
  }
}


function setDataset(entries) {
  state.entries = entries;
  state.dataset = normalizeDataset(entries);
  state.key = datasetKey(state.dataset);
  state.query = "";
  state.group = "all";
  state.statusFilter = "all";
  state.recognitionFilters = new Set();
  state.editingCaseId = "";
  state.selectedCaseId = "";
  elements.searchInput.value = "";
  elements.statusSelect.value = "all";
  elements.exportPanel.hidden = true;
  elements.exportJsonText.value = "";
  renderGroupOptions(elements.groupSelect, state.dataset.groups);
  elements.groupSelect.value = "all";
  loadPersonalState();
  refreshRecognitionFilters();
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


function exportJsonForMode() {
  return state.exportMode === "edits" ? makeEditedCasesJson() : makeMergedCasesJson();
}


function updateExportPanel() {
  const isEdits = state.exportMode === "edits";
  elements.exportPanelTitle.textContent = isEdits ? "편집분만 출력" : "cases.json 출력";
  elements.exportPanelDescription.textContent = isEdits
    ? "브라우저에 저장된 편집 케이스만 모은 결과입니다."
    : "브라우저에 저장된 편집 내용을 현재 데이터에 병합한 결과입니다.";
  elements.exportFullButton.classList.toggle("is-active", !isEdits);
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
  link.download = state.exportMode === "edits"
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
  for (const key of keys) {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = bundled[key]["algset.json"]?.name || key;
    elements.datasetSelect.append(option);
  }

  return keys;
}


function loadBundledDataset(key) {
  const bundled = window.AlgNoteBundledData || {};
  if (!bundled[key]) return;
  elements.datasetSelect.value = key;
  setDataset(bundled[key]);
}


elements.datasetSelect.addEventListener("change", (event) => {
  loadBundledDataset(event.target.value);
});

elements.searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  state.selectedCaseId = "";
  render();
});

elements.groupSelect.addEventListener("change", (event) => {
  state.group = event.target.value;
  state.selectedCaseId = "";
  render();
});

elements.statusSelect.addEventListener("change", (event) => {
  state.statusFilter = event.target.value;
  state.selectedCaseId = "";
  render();
});

elements.recognitionFilterTags.addEventListener("click", (event) => {
  const button = event.target.closest(".tag-filter-button");
  if (!button) return;

  const value = button.dataset.recognition;
  if (state.recognitionFilters.has(value)) {
    state.recognitionFilters.delete(value);
  } else {
    state.recognitionFilters.add(value);
  }
  state.selectedCaseId = "";
  render();
});

elements.detailModeToggle.addEventListener("change", (event) => {
  state.detailMode = event.target.checked ? "full" : "compact";
  state.editingCaseId = "";
  state.selectedCaseId = "";
  saveJson("detailModeV2", state.detailMode);
  render();
});

elements.exportJsonButton.addEventListener("click", () => {
  state.exportMode = "full";
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
  state.group = "all";
  state.statusFilter = "all";
  state.recognitionFilters = new Set();
  state.selectedCaseId = "";
  elements.searchInput.value = "";
  elements.groupSelect.value = "all";
  elements.statusSelect.value = "all";
  render();
});

function handleCaseAction(event) {
  if (event.target.closest(".close-detail-button")) {
    state.selectedCaseId = "";
    state.editingCaseId = "";
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

    row.append(textarea, removeButton);
    list.insertBefore(row, card.querySelector(".edit-actions"));
    row.querySelector(".algorithm-editor").focus();
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

  if (event.target.closest(".favorite-button")) {
    if (state.favorites.has(caseId)) {
      state.favorites.delete(caseId);
    } else {
      state.favorites.add(caseId);
    }
    savePersonalState();
    render();
    return;
  }

  const statusButton = event.target.closest(".status-button");
  if (statusButton) {
    const nextStatus = statusButton.dataset.status;
    if (state.statuses.get(caseId) === nextStatus) {
      state.statuses.delete(caseId);
    } else {
      state.statuses.set(caseId, nextStatus);
    }
    savePersonalState();
    render();
    return;
  }

  if (state.detailMode === "compact" && card.classList.contains("is-compact")) {
    state.selectedCaseId = caseId;
    state.editingCaseId = "";
    render();
  }

}


elements.caseGrid.addEventListener("click", handleCaseAction);
elements.caseDetail.addEventListener("click", handleCaseAction);
const datasetKeys = renderDatasetOptions();
elements.detailModeToggle.checked = state.detailMode === "full";
if (datasetKeys.length) {
  const lastKey = loadJson("lastBundledDataset", datasetKeys[0]);
  loadBundledDataset(datasetKeys.includes(lastKey) ? lastKey : datasetKeys[0]);
  elements.datasetSelect.addEventListener("change", (event) => {
    saveJson("lastBundledDataset", event.target.value);
  });
} else {
  elements.emptyState.hidden = true;
}
})();
