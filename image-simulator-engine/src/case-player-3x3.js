function initCubeCasePlayer() {
  const messageOrigin = location.protocol === 'file:' ? '*' : location.origin;
  const sourceOrigin = location.protocol === 'file:' ? 'null' : location.origin;
  const preferences = {};
  const defaults = currentCubeState();
  let loaded = false, initialView, ranges = [];
  const root = document.createElement('main');
  root.className = 'player-root';
  const message = document.createElement('p');
  message.className = 'player-message';
  message.setAttribute('role', 'status');
  message.textContent = '알고리즘을 불러오는 중…';
  const playback = $('cube-sim-play').closest('.sim-toolbar');
  const speed = $('cube-sim-speed').closest('.sim-toolbar');
  speed.querySelector('.sim-paint-toggle').hidden = true;
  const notation = document.createElement('section');
  notation.className = 'player-notation';
  const caption = document.createElement('h2');
  caption.textContent = 'ALG · 현재 수는 테두리로 표시';
  const formula = document.createElement('pre');
  formula.id = 'player-algorithm';
  formula.setAttribute('aria-label', '선택한 알고리즘');
  notation.append(caption, formula, $('notation-error'));
  const options = document.createElement('div');
  options.className = 'player-options';
  function toggle(id, label, key) {
    const wrapper = document.createElement('label'), input = document.createElement('input');
    input.type = 'checkbox'; input.id = id;
    input.onchange = () => { preferences[key] = input.checked; state[key] = input.checked; cubeDraw(); };
    wrapper.append(input, document.createTextNode(label)); options.append(wrapper);
    return input;
  }
  const markings = toggle('player-markings', '스티커 마킹', 'showMarkings');
  const symbols = toggle('player-symbols', '회전면 기호', 'faceSymbols');
  const zoomLabel = document.createElement('label');
  zoomLabel.className = 'player-zoom'; zoomLabel.textContent = '확대';
  const zoom = document.createElement('input');
  zoom.type = 'range'; zoom.min = '.5'; zoom.max = '2'; zoom.step = '.05'; zoom.value = '1';
  zoom.setAttribute('aria-label', '퍼즐 확대');
  zoom.oninput = () => { cubeZoom = Number(zoom.value); cubeDraw(); };
  zoomLabel.append(zoom);
  const settings = document.createElement('details'), summary = document.createElement('summary');
  summary.textContent = '속도 · 관찰 시점';
  settings.append(summary, speed, zoomLabel, $('cube-sim-viewpoints'));
  const setup = document.createElement('details'), setupSummary = document.createElement('summary');
  setup.open = true; setupSummary.textContent = '시작 setup';
  const setupText = document.createElement('p'); setupText.className = 'player-setup';
  setup.append(setupSummary, setupText);
  root.append(message, playback, cubeCanvas, notation, options, settings, setup);
  document.body.append(root);
  $('cube-sim-paint').checked = false;
  cubePlayerDraw = () => {
    const active = cubeIndex < cubeSteps.length ? cubeIndex : -1;
    [...formula.children].forEach((span, index) => span.classList.toggle('notation-current', index === active));
  };
  $('cube-sim-camera').onclick = () => {
    if (!initialView) return;
    cubeYaw = initialView.yaw; cubePitch = initialView.pitch; cubeZoom = initialView.zoom;
    cubeBasis = initialView.basis.map(row => [...row]); zoom.value = String(cubeZoom); cubeDraw();
  };
  function load(data) {
    loaded = false; cubePlaying = false; cubeAnimation = null;
    formula.textContent = data.algorithm || '';
    setupText.textContent = data.scramble || '(setup 없음)';
    try {
      const image = data.imageState?.settings?.image || defaults;
      Object.assign(state, JSON.parse(JSON.stringify(image)), { notation: data.algorithm, mode: 'setup', markingMode: false });
      cubeCaseSources = applyTokens(identityState(state.size), parseNotation(data.scramble || '', state.size), state.size);
      cubeSteps = parseNotation(data.algorithm, state.size);
      // Parentheses and prime variants occupy one character in the existing parser.
      const text = data.algorithm.replace(/[’′]/g, "'").replace(/[()]/g, ' ');
      ranges = [...text.matchAll(/\.|(?:[1-9]\d*[UDFBRL]w|[UDFBRL]w|[UDFBRLudfbrlMESxyz])(?:'2|2'|2|'|3)?/g)];
      formula.replaceChildren();
      let offset = 0;
      for (const match of ranges) {
        formula.append(document.createTextNode(data.algorithm.slice(offset, match.index)));
        const span = document.createElement('span'); span.textContent = data.algorithm.slice(match.index, match.index + match[0].length);
        formula.append(span); offset = match.index + match[0].length;
      }
      formula.append(document.createTextNode(data.algorithm.slice(offset)));
      preferences.showMarkings ??= image.showMarkings !== false;
      preferences.faceSymbols ??= Boolean(image.faceSymbols);
      markings.disabled = !Object.values(state.stickerNames || {}).some(value => String(value).trim());
      markings.checked = !markings.disabled && preferences.showMarkings;
      state.showMarkings = markings.checked;
      symbols.checked = state.faceSymbols = preferences.faceSymbols;
      const sim = data.imageState?.settings?.simulator;
      initialView = { yaw: sim?.yaw ?? -Math.PI/4, pitch: sim?.pitch ?? Math.PI/6, zoom: sim?.zoom ?? 1, basis: sim?.basis || [[1,0,0],[0,1,0],[0,0,1]] };
      valid = true; $('notation-error').hidden = true;
      $('cube-sim-camera').click(); cubeSeek(0); loaded = true;
      message.textContent = '드래그로 회전 · 휠로 확대 · Space 재생/정지 · ← → 한 수씩 이동';
    } catch (error) {
      valid = false; cubeSteps = []; cubeIndex = 0; cubeDraw();
      $('notation-error').hidden = false;
      $('notation-error').textContent = `재생할 수 없습니다: ${error.message}`;
      message.textContent = '공식 표기를 확인하세요.';
    }
  }
  window.addEventListener('message', event => {
    if (event.source !== window.parent || event.origin !== sourceOrigin) return;
    if (event.data?.type === 'alg-note-player-load') load(event.data);
    else if (event.data?.type === 'alg-note-player-check-ready') window.parent.postMessage({ type: 'alg-note-player-ready' }, messageOrigin);
    else if (event.data?.type === 'alg-note-player-stop') {
      loaded = false; cubePlaying = false; cubeAnimation = null;
      cubeSources = cubeStateAt(cubeIndex); cubeDraw();
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { window.parent.postMessage({type:'alg-note-player-close'}, messageOrigin); return; }
    if (!loaded || event.target.matches('input, textarea, select, button')) return;
    const control = { Space:'play', ArrowLeft:'prev', ArrowRight:'next', Home:'start', End:'end' }[event.code];
    if (control) { event.preventDefault(); $('cube-sim-' + control).click(); }
  });
  window.parent.postMessage({ type: 'alg-note-player-ready' }, messageOrigin);
}
