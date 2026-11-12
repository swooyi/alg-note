// Versioned, self-contained snapshots for NxNxN links and JSON files.
window.AlgNoteImageEngine = { capture: captureCubeSettingsShare, restore: restoreCubeSettingsShare };
const CUBE_SHARE_CONTROLS = ['save-filename', 'batch-json', 'batch-format', 'cube-sim-speed', 'cube-sim-paint'];

function captureCubeSettingsShare() {
  if (cubeAnimation) throw new Error('현재 회전이 끝난 뒤 다시 공유해 주세요.');
  return {
    schemaVersion: 1, application: 'nxnxn-image-generator', puzzle: 'NxNxN',
    description: 'image: 현재 크기의 스티커 색과 공식, 팔레트 및 3D/LL 시점. simulator: 진행 단계와 3D 관찰 방향. 재생은 정지 상태로 복원됩니다.',
    image: currentCubeState(), selectedPaletteName,
    controls: Object.fromEntries(CUBE_SHARE_CONTROLS.map(id => {
      const el = $(id);
      return [id, el.type === 'checkbox' ? el.checked : el.value];
    })),
    tab: cubeTabs.find(name => $('cube-tab-' + name).getAttribute('aria-selected') === 'true'),
    simulator: { index: cubeIndex, yaw: cubeYaw, pitch: cubePitch, zoom: cubeZoom, basis: cubeBasis.map(row => [...row]) }
  };
}

function encodeCubeSettingsShare(data) {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function decodeCubeSettingsShare(encoded) {
  if (encoded.length > 3000000) throw new Error('공유 정보가 너무 큽니다.');
  const binary = atob(encoded.replaceAll('-', '+').replaceAll('_', '/'));
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(binary, character => character.charCodeAt(0))));
}

function validateCubeSettingsShare(data) {
  const fail = () => { throw new Error('지원하지 않거나 손상된 NxNxN 설정 파일입니다.'); };
  if (!data || data.schemaVersion !== 1 || data.application !== 'nxnxn-image-generator' || data.puzzle !== 'NxNxN') fail();
  const image = data.image, sim = data.simulator;
  if (!image || !Number.isInteger(image.size) || image.size < 2 || image.size > 7) fail();
  const imageKeys = ['size', 'base', 'notation', 'mode', 'orientations', 'labels', 'markingMode', 'showMarkings', 'stickerNames', 'faceSymbols', 'faceSymbolSize', 'showBackFaces', 'backFaceDistance', 'singleView', 'batchView', 'colorOrigin', 'palette'];
  if (Object.keys(image).some(key => !imageKeys.includes(key)) || imageKeys.filter(key => !['faceSymbolSize', 'backFaceDistance', 'stickerNames', 'markingMode', 'showMarkings'].includes(key)).some(key => !(key in image))) fail();
  const ids = Object.keys(solvedState(image.size));
  const color = value => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value);
  const colorMap = (map, keys) => map && Object.keys(map).length === keys.length && keys.every(key => color(map[key]));
  if (!colorMap(image.base, ids) || (image.colorOrigin !== null && !colorMap(image.colorOrigin, ids))) fail();
  if (!colorMap(image.palette, Object.keys(DEFAULT_PALETTE)) || !Object.keys(DEFAULT_PALETTE).includes(data.selectedPaletteName)) fail();
  if (!['setup', 'alg'].includes(image.mode) || typeof image.notation !== 'string') fail();
  if (!['labels', 'faceSymbols', 'showBackFaces'].every(key => typeof image[key] === 'boolean')) fail();
  if (image.faceSymbolSize !== undefined && (!Number.isInteger(image.faceSymbolSize) || image.faceSymbolSize < 50 || image.faceSymbolSize > 200)) fail();
  if (image.backFaceDistance !== undefined && (!Number.isInteger(image.backFaceDistance) || image.backFaceDistance < 50 || image.backFaceDistance > 300)) fail();
  if (image.markingMode !== undefined && typeof image.markingMode !== 'boolean') fail();
  if (image.showMarkings !== undefined && typeof image.showMarkings !== 'boolean') fail();
  if (image.stickerNames !== undefined && (!image.stickerNames || typeof image.stickerNames !== 'object' || Array.isArray(image.stickerNames) || Object.entries(image.stickerNames).some(([id, name]) => !ids.includes(id) || typeof name !== 'string' || Array.from(name).length > 20))) fail();
  if (!['singleView', 'batchView'].every(key => ['both', ...VIEWS].includes(image[key]))) fail();
  for (const view of VIEWS) {
    if (!Array.isArray(image.orientations?.[view]) || image.orientations[view].some(token =>
      !token || !['x', 'y', 'z'].includes(token.move) || ![1, 2, 3].includes(token.turns))) fail();
  }
  if (!data.controls || CUBE_SHARE_CONTROLS.some(id => typeof data.controls[id] !== (id === 'cube-sim-paint' ? 'boolean' : 'string'))) fail();
  if (!['svg', 'png'].includes(data.controls['batch-format'])) fail();
  const speed = Number(data.controls['cube-sim-speed']);
  if (!Number.isFinite(speed) || speed < 50 || speed > 1000) fail();
  if (!cubeTabs.includes(data.tab)) fail();
  if (!sim || !Number.isInteger(sim.index) || sim.index < 0 || ![sim.yaw, sim.pitch, sim.zoom].every(Number.isFinite) || sim.zoom < .5 || sim.zoom > 2) fail();
  if (!Array.isArray(sim.basis) || sim.basis.length !== 3 || !sim.basis.every(row => Array.isArray(row) && row.length === 3 && row.every(value => Number.isFinite(value) && Math.abs(value) <= 1.001))) fail();
  let count = 0;
  try { count = parseNotation(image.notation, image.size).length; } catch { /* Invalid notation is a shareable draft. */ }
  if (sim.index > count) fail();
  return data;
}

function restoreCubeSettingsShare(data) {
  validateCubeSettingsShare(data);
  if (cubeAnimation) throw new Error('현재 회전이 끝난 뒤 다시 불러와 주세요.');
  cubePlaying = false;
  invalidateBatch();
  for (const id of CUBE_SHARE_CONTROLS) {
    const el = $(id);
    if (el.type === 'checkbox') el.checked = data.controls[id];
    else el.value = data.controls[id];
  }
  $('cube-sim-speed-range').value = $('cube-sim-speed').value;
  selectedPaletteName = data.selectedPaletteName;
  cubeSignature = '';
  change(() => {
    Object.assign(state, { faceSymbolSize: 100, backFaceDistance: 100, markingMode: false, showMarkings: true, stickerNames: {}, ...JSON.parse(JSON.stringify(data.image)), sizeStates: {} });
    syncControls();
  });
  activePresetName = ''; $('preset-name').value = ''; renderPresets();
  cubeYaw = data.simulator.yaw; cubePitch = data.simulator.pitch; cubeZoom = data.simulator.zoom;
  cubeBasis = data.simulator.basis.map(row => [...row]);
  cubeIndex = data.simulator.index;
  cubeSources = cubeStateAt(cubeIndex);
  selectCubeTab(data.tab);
  cubeDraw();
}

function initCubeSettingsShare() {
  const message = $('share-status'), fallback = $('share-fallback');
  const report = error => { message.textContent = `공유 실패: ${error.message}`; };
  const copy = async value => {
    fallback.hidden = true;
    try {
      await navigator.clipboard.writeText(value);
      message.textContent = '복사했습니다.';
    } catch {
      fallback.value = value; fallback.hidden = false; fallback.focus(); fallback.select();
      message.textContent = '아래 내용을 선택해 복사하세요 (Ctrl+C).';
    }
  };
  $('share-link').onclick = async () => {
    try {
      const url = new URL(location.href);
      url.hash = 'share=' + encodeCubeSettingsShare(captureCubeSettingsShare());
      await copy(url.href);
      if (location.protocol === 'file:') message.textContent += ' 다른 기기에서는 JSON 저장·불러오기를 사용하세요.';
    } catch (error) { report(error); }
  };
  $('share-json').onclick = async () => {
    try { await copy(JSON.stringify(captureCubeSettingsShare(), null, 2)); } catch (error) { report(error); }
  };
  $('share-download').onclick = () => {
    try {
      const blob = new Blob([JSON.stringify(captureCubeSettingsShare(), null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      const now = new Date(), pad = value => String(value).padStart(2, '0');
      const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
      link.href = url; link.download = `큐브_${state.size}x${state.size}_설정공유_${stamp}.json`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      message.textContent = '설정 파일을 저장했습니다.';
    } catch (error) { report(error); }
  };
  $('share-import').onclick = () => $('share-file').click();
  $('share-file').onchange = async event => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      if (file.size > 2000000) throw new Error('설정 파일은 2MB까지 불러올 수 있습니다.');
      restoreCubeSettingsShare(JSON.parse(await file.text()));
      message.textContent = '공유 설정을 불러왔습니다. 시뮬레이터는 정지 상태입니다.';
    } catch (error) { report(error); }
    finally { event.target.value = ''; }
  };
  const restoreLink = () => {
    if (!location.hash.startsWith('#share=')) return;
    try {
      restoreCubeSettingsShare(decodeCubeSettingsShare(location.hash.slice(7)));
      message.textContent = '링크의 설정을 불러왔습니다. 시뮬레이터는 정지 상태입니다.';
    } catch (error) { report(error); }
  };
  window.addEventListener('hashchange', restoreLink);
  restoreLink();
}
