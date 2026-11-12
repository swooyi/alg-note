// Versioned, self-contained FTO snapshots for links and AI-readable JSON.
window.AlgNoteImageEngine = { capture: captureSettingsShare, restore: restoreSettingsShare };
const SHARE_CONTROLS = ['save-filename', 'batch-json', 'batch-format', 'sticker-text-target', 'sticker-text-input', 'sim-speed', 'sim-paint'];
function captureSettingsShare() {
  if (simAnimation) throw new Error('현재 회전이 끝난 뒤 다시 공유해 주세요.');
  return {
    schemaVersion: 1, application: 'fto-image-generator', puzzle: 'FTO',
    description: 'image: 원래 스티커 색·문자와 공식 및 CIF/EIF 시점. simulator: 진행 단계와 3D 관찰 방향. 재생은 정지 상태로 복원됩니다.',
    image: captureImageState(),
    viewModes: { ...state.viewModes }, selectedColor: state.selectedColor,
    controls: Object.fromEntries(SHARE_CONTROLS.map(id => {
      const el = document.getElementById(id);
      return [id, el.type === 'checkbox' ? el.checked : el.value];
    })),
    tab: ftoTabNames.find(name => simEl(`fto-tab-${name}`).getAttribute('aria-selected') === 'true'),
    simulator: { index: simIndex, yaw: simYaw, pitch: simPitch, zoom: simZoom, basis: simViewBasis.map(v => [...v]) },
    resolved: { displayedSources: state.displayedSources, simulatorSources: simSources }
  };
}
function encodeSettingsShare(data) {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
function decodeSettingsShare(encoded) {
  if (encoded.length > 3000000) throw new Error('공유 정보가 너무 큽니다.');
  const binary = atob(encoded.replaceAll('-', '+').replaceAll('_', '/'));
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(binary, c => c.charCodeAt(0))));
}
function validateSettingsShare(data) {
  const fail = () => { throw new Error('지원하지 않거나 손상된 FTO 설정 파일입니다.'); };
  if (!data || data.schemaVersion !== 1 || data.application !== 'fto-image-generator' || data.puzzle !== 'FTO') fail();
  const image = data.image, sim = data.simulator;
  const color = v => typeof v === 'string' && /^#[\da-f]{6}$/i.test(v);
  const colorMap = (map, keys) => map && Object.keys(map).length === keys.length && keys.every(k => color(map[k]));
  const ids = state.template.stickers.map(s => s.id);
  if (!image || !colorMap(image.baseColors, ids) || !['setup', 'alg'].includes(image.mode) || typeof image.notation !== 'string') fail();
  // Invalid notation may be shared as a draft; the normal editor displays its error.
  if (!image.colors || !Array.isArray(image.colors.palette) || image.colors.palette.some(item => !item || typeof item !== 'object') || !isValidColors(image.colors) || !colorMap(image.colors.faces, FACE_ORDER) || !color(image.colors.blank)) fail();
  if (image.colorLayoutOrigin !== null && !colorMap(image.colorLayoutOrigin, ids)) fail();
  if (!image.stickerTexts || Object.entries(image.stickerTexts).some(([id, text]) => !ids.includes(id) || typeof text !== 'string')) fail();
  if (!['showBackFaces', 'showLabels', 'showStickerText'].every(k => typeof image[k] === 'boolean')) fail();
  if (image.showFaceSymbols !== undefined && typeof image.showFaceSymbols !== 'boolean') fail();
  if (image.backFaceDistance !== undefined && (!Number.isInteger(image.backFaceDistance) || image.backFaceDistance < 50 || image.backFaceDistance > 300)) fail();
  if (image.markingMode !== undefined && typeof image.markingMode !== 'boolean') fail();
  if (image.faceSymbolSize !== undefined && (!Number.isInteger(image.faceSymbolSize) || image.faceSymbolSize < 50 || image.faceSymbolSize > 200)) fail();
  if (![...FACE_ORDER, 'Blank'].includes(image.selectedPaletteName) || !color(data.selectedColor)) fail();
  for (const view of VIEWS) {
    const tokens = image.viewpointTokens?.[view];
    if (!Array.isArray(tokens)) fail();
    for (const token of tokens) {
      if (!token || !['U', 'R', 'F', 'B', 'V'].includes(token.move) || !['', "'", '2'].includes(token.suffix)) fail();
    }
  }
  if (!data.controls || SHARE_CONTROLS.some(id => typeof data.controls[id] !== (id === 'sim-paint' ? 'boolean' : 'string'))) fail();
  if (!['svg', 'png'].includes(data.controls['batch-format'])) fail();
  const speed = Number(data.controls['sim-speed']);
  if (!Number.isFinite(speed) || speed < 50 || speed > 1000) fail();
  if (!ftoTabNames.includes(data.tab) || !['single', 'batch'].every(k => ['both', 'cif', 'eif'].includes(data.viewModes?.[k]))) fail();
  if (!sim || !Number.isInteger(sim.index) || sim.index < 0 || ![sim.yaw, sim.pitch, sim.zoom].every(Number.isFinite) || sim.zoom < 0.5 || sim.zoom > 2) fail();
  if (!Array.isArray(sim.basis) || sim.basis.length !== 3 || !sim.basis.every(v => Array.isArray(v) && v.length === 3 && v.every(n => Number.isFinite(n) && Math.abs(n) <= 1.001))) fail();
  let count = 0;
  try { count = compileFtoSimulation(image.notation).steps.length; } catch { /* draft */ }
  if (sim.index > count) fail();
  return data;
}
function restoreSettingsShare(data) {
  validateSettingsShare(data);
  if (simAnimation) throw new Error('현재 회전이 끝난 뒤 다시 불러와 주세요.');
  applyImageState(data.image);
  state.selectedColor = data.selectedColor;
  for (const id of SHARE_CONTROLS) {
    const el = document.getElementById(id);
    if (el.type === 'checkbox') el.checked = data.controls[id];
    else el.value = data.controls[id];
  }
  simEl('sim-speed-range').value = simEl('sim-speed').value;
  state.viewModes = { ...data.viewModes };
  for (const scope of ['single', 'batch']) setViewMode(scope, state.viewModes[scope]);
  invalidateBatch();
  updateAndRecord();
  const sim = data.simulator;
  simPlaying = false;
  simYaw = sim.yaw; simPitch = sim.pitch; simZoom = sim.zoom;
  simViewBasis = sim.basis.map(v => [...v]);
  simIndex = sim.index;
  simRestoreState();
  selectFtoTab(data.tab);
  simDraw();
}
function initSettingsShare() {
  const status = simEl('share-status'), fallback = simEl('share-fallback');
  const report = error => { status.textContent = `공유 실패: ${error.message}`; };
  const copy = async text => {
    fallback.hidden = true;
    try {
      await navigator.clipboard.writeText(text);
      status.textContent = '복사했습니다.';
    } catch {
      fallback.value = text; fallback.hidden = false; fallback.focus(); fallback.select();
      status.textContent = '아래 내용을 선택해 복사하세요 (Ctrl+C).';
    }
  };
  simEl('share-link').onclick = async () => {
    try {
      const url = new URL(location.href);
      url.hash = 'share=' + encodeSettingsShare(captureSettingsShare());
      await copy(url.href);
      if (location.protocol === 'file:') status.textContent += ' 다른 기기에서는 JSON 저장·불러오기를 사용하세요.';
    } catch (error) { report(error); }
  };
  simEl('share-json').onclick = async () => {
    try { await copy(JSON.stringify(captureSettingsShare(), null, 2)); } catch (error) { report(error); }
  };
  simEl('share-download').onclick = () => {
    try {
      const blob = new Blob([JSON.stringify(captureSettingsShare(), null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      const now = new Date(), pad = value => String(value).padStart(2, '0');
      const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
      link.href = url; link.download = `FTO_설정공유_${stamp}.json`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      status.textContent = '설정 파일을 저장했습니다.';
    } catch (error) { report(error); }
  };
  simEl('share-import').onclick = () => simEl('share-file').click();
  simEl('share-file').onchange = async event => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      if (file.size > 2000000) throw new Error('설정 파일은 2MB까지 불러올 수 있습니다.');
      restoreSettingsShare(JSON.parse(await file.text()));
      status.textContent = '공유 설정을 불러왔습니다. 시뮬레이터는 정지 상태입니다.';
    } catch (error) { report(error); }
    finally { event.target.value = ''; }
  };
  const restoreLink = () => {
    if (!location.hash.startsWith('#share=')) return;
    try {
      restoreSettingsShare(decodeSettingsShare(location.hash.slice(7)));
      status.textContent = '링크의 설정을 불러왔습니다. 시뮬레이터는 정지 상태입니다.';
    } catch (error) { report(error); }
  };
  window.addEventListener('hashchange', restoreLink);
  restoreLink();
}
