(() => {
const { normalizeDataset } = window.AlgNoteNormalize;
const { renderCases, renderGroupedCases, renderCaseDetail, renderGroupFilterOptions, renderRecognitionFilterOptions, renderBookmarkFilterOptions, renderSummary } = window.AlgNoteRender;
const { datasetKey, loadJson, saveJson } = window.AlgNoteStorage;

const DEFAULT_COLUMNS = "4";
const DEFAULT_IMAGE_SIZE = 190;
const DEFAULT_SIDEBAR_WIDTH = 288;
const MIN_SIDEBAR_WIDTH = 220;
const MAX_SIDEBAR_WIDTH = 440;
const DEFAULT_DRILL_HISTORY_WIDTH = 430;
const MIN_DRILL_HISTORY_WIDTH = 280;
const MAX_DRILL_HISTORY_WIDTH = 720;
const VIEW_MODES = new Set(["compact", "list", "full"]);
const ACCENT_THEMES = new Set(["red", "yellow", "green", "blue", "purple", "mono"]);
const LANGUAGES = new Set(["ko", "en", "ja"]);
const LANGUAGE_NAMES = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
};
const LANGUAGE_ICON_SOURCES = {
  ko: "./images/flag-ko.svg",
  ja: "./images/flag-ja.svg",
};
const BOOKMARK_TYPES = new Set(["red-sun", "green-moon", "yellow-star", "blue-cloud"]);
const DRILL_AUF_MODES = new Set(["none", "u", "up", "u2", "random"]);
const DRILL_AUF_LABELS = {
  none: "없음",
  u: "U",
  up: "U'",
  u2: "U2",
  random: "랜덤",
};
const UI_LABELS = {
  ko: {
    all: "전체",
    allJsonEditsDescription: "모든 해법에서 브라우저에 저장된 수정 내용만 모은 결과입니다.",
    allJsonEditsTitle: "수정 json",
    algorithm: "알고리즘",
    "auf.none": "없음",
    "auf.random": "랜덤",
    "auf.u": "U",
    "auf.up": "U'",
    "auf.u2": "U2",
    answerPanel: "정답 패널",
    bookmark: "bookmark",
    bookmarkBlueCloud: "파란 구름",
    bookmarkGreenMoon: "초록 달",
    bookmarkRedSun: "빨간 해",
    bookmarkYellowStar: "노란 별",
    bookmarks: "북마크",
    cancel: "취소",
    caseCount: "개",
    clear: "해제",
    clearFilters: "필터 초기화",
    close: "닫기",
    closeDrill: "드릴 닫기",
    closeEdit: "편집 닫기",
    closeExport: "출력 닫기",
    closePanel: "패널 닫기",
    color: "색상",
    colorTheme: "색상 테마",
    compact: "간단히",
    closeRecords: "기록 닫기",
    copy: "복사",
    detail: "세부",
    deleteAlgorithm: "알고리즘 삭제",
    delete: "삭제",
    deletePreset: "프리셋 삭제",
    deletePresetConfirm: "\"{name}\" 프리셋을 삭제할까요?",
    deleteRecord: "기록 삭제",
    download: "다운로드",
    drillComplete: "드릴 완료",
    drillMode: "드릴 모드",
    drillShuffleHint: "Space 또는 터치로 다시 섞기",
    drillStartHint: "Space 또는 터치",
    drillStopHint: "Space 또는 터치로 정지",
    duplicatePresetName: "같은 해법셋 안에 같은 이름의 프리셋이 이미 있습니다.",
    exclude: "제외",
    editAlgorithm: "알고리즘 편집",
    edit: "편집",
    editJson: "수정 JSON",
    editSetup: "setup 편집",
    editsOnly: "편집분만",
    editsOnlyDescription: "브라우저에 저장된 편집 케이스만 모은 결과입니다.",
    editsOnlyTitle: "편집분만 출력",
    filter: "필터",
    formulaFolder: "공식 폴더",
    fullJson: "전체 JSON",
    fullJsonDescription: "브라우저에 저장된 편집 내용을 현재 데이터에 병합한 결과입니다.",
    fullJsonTitle: "cases.json 출력",
    group: "group",
    list: "목록",
    moveAlgorithmDown: "알고리즘 아래로 이동",
    moveAlgorithmUp: "알고리즘 위로 이동",
    noImage: "이미지없음",
    noFilteredAlgorithms: "필터 결과에 보이는 공식이 없습니다.",
    noShortcuts: "등록된 바로가기가 없습니다.",
    noSavedPresets: "저장한 프리셋 없음",
    noSelectedAlgorithms: "선택된 공식이 없습니다.",
    nextAlgorithm: "다음 공식",
    noRecords: "아직 기록 없음",
    noSetup: "등록된 setup이 없습니다.",
    other: "기타",
    pinPreset: "프리셋 고정",
    openPanel: "패널 열기",
    presetNamePlaceholder: "저장할 프리셋 이름 입력",
    presets: "프리셋",
    presetShortcuts: "프리셋 바로가기",
    previousAlgorithm: "이전 공식",
    recordDetail: "기록 세부 보기",
    recordDetails: "기록 세부",
    recog: "recog",
    resetJson: "JSON 초기화",
    resetJsonConfirm: "브라우저에 저장된 수정 JSON을 초기화할까요? 북마크와 프리셋은 유지됩니다.",
    resizePanel: "패널 폭 조절",
    resizeRecords: "기록 영역 크기 조절",
    restore: "복구",
    savedPresets: "저장한 프리셋",
    saveFiltered: "필터 저장",
    save: "저장",
    saveSelected: "선택 저장",
    search: "검색",
    searchPlaceholder: "이름, 공식, 스크램블 검색",
    selectAlgset: "해법 선택",
    selectCases: "케이스를 선택하세요.",
    selectedOnly: "선택만",
    selection: "선택",
    set: "세트",
    settings: "설정",
    license: "라이선스",
    notices: "고지",
    shown: "표시",
    exportMode: "출력 방식",
    home: "홈",
    invalidMinimumTime: "최소 시간을 0.0초 이상으로 입력하세요.",
    minimumRecordTime: "선택할 최소 기록 시간",
    minimumTime: "최소 시간",
    seconds: "초",
    startDrill: "드릴 시작",
    unsupported: "미지원",
    view: "보기",
    viewMode: "보기 모드",
    unpinPreset: "프리셋 고정 해제",
    undoLast: "직전 취소",
    deleteAll: "전체 삭제",
    deleteAllConfirm: "모든 기록을 삭제할까요?",
    filteredShown: "필터표시",
    addCurrentSelection: "현재 선택 추가",
    removeCurrentSelection: "현재 선택 제거",
    shortcuts: "단축키",
    toggleDrillMode: "리캡/트레인 전환",
    showAnswer: "공식 보기",
    resetTimer: "타이머 초기화",
  },
  en: {
    all: "All",
    allJsonEditsDescription: "Only edited items saved in this browser across all alg sets.",
    allJsonEditsTitle: "Edited JSON",
    algorithm: "Algorithm",
    "auf.none": "None",
    "auf.random": "Random",
    "auf.u": "U",
    "auf.up": "U'",
    "auf.u2": "U2",
    answerPanel: "Answer Panel",
    bookmark: "bookmark",
    bookmarkBlueCloud: "Blue Cloud",
    bookmarkGreenMoon: "Green Moon",
    bookmarkRedSun: "Red Sun",
    bookmarkYellowStar: "Yellow Star",
    bookmarks: "Bookmarks",
    cancel: "Cancel",
    caseCount: "cases",
    clear: "Clear",
    clearFilters: "Reset Filters",
    close: "Close",
    closeDrill: "Close Drill",
    closeEdit: "Close Edit",
    closeExport: "Close Export",
    closePanel: "Close Panel",
    color: "Color",
    colorTheme: "Color Theme",
    compact: "Compact",
    closeRecords: "Close Records",
    copy: "Copy",
    detail: "Detail",
    deleteAlgorithm: "Delete Algorithm",
    delete: "Delete",
    deletePreset: "Delete Preset",
    deletePresetConfirm: "Delete \"{name}\" preset?",
    deleteRecord: "Delete Record",
    download: "Download",
    drillComplete: "Drill Complete",
    drillMode: "Drill Mode",
    drillShuffleHint: "Space or touch to shuffle again",
    drillStartHint: "Space or touch",
    drillStopHint: "Space or touch to stop",
    duplicatePresetName: "A preset with the same name already exists in this alg set.",
    exclude: "Exclude",
    editAlgorithm: "Edit Algorithm",
    edit: "Edit",
    editJson: "Edit JSON",
    editSetup: "Edit setup",
    editsOnly: "Edits Only",
    editsOnlyDescription: "Only edited cases saved in this browser.",
    editsOnlyTitle: "Edits Only",
    filter: "Filter",
    formulaFolder: "Algorithm Folder",
    fullJson: "Full JSON",
    fullJsonDescription: "Current data merged with edits saved in this browser.",
    fullJsonTitle: "cases.json",
    group: "group",
    list: "List",
    moveAlgorithmDown: "Move Algorithm Down",
    moveAlgorithmUp: "Move Algorithm Up",
    noImage: "No image",
    noFilteredAlgorithms: "No algorithms are visible in the filter results.",
    noShortcuts: "No shortcuts saved.",
    noSavedPresets: "No saved presets",
    noSelectedAlgorithms: "No algorithms selected.",
    nextAlgorithm: "Next Algorithm",
    noRecords: "No records yet",
    noSetup: "No setup saved.",
    other: "Other",
    pinPreset: "Pin Preset",
    openPanel: "Open Panel",
    presetNamePlaceholder: "Preset name",
    presets: "Presets",
    presetShortcuts: "Preset Shortcuts",
    previousAlgorithm: "Previous Algorithm",
    recordDetail: "record details",
    recordDetails: "Record Details",
    recog: "recog",
    resetJson: "Reset JSON",
    resetJsonConfirm: "Reset edited JSON saved in this browser? Bookmarks and presets will be kept.",
    resizePanel: "Resize Panel",
    resizeRecords: "Resize Records",
    restore: "Restore",
    savedPresets: "Saved presets",
    saveFiltered: "Save Filter",
    save: "Save",
    saveSelected: "Save Selected",
    search: "Search",
    searchPlaceholder: "Search name, algorithm, scramble",
    selectAlgset: "Select Alg Set",
    selectCases: "Select cases.",
    selectedOnly: "Selected Only",
    selection: "Selection",
    set: "Set",
    settings: "Settings",
    license: "License",
    notices: "Notices",
    shown: "Shown",
    exportMode: "Export Mode",
    home: "Home",
    invalidMinimumTime: "Enter a minimum time of 0.0 seconds or more.",
    minimumRecordTime: "Minimum record time to include",
    minimumTime: "Minimum Time",
    seconds: "seconds",
    startDrill: "Start Drill",
    unsupported: "Unsupported",
    view: "View",
    viewMode: "View Mode",
    unpinPreset: "Unpin Preset",
    undoLast: "Undo Last",
    deleteAll: "Delete All",
    deleteAllConfirm: "Delete all records?",
    filteredShown: "Filtered Shown",
    addCurrentSelection: "Add Current Selection",
    removeCurrentSelection: "Remove Current Selection",
    shortcuts: "Shortcuts",
    toggleDrillMode: "Toggle Recap/Train",
    showAnswer: "Show Algorithm",
    resetTimer: "Reset Timer",
  },
  ja: {
    all: "すべて",
    allJsonEditsDescription: "すべての手順セットから、このブラウザに保存された編集内容のみを集めた結果です。",
    allJsonEditsTitle: "編集JSON",
    algorithm: "アルゴリズム",
    "auf.none": "なし",
    "auf.random": "ランダム",
    "auf.u": "U",
    "auf.up": "U'",
    "auf.u2": "U2",
    answerPanel: "答えパネル",
    bookmark: "bookmark",
    bookmarkBlueCloud: "青い雲",
    bookmarkGreenMoon: "緑の月",
    bookmarkRedSun: "赤い太陽",
    bookmarkYellowStar: "黄色い星",
    bookmarks: "ブックマーク",
    cancel: "キャンセル",
    caseCount: "件",
    clear: "解除",
    clearFilters: "フィルターリセット",
    close: "閉じる",
    closeDrill: "ドリルを閉じる",
    closeEdit: "編集を閉じる",
    closeExport: "出力を閉じる",
    closePanel: "パネルを閉じる",
    color: "色",
    colorTheme: "カラーテーマ",
    compact: "簡易",
    closeRecords: "記録を閉じる",
    copy: "コピー",
    detail: "詳細",
    deleteAlgorithm: "アルゴリズム削除",
    delete: "削除",
    deletePreset: "プリセット削除",
    deletePresetConfirm: "「{name}」プリセットを削除しますか？",
    deleteRecord: "記録削除",
    download: "ダウンロード",
    drillComplete: "ドリル完了",
    drillMode: "ドリルモード",
    drillShuffleHint: "Spaceまたはタッチで再シャッフル",
    drillStartHint: "Spaceまたはタッチ",
    drillStopHint: "Spaceまたはタッチで停止",
    duplicatePresetName: "同じ手順セット内に同じ名前のプリセットが既にあります。",
    exclude: "除外",
    editAlgorithm: "アルゴリズム編集",
    edit: "編集",
    editJson: "JSON編集",
    editSetup: "setup編集",
    editsOnly: "編集分のみ",
    editsOnlyDescription: "このブラウザに保存された編集ケースのみを集めた結果です。",
    editsOnlyTitle: "編集分のみ出力",
    filter: "フィルター",
    formulaFolder: "手順フォルダー",
    fullJson: "全体JSON",
    fullJsonDescription: "このブラウザに保存された編集内容を現在のデータに反映した結果です。",
    fullJsonTitle: "cases.json出力",
    group: "group",
    list: "リスト",
    moveAlgorithmDown: "アルゴリズムを下へ移動",
    moveAlgorithmUp: "アルゴリズムを上へ移動",
    noImage: "画像なし",
    noFilteredAlgorithms: "フィルター結果に表示されている手順がありません。",
    noShortcuts: "登録されたショートカットはありません。",
    noSavedPresets: "保存済みプリセットなし",
    noSelectedAlgorithms: "選択された手順がありません。",
    nextAlgorithm: "次の手順",
    noRecords: "記録はまだありません",
    noSetup: "登録されたsetupがありません。",
    other: "その他",
    pinPreset: "プリセット固定",
    openPanel: "パネルを開く",
    presetNamePlaceholder: "保存するプリセット名",
    presets: "プリセット",
    presetShortcuts: "プリセットショートカット",
    previousAlgorithm: "前の手順",
    recordDetail: "記録詳細を見る",
    recordDetails: "記録詳細",
    recog: "recog",
    resetJson: "JSONリセット",
    resetJsonConfirm: "このブラウザに保存された編集JSONをリセットしますか？ブックマークとプリセットは保持されます。",
    resizePanel: "パネル幅を調整",
    resizeRecords: "記録エリアのサイズを調整",
    restore: "復元",
    savedPresets: "保存済みプリセット",
    saveFiltered: "フィルター保存",
    save: "保存",
    saveSelected: "選択を保存",
    search: "検索",
    searchPlaceholder: "名前、手順、スクランブルを検索",
    selectAlgset: "手順セット選択",
    selectCases: "ケースを選択してください。",
    selectedOnly: "選択のみ",
    selection: "選択",
    set: "セット",
    settings: "設定",
    license: "ライセンス",
    notices: "表記",
    shown: "表示",
    exportMode: "出力方式",
    home: "ホーム",
    invalidMinimumTime: "最小時間は0.0秒以上で入力してください。",
    minimumRecordTime: "選択する最小記録時間",
    minimumTime: "最小時間",
    seconds: "秒",
    startDrill: "ドリル開始",
    unsupported: "未対応",
    view: "表示",
    viewMode: "表示モード",
    unpinPreset: "プリセット固定解除",
    undoLast: "直前を取り消す",
    deleteAll: "すべて削除",
    deleteAllConfirm: "すべての記録を削除しますか？",
    filteredShown: "フィルター表示",
    addCurrentSelection: "現在の選択を追加",
    removeCurrentSelection: "現在の選択を削除",
    shortcuts: "ショートカット",
    toggleDrillMode: "Recap/Trainを切替",
    showAnswer: "手順を見る",
    resetTimer: "タイマーをリセット",
  },
};
const DRILL_AUF_FIXED_MOVES = {
  u: "U",
  up: "U'",
  u2: "U2",
};

function isDrillCompactLayout() {
  return window.matchMedia("(max-width: 720px)").matches;
}

function initialViewMode() {
  const saved = loadJson("viewModeV3", "");
  if (VIEW_MODES.has(saved)) return saved;
  return loadJson("detailModeV2", "compact") === "full" ? "full" : "compact";
}

function initialAccentTheme() {
  const saved = loadJson("accentTheme", "blue");
  return ACCENT_THEMES.has(saved) ? saved : "blue";
}

function initialLanguage() {
  const saved = loadJson("language", "ko");
  return LANGUAGES.has(saved) ? saved : "ko";
}

function t(key) {
  return UI_LABELS[state.language]?.[key] || UI_LABELS.ko[key] || key;
}

function formatCaseCount(count) {
  const value = Number.isFinite(count) ? count : 0;
  return state.language === "en" ? `${value} ${t("caseCount")}` : `${value}${t("caseCount")}`;
}

function formatCaseProgress(current, total) {
  return state.language === "en" ? `${current}/${total} ${t("caseCount")}` : `${current}/${total}${t("caseCount")}`;
}

function syncAppHeaderHeight() {
  const header = document.querySelector(".app-header");
  document.documentElement.style.setProperty("--app-header-height", `${header?.offsetHeight || 0}px`);
}

function drillAufLabel(mode) {
  return t(`auf.${mode}`);
}

const elements = {
  datasetLabel: document.getElementById("datasetLabel"),
  datasetSelect: document.getElementById("datasetSelect"),
  homeButton: document.getElementById("homeButton"),
  languageButton: document.getElementById("languageButton"),
  languagePopover: document.getElementById("languagePopover"),
  languageOptions: [...document.querySelectorAll("[data-language]")],
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
  saveSelectedPresetButton: document.getElementById("saveSelectedPresetButton"),
  saveFilteredPresetButton: document.getElementById("saveFilteredPresetButton"),
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
  drillProgressText: document.getElementById("drillProgressText"),
  drillRecapModeButton: document.getElementById("drillRecapModeButton"),
  drillTrainModeButton: document.getElementById("drillTrainModeButton"),
  drillRandomAufButton: document.getElementById("drillRandomAufButton"),
  drillAufPanel: document.getElementById("drillAufPanel"),
  drillAufModeButtons: [...document.querySelectorAll("[data-auf-mode]")],
  drillSetupText: document.getElementById("drillSetupText"),
  drillMain: document.getElementById("drillMain"),
  drillResizeHandle: document.getElementById("drillResizeHandle"),
  drillHistoryPanel: document.querySelector(".drill-history-panel"),
  drillTimerText: document.getElementById("drillTimerText"),
  drillHintText: document.getElementById("drillHintText"),
  drillTimesText: document.getElementById("drillTimesText"),
  drillClearResultsButton: document.getElementById("drillClearResultsButton"),
  drillToggleHistoryButton: document.getElementById("drillToggleHistoryButton"),
  drillMinResultSecondsInput: document.getElementById("drillMinResultSecondsInput"),
  drillSelectResultsByTimeButton: document.getElementById("drillSelectResultsByTimeButton"),
  drillRestoreSelectionButton: document.getElementById("drillRestoreSelectionButton"),
  drillResultList: document.getElementById("drillResultList"),
  drillShowAnswerButton: document.getElementById("drillShowAnswerButton"),
  drillUndoButton: document.getElementById("drillUndoButton"),
  drillCloseButton: document.getElementById("drillCloseButton"),
  drillShortcutButton: document.getElementById("drillShortcutButton"),
  drillShortcutPanel: document.getElementById("drillShortcutPanel"),
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
  language: initialLanguage(),
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
  openFilterMenu: "",
  isHomeView: true,
  drill: {
    active: false,
    mode: "recap",
    aufMode: "none",
    historyWidth: loadJson("drillHistoryWidth", DEFAULT_DRILL_HISTORY_WIDTH),
    source: [],
    queue: [],
    index: 0,
    currentSetup: "",
    timerStatus: "idle",
    startedAt: 0,
    elapsedMs: 0,
    displayMs: 0,
    results: [],
    historyExpanded: !isDrillCompactLayout(),
    minResultSeconds: normalizeDrillMinResultSeconds(loadJson("drillMinResultSeconds", 0.5)),
    selectionRestoreSnapshot: null,
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

function makeLanguageIcon(language) {
  if (language === "en") {
    const icon = document.createElement("span");
    icon.className = "language-icon language-globe";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "🌐";
    return icon;
  }

  const icon = document.createElement("img");
  icon.className = "language-icon";
  icon.src = LANGUAGE_ICON_SOURCES[language];
  icon.alt = "";
  icon.setAttribute("aria-hidden", "true");
  return icon;
}

function applyLanguage() {
  document.documentElement.lang = state.language;
  window.AlgNoteLocale = { language: state.language, labels: UI_LABELS[state.language] };
  elements.languageButton.replaceChildren(
    makeLanguageIcon(state.language),
    document.createTextNode(LANGUAGE_NAMES[state.language]),
  );

  for (const option of elements.languageOptions) {
    const active = option.dataset.language === state.language;
    option.classList.toggle("is-active", active);
    option.setAttribute("aria-pressed", active ? "true" : "false");
  }

  for (const node of document.querySelectorAll("[data-i18n]")) {
    const textKey = node.dataset.i18nText || node.dataset.i18n;
    const attrKeys = (node.dataset.i18nAttr || "").split(":").filter(Boolean);
    if (!node.dataset.i18nText && !attrKeys.length) node.textContent = t(textKey);
    if (node.dataset.i18nText) node.textContent = t(textKey);
    for (const attr of attrKeys) node.setAttribute(attr, t(node.dataset.i18n));
  }

  elements.homeSettingsButton.setAttribute("aria-label", t("settings"));
  elements.homeSettingsButton.title = t("settings");
  elements.languageButton.setAttribute("aria-label", LANGUAGE_NAMES[state.language]);
  elements.languageButton.title = LANGUAGE_NAMES[state.language];
  updateSidebarLayout();
  updateFilterMenuButtons();
  updateExportPanelText();
  if (state.isHomeView) renderDatasetOptions();
  if (state.dataset) render();
}


function closeLanguageMenu() {
  elements.languagePopover.hidden = true;
  elements.languageButton.setAttribute("aria-expanded", "false");
}


function toggleLanguageMenu() {
  const willOpen = elements.languagePopover.hidden;
  elements.languagePopover.hidden = !willOpen;
  elements.languageButton.setAttribute("aria-expanded", willOpen ? "true" : "false");
  if (willOpen) closeHomeSettings();
}


function closeHomeSettings() {
  elements.homeSettingsPopover.hidden = true;
  elements.homeSettingsButton.setAttribute("aria-expanded", "false");
}


function toggleHomeSettings() {
  const willOpen = elements.homeSettingsPopover.hidden;
  elements.homeSettingsPopover.hidden = !willOpen;
  elements.homeSettingsButton.setAttribute("aria-expanded", willOpen ? "true" : "false");
  if (willOpen) closeLanguageMenu();
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


function removeCaseFromSelection(caseId) {
  const id = String(caseId);
  if (!state.selectedCards.has(id)) return false;

  state.selectedCards.delete(id);
  state.activeSelectionPresetId = "";
  saveSelectionPresets();

  if (state.drill.active) {
    const removedQueueIndex = state.drill.queue.findIndex((item) => item.id === id);
    state.drill.source = state.drill.source.filter((item) => item.id !== id);
    state.drill.queue = state.drill.queue.filter((item) => item.id !== id);
    if (!state.drill.queue.length || !state.drill.source.length) {
      state.drill.completed = true;
      state.drill.currentSetup = "";
    } else if (removedQueueIndex !== -1 && removedQueueIndex < state.drill.index) {
      state.drill.index -= 1;
    } else if (state.drill.index >= state.drill.queue.length) {
      state.drill.index = Math.max(0, state.drill.queue.length - 1);
    }
    if (!state.drill.completed) state.drill.currentSetup = makeDrillSetup(currentDrillItem());
  }

  return true;
}


function renderSelectionPresetOptions() {
  elements.favoritePresetList.replaceChildren();

  if (!state.selectionPresets.length) {
    const empty = document.createElement("p");
    empty.className = "preset-empty";
    empty.textContent = t("noSavedPresets");
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
    count.textContent = formatCaseCount(preset.selectedCards.length);
    const text = document.createElement("span");
    text.className = "preset-file-text";
    text.append(name, count);

    const pinButton = document.createElement("button");
    pinButton.className = "preset-file-icon-button";
    pinButton.type = "button";
    pinButton.dataset.presetAction = "pin";
    pinButton.setAttribute("aria-label", `${preset.name} ${preset.pinned ? t("unpinPreset") : t("pinPreset")}`);
    pinButton.setAttribute("aria-pressed", preset.pinned ? "true" : "false");
    pinButton.title = preset.pinned ? t("unpinPreset") : t("pinPreset");
    const icon = document.createElement("span");
    icon.className = "preset-file-icon";
    icon.setAttribute("aria-hidden", "true");
    pinButton.append(icon);
    applyButton.append(text);

    const deleteButton = document.createElement("button");
    deleteButton.className = "preset-delete-button";
    deleteButton.type = "button";
    deleteButton.dataset.presetAction = "delete";
    deleteButton.setAttribute("aria-label", `${preset.name} ${t("deletePreset")}`);
    deleteButton.title = t("delete");
    deleteButton.textContent = "×";

    const addButton = document.createElement("button");
    addButton.className = "preset-selection-button";
    addButton.type = "button";
    addButton.dataset.presetAction = "add-current-selection";
    addButton.setAttribute("aria-label", `${preset.name} ${t("addCurrentSelection")}`);
    addButton.title = t("addCurrentSelection");
    addButton.textContent = "+";

    const removeButton = document.createElement("button");
    removeButton.className = "preset-selection-button";
    removeButton.type = "button";
    removeButton.dataset.presetAction = "remove-current-selection";
    removeButton.setAttribute("aria-label", `${preset.name} ${t("removeCurrentSelection")}`);
    removeButton.title = t("removeCurrentSelection");
    removeButton.textContent = "−";

    item.append(pinButton, applyButton, addButton, removeButton, deleteButton);
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


function saveSelectionPresetFromIds(cardIds, emptyMessage) {
  const selectedCards = [...new Set(cardIds.map(String))];
  if (!selectedCards.length) {
    window.alert(emptyMessage);
    return;
  }

  const name = elements.favoritePresetNameInput.value.trim();
  if (!name) {
    elements.favoritePresetNameInput.focus();
    return;
  }
  if (hasDuplicatePresetName(name)) {
    window.alert(t("duplicatePresetName"));
    elements.favoritePresetNameInput.focus();
    return;
  }

  const preset = {
    id: makePresetId(),
    name,
    selectedCards,
    pinned: false,
  };
  state.selectionPresets.push(preset);
  state.activeSelectionPresetId = preset.id;
  elements.favoritePresetNameInput.value = "";
  saveSelectionPresets();
  renderPresetShortcuts();
  render();
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


function drillAufModeKey(key = state.key) {
  return `drillAufMode.${key}`;
}


function drillAufMoves(dataset = state.dataset) {
  const puzzle = String(dataset?.puzzle || "").toLowerCase();
  if (puzzle.includes("sq1")) return [];
  if (puzzle.includes("fto")) return ["U", "U'"];
  if (puzzle.includes("3x3")) return ["U", "U'", "U2"];
  return [];
}


function supportsDrillAuf(dataset = state.dataset) {
  return drillAufMoves(dataset).length > 0;
}


function normalizeDrillAufMode(mode, dataset = state.dataset) {
  const value = DRILL_AUF_MODES.has(mode) ? mode : "none";
  if (value === "u2" && !drillAufMoves(dataset).includes("U2")) return "none";
  return value;
}


function loadDrillAufMode() {
  return normalizeDrillAufMode(loadJson(drillAufModeKey(), "none"));
}


function saveDrillAufMode(mode) {
  state.drill.aufMode = normalizeDrillAufMode(mode);
  if (state.key) saveJson(drillAufModeKey(), state.drill.aufMode);
}


function randomAufMove() {
  return randomItem(drillAufMoves());
}


function randomLeadingAufMove() {
  return randomItem(["", ...drillAufMoves()]);
}


function makeDrillSetup(item) {
  const setup = (item?.scramble || "").trim();
  if (!setup) return t("noSetup");
  const mode = normalizeDrillAufMode(state.drill.aufMode);
  if (mode === "none" || !supportsDrillAuf()) return setup;

  const front = randomLeadingAufMove();
  const back = mode === "random" ? randomAufMove() : DRILL_AUF_FIXED_MOVES[mode];
  return [front, setup, back].filter(Boolean).join(" ");
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
  const totalHundredths = Math.round(Math.max(0, ms) / 10);
  const minutes = Math.floor(totalHundredths / 6000);
  const remainder = totalHundredths % 6000;
  const seconds = Math.floor(remainder / 100);
  const hundredths = String(remainder % 100).padStart(2, "0");
  const time = `${minutes ? String(seconds).padStart(2, "0") : seconds}.${hundredths}`;
  return minutes ? `${minutes}:${time}` : time;
}


function stopDrillTicker() {
  if (!state.drill.tickHandle) return;
  window.cancelAnimationFrame(state.drill.tickHandle);
  state.drill.tickHandle = 0;
}


function updateDrillTimerDisplay() {
  if (state.drill.timerStatus === "running") {
    state.drill.elapsedMs = performance.now() - state.drill.startedAt;
    state.drill.displayMs = state.drill.elapsedMs;
  }
  elements.drillTimerText.textContent = formatDrillTime(state.drill.displayMs);
}


function tickDrillTimer() {
  if (!state.drill.active || state.drill.timerStatus !== "running") return;
  updateDrillTimerDisplay();
  state.drill.tickHandle = window.requestAnimationFrame(tickDrillTimer);
}


function resetDrillTimer({ preserveDisplay = false } = {}) {
  stopDrillTicker();
  state.drill.timerStatus = "idle";
  state.drill.startedAt = 0;
  state.drill.elapsedMs = 0;
  if (!preserveDisplay) state.drill.displayMs = 0;
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
    || effectiveCases().find((item) => item.id === caseId)
    || null;
}


function renderDrillResults() {
  elements.drillResultList.replaceChildren();

  const results = state.drill.results.map((result, index) => ({ ...result, order: index + 1 })).reverse();
  if (!results.length) {
    const empty = document.createElement("p");
    empty.className = "drill-result-empty";
    empty.textContent = t("noRecords");
    elements.drillResultList.append(empty);
    return;
  }

  for (const result of results) {
    const row = document.createElement("div");
    row.className = "drill-result-row";
    const body = document.createElement("div");
    body.className = "drill-result-body";
    body.dataset.resultDetailId = result.id;
    body.tabIndex = 0;
    body.setAttribute("role", "button");
    body.setAttribute("aria-label", `${result.caseName} ${t("recordDetail")}`);
    const top = document.createElement("div");
    top.className = "drill-result-top";
    const order = document.createElement("span");
    order.className = "drill-result-order";
    order.textContent = `${result.order}.`;
    const name = document.createElement("span");
    name.textContent = result.groupName ? `${result.groupName} ${result.caseName}` : result.caseName;
    const time = document.createElement("strong");
    time.textContent = formatDrillTime(result.elapsedMs);
    const setup = document.createElement("p");
    setup.textContent = result.setup;
    top.append(order, name, time);
    body.append(top, setup);

    const excludeButton = document.createElement("button");
    excludeButton.className = "drill-exclude-result-button";
    excludeButton.type = "button";
    excludeButton.dataset.resultExcludeCaseId = result.caseId;
    excludeButton.textContent = t("exclude");
    excludeButton.disabled = state.drill.timerStatus === "running" || !state.selectedCards.has(result.caseId);
    const deleteButton = document.createElement("button");
    deleteButton.className = "drill-delete-result-button";
    deleteButton.type = "button";
    deleteButton.dataset.resultDeleteId = result.id;
    deleteButton.textContent = t("delete");
    deleteButton.setAttribute("aria-label", t("deleteRecord"));
    deleteButton.title = t("deleteRecord");
    const actions = document.createElement("div");
    actions.className = "drill-result-actions";
    actions.append(excludeButton, deleteButton);

    row.append(body, actions);
    elements.drillResultList.append(row);
  }
}


function updateDrillStartButton() {
  const canShow = !state.isHomeView;
  elements.drillStartButton.disabled = false;
  elements.drillStartButton.hidden = state.isHomeView || state.drill.active;
  elements.drillStartButton.title = canShow && state.selectedCards.size > 0 ? t("startDrill") : t("selectCases");
  elements.drillStartButton.setAttribute("aria-label", elements.drillStartButton.title);
}


function closeDrillAufPanel() {
  elements.drillAufPanel.hidden = true;
  elements.drillRandomAufButton.setAttribute("aria-expanded", "false");
}


function toggleDrillAufPanel() {
  if (!supportsDrillAuf()) return;
  const willOpen = elements.drillAufPanel.hidden;
  elements.drillAufPanel.hidden = !willOpen;
  elements.drillRandomAufButton.setAttribute("aria-expanded", willOpen ? "true" : "false");
}


function closeDrillShortcutPanel() {
  elements.drillShortcutPanel.hidden = true;
  elements.drillShortcutButton.setAttribute("aria-expanded", "false");
}


function toggleDrillShortcutPanel() {
  const willOpen = elements.drillShortcutPanel.hidden;
  elements.drillShortcutPanel.hidden = !willOpen;
  elements.drillShortcutButton.setAttribute("aria-expanded", willOpen ? "true" : "false");
}


function updateDrillAufControls() {
  const supported = supportsDrillAuf();
  const moves = drillAufMoves();
  const mode = supported ? normalizeDrillAufMode(state.drill.aufMode) : "none";
  const active = supported && mode !== "none";

  if (state.drill.aufMode !== mode) saveDrillAufMode(mode);
  elements.drillRandomAufButton.textContent = supported ? `AUF: ${drillAufLabel(mode)}` : `AUF: ${t("unsupported")}`;
  elements.drillRandomAufButton.disabled = !supported;
  elements.drillRandomAufButton.classList.toggle("is-active", active);
  elements.drillRandomAufButton.setAttribute("aria-pressed", active ? "true" : "false");

  if (!supported) closeDrillAufPanel();

  for (const button of elements.drillAufModeButtons) {
    const option = button.dataset.aufMode;
    const visible = option !== "u2" || moves.includes("U2");
    button.hidden = !visible;
    button.classList.toggle("is-active", supported && option === mode);
    button.setAttribute("aria-pressed", supported && option === mode ? "true" : "false");
  }
}


function renderDrill() {
  if (!state.drill.active) {
    elements.drillOverlay.hidden = true;
    updateDrillStartButton();
    return;
  }

  elements.drillOverlay.hidden = false;
  updateDrillStartButton();
  updateDrillHistoryLayout();

  const total = state.drill.queue.length;
  elements.drillRecapModeButton.classList.toggle("is-active", state.drill.mode === "recap");
  elements.drillTrainModeButton.classList.toggle("is-active", state.drill.mode === "train");
  elements.drillRecapModeButton.setAttribute("aria-pressed", state.drill.mode === "recap" ? "true" : "false");
  elements.drillTrainModeButton.setAttribute("aria-pressed", state.drill.mode === "train" ? "true" : "false");
  updateDrillAufControls();

  if (state.drill.mode === "recap") {
    elements.drillProgressText.textContent = formatCaseProgress(Math.min(state.drill.index + 1, total), total);
  } else {
    elements.drillProgressText.textContent = formatCaseCount(state.drill.source.length);
  }

  if (state.drill.completed) {
    elements.drillSetupText.textContent = t("drillComplete");
    elements.drillShowAnswerButton.disabled = true;
    elements.drillHintText.textContent = t("drillShuffleHint");
  } else {
    elements.drillSetupText.textContent = state.drill.currentSetup;
    elements.drillShowAnswerButton.disabled = false;
    elements.drillHintText.textContent = state.drill.timerStatus === "running" ? t("drillStopHint") : t("drillStartHint");
  }

  updateDrillTimerDisplay();
  elements.drillTimesText.textContent = `Times ${state.drill.results.length}`;
  elements.drillHistoryPanel.classList.toggle("is-expanded", state.drill.historyExpanded);
  elements.drillToggleHistoryButton.textContent = state.drill.historyExpanded ? t("closeRecords") : t("recordDetails");
  elements.drillToggleHistoryButton.setAttribute("aria-expanded", state.drill.historyExpanded ? "true" : "false");
  if (document.activeElement !== elements.drillMinResultSecondsInput) {
    elements.drillMinResultSecondsInput.value = state.drill.minResultSeconds.toFixed(1);
  }
  const minSeconds = roundedDrillMinResultSeconds() ?? state.drill.minResultSeconds;
  const matchingResultCount = drillResultsAtLeast(minSeconds).length;
  elements.drillSelectResultsByTimeButton.textContent = `${t("selection")} · ${matchingResultCount}/${state.drill.results.length}`;
  elements.drillMinResultSecondsInput.disabled = state.drill.timerStatus === "running";
  elements.drillSelectResultsByTimeButton.disabled = state.drill.timerStatus === "running" || state.drill.results.length === 0;
  elements.drillRestoreSelectionButton.disabled = state.drill.timerStatus === "running" || !state.drill.selectionRestoreSnapshot;
  elements.drillClearResultsButton.disabled = state.drill.timerStatus === "running" || state.drill.results.length === 0;
  elements.drillUndoButton.disabled = state.drill.timerStatus === "running" || state.drill.results.length === 0;
  renderDrillResults();
}


function startDrill({ clearResults = true } = {}) {
  const source = selectedDrillCases();
  if (!source.length) {
    window.alert(t("selectCases"));
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
  if (clearResults) state.drill.results = [];
  state.drill.historyExpanded = !isDrillCompactLayout();
  state.drill.selectionRestoreSnapshot = null;
  state.drill.completed = false;
  state.drill.currentSetup = makeDrillSetup(currentDrillItem());
  state.selectedCaseId = "";
  state.editingCaseId = "";
  render();
}


function closeDrill() {
  stopDrillTicker();
  closeDrillAufPanel();
  closeDrillShortcutPanel();
  state.drill.active = false;
  state.drill.source = [];
  state.drill.queue = [];
  state.drill.index = 0;
  state.drill.currentSetup = "";
  state.drill.results = [];
  state.drill.selectionRestoreSnapshot = null;
  state.drill.completed = false;
  resetDrillTimer();
  renderDrill();
}


function moveToNextDrillCase({ preserveTimerDisplay = false } = {}) {
  if (!state.drill.active) return;

  if (state.drill.mode === "train") {
    const source = state.drill.source.length ? state.drill.source : selectedDrillCases();
    state.drill.source = source;
    state.drill.queue = source.length ? [source[Math.floor(Math.random() * source.length)]] : [];
    state.drill.index = 0;
    state.drill.currentSetup = makeDrillSetup(currentDrillItem());
    state.drill.completed = false;
    resetDrillTimer({ preserveDisplay: preserveTimerDisplay });
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
  resetDrillTimer({ preserveDisplay: preserveTimerDisplay });
  renderDrill();
}


function toggleDrillTimer() {
  if (!state.drill.active) return;
  if (state.drill.completed) {
    startDrill({ clearResults: false });
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
  moveToNextDrillCase({ preserveTimerDisplay: true });
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


function deleteDrillResult(resultId) {
  if (!state.drill.active || state.drill.timerStatus === "running") return;
  const nextResults = state.drill.results.filter((item) => item.id !== resultId);
  if (nextResults.length === state.drill.results.length) return;
  state.drill.results = nextResults;
  renderDrill();
}


function clearDrillResults() {
  if (!state.drill.active || state.drill.timerStatus === "running" || !state.drill.results.length) return;
  if (!window.confirm(t("deleteAllConfirm"))) return;
  state.drill.results = [];
  renderDrill();
}


function roundedDrillMinResultSeconds() {
  const value = Number(elements.drillMinResultSecondsInput.value);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 10) / 10;
}


function drillResultsAtLeast(seconds) {
  const thresholdMs = seconds * 1000;
  return state.drill.results.filter((result) => result.elapsedMs >= thresholdMs);
}


function normalizeDrillMinResultSeconds(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) return 0.5;
  return Math.round(seconds * 10) / 10;
}


function saveDrillSelectionRestoreSnapshot() {
  state.drill.selectionRestoreSnapshot = {
    selectedCards: [...state.selectedCards],
    source: [...state.drill.source],
    queue: [...state.drill.queue],
    index: state.drill.index,
    currentSetup: state.drill.currentSetup,
    completed: state.drill.completed,
  };
}


function updateDrillSelectionFromIds(selectedIds) {
  state.selectedCards = new Set(selectedIds);
  state.activeSelectionPresetId = "";
  saveSelectionPresets();

  if (!state.drill.active) return;

  state.drill.source = state.drill.source.filter((item) => state.selectedCards.has(item.id));
  state.drill.queue = state.drill.queue.filter((item) => state.selectedCards.has(item.id));
  if (!state.drill.source.length || !state.drill.queue.length) {
    state.drill.completed = true;
    state.drill.currentSetup = "";
    state.drill.index = 0;
    resetDrillTimer();
    return;
  }

  state.drill.index = Math.min(state.drill.index, state.drill.queue.length - 1);
  state.drill.currentSetup = makeDrillSetup(currentDrillItem());
}


function selectDrillResultsByTime() {
  if (!state.drill.active || state.drill.timerStatus === "running" || !state.drill.results.length) return;
  const seconds = roundedDrillMinResultSeconds();
  if (seconds === null) {
    window.alert(t("invalidMinimumTime"));
    return;
  }

  state.drill.minResultSeconds = seconds;
  elements.drillMinResultSecondsInput.value = seconds.toFixed(1);
  saveJson("drillMinResultSeconds", seconds);

  const selectedIds = drillResultsAtLeast(seconds).map((result) => result.caseId);
  saveDrillSelectionRestoreSnapshot();
  updateDrillSelectionFromIds(selectedIds);
  render();
}


function restoreDrillSelectionBeforeTimeFilter() {
  const snapshot = state.drill.selectionRestoreSnapshot;
  if (!state.drill.active || state.drill.timerStatus === "running" || !snapshot) return;

  state.selectedCards = new Set(snapshot.selectedCards);
  state.activeSelectionPresetId = "";
  saveSelectionPresets();

  state.drill.source = [...snapshot.source];
  state.drill.queue = [...snapshot.queue];
  state.drill.index = snapshot.index;
  state.drill.currentSetup = snapshot.currentSetup;
  state.drill.completed = snapshot.completed;
  state.drill.selectionRestoreSnapshot = null;
  render();
}


function saveDrillMinResultSecondsFromInput({ normalize = false } = {}) {
  const seconds = roundedDrillMinResultSeconds();
  if (seconds === null) return;
  state.drill.minResultSeconds = seconds;
  saveJson("drillMinResultSeconds", seconds);
  if (normalize) elements.drillMinResultSecondsInput.value = seconds.toFixed(1);
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
  elements.sidebarOpenButton.setAttribute("aria-label", state.sidebarOpen ? t("closePanel") : t("openPanel"));
  elements.sidebarOpenButton.title = state.sidebarOpen ? t("closePanel") : t("openPanel");
}


function clampDrillHistoryWidth(value) {
  const width = Number(value);
  if (!Number.isFinite(width)) return DEFAULT_DRILL_HISTORY_WIDTH;
  const maxByViewport = Math.max(MIN_DRILL_HISTORY_WIDTH, Math.floor(window.innerWidth * 0.6));
  const maxWidth = Math.min(MAX_DRILL_HISTORY_WIDTH, maxByViewport);
  return Math.min(maxWidth, Math.max(MIN_DRILL_HISTORY_WIDTH, Math.round(width)));
}


function updateDrillHistoryLayout() {
  state.drill.historyWidth = clampDrillHistoryWidth(state.drill.historyWidth);
  document.documentElement.style.setProperty("--drill-history-width", `${state.drill.historyWidth}px`);
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
    group: t("group"),
    recognition: t("recog"),
    bookmark: t("bookmark"),
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
  state.openFilterMenu = "";
}


function openFilterMenu(type) {
  const button = document.querySelector(`[data-filter-menu="${type}"]`);
  const panel = document.getElementById(`${type}FilterOptions`);
  if (!button || !panel) return;
  panel.hidden = false;
  button.setAttribute("aria-expanded", "true");
  state.openFilterMenu = type;
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
  if (state.openFilterMenu) openFilterMenu(state.openFilterMenu);

  renderSummary(elements.summary, state.dataset, rows, state);
  syncAppHeaderHeight();
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
  state.drill.aufMode = loadDrillAufMode();
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


function updateExportPanelText() {
  const isAllEdits = state.exportMode === "allEdits";
  const isEdits = state.exportMode === "edits";
  elements.exportPanelTitle.textContent = isAllEdits ? t("allJsonEditsTitle") : (isEdits ? t("editsOnlyTitle") : t("fullJsonTitle"));
  elements.exportPanelDescription.textContent = isAllEdits
    ? t("allJsonEditsDescription")
    : isEdits
    ? t("editsOnlyDescription")
    : t("fullJsonDescription");
  elements.exportFullButton.parentElement.hidden = isAllEdits;
  elements.exportFullButton.classList.toggle("is-active", !isEdits && !isAllEdits);
  elements.exportEditsButton.classList.toggle("is-active", isEdits);
}


function updateExportPanel() {
  updateExportPanelText();
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
    meta.textContent = `${algset.puzzle || "FTO"} · ${formatCaseCount(cases.length)}`;

    const preview = document.createElement("div");
    preview.className = "dataset-choice-preview";
    if (previewCase?.svg) {
      preview.innerHTML = previewCase.svg;
    } else {
      preview.classList.add("is-missing");
      preview.textContent = t("noImage");
    }

    const textBlock = document.createElement("div");
    textBlock.className = "dataset-choice-text";
    textBlock.append(name, meta);

    button.append(preview, textBlock);

    const puzzle = algset.puzzle || "FTO";
    if (!puzzleSections.has(puzzle)) {
      const section = document.createElement("section");
      section.className = "dataset-puzzle-section";
      section.dataset.puzzle = puzzle;

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
    meta.textContent = `${shortcut.puzzle} · ${shortcut.datasetName} · ${formatCaseCount(shortcut.selectedCount)}`;
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

elements.languageButton.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleLanguageMenu();
});

elements.languagePopover.addEventListener("click", (event) => {
  const button = event.target.closest("[data-language]");
  if (!button) return;
  event.stopPropagation();
  const nextLanguage = button.dataset.language;
  if (!LANGUAGES.has(nextLanguage)) return;
  state.language = nextLanguage;
  saveJson("language", state.language);
  applyLanguage();
  closeLanguageMenu();
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
    if (willOpen) {
      openFilterMenu(button.dataset.filterMenu);
    }
  });
}

document.addEventListener("click", (event) => {
  if (event.target instanceof Element && event.target.closest(".language-wrapper")) return;
  closeLanguageMenu();
  if (event.target instanceof Element && event.target.closest(".home-settings-wrapper")) return;
  closeHomeSettings();
  if (event.target instanceof Element && event.target.closest(".filter-menu")) return;
  closeFilterMenus();
  if (event.target instanceof Element && event.target.closest(".drill-auf-control")) return;
  closeDrillAufPanel();
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
  if (!button) return;
  event.stopPropagation();
  toggleFilterValue(state.recognitionFilters, button.dataset.value);
  openFilterMenu("recognition");
});

elements.bookmarkFilterOptions.addEventListener("click", (event) => {
  const button = event.target.closest(".filter-choice-button");
  if (!button) return;
  event.stopPropagation();
  toggleFilterValue(state.bookmarkFilters, button.dataset.value);
  openFilterMenu("bookmark");
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

elements.saveSelectedPresetButton.addEventListener("click", () => {
  saveSelectionPresetFromIds([...state.selectedCards], t("noSelectedAlgorithms"));
});

elements.saveFilteredPresetButton.addEventListener("click", () => {
  saveSelectionPresetFromIds(visibleCases().map((item) => item.id), t("noFilteredAlgorithms"));
});

elements.favoritePresetList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-preset-action]");
  const item = event.target.closest(".preset-item");
  if (!button || !item) return;

  const preset = state.selectionPresets.find((entry) => entry.id === item.dataset.presetId);
  if (!preset) return;

  if (button.dataset.presetAction === "delete") {
    if (!window.confirm(t("deletePresetConfirm").replace("{name}", preset.name))) return;
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

  if (button.dataset.presetAction === "add-current-selection" || button.dataset.presetAction === "remove-current-selection") {
    if (!state.selectedCards.size) {
      window.alert(t("noSelectedAlgorithms"));
      return;
    }
    const originalIds = preset.selectedCards;
    preset.selectedCards = button.dataset.presetAction === "add-current-selection"
      ? [...new Set([...originalIds, ...state.selectedCards])]
      : originalIds.filter((id) => !state.selectedCards.has(id));
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

elements.drillRandomAufButton.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleDrillAufPanel();
});

elements.drillAufPanel.addEventListener("click", (event) => {
  const button = event.target.closest("[data-auf-mode]");
  if (!button) return;
  event.stopPropagation();
  saveDrillAufMode(button.dataset.aufMode);
  closeDrillAufPanel();
  if (state.drill.active && state.drill.timerStatus === "idle" && !state.drill.completed) {
    state.drill.currentSetup = makeDrillSetup(currentDrillItem());
  }
  renderDrill();
});

elements.drillCloseButton.addEventListener("click", () => {
  closeDrill();
});

elements.drillShortcutButton.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleDrillShortcutPanel();
});

elements.drillShowAnswerButton.addEventListener("click", () => {
  toggleDrillAnswer();
});

elements.drillMain.addEventListener("pointerup", (event) => {
  if (event.pointerType !== "touch") return;
  toggleDrillTimer();
});

elements.drillUndoButton.addEventListener("click", () => {
  undoDrillResult();
});

elements.drillToggleHistoryButton.addEventListener("click", () => {
  state.drill.historyExpanded = !state.drill.historyExpanded;
  renderDrill();
});

elements.drillClearResultsButton.addEventListener("click", () => {
  clearDrillResults();
});

elements.drillMinResultSecondsInput.addEventListener("input", () => {
  saveDrillMinResultSecondsFromInput();
});

elements.drillMinResultSecondsInput.addEventListener("change", () => {
  saveDrillMinResultSecondsFromInput({ normalize: true });
});

elements.drillSelectResultsByTimeButton.addEventListener("click", () => {
  selectDrillResultsByTime();
});

elements.drillRestoreSelectionButton.addEventListener("click", () => {
  restoreDrillSelectionBeforeTimeFilter();
});

elements.drillResultList.addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-result-delete-id]");
  if (deleteButton) {
    deleteDrillResult(deleteButton.dataset.resultDeleteId);
    return;
  }
  const excludeButton = event.target.closest("[data-result-exclude-case-id]");
  if (excludeButton) {
    if (state.drill.timerStatus === "running") return;
    if (removeCaseFromSelection(excludeButton.dataset.resultExcludeCaseId)) render();
    return;
  }
  const detailBody = event.target.closest("[data-result-detail-id]");
  if (!detailBody) return;
  showDrillResultDetail(detailBody.dataset.resultDetailId);
});

elements.drillResultList.addEventListener("keydown", (event) => {
  if (!["Enter", " "].includes(event.key)) return;
  const detailBody = event.target.closest("[data-result-detail-id]");
  if (!detailBody) return;
  event.preventDefault();
  showDrillResultDetail(detailBody.dataset.resultDetailId);
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

elements.drillResizeHandle.addEventListener("pointerdown", (event) => {
  if (!state.drill.active || window.matchMedia("(max-width: 720px)").matches) return;
  event.preventDefault();
  event.stopPropagation();
  elements.drillResizeHandle.setPointerCapture(event.pointerId);
  document.body.classList.add("is-resizing-drill");

  const handleMove = (moveEvent) => {
    state.drill.historyWidth = clampDrillHistoryWidth(window.innerWidth - moveEvent.clientX);
    updateDrillHistoryLayout();
  };

  const handleUp = () => {
    saveJson("drillHistoryWidth", state.drill.historyWidth);
    document.body.classList.remove("is-resizing-drill");
    elements.drillResizeHandle.removeEventListener("pointermove", handleMove);
    elements.drillResizeHandle.removeEventListener("pointerup", handleUp);
    elements.drillResizeHandle.removeEventListener("pointercancel", handleUp);
  };

  elements.drillResizeHandle.addEventListener("pointermove", handleMove);
  elements.drillResizeHandle.addEventListener("pointerup", handleUp);
  elements.drillResizeHandle.addEventListener("pointercancel", handleUp);
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
  if (!window.confirm(t("resetJsonConfirm"))) return;
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
    moveUpButton.setAttribute("aria-label", t("moveAlgorithmUp"));
    moveUpButton.title = t("moveAlgorithmUp");

    const moveDownButton = document.createElement("button");
    moveDownButton.className = "move-algorithm-button move-algorithm-down-button icon-button";
    moveDownButton.type = "button";
    moveDownButton.dataset.direction = "down";
    moveDownButton.textContent = "↓";
    moveDownButton.setAttribute("aria-label", t("moveAlgorithmDown"));
    moveDownButton.title = t("moveAlgorithmDown");

    const textarea = document.createElement("textarea");
    textarea.className = "algorithm-editor";
    textarea.rows = 2;
    textarea.setAttribute("aria-label", t("editAlgorithm"));

    const removeButton = document.createElement("button");
    removeButton.className = "remove-algorithm-button icon-button";
    removeButton.type = "button";
    removeButton.textContent = "×";
    removeButton.setAttribute("aria-label", t("deleteAlgorithm"));
    removeButton.title = t("deleteAlgorithm");

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

  if (state.drill.active) {
    if (event.code === "Space") {
      event.preventDefault();
      toggleDrillTimer();
      return;
    }
    if (event.key === "Escape" && state.drill.timerStatus === "running") {
      event.preventDefault();
      resetDrillTimer();
      renderDrill();
      return;
    }
    if (event.key === "Backspace") {
      event.preventDefault();
      closeDrill();
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      setDrillMode(state.drill.mode === "recap" ? "train" : "recap");
      return;
    }
    if (!event.repeat && event.key.toLowerCase() === "d") {
      event.preventDefault();
      clearDrillResults();
      return;
    }
    if (!event.repeat && event.key.toLowerCase() === "r") {
      event.preventDefault();
      undoDrillResult();
      return;
    }
    if (!event.repeat && event.key.toLowerCase() === "a") {
      event.preventDefault();
      toggleDrillAnswer();
      return;
    }
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
applyAccentTheme();
applyLanguage();
new ResizeObserver(syncAppHeaderHeight).observe(document.querySelector(".app-header"));
const datasetKeys = renderDatasetOptions();
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
window.addEventListener("resize", () => {
  if (!state.drill.active) return;
  updateDrillHistoryLayout();
});
window.addEventListener("scroll", () => {
  if (!state.key || state.pendingScrollY !== null) return;
  window.clearTimeout(state.scrollSaveTimer);
  state.scrollSaveTimer = window.setTimeout(saveCurrentViewState, 150);
}, { passive: true });
})();
