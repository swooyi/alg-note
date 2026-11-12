function initFtoCasePlayer() {
  const messageOrigin = location.protocol === 'file:' ? '*' : location.origin;
  const sourceOrigin = location.protocol === 'file:' ? 'null' : location.origin;
  const displayPreferences = {};
  const root = document.createElement('main');
  root.className = 'player-root';
  const message = document.createElement('p');
  message.className = 'player-message';
  message.setAttribute('role', 'status');
  message.textContent = '알고리즘을 불러오는 중…';
  const playback = simEl('sim-play').closest('.sim-toolbar');
  const speed = simEl('sim-speed').closest('.sim-toolbar');
  speed.querySelector('.sim-paint-toggle').hidden = true;
  const notation = document.createElement('section');
  notation.className = 'player-notation';
  const caption = document.createElement('h2');
  caption.textContent = 'ALG · EIF 구간은 파랑, 현재 수는 테두리로 표시';
  els.notation.readOnly = true;
  els.notation.setAttribute('aria-label', '선택한 알고리즘');
  notation.append(caption, els.notation.closest('.notation-editor'), simEl('notation-error'));
  const options = document.createElement('div');
  options.className = 'player-options';
  function toggle(id, label, input, preference) {
    const wrapper = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = id;
    checkbox.onchange = () => {
      displayPreferences[preference] = checkbox.checked;
      input.checked = checkbox.checked;
      simDraw();
    };
    wrapper.append(checkbox, document.createTextNode(label));
    options.append(wrapper);
    return checkbox;
  }
  const markings = toggle('player-markings', '스티커 마킹', els.showStickerText, 'markings');
  const symbols = toggle('player-symbols', '회전면 기호', els.showFaceSymbols, 'symbols');
  const zoomLabel = document.createElement('label');
  zoomLabel.className = 'player-zoom';
  zoomLabel.textContent = '확대';
  const zoom = document.createElement('input');
  zoom.type = 'range';
  zoom.min = '.5'; zoom.max = '2'; zoom.step = '.05'; zoom.value = '1';
  zoom.setAttribute('aria-label', '퍼즐 확대');
  zoom.oninput = () => { simZoom = Number(zoom.value); simDraw(); };
  zoomLabel.append(zoom);
  const settings = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = '속도 · 관찰 시점';
  const controlsHint = '드래그로 회전 · 휠로 확대 · Space 재생/정지 · ← → 한 수씩 이동';
  settings.append(summary, speed, zoomLabel, simEl('sim-viewpoints'));
  const setup = document.createElement('details');
  setup.open = true;
  const setupSummary = document.createElement('summary');
  setupSummary.textContent = '시작 setup';
  const setupText = document.createElement('p');
  setupText.className = 'player-setup';
  setup.append(setupSummary, setupText);
  root.append(message, playback, simCanvas, notation, options, settings, setup);
  document.body.append(root);
  simEl('sim-paint').checked = false;
  els.markStickers.checked = false;
  const defaults = captureSettingsShare();
  let loaded = false;
  let initialView;
  simEl('sim-camera').onclick = () => {
    if (!initialView) return;
    simYaw = initialView.yaw; simPitch = initialView.pitch; simZoom = initialView.zoom;
    simViewBasis = initialView.basis.map(row => [...row]);
    zoom.value = String(simZoom);
    simDraw();
  };

  function load(data) {
    loaded = false;
    simPlaying = false;
    simAnimation = null;
    simCaseSources = null;
    for (const button of playback.querySelectorAll('button')) button.disabled = true;
    try {
      // The saved setup is the starting position, independently of the chosen ALG.
      const setupPlan = compileFtoSimulation(data.scramble);
      const image = (data.imageState?.settings || defaults).image;
      state.baseColors = { ...image.baseColors };
      state.colors = cloneColors(image.colors);
      state.stickerTexts = { ...image.stickerTexts };
      state.viewpointTokens = Object.fromEntries(VIEWS.map(view => [view, image.viewpointTokens[view].map(token => ({ ...token }))]));
      els.showLabels.checked = image.showLabels;
      displayPreferences.markings ??= image.showStickerText !== false;
      displayPreferences.symbols ??= Boolean(image.showFaceSymbols);
      els.showStickerText.checked = displayPreferences.markings;
      els.showFaceSymbols.checked = displayPreferences.symbols;
      els.faceSymbolSize.value = String(image.faceSymbolSize ?? 100);
      const view = data.initialView || data.imageState?.view || 'cif';
      simYaw = 0;
      simPitch = view === 'eif' ? Math.atan(Math.sqrt(2)) : 0;
      simZoom = 1;
      simViewBasis = [[1,0,0], [0,1,0], [0,0,1]];
      for (const token of physicalViewpointTokens(view, state.viewpointTokens[view])) {
        const vertex = token.move === 'V';
        const turns = token.suffix === '2' ? 2 : token.suffix === "'" ? (vertex ? 3 : 2) : 1;
        const axis = vertex ? [0,0,1] : FACE_NORMALS[token.move];
        simViewBasis = simViewBasis.map(vector => rotateFtoPoint(vector, axis, -turns * (vertex ? Math.PI/2 : Math.PI*2/3)));
      }
      initialView = {yaw:simYaw, pitch:simPitch, zoom:simZoom, basis:simViewBasis.map(row => [...row])};
      zoom.value = String(simZoom);
      simCaseSources = ftoSimulationState(setupPlan, setupPlan.steps.length).values;
      const algorithmPlan = compileFtoSimulation(data.algorithm);
      els.notation.value = data.algorithm;
      els.mode.value = 'setup';
      simPlan = algorithmPlan;
      simNotationPlan = algorithmPlan;
      simValid = true;
      simEl('sim-paint').checked = false;
      els.markStickers.checked = false;
      markings.disabled = !Object.values(state.stickerTexts).some(value => String(value).trim());
      markings.checked = !markings.disabled && els.showStickerText.checked;
      els.showStickerText.checked = markings.checked;
      symbols.checked = els.showFaceSymbols.checked;
      setupText.textContent = data.scramble || '(setup 없음)';
      simEl('notation-error').hidden = true;
      els.notation.setAttribute('aria-invalid', 'false');
      selectFtoTab('simulator');
      simSeek(0);
      simHighlightNotation();
      loaded = true;
      message.textContent = controlsHint;
    } catch (error) {
      simPlan = null;
      simValid = false;
      state.valid = false;
      if (simCaseSources) simSources = { ...simCaseSources };
      simFrame = ftoIdentityFrame();
      els.notation.value = data.algorithm || '';
      simNotationPlan = null;
      simDraw();
      simEl('notation-highlights').replaceChildren();
      els.notation.setAttribute('aria-invalid', 'true');
      simEl('notation-error').textContent = `재생할 수 없습니다: ${error.message}`;
      simEl('notation-error').hidden = false;
      message.textContent = '공식 표기를 확인하세요.';
    }
    els.notation.style.height = 'auto';
    els.notation.style.height = `${Math.max(76, Math.min(220, els.notation.scrollHeight))}px`;
    simHighlightNotation();
  }

  window.addEventListener('message', event => {
    if (event.source !== window.parent || event.origin !== sourceOrigin) return;
    if (event.data?.type === 'alg-note-player-load') load(event.data);
    else if (event.data?.type === 'alg-note-player-check-ready') {
      window.parent.postMessage({type:'alg-note-player-ready'}, messageOrigin);
    } else if (event.data?.type === 'alg-note-player-stop') {
      loaded = false;
      simPlaying = false;
      simAnimation = null;
      simDraw();
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      window.parent.postMessage({type:'alg-note-player-close'}, messageOrigin);
      return;
    }
    if (!loaded || event.target.matches('input, textarea, select, button')) return;
    const control = { Space:'sim-play', ArrowLeft:'sim-prev', ArrowRight:'sim-next', Home:'sim-start', End:'sim-end' }[event.code];
    if (control) { event.preventDefault(); simEl(control).click(); }
  });
  window.parent.postMessage({type:'alg-note-player-ready'}, messageOrigin);
}
