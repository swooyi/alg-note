window.AlgNoteCasePlayer = (() => {
  let dialog, frame, context, returnFocus;
  let ready = false, sentContext;
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

  function prepare() {
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
    if (!frame) {
      frame = document.createElement("iframe");
      frame.title = "FTO 알고리즘 시뮬레이터";
      frame.addEventListener("load", () => {
        frame.contentWindow.postMessage({ type: "alg-note-player-check-ready" }, messageOrigin);
      });
      frame.src = new URL("../image-simulator-engine/case-player-fto.html?v=8", location.href).href;
      dialog.append(frame);
    }
  }

  function open(item, algorithm, index, trigger, initialView) {
    prepare();
    returnFocus = trigger;
    context = { scramble: item.scramble || "", algorithm, imageState: item.imageState, initialView };
    dialog.querySelector("h2").textContent = `${item.groupName || ""} · ${item.name} · ALG ${index + 1}`;
    document.body.classList.add("has-case-player");
    if (!dialog.open) dialog.showModal();
    sendContext();
  }

  window.addEventListener("message", event => {
    if (!frame || event.source !== frame.contentWindow || event.origin !== sourceOrigin) return;
    if (event.data?.type === "alg-note-player-ready") {
      ready = true;
      sendContext();
    } else if (event.data?.type === "alg-note-player-close") close();
  });

  return { open, close, prepare };
})();
