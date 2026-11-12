(() => {
  const pages = {
    FTO: "image-gen-fto.html",
    "3x3": "image-gen-3x3.html",
    SQ1: "image-gen-square1.html",
  };
  const contextId = new URLSearchParams(location.search).get("context");
  if (!contextId) return;

  let context;
  try {
    const named = window.name.startsWith("algNoteContext:")
      ? JSON.parse(window.name.slice("algNoteContext:".length)) : null;
    context = named?.id === contextId ? named.context
      : JSON.parse(localStorage.getItem(`algNote.imageContext.${contextId}`));
  } catch { /* A generator page also works without an alg-note case. */ }
  if (!context) return;
  const currentPage = location.pathname.split("/").pop();
  if (currentPage === "index.html") {
    for (const link of document.querySelectorAll(".generator-card")) {
      const url = new URL(link.href);
      url.searchParams.set("context", contextId);
      link.href = url.href;
    }
    return;
  }
  if (pages[context.puzzle] !== currentPage) return;
  for (const link of document.querySelectorAll('a[href="./index.html"]')) {
    link.href = `./index.html?context=${encodeURIComponent(contextId)}`;
  }

  const panel = document.createElement("section");
  panel.className = "alg-note-bridge";
  panel.setAttribute("aria-label", "ALG note 케이스 연동");
  const title = document.createElement("h2");
  title.textContent = `${context.puzzle} · ${context.name} · ${context.group || ""}`;
  const picker = window.AlgNoteCasePicker;
  const entry = picker?.datasets.find(({ dataset }) =>
    window.AlgNoteStorage.datasetKey(dataset) === context.dataset);
  const caseIndex = entry?.dataset.cases.findIndex((item) => item.id === context.caseId) ?? -1;
  const navigation = document.createElement("div");
  navigation.className = "bridge-row bridge-case-navigation";
  if (entry && caseIndex >= 0) {
    const previous = button("← 이전 케이스", () => picker.openCase(entry, entry.dataset.cases[caseIndex - 1]));
    previous.disabled = caseIndex === 0;
    const choose = button("다른 케이스 선택", () => picker.showPicker(entry.bundleKey));
    const next = button("다음 케이스 →", () => picker.openCase(entry, entry.dataset.cases[caseIndex + 1]));
    next.disabled = caseIndex === entry.dataset.cases.length - 1;
    navigation.append(previous, choose, next);
  }
  const backLink = document.createElement("a");
  backLink.href = "../app/";
  backLink.textContent = "ALG note 열기";
  const description = document.createElement("p");
  description.textContent = "setup이나 ALG를 눌러 생성기와 시뮬레이터에 불러오세요. 일부 ALG의 특수 표기는 생성기에서 해석되지 않을 수 있습니다. 아래 이미지 반영은 이 케이스의 그림만 바꿉니다.";
  const caseNote = document.createElement("p");
  if (context.caseNote) caseNote.textContent = `메모: ${context.caseNote}`;
  const inputRow = document.createElement("div");
  inputRow.className = "bridge-row";
  const setupButton = button("setup 불러오기", () => loadNotation(context.scramble, "setup"));
  inputRow.append(setupButton);
  const setupText = document.createElement("code");
  setupText.textContent = context.scramble || "(setup 없음)";
  inputRow.append(setupText);

  const list = document.createElement("ol");
  for (const [index, algorithm] of (context.algorithms || []).entries()) {
    const item = document.createElement("li");
    item.append(button(`ALG ${index + 1} 불러오기`, () => loadNotation(algorithm, "alg")));
    const text = document.createElement("code");
    text.textContent = ` ${algorithm}`;
    item.append(text);
    const note = context.notes?.[algorithm];
    if (note) {
      const noteNode = document.createElement("span");
      noteNode.className = "bridge-note";
      noteNode.textContent = `메모: ${note}`;
      item.append(noteNode);
    }
    list.append(item);
  }

  const actions = document.createElement("div");
  actions.className = "bridge-row";
  const views = context.puzzle === "FTO" ? ["cif", "eif"] : context.puzzle === "3x3" ? ["3d", "ll"] : ["current"];
  for (const view of views) {
    actions.append(button(`${view === "current" ? "현재 보기" : view.toUpperCase()} 이미지 반영`, () => savePreview(view)));
  }
  const upload = document.createElement("label");
  upload.className = "bridge-file";
  upload.textContent = "별도 이미지 지정";
  const file = document.createElement("input");
  file.type = "file";
  file.accept = "image/png,image/jpeg,image/webp,image/svg+xml";
  file.addEventListener("change", () => uploadImage(file.files?.[0]));
  upload.append(file);
  actions.append(upload);
  actions.append(button("기존 이미지로 복원", restoreImage));
  const status = document.createElement("p");
  status.className = "bridge-status";
  status.setAttribute("role", "status");
  panel.append(backLink, title, navigation, description, caseNote, inputRow, list, actions, status);
  document.body.prepend(panel);

  function button(label, action) {
    const element = document.createElement("button");
    element.type = "button";
    element.textContent = label;
    element.addEventListener("click", action);
    return element;
  }

  function loadNotation(value, mode) {
    const modeInput = document.getElementById("input-mode");
    const notation = document.getElementById("notation");
    modeInput.value = mode;
    modeInput.dispatchEvent(new Event("change", { bubbles: true }));
    notation.value = value || "";
    notation.dispatchEvent(new Event("input", { bubbles: true }));
    status.textContent = `${mode === "setup" ? "setup" : "ALG"}를 불러왔습니다.`;
  }

  function preview(view) {
    const selector = context.puzzle === "FTO" ? `#${view}-preview svg`
      : context.puzzle === "3x3" ? `#cube-${view}-preview svg`
        : "#single-view svg";
    return document.querySelector(selector);
  }

  async function savePreview(view) {
    const notation = document.getElementById("notation");
    const error = document.getElementById("notation-error");
    if (notation.getAttribute("aria-invalid") === "true" || !error.hidden) {
      status.textContent = "회전기호 오류를 먼저 수정하세요.";
      return;
    }
    const svg = preview(view);
    if (!svg) { status.textContent = "이미지 미리보기를 찾지 못했습니다."; return; }
    const copy = svg.cloneNode(true);
    copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    try {
      const svg = new XMLSerializer().serializeToString(copy);
      const settings = window.AlgNoteImageEngine.capture();
      await storeImage(svg, { view, settings });
    } catch (error) {
      status.textContent = `이미지 저장 실패: ${error.message}`;
    }
  }

  async function uploadImage(blob) {
    if (!blob) return;
    if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(blob.type)) {
      status.textContent = "PNG, JPEG, WebP 또는 SVG 이미지를 선택하세요.";
      return;
    }
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 150" role="img" aria-label="${escapeXml(context.name)}"><image href="${dataUrl}" width="150" height="150" preserveAspectRatio="xMidYMid meet"/></svg>`;
    await storeImage(svg);
    file.value = "";
  }

  function escapeXml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]);
  }

  async function storeImage(svg, imageState) {
    try {
      await window.AlgNoteImageStore.save(context.dataset, context.caseId, svg, imageState);
      context.imageState = imageState;
      saveContext();
      status.textContent = "이 케이스의 이미지에 반영했습니다. ALG note 화면에도 적용됩니다.";
      notify(svg, imageState);
    } catch (error) {
      status.textContent = `이미지 저장 실패: ${error.message}`;
    }
  }

  async function restoreImage() {
    try {
      await window.AlgNoteImageStore.remove(context.dataset, context.caseId);
      context.imageState = entry?.dataset.cases.find((item) => item.id === context.caseId)?.imageState;
      saveContext();
      status.textContent = "기존 이미지로 복원했습니다.";
      notify(null);
    } catch (error) {
      status.textContent = `복원 실패: ${error.message}`;
    }
  }

  function notify(svg, imageState) {
    if (window.opener) window.opener.postMessage(
      { type: "alg-note-image-changed", dataset: context.dataset, caseId: context.caseId, svg, imageState },
      location.origin === "null" ? "*" : location.origin,
    );
  }

  function saveContext() {
    localStorage.setItem(`algNote.imageContext.${contextId}`, JSON.stringify(context));
    window.name = `algNoteContext:${JSON.stringify({ id: contextId, context })}`;
  }

  if (context.imageState?.settings || context.scramble) {
    const ready = setInterval(() => {
      if (!preview(views[0])) return;
      clearInterval(ready);
      try {
        if (context.imageState?.settings) {
          window.AlgNoteImageEngine.restore(context.imageState.settings);
          status.textContent = "케이스에 저장된 색 배치와 이미지 설정을 불러왔습니다.";
        } else {
          loadNotation(context.scramble, "setup");
        }
      } catch (error) {
        status.textContent = `이미지 설정 불러오기 실패: ${error.message}`;
      }
    }, 50);
    setTimeout(() => clearInterval(ready), 5000);
  }
})();
