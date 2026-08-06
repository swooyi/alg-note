window.AlgNoteRender = (() => {
const RECOGNITION_ORDER = [
  "is-corner-only",
  "is-corner-flipped-only",
  "is-pair-solved",
  "is-flipped-pair-solved",
  "is-pair-wrong",
  "is-flipped-pair-wrong",
];
const BOOKMARK_TYPES = [
  { id: "red-sun", label: "빨간 해", mark: "☀" },
  { id: "green-moon", label: "초록 달", mark: "☾" },
  { id: "yellow-star", label: "노란 별", mark: "★" },
  { id: "blue-cloud", label: "파란 구름", mark: "☁" },
];


function text(value) {
  return value == null ? "" : String(value);
}


function makeSummaryItem(label, value) {
  const element = document.createElement("span");
  element.textContent = `${label}: ${value}`;
  return element;
}


function makeFilterOption({ value, label, checked, className = "", mark = "" }) {
  const option = document.createElement("label");
  option.className = `filter-option ${className}`.trim();

  const input = document.createElement("input");
  input.type = "checkbox";
  input.value = value;
  input.checked = checked;

  const textNode = document.createElement("span");
  textNode.textContent = mark ? `${mark} ${label}` : label;

  option.append(input, textNode);
  return option;
}


function makeFilterButton({ value, label, selected, className = "", mark = "" }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `filter-choice-button ${className}`.trim();
  button.dataset.value = value;
  button.classList.toggle("is-active", selected);
  button.setAttribute("aria-pressed", selected ? "true" : "false");
  button.setAttribute("aria-label", label);
  button.title = label;
  button.textContent = mark || label;
  return button;
}


function renderGroupFilterOptions(container, groups, selectedValues) {
  container.innerHTML = "";

  for (const group of groups) {
    container.append(makeFilterOption({
      value: group.id,
      label: group.name,
      checked: selectedValues.has(group.id),
    }));
  }
}


function renderRecognitionFilterOptions(container, cases, selectedValues) {
  const values = sortedRecognitionValues(cases);
  container.innerHTML = "";
  container.classList.remove("bookmark-filter-panel");
  container.classList.add("recognition-filter-panel");

  for (const value of values) {
    container.append(makeFilterButton({
      value,
      label: value,
      selected: selectedValues.has(value),
      className: `tag-badge ${recognitionClassName(value)}`,
    }));
  }
}


function renderBookmarkFilterOptions(container, selectedValues) {
  container.innerHTML = "";
  container.classList.remove("recognition-filter-panel");
  container.classList.add("bookmark-filter-panel");

  for (const bookmark of BOOKMARK_TYPES) {
    container.append(makeFilterButton({
      value: bookmark.id,
      label: bookmark.label,
      selected: selectedValues.has(bookmark.id),
      className: `bookmark-choice bookmark-${bookmark.id}`,
      mark: bookmark.mark,
    }));
  }
}


function renderSummary(element, dataset, rows, state) {
  element.replaceChildren(
    makeSummaryItem("세트", dataset.name),
    makeSummaryItem("전체", dataset.cases.length),
    makeSummaryItem("표시", rows.length),
    makeSummaryItem("북마크", state.bookmarks?.size || 0),
    makeSummaryItem("선택", state.selectedCards?.size || 0),
  );
}


function caseMetaParts(item) {
  const tags = typeof item.tags === "object" && !Array.isArray(item.tags) ? item.tags : {};
  const parts = [item.id, item.groupName];
  parts.push(...recognitionList(tags.recognition));
  if (tags.typeCode) parts.push(tags.typeCode);
  if (tags.parity) parts.push(tags.parity);
  if (tags.tcp) parts.push("TCP");
  return parts;
}


function caseGroupTitle(item, state) {
  const tags = typeof item.tags === "object" && !Array.isArray(item.tags) ? item.tags : {};
  if (state.dataset?.algset === "1l3t" && tags.parity) {
    return `${item.groupName} - ${tags.parity}`;
  }
  return item.groupName || "기타";
}


function detailGroupLabel(item, state) {
  const tags = typeof item.tags === "object" && !Array.isArray(item.tags) ? item.tags : {};
  if (state.dataset?.algset === "1l3t" && tags.parity) {
    return `${item.groupName}-${tags.parity}`;
  }
  return item.groupName || "기타";
}


function recognitionValues(state) {
  const cases = state.dataset?.cases || [];
  return sortedRecognitionValues(cases);
}


function recognitionList(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(text);
  return value ? [text(value)] : [];
}


function sortedRecognitionValues(cases) {
  return [...new Set(cases.flatMap((item) => recognitionList(item.tags?.recognition)))]
    .sort((a, b) => {
      const indexA = RECOGNITION_ORDER.indexOf(a);
      const indexB = RECOGNITION_ORDER.indexOf(b);
      if (indexA !== -1 || indexB !== -1) {
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      }
      return a.localeCompare(b);
    });
}


function recognitionClassName(value) {
  return `tag-${text(value).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}


function makeCaseCard(template, item, state) {
  const node = template.content.firstElementChild.cloneNode(true);
  const currentBookmark = state.bookmarks?.get(item.id) || "";
  const isEditing = state.editingCaseId === item.id;
  const isCompact = state.viewMode === "compact" && !state.renderingDetail;
  const isList = state.viewMode === "list" && !state.renderingDetail;
  const isDetail = Boolean(state.renderingDetail) || state.viewMode === "full";
  const recognitions = typeof item.tags === "object" && !Array.isArray(item.tags) ? recognitionList(item.tags.recognition) : [];

  node.dataset.caseId = item.id;
  node.classList.toggle("is-editing", isEditing);
  node.classList.toggle("is-detail-card", isDetail);
  node.classList.toggle("is-list-card", isList);
  node.classList.toggle("is-selected", state.selectedCaseId === item.id);
  node.classList.toggle("is-active-card", state.selectedCards?.has(item.id));
  node.classList.toggle("is-compact", isCompact);
  node.classList.toggle("images-hidden", !state.imagesVisible || isList);
  node.classList.toggle("has-recognition-badges", !isEditing && (isDetail || isCompact || isList) && recognitions.length > 0);
  renderCaseTitle(node.querySelector(".case-name"), isDetail ? `[${detailGroupLabel(item, state)}] ${item.name}` : item.name, {
    currentBookmark,
  });
  node.querySelector(".case-meta").textContent = isDetail ? "" : caseMetaParts(item).filter(Boolean).join(" · ");
  renderSvgBox(node.querySelector(".svg-box"), item.svg);

  const cardTop = node.querySelector(".card-top");
  const setupSection = node.querySelector(".setup-section");
  const algSection = node.querySelector(".alg-section");

  if (isEditing) {
    setupSection.querySelector(".scramble").replaceWith(makeSetupEditor(item.scramble));
    algSection.querySelector(".algorithm-list").replaceWith(makeAlgorithmEditor(item.algorithms));
    node.append(makeRecognitionEditor(recognitions, recognitionValues(state)));
  } else {
    node.querySelector(".scramble").textContent = item.scramble || "-";

    const algorithmList = node.querySelector(".algorithm-list");
    for (const algorithm of item.algorithms) {
      const li = document.createElement("li");
      li.textContent = text(algorithm);
      algorithmList.append(li);
    }
    if ((isDetail || isCompact || isList) && recognitions.length) cardTop.after(makeRecognitionBadges(recognitions));
  }

  for (const button of node.querySelectorAll(".bookmark-button")) {
    const active = button.dataset.bookmark === currentBookmark;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  }
  node.querySelector(".edit-button").textContent = isEditing ? "×" : "✎";
  node.querySelector(".edit-button").setAttribute("aria-label", isEditing ? "편집 닫기" : "편집");
  node.querySelector(".edit-button").title = isEditing ? "편집 닫기" : "편집";

  return node;
}


function renderCaseTitle(title, label, { currentBookmark }) {
  title.replaceChildren();

  const labelNode = document.createElement("span");
  labelNode.className = "case-title-text";
  labelNode.textContent = label;
  title.append(labelNode);

  const badges = document.createElement("span");
  badges.className = "case-title-badges";

  const bookmark = BOOKMARK_TYPES.find((item) => item.id === currentBookmark);
  if (bookmark) {
    const badge = document.createElement("span");
    badge.className = `case-title-badge case-title-bookmark bookmark-${bookmark.id}`;
    badge.textContent = bookmark.mark;
    badge.title = bookmark.label;
    badges.append(badge);
  }

  if (badges.children.length) title.append(badges);
}


function renderSvgBox(box, svg) {
  if (text(svg).trim()) {
    box.innerHTML = svg;
    box.classList.remove("is-missing");
    return;
  }

  box.replaceChildren();
  box.classList.add("is-missing");
  const message = document.createElement("span");
  message.className = "image-missing-message";
  message.textContent = "이미지없음";
  box.append(message);
}


function makeSetupEditor(scramble) {
  const textarea = document.createElement("textarea");
  textarea.className = "setup-editor";
  textarea.rows = 3;
  textarea.value = text(scramble);
  textarea.setAttribute("aria-label", "setup 편집");
  return textarea;
}


function makeAlgorithmEditor(algorithms) {
  const wrapper = document.createElement("div");
  wrapper.className = "algorithm-editor-list";

  const values = algorithms.length ? algorithms : [""];
  for (const algorithm of values) {
    wrapper.append(makeAlgorithmEditorRow(algorithm));
  }

  const actions = document.createElement("div");
  actions.className = "edit-actions";

  const addButton = document.createElement("button");
  addButton.className = "add-algorithm-button";
  addButton.type = "button";
  addButton.textContent = "+ 알고리즘";

  const saveButton = document.createElement("button");
  saveButton.className = "save-edit-button";
  saveButton.type = "button";
  saveButton.textContent = "저장";

  const cancelButton = document.createElement("button");
  cancelButton.className = "cancel-edit-button";
  cancelButton.type = "button";
  cancelButton.textContent = "취소";

  actions.append(addButton, saveButton, cancelButton);
  wrapper.append(actions);
  return wrapper;
}


function makeAlgorithmEditorRow(algorithm) {
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
  textarea.value = text(algorithm);
  textarea.setAttribute("aria-label", "알고리즘 편집");

  const removeButton = document.createElement("button");
  removeButton.className = "remove-algorithm-button icon-button";
  removeButton.type = "button";
  removeButton.textContent = "×";
  removeButton.setAttribute("aria-label", "알고리즘 삭제");
  removeButton.title = "알고리즘 삭제";

  row.append(moveUpButton, moveDownButton, textarea, removeButton);
  return row;
}


function makeRecognitionBadges(recognitions) {
  const section = document.createElement("div");
  section.className = "recognition-badges";

  for (const recognition of recognitions) {
    const badge = document.createElement("span");
    badge.className = `tag-badge ${recognitionClassName(recognition)}`;
    badge.textContent = recognition;
    section.append(badge);
  }
  return section;
}


function makeRecognitionEditor(recognitions, values) {
  const section = document.createElement("div");
  section.className = "case-section recognition-edit-section";

  const title = document.createElement("h3");
  title.textContent = "recognition";

  const badges = document.createElement("div");
  badges.className = "recognition-toggle-list";

  const selected = new Set(recognitions);
  for (const value of values) {
    const label = document.createElement("label");
    label.className = "recognition-toggle";

    const input = document.createElement("input");
    input.className = "recognition-editor";
    input.type = "checkbox";
    input.value = value;
    input.checked = selected.has(value);

    const badge = document.createElement("span");
    badge.className = `tag-badge ${recognitionClassName(value)}`;
    badge.textContent = value;

    label.append(input, badge);
    badges.append(label);
  }

  section.append(title, badges);
  return section;
}


function renderCaseDetail(container, template, item, state) {
  if (!item) {
    container.hidden = true;
    container.replaceChildren();
    return;
  }

  const detailState = {
    ...state,
    renderingDetail: true,
  };
  const top = document.createElement("div");
  top.className = "case-detail-top";

  const prevButton = document.createElement("button");
  prevButton.className = "detail-nav-button prev-detail-button";
  prevButton.type = "button";
  prevButton.textContent = "이전 공식";
  prevButton.disabled = !state.detailNav?.hasPrev;

  const nextButton = document.createElement("button");
  nextButton.className = "detail-nav-button next-detail-button";
  nextButton.type = "button";
  nextButton.textContent = "다음 공식";
  nextButton.disabled = !state.detailNav?.hasNext;

  const closeButton = document.createElement("button");
  closeButton.className = "close-detail-button";
  closeButton.type = "button";
  closeButton.textContent = "닫기";

  top.append(prevButton, nextButton, closeButton);

  const card = makeCaseCard(template, item, detailState);
  container.replaceChildren(top, card);
  container.hidden = false;
}


function renderCases(grid, template, rows, state) {
  const fragment = document.createDocumentFragment();

  for (const item of rows) {
    fragment.append(makeCaseCard(template, item, state));
  }

  grid.replaceChildren(fragment);
}


function renderGroupedCases(grid, template, rows, state) {
  const fragment = document.createDocumentFragment();
  const groupOrder = [];
  const byGroup = new Map();

  for (const item of rows) {
    const title = caseGroupTitle(item, state);
    if (!byGroup.has(title)) {
      byGroup.set(title, []);
      groupOrder.push(title);
    }
    byGroup.get(title).push(item);
  }

  for (const titleText of groupOrder) {
    const section = document.createElement("section");
    section.className = "case-group-section";

    const title = document.createElement("h2");
    title.className = "case-group-title";
    title.dataset.groupTitle = titleText;
    title.textContent = titleText;
    section.append(title);

    const groupGrid = document.createElement("div");
    groupGrid.className = "case-grid grouped-grid";
    groupGrid.dataset.viewMode = state.viewMode;
    groupGrid.dataset.columns = state.columns;
    groupGrid.style.setProperty("--image-size", `${state.imageSize}px`);

    for (const item of byGroup.get(titleText)) {
      groupGrid.append(makeCaseCard(template, item, state));
    }

    section.append(groupGrid);
    fragment.append(section);
  }

  grid.replaceChildren(fragment);
}


function renderCasesByRecognition(grid, template, rows, state) {
  const fragment = document.createDocumentFragment();
  const groupOrder = [...new Set(rows.flatMap((item) => recognitionList(item.tags?.recognition).length ? recognitionList(item.tags?.recognition) : ["기타"]))].sort();

  for (const recognition of groupOrder) {
    const section = document.createElement("section");
    section.className = "recognition-section";

    const title = document.createElement("h2");
    title.className = "recognition-title";
    title.textContent = recognition;
    section.append(title);

    const groupGrid = document.createElement("div");
    groupGrid.className = "case-grid recognition-grid";
    groupGrid.dataset.columns = state.columns;
    groupGrid.dataset.viewMode = state.viewMode;

    for (const item of rows.filter((candidate) => {
      const values = recognitionList(candidate.tags?.recognition);
      return values.length ? values.includes(recognition) : recognition === "기타";
    })) {
      groupGrid.append(makeCaseCard(template, item, state));
    }

    section.append(groupGrid);
    fragment.append(section);
  }

  grid.replaceChildren(fragment);
}


return {
  renderCases,
  renderGroupedCases,
  renderCasesByRecognition,
  renderCaseDetail,
  renderGroupFilterOptions,
  renderRecognitionFilterOptions,
  renderBookmarkFilterOptions,
  renderSummary,
};
})();
