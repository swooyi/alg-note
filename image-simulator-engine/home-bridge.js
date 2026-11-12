(() => {
  const { normalizeDataset } = window.AlgNoteNormalize;
  const { datasetKey, loadJson } = window.AlgNoteStorage;
  const pages = { FTO: "image-gen-fto.html", "3x3": "image-gen-3x3.html", SQ1: "image-gen-square1.html" };
  const datasets = Object.entries(window.AlgNoteBundledData || {}).map(([bundleKey, entries]) => ({
    bundleKey, dataset: normalizeDataset(entries),
  })).filter(({ dataset }) => pages[dataset.puzzle]);
  if (!datasets.length) return;

  async function openCase(entry, item) {
    const { dataset } = entry;
    const key = datasetKey(dataset);
    const saved = loadJson(`personal.${key}`, {});
    const edit = saved.edits?.[item.id];
    let imageState = item.imageState;
    try {
      const records = await window.AlgNoteImageStore.list(key);
      const record = records.find((record) => record.caseId === item.id);
      if (record) {
        const settings = { ...record.imageState };
        delete settings.svg;
        imageState = Object.keys(settings).length ? settings : undefined;
      }
    } catch (error) { console.error("케이스 이미지 불러오기 실패", error); }
    const context = {
      dataset: key, caseId: item.id, name: item.name, group: item.groupName,
      puzzle: dataset.puzzle, scramble: edit?.scramble ?? item.scramble ?? "",
      algorithms: edit?.algorithms ?? item.algorithms ?? [],
      notes: saved.algorithmNotes?.[item.id] || item.algorithmNotes || {},
      imageState,
      caseNote: item.csp?.notes || "", openedAt: Date.now(),
    };
    const contextId = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    localStorage.setItem(`algNote.imageContext.${contextId}`, JSON.stringify(context));
    window.name = `algNoteContext:${JSON.stringify({ id: contextId, context })}`;
    const url = new URL(pages[dataset.puzzle], location.href);
    url.searchParams.set("context", contextId);
    location.href = url.href;
  }

  function createPicker() {
    const dialog = document.createElement("dialog");
    dialog.className = "bridge-picker";
    dialog.setAttribute("aria-label", "ALG note 케이스 이미지 선택");
    dialog.innerHTML = `<div class="bridge-picker-header"><div><h2>케이스 선택</h2><p class="bridge-picker-subtitle"></p></div><button type="button" class="bridge-picker-close" aria-label="닫기">×</button></div><input class="bridge-picker-search" type="search" placeholder="이름, 그룹, 번호 검색" aria-label="케이스 검색"><div class="bridge-picker-grid"></div><button type="button" class="bridge-picker-more" hidden>더 보기</button>`;
    document.body.append(dialog);
    const subtitle = dialog.querySelector(".bridge-picker-subtitle");
    const search = dialog.querySelector(".bridge-picker-search");
    const grid = dialog.querySelector(".bridge-picker-grid");
    const more = dialog.querySelector(".bridge-picker-more");
    let entry;
    let matches = [];
    let groupCounts = new Map();
    let count = 0;
    let overrides = new Map();

    function addCards() {
      const fragment = document.createDocumentFragment();
      for (const [offset, item] of matches.slice(count, count + 100).entries()) {
        const index = count + offset;
        const groupName = item.groupName || "기타";
        if (index === 0 || matches[index - 1].groupName !== item.groupName) {
          const heading = document.createElement("h3");
          heading.className = "bridge-picker-group";
          heading.textContent = `${groupName} · ${groupCounts.get(groupName)}개`;
          fragment.append(heading);
        }
        const card = document.createElement("button");
        card.type = "button";
        card.className = "bridge-picker-card";
        const image = document.createElement("img");
        image.alt = "";
        image.loading = "lazy";
        const svg = overrides.get(item.id) || item.svg;
        if (svg) image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        else image.className = "bridge-picker-missing";
        const label = document.createElement("span");
        label.textContent = item.name;
        card.append(image, label);
        card.addEventListener("click", () => openCase(entry, item));
        fragment.append(card);
      }
      grid.append(fragment);
      count = Math.min(count + 100, matches.length);
      more.hidden = count >= matches.length;
    }

    function filter() {
      const query = search.value.trim().toLowerCase();
      const filtered = entry.dataset.cases.filter((item) =>
        !query || [item.id, item.name, item.groupName, item.scramble].join(" ").toLowerCase().includes(query));
      const groups = new Map();
      for (const item of filtered) {
        const name = item.groupName || "기타";
        if (!groups.has(name)) groups.set(name, []);
        groups.get(name).push(item);
      }
      groupCounts = new Map([...groups].map(([name, items]) => [name, items.length]));
      matches = [...groups.values()].flat();
      count = 0;
      grid.replaceChildren();
      addCards();
      if (!matches.length) grid.textContent = "검색 결과가 없습니다.";
    }

    search.addEventListener("input", filter);
    more.addEventListener("click", addCards);
    dialog.querySelector(".bridge-picker-close").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });

    return async (bundleKey) => {
      entry = datasets.find((value) => value.bundleKey === bundleKey) || datasets[0];
      subtitle.textContent = `${entry.dataset.puzzle} · ${entry.dataset.name}`;
      search.value = "";
      overrides = new Map();
      try {
        const records = await window.AlgNoteImageStore.list(datasetKey(entry.dataset));
        overrides = new Map(records.map((record) => [record.caseId, record.svg]));
      } catch (error) { console.error("케이스 이미지 불러오기 실패", error); }
      filter();
      dialog.showModal();
      search.focus();
    };
  }

  const showPicker = createPicker();
  window.AlgNoteCasePicker = { datasets, showPicker, openCase };
  if (location.pathname.split("/").pop() !== "index.html" && !location.pathname.endsWith("/")) return;

  const panel = document.createElement("section");
  panel.className = "alg-note-bridge bridge-home";
  panel.setAttribute("aria-label", "ALG note 케이스 선택");
  const heading = document.createElement("h2");
  heading.textContent = "ALG note 케이스 이미지 수정";
  const description = document.createElement("p");
  description.textContent = "alg 세트를 선택한 뒤 그림을 눌러 케이스를 여세요.";
  const row = document.createElement("div");
  row.className = "bridge-row";
  const select = document.createElement("select");
  select.setAttribute("aria-label", "alg 세트");
  for (const { bundleKey, dataset } of datasets) {
    const option = document.createElement("option");
    option.value = bundleKey;
    option.textContent = `${dataset.puzzle} · ${dataset.name}`;
    select.append(option);
  }
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "케이스 이미지 선택";
  row.append(select, button);
  panel.append(heading, description, row);
  document.body.prepend(panel);
  select.value = loadJson("lastBundledDataset", datasets[0].bundleKey);
  if (!select.value) select.value = datasets[0].bundleKey;
  select.addEventListener("change", () => showPicker(select.value));
  button.addEventListener("click", () => showPicker(select.value));
})();
