import { SQUARE1_COLORS, solvedSquare1, parseSquare1, formatSquare1, invertSquare1, traceSquare1 } from './square1-engine.js';
import { square1Svg, square1ViewSize, SQUARE1_CAMERA } from './square1-render.js';

const $ = id => document.getElementById(id);
const labels = { U: 'U · 어두운 회색', D: 'D · 흰색', F: 'F · 빨강', R: 'R · 초록', B: 'B · 주황', L: 'L · 파랑' };
const colors = { ...SQUARE1_COLORS }, camera = { ...SQUARE1_CAMERA };
let moves = [], states = [solvedSquare1()], simIndex = 0, valid = true, errorIndex = -1;
let batches = [], view = '3d', playing = false, animation = null, frame = 0, saving = false;
const limit = () => states.length - 1;
const selectedState = () => $('input-mode').value === 'alg' ? states[0] : states.at(-1);
const screenSvg = state => square1Svg(state, colors, view, { camera });
const duration = () => Math.max(100, Math.min(3000, Number($('sim-speed').value) || 600));

window.AlgNoteImageEngine = {
  capture() {
    if (animation) throw new Error('현재 회전이 끝난 뒤 다시 반영해 주세요.');
    return {
      schemaVersion: 1, puzzle: 'SQ1',
      notation: $('notation').value, mode: $('input-mode').value,
      colors: { ...colors }, camera: { ...camera }, view, simIndex,
      tab: tabs.find(tab => $(`tab-${tab}`).getAttribute('aria-selected') === 'true'),
    };
  },
  restore(data) {
    if (!data || data.schemaVersion !== 1 || data.puzzle !== 'SQ1' ||
        typeof data.notation !== 'string' || !['setup', 'alg'].includes(data.mode) ||
        !['3d', 'vertical', 'horizontal'].includes(data.view) || !tabs.includes(data.tab) ||
        !Number.isInteger(data.simIndex) || data.simIndex < 0 ||
        !Object.keys(colors).every(face => /^#[\da-f]{6}$/i.test(data.colors?.[face])) ||
        !['yaw', 'pitch', 'zoom'].every(key => Number.isFinite(data.camera?.[key])) ||
        data.camera.zoom < .55 || data.camera.zoom > 1.25) {
      throw new Error('지원하지 않거나 손상된 Square-1 이미지 설정입니다.');
    }
    cancelPlayback();
    Object.assign(colors, data.colors);
    Object.assign(camera, data.camera);
    $('notation').value = data.notation;
    $('input-mode').value = data.mode;
    [...$('color-grid').querySelectorAll('input')].forEach((input, index) => {
      input.value = colors[Object.keys(labels)[index]];
    });
    view = data.view;
    document.querySelectorAll('[data-view]').forEach(control => control.setAttribute('aria-pressed', String(control.dataset.view === view)));
    $('preview-camera-reset').disabled = view !== '3d';
    invalidateBatches();
    renderInput();
    seek(data.simIndex);
    selectTab(data.tab);
  },
};

function cancelPlayback() {
  cancelAnimationFrame(frame); playing = false; animation = null;
}
function pausePlayback() {
  cancelAnimationFrame(frame); playing = false;
  if (animation) { animation.paused = true; animation.last = null; }
  renderSim();
}
function renderSim() {
  const motion = animation ? { move: animation.move, progress: animation.progress } : null;
  $('sim-view').innerHTML = square1Svg(states[simIndex], colors, '3d', { camera, animation: motion });
  $('sim-progress').textContent = `${simIndex} / ${moves.length} 단계${animation ? animation.paused ? ' · 일시정지' : ' · 회전 중' : !valid && simIndex === limit() ? ' · 오류 직전' : ''}`;
  const playButton = $('sim-play');
  const playLabel = animation?.paused ? '계속 재생' : playing || animation ? '일시정지' : '자동 재생';
  playButton.setAttribute('data-playing', String(playLabel === '일시정지'));
  playButton.setAttribute('aria-label', playLabel);
  playButton.title = playLabel;
  $('sim-start').disabled = simIndex === 0 && !animation;
  $('sim-prev').disabled = !!animation || simIndex === 0;
  $('sim-next').disabled = !!animation || simIndex >= limit();
  $('sim-end').disabled = simIndex === limit() && !animation;
  $('sim-play').disabled = limit() === 0;
  $('sim-seek').max = String(limit()); $('sim-seek').value = String(simIndex);
  $('sim-seek').disabled = limit() === 0;
  const active = animation ? animation.moveIndex : simIndex - 1;
  $('sim-moves').querySelectorAll('button').forEach((button, index) => {
    button.classList.toggle('current', index === active);
    if (index === active) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  });
}
function drawBatchCards() {
  $('batch-list').replaceChildren();
  for (const item of batches) {
    const card = document.createElement('article'), heading = document.createElement('h3'), picture = document.createElement('div');
    heading.textContent = item.name; picture.innerHTML = screenSvg(item.state);
    card.append(heading, picture); $('batch-list').append(card);
  }
}
function refreshPictures() {
  $('single-view').innerHTML = screenSvg(selectedState());
  $('single-view').classList.toggle('interactive', view === '3d');
  $('sim-view').classList.add('interactive');
  renderSim(); drawBatchCards();
}
function renderMoves() {
  $('sim-moves').replaceChildren();
  moves.forEach((move, index) => {
    const button = document.createElement('button'); button.type = 'button';
    button.textContent = formatSquare1([move]); button.disabled = index >= limit();
    button.classList.toggle('invalid-move', index === errorIndex);
    button.title = `${index+1}번째 수`;
    button.onclick = () => seek(index+1);
    $('sim-moves').append(button);
  });
}
function renderInput() {
  cancelPlayback(); errorIndex = -1; valid = false; moves = []; states = [solvedSquare1()];
  let error = '';
  try {
    moves = parseSquare1($('notation').value);
    $('normalized').textContent = moves.length ? `인식: ${formatSquare1(moves)}` : '회전기호를 입력하면 이미지와 시뮬레이터에 적용됩니다.';
    let base = solvedSquare1();
    if ($('input-mode').value === 'alg') {
      const inverse = traceSquare1(invertSquare1(moves));
      if (inverse.error) throw new Error('Alg 케이스 생성: ' + inverse.error);
      base = inverse.states.at(-1);
    }
    const result = traceSquare1(moves, base);
    states = result.states; error = result.error; errorIndex = result.errorIndex;
    valid = !error;
  } catch (problem) {
    error = problem.message;
    if (!moves.length) $('normalized').textContent = '';
  }
  $('notation-error').textContent = error;
  $('notation-error').hidden = !error;
  $('notation').setAttribute('aria-invalid', String(!!error));
  simIndex = $('input-mode').value === 'alg' ? 0 : limit();
  $('save-svg').disabled = $('save-png').disabled = !valid || saving;
  renderMoves(); refreshPictures();
}
function seek(index) {
  cancelPlayback(); simIndex = Math.max(0, Math.min(limit(), index)); renderSim();
}
function tick(now) {
  if (!animation || animation.paused) return;
  if (animation.last !== null) animation.elapsed += now - animation.last;
  animation.last = now;
  const t = Math.min(1, animation.elapsed / animation.duration);
  animation.progress = t*t*(3-2*t);
  if (t === 1) {
    simIndex = animation.target; animation = null;
    if (playing && simIndex < limit()) { step(1); return; }
    playing = false;
  }
  renderSim();
  if (animation) frame = requestAnimationFrame(tick);
}
function step(direction) {
  if (animation || simIndex+direction < 0 || simIndex+direction > limit()) return;
  const moveIndex = direction > 0 ? simIndex : simIndex-1, original = moves[moveIndex];
  const move = direction > 0 ? original : original.type === 'slash' ? { type: 'slash', direction: -1 } : { type: 'turn', top: -original.top, bottom: -original.bottom };
  animation = { move, moveIndex, target: simIndex+direction, elapsed: 0, last: null, progress: 0, duration: duration(), paused: false };
  renderSim(); frame = requestAnimationFrame(tick);
}
function filename(raw, extension) {
  const clean = (raw || 'square1').replace(/[\\/:*?"<>|]/g, '-').trim() || 'square1';
  return `${clean}.${extension}`;
}
function download(blob, name) {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
async function save(state, name, format) {
  const svg = screenSvg(state);
  if (format === 'svg') { download(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), filename(name, 'svg')); return; }
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('이미지를 읽지 못했습니다.')); image.src = url; });
    const [width,height] = square1ViewSize(view), ratio = 1600 / Math.max(width,height);
    const canvas = document.createElement('canvas'); canvas.width = Math.round(width*ratio); canvas.height = Math.round(height*ratio);
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('PNG 생성에 실패했습니다.');
    download(blob, filename(name, 'png'));
  } finally { URL.revokeObjectURL(url); }
}
function parseBatches() {
  const parsed = JSON.parse($('batch-json').value);
  if (!Array.isArray(parsed) || !parsed.length) throw new Error('하나 이상의 항목이 있는 JSON 배열을 입력하세요.');
  return parsed.map((item, index) => {
    if (!item || typeof item.scramble !== 'string') throw new Error(`${index+1}번째 항목에 scramble 문자열이 필요합니다.`);
    const steps = parseSquare1(item.scramble);
    let base = solvedSquare1();
    if ($('input-mode').value === 'alg') {
      const inverse = traceSquare1(invertSquare1(steps));
      if (inverse.error) throw new Error(`${index+1}번째 항목: ${inverse.error}`);
      base = inverse.states.at(-1);
    }
    const result = traceSquare1(steps, base);
    if (result.error) throw new Error(`${index+1}번째 항목: ${result.error}`);
    return { name: typeof item.filename === 'string' ? item.filename : `square1-${index+1}`, state: $('input-mode').value === 'alg' ? base : result.states.at(-1) };
  });
}
function renderBatches() {
  try { batches = parseBatches(); $('batch-status').textContent = `${batches.length}개 이미지 준비 완료`; }
  catch (error) { batches = []; $('batch-status').textContent = error.message; }
  drawBatchCards();
}
function invalidateBatches() { batches = []; drawBatchCards(); $('batch-status').textContent = ''; }
async function saveImages(format, batch = false) {
  if (saving) return;
  if (batch) renderBatches();
  if (batch ? !batches.length : !valid) return;
  saving = true;
  const saveButtons = ['save-svg','save-png','save-batch-svg','save-batch-png'];
  saveButtons.forEach(id => $(id).disabled = true);
  document.querySelectorAll('[data-view]').forEach(button => button.disabled = true);
  const items = batch ? [...batches] : [{ state: selectedState(), name: $('filename').value }];
  try {
    for (const item of items) await save(item.state, item.name, format);
    $(batch ? 'batch-status' : 'save-status').textContent = `${items.length}개 ${format.toUpperCase()} 저장 요청 완료`;
  } catch (error) { $(batch ? 'batch-status' : 'save-status').textContent = error.message; }
  finally {
    saving = false; saveButtons.forEach(id => $(id).disabled = false);
    $('save-svg').disabled = $('save-png').disabled = !valid;
    document.querySelectorAll('[data-view]').forEach(button => button.disabled = false);
  }
}
const tabs = ['single','batch','simulator'];
function selectTab(name, focus = false) {
  if (!tabs.includes(name)) name = 'single';
  if (name !== 'simulator') pausePlayback();
  tabs.forEach(tab => {
    const active = tab === name, control = $(`tab-${tab}`);
    control.setAttribute('aria-selected', String(active)); control.tabIndex = active ? 0 : -1;
    $(`${tab}-panel`).hidden = !active;
    if (active && focus) control.focus();
  });
  $('view-controls').hidden = name === 'simulator';
  renderSim();
}
tabs.forEach((tab, index) => {
  $(`tab-${tab}`).onclick = () => selectTab(tab);
  $(`tab-${tab}`).onkeydown = event => {
    const nextIndex = event.key === 'ArrowRight' ? (index+1)%3 : event.key === 'ArrowLeft' ? (index+2)%3 : event.key === 'Home' ? 0 : event.key === 'End' ? 2 : -1;
    if (nextIndex >= 0) { event.preventDefault(); selectTab(tabs[nextIndex], true); }
  };
});
for (const face of Object.keys(labels)) {
  const label = document.createElement('label'); label.textContent = labels[face];
  const picker = document.createElement('input'); picker.type = 'color'; picker.value = colors[face]; picker.setAttribute('aria-label', `${face} 색상`);
  picker.oninput = () => { colors[face] = picker.value; refreshPictures(); };
  label.append(picker); $('color-grid').append(label);
}
$('reset-colors').onclick = () => {
  Object.assign(colors, SQUARE1_COLORS);
  [...$('color-grid').querySelectorAll('input')].forEach((input, index) => input.value = colors[Object.keys(labels)[index]]);
  refreshPictures();
};
document.querySelectorAll('[data-view]').forEach(button => button.onclick = () => {
  view = button.dataset.view;
  document.querySelectorAll('[data-view]').forEach(control => control.setAttribute('aria-pressed', String(control.dataset.view === view)));
  $('preview-camera-reset').disabled = view !== '3d';
  refreshPictures();
});
function resetCamera() { Object.assign(camera, SQUARE1_CAMERA); refreshPictures(); }
$('preview-camera-reset').onclick = $('sim-camera-reset').onclick = resetCamera;
for (const id of ['single-view','sim-view']) {
  const element = $(id); let pointer = null;
  element.onpointerdown = event => {
    if (id === 'single-view' && view !== '3d') return;
    pointer = [event.clientX,event.clientY]; element.setPointerCapture(event.pointerId);
  };
  element.onpointermove = event => {
    if (!pointer) return;
    camera.yaw += (event.clientX-pointer[0])*.008;
    camera.pitch += (event.clientY-pointer[1])*.008;
    pointer = [event.clientX,event.clientY]; refreshPictures();
  };
  element.onpointerup = element.onpointercancel = element.onlostpointercapture = () => { pointer = null; };
  element.addEventListener('wheel', event => {
    if (id === 'single-view' && view !== '3d') return;
    event.preventDefault(); camera.zoom = Math.max(.55,Math.min(1.25,camera.zoom*Math.exp(-event.deltaY*.001))); refreshPictures();
  }, { passive: false });
}
$('notation').oninput = renderInput;
$('input-mode').onchange = () => { renderInput(); invalidateBatches(); };
$('clear-notation').onclick = () => { $('notation').value = ''; renderInput(); $('notation').focus(); };
$('save-svg').onclick = () => saveImages('svg');
$('save-png').onclick = () => saveImages('png');
$('preview-batch').onclick = renderBatches;
$('batch-json').oninput = invalidateBatches;
$('save-batch-svg').onclick = () => saveImages('svg', true);
$('save-batch-png').onclick = () => saveImages('png', true);
$('sim-start').onclick = () => seek(0);
$('sim-prev').onclick = () => { playing = false; step(-1); };
$('sim-next').onclick = () => { playing = false; step(1); };
$('sim-end').onclick = () => seek(limit());
$('sim-seek').oninput = () => seek(Number($('sim-seek').value));
$('sim-speed').onchange = () => { $('sim-speed').value = String(duration()); };
$('sim-play').onclick = () => {
  if (animation && !animation.paused || playing) { pausePlayback(); return; }
  playing = true;
  if (animation?.paused) { animation.paused = false; animation.last = null; frame = requestAnimationFrame(tick); renderSim(); }
  else { if (simIndex >= limit()) simIndex = 0; step(1); }
};
renderInput();
selectTab(location.hash.slice(1));
