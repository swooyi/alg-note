window.AlgNoteCasePlayer = (() => {
  let dialog, frame, context, returnFocus;
  let ready = false, sentContext;
  const frames = new Map(), frameReady = new Map();
  // Local HTML files have an opaque message origin ("null"), even when location.origin is "file://".
  const messageOrigin = location.protocol === "file:" ? "*" : location.origin;
  const sourceOrigin = location.protocol === "file:" ? "null" : location.origin;

  function sendContext() {
    if (!ready || !dialog?.open || !context || sentContext === context) return;
    sentContext = context;
    frame.contentWindow.postMessage({ type: "alg-note-player-load", ...context }, messageOrigin);
  }

  function close() {
    frame?.contentWindow.postMessage({ type: "alg-note-player-stop" }, messageOrigin);
    if (dialog?.open) dialog.close();
  }

  function prepare(puzzle = "FTO") {
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.className = "case-player-dialog";
      dialog.setAttribute("aria-labelledby", "casePlayerTitle");
      const header = document.createElement("div");
      header.className = "case-player-header";
      const title = document.createElement("h2");
      title.id = "casePlayerTitle";
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "닫기";
      button.addEventListener("click", close);
      header.append(title, button);
      dialog.append(header);
      document.body.append(dialog);
      dialog.addEventListener("close", () => {
        if (dialog.open) return;
        frame?.contentWindow.postMessage({ type: "alg-note-player-stop" }, messageOrigin);
        context = null;
        document.body.classList.remove("has-case-player");
        if (returnFocus?.isConnected) returnFocus.focus();
      });
      dialog.addEventListener("click", event => { if (event.target === dialog) close(); });
    }
    const engine = puzzle === "3x3" ? "3x3" : "fto";
    if (frame !== frames.get(engine)) {
      frame?.contentWindow.postMessage({ type: "alg-note-player-stop" }, messageOrigin);
      if (frame) frame.hidden = true;
      frame = frames.get(engine);
      ready = frameReady.get(engine) || false;
      sentContext = null;
    }
    if (!frame) {
      frame = document.createElement("iframe");
      frame.title = `${puzzle} 알고리즘 시뮬레이터`;
      const createdFrame = frame;
      frame.addEventListener("load", () => {
        createdFrame.contentWindow.postMessage({ type: "alg-note-player-check-ready" }, messageOrigin);
      });
      frame.src = new URL(`../image-simulator-engine/case-player-${engine}.html?v=9`, location.href).href;
      frames.set(engine, frame);
      dialog.append(frame);
    }
    frame.hidden = false;
  }

  function open(item, algorithm, index, trigger, initialView, puzzle = "FTO") {
    prepare(puzzle);
    returnFocus = trigger;
    context = { scramble: item.scramble || "", algorithm, imageState: item.imageState, initialView };
    dialog.querySelector("h2").textContent = `${item.groupName || ""} · ${item.name} · ALG ${index + 1}`;
    document.body.classList.add("has-case-player");
    if (!dialog.open) dialog.showModal();
    sendContext();
  }

  window.addEventListener("message", event => {
    if (event.origin !== sourceOrigin) return;
    const entry = [...frames].find(([, candidate]) => event.source === candidate.contentWindow);
    if (!entry) return;
    if (event.data?.type === "alg-note-player-ready") frameReady.set(entry[0], true);
    if (event.source !== frame?.contentWindow) return;
    if (event.data?.type === "alg-note-player-ready") {
      ready = true;
      sendContext();
    } else if (event.data?.type === "alg-note-player-close") close();
  });

  return { open, close, prepare };
})();
