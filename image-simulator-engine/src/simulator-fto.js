const simCanvas = document.querySelector('#sim-canvas');
const simContext = simCanvas.getContext('2d');
const simPieces = createFtoSolids(FACE_NORMALS, STICKERS);
let simSources = identityState(), simIndex = 0, simSignature = '', simAnimation = null;
let simPlaying = false, simYaw = 0, simPitch = 0, simZoom = 1, simHits = [];
let simPointer = null;
let simViewBasis = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const simEl = id => document.getElementById(id);
let simPlan = null, simValid = false, simFrame = ftoIdentityFrame();
let simNotationPlan = null, simHighlightSignature = '';
let simCaseSources = null;
const simReady = () => simPlan ? simValid : state.valid;
const simLength = () => simPlan ? simPlan.steps.length : state.lastTokens.length;
function simRestoreState() {
  if (simPlan) {
    const current = ftoSimulationState(simPlan, simIndex, simCaseSources ? 'setup' : els.mode.value, simCaseSources || identityState());
    simSources = current.values; simFrame = current.frame;
  } else {
    simSources = applyTokens(identityState(), state.valid ? simStateTokens(simIndex) : []);
    simFrame = ftoIdentityFrame();
  }
}

function simPlaybackTokens() {
  return els.mode.value === 'alg' ? invertTokens(state.lastTokens) : state.lastTokens;
}
function simStateTokens(index) {
  const prefix = simPlaybackTokens().slice(0, index);
  return els.mode.value === 'alg' ? [...state.lastTokens, ...prefix] : prefix;
}
function simulatorRefresh() {
  simPlan = null; simValid = false;
  if (/\{[^}]*,/.test(els.notation.value)) {
    try {
      simPlan = compileFtoSimulation(els.notation.value); simValid = true;
      els.notation.setAttribute('aria-invalid', 'false');
    } catch (error) {
      simEl('notation-error').textContent = error.message;
    }
  }
  try { simNotationPlan = simPlan || compileFtoSimulation(els.notation.value); }
  catch { simNotationPlan = null; }
  const signature = JSON.stringify([simPlan ? els.notation.value : state.lastTokens, simReady(), els.mode.value]);
  if (signature !== simSignature) {
    simSignature = signature;
    simAnimation = null; simPlaying = false;
    simIndex = simReady() && els.mode.value !== 'alg' ? simLength() : 0;
  }
  simRestoreState();
  simDraw();
}
function simCamera(p) {
  p = ftoTransform(simFrame.matrix, p);
  if (simAnimation?.frameTurn) p = rotateFtoPoint(p, simAnimation.axis, simAnimation.angle);
  const oriented = p.map((_, i) => p.reduce((sum, value, j) => sum + value * simViewBasis[j][i], 0));
  const cif = rotateFtoPoint(oriented, [0, 0, 1], Math.PI / 4);
  return rotateFtoPoint(rotateFtoPoint(cif, [0, 1, 0], simYaw), [1, 0, 0], simPitch);
}
function simRoundedPath(points, radius) {
  const path = new Path2D();
  points.forEach((point, i) => {
    const before = points[(i + points.length - 1) % points.length];
    const after = points[(i + 1) % points.length];
    const left = Math.hypot(before[0]-point[0], before[1]-point[1]);
    const right = Math.hypot(after[0]-point[0], after[1]-point[1]);
    const r = Math.min(radius, left*0.18, right*0.18);
    const entry = point.map((v, k) => v + (before[k]-v)*r/(left || 1));
    const exit = point.map((v, k) => v + (after[k]-v)*r/(right || 1));
    if (i === 0) path.moveTo(...entry); else path.lineTo(...entry);
    path.quadraticCurveTo(...point, ...exit);
  });
  path.closePath();
  return path;
}
function simDraw() {
  simHighlightNotation(false);
  const width = simCanvas.clientWidth, height = simCanvas.clientHeight, ratio = window.devicePixelRatio || 1;
  if (simCanvas.width !== Math.round(width*ratio) || simCanvas.height !== Math.round(height*ratio)) {
    simCanvas.width = Math.round(width*ratio); simCanvas.height = Math.round(height*ratio);
  }
  simContext.setTransform(ratio, 0, 0, ratio, 0, 0);
  simContext.clearRect(0, 0, width, height);
  const scale = Math.min(width, height) / 23 * simZoom;
  const polygons = [];
  for (const piece of simPieces) {
    const moving = simAnimation && !simAnimation.frameTurn && simAnimation.token.move !== '.' && (simAnimation.whole || ftoPieceMoves(piece.center, simAnimation.token.move, FACE_NORMALS));
    const transform = p => simCamera(moving ? rotateFtoPoint(p, simAnimation.axis, simAnimation.angle) : p);
    for (const face of piece.faces) {
      const normal = transform(face.normal);
      if (normal[2] <= 1e-7) continue;
      const points = face.points.map(p => transform(p.map((v, i) => piece.center[i] + (v-piece.center[i])*0.985)));
      polygons.push({ face, normal, depth: solidMean(points)[2], points: points.map(p => [width/2 + p[0]*scale, height/2 - p[1]*scale]) });
    }
  }
  polygons.sort((a, b) => a.depth - b.depth);
  simHits = [];
  for (const {face, points} of polygons) {
    const path = simRoundedPath(points, scale*0.16);
    const source = simSources[face.sticker];
    simContext.fillStyle = face.sticker ? state.baseColors[source] : '#20242b';
    simContext.fill(path);
    simContext.strokeStyle = '#30353d'; simContext.lineWidth = 1.15;
    simContext.lineJoin = 'round'; simContext.lineCap = 'round'; simContext.stroke(path);
    // Include dark internal faces so hidden stickers cannot be clicked through them.
    simHits.push({path, source});
    const idLabel = els.showLabels.checked && face.sticker;
    const marking = els.showStickerText.checked && state.stickerTexts[source];
    if (idLabel || marking) {
      const center = solidMean(points).slice(0, 2);
      simContext.font = `bold ${idLabel && marking ? 11 : 13}px Arial, "Segoe UI Emoji", sans-serif`;
      simContext.textAlign = 'center'; simContext.textBaseline = 'middle';
      for (const [label, offset] of [[idLabel, marking ? -7 : 0], [marking, idLabel ? 7 : 0]]) {
        if (!label) continue;
        simContext.lineWidth = 3; simContext.strokeStyle = '#ffffff'; simContext.strokeText(label, center[0], center[1] + offset, scale * 2.2);
        simContext.fillStyle = '#111827'; simContext.fillText(label, center[0], center[1] + offset, scale * 2.2);
      }
    }
  }
  if (els.showFaceSymbols.checked) {
    const symbolScale = Number(els.faceSymbolSize.value || 100) / 100;
    for (const [face, physical] of Object.entries(simFrame.faces)) {
      const normal = FACE_NORMALS[physical];
      if (simCamera(normal)[2] <= 1e-7) continue;
      const point = simCamera(normal.map(value => value * 3));
      const x = width/2 + point[0]*scale, y = height/2 - point[1]*scale;
      const badgeWidth = (face.length > 1 ? 29 : 23) * symbolScale;
      const badgeHeight = 22 * symbolScale;
      simContext.fillStyle = simFrame.mode === 'EIF' ? '#1479c9' : '#172936'; simContext.strokeStyle = '#f4fbff'; simContext.lineWidth = 1.5 * symbolScale;
      simContext.beginPath(); simContext.roundRect(x-badgeWidth/2, y-badgeHeight/2, badgeWidth, badgeHeight, 5 * symbolScale); simContext.fill(); simContext.stroke();
      simContext.fillStyle = '#fff'; simContext.font = `bold ${13 * symbolScale}px sans-serif`; simContext.textAlign = 'center'; simContext.textBaseline = 'middle';
      simContext.fillText(face, x, y);
    }
  }
  simEl('sim-progress').textContent = simReady() ? `${simIndex} / ${simLength()} 단계 · ${simFrame.mode}${simAnimation ? (simAnimation.token.move === '.' && !simAnimation.frameTurn ? ' · 대기 중' : ' · 회전 중') : ''}` : '공식 입력을 확인하세요';
  const playButton = simEl('sim-play');
  playButton.setAttribute('data-playing', String(simPlaying));
  playButton.setAttribute('aria-label', simPlaying ? '일시정지' : '자동 재생');
  playButton.title = simPlaying ? '일시정지' : '자동 재생';
  for (const id of ['sim-prev', 'sim-next', 'sim-start', 'sim-end']) simEl(id).disabled = !!simAnimation || !simReady();
  simEl('sim-prev').disabled ||= simIndex === 0;
  simEl('sim-next').disabled ||= simIndex === simLength();
  simEl('sim-play').disabled = !simReady() || !simLength();
  for (const button of simEl('sim-moves').querySelectorAll('button')) button.disabled = !!simAnimation || simPlaying || !simReady();
}
function simDuration(id, fallback, min, max) {
  const value = Number(simEl(id).value);
  return Number.isFinite(value) && value >= min ? Math.min(max, value) : fallback;
}
function simTokenAngle(token) {
  if (token.move === '.') return 0;
  const direction = token.suffix.includes("'") ? 1 : -1;
  return direction * (token.move === 'T' ? Math.PI / 2 : Math.PI * 2 / 3) * (token.suffix.includes('2') ? 2 : 1);
}
function simPlanTurn(step, inverse, finish, notationIndex = null) {
  if (simAnimation || !simReady()) return;
  const token = step.physical ? (inverse ? invertTokens([step.physical])[0] : step.physical) : {move:'.', suffix:''};
  const target = inverse ? step.before : step.after;
  const rotation = ftoFrameRotation(simFrame, target);
  const frameTurn = !step.physical;
  const axis = frameTurn ? rotation.axis : step.vertexAxis || FACE_NORMALS[token.move.replace(/[wso]$/, '')];
  const angle = frameTurn ? rotation.angle : simTokenAngle(token);
  const animation = {token, axis, frameTurn, whole: token.move === 'T' || token.move.endsWith('o'), angle:0, notationIndex};
  simAnimation = animation;
  simDraw();
  const start = performance.now(), duration = simDuration('sim-speed',600,50,1000);
  const tick = now => {
    if (simAnimation !== animation) return;
    const t = Math.min(1,(now-start)/duration);
    animation.angle = angle*t*t*(3-2*t); simDraw();
    if (t < 1) requestAnimationFrame(tick);
    else {
      simSources = applyFtoSimulationStep(simSources, step, inverse);
      simFrame = target; simAnimation = null; finish(); simDraw();
      if (simPlaying) simNext();
    }
  };
  requestAnimationFrame(tick);
}

function simHighlightNotation(force = true) {
  const index = simAnimation ? simAnimation.notationIndex : simIndex - 1;
  const active = simReady() && !simEl('simulator-workspace').hidden && index !== null ? simNotationPlan?.steps[index] : null;
  const signature = JSON.stringify([els.notation.value, active?.start, active?.end, !!simNotationPlan]);
  if (!force && signature === simHighlightSignature) return;
  simHighlightSignature = signature;
  const backdrop = simEl('notation-highlights');
  backdrop.style.width = `${els.notation.clientWidth + 2}px`;
  backdrop.replaceChildren();
  const ranges = simNotationPlan?.ranges || [{start:0, end:els.notation.value.length, mode:'CIF'}];
  for (const range of ranges) {
    const span = document.createElement('span');
    span.textContent = els.notation.value.slice(range.start,range.end);
    span.className = [range.mode === 'EIF' ? 'notation-eif' : '', active && range.start === active.start && range.end === active.end ? 'notation-current' : ''].filter(Boolean).join(' ');
    backdrop.append(span);
  }
  // Preserve the last empty line so the two scrolling layers have equal height.
  const end = document.createElement('span'); end.textContent = '\n'; backdrop.append(end);
  backdrop.scrollTop = els.notation.scrollTop;
  backdrop.scrollLeft = els.notation.scrollLeft;
}
els.notation.addEventListener('scroll', () => {
  simEl('notation-highlights').scrollTop = els.notation.scrollTop;
  simEl('notation-highlights').scrollLeft = els.notation.scrollLeft;
});
new ResizeObserver(() => simHighlightNotation()).observe(els.notation);
function simTurn(token, finish, notationIndex = null) {
  if (simAnimation || !state.valid) return;
  const whole = token.move === 'T' || token.move.endsWith('o');
  const axis = token.move === 'T' ? [0, 0, 1] : FACE_NORMALS[token.move.replace(/[wso]$/, '')];
  const animation = {token, axis, whole, angle: 0, notationIndex}; simAnimation = animation;
  simDraw();
  const start = performance.now(), duration = simDuration('sim-speed', 600, 50, 1000);
  const angle = simTokenAngle(token);
  const tick = now => {
    if (simAnimation !== animation) return;
    const t = Math.min(1, (now-start)/duration), eased = t*t*(3-2*t);
    animation.angle = angle*eased;
    simDraw();
    if (t < 1) requestAnimationFrame(tick);
    else {
      simSources = applyTokens(simSources, [token]); simAnimation = null; finish(); simDraw();
      if (simPlaying) simNext();
    }
  };
  requestAnimationFrame(tick);
}
function simNext() {
  if (simIndex >= simLength()) { simPlaying = false; simDraw(); return; }
  if (simPlan) { simPlanTurn(simPlan.steps[simIndex], false, () => { simIndex++; }, simIndex); return; }
  simTurn(simPlaybackTokens()[simIndex], () => { simIndex++; }, simIndex);
}
simEl('sim-next').onclick = () => { simPlaying = false; simNext(); };
simEl('sim-prev').onclick = () => {
  simPlaying = false;
  if (simPlan && simIndex) { simPlanTurn(simPlan.steps[simIndex-1], true, () => { simIndex--; }, simIndex-1); return; }
  if (simIndex) simTurn(invertTokens([simPlaybackTokens()[simIndex-1]])[0], () => { simIndex--; }, simIndex-1);
};
function simSeek(index) { simPlaying = false; simAnimation = null; simIndex = index; simRestoreState(); simDraw(); }
simEl('sim-start').onclick = () => simSeek(0);
simEl('sim-end').onclick = () => simSeek(simLength());
simEl('sim-play').onclick = () => {
  if (simPlaying) { simPlaying = false; simDraw(); return; }
  if (simIndex === simLength() && !simAnimation) simSeek(0);
  simPlaying = true; if (!simAnimation) simNext(); simDraw();
};
simEl('sim-camera').onclick = () => {
  simYaw = 0; simPitch = 0; simZoom = 1;
  simViewBasis = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  simDraw();
};
{
  const id = 'sim-speed';
  const range = simEl(id + '-range'), input = simEl(id);
  range.oninput = () => { input.value = range.value; };
  input.onchange = () => {
    input.value = String(simDuration(id, 600, 50, 1000));
    range.value = input.value;
  };
}
for (const token of parseNotation("{Uo} {Uo'} {Ro} {Ro'} {Fo} {Fo'} T T' T2")) {
  const button = document.createElement('button'); button.type = 'button'; button.textContent = formatToken(token);
  button.onclick = () => {
    const axis = token.move === 'T' ? [0, 0, 1] : FACE_NORMALS[token.move.slice(0, -1)];
    const angle = (token.suffix === "'" ? 1 : -1) * (token.move === 'T' ? Math.PI / 2 * (token.suffix === '2' ? 2 : 1) : Math.PI * 2 / 3);
    simViewBasis = simViewBasis.map(vector => rotateFtoPoint(vector, axis, angle));
    simDraw();
  };
  simEl('sim-viewpoints').append(button);
}
for (const move of [...Object.keys(FACE_NORMALS), ...Object.keys(FACE_NORMALS).map(f => f+'w'), 'Us', 'Fs', 'Rs', 'Ls']) {
  for (const suffix of ['', "'"]) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = move+suffix;
    button.onclick = () => {
      if (simPlan) {
        const face = move.replace(/[ws]$/, '');
        const physical = {move:simFrame.faces[face]+move.slice(face.length), suffix};
        const step = {physical, before:simFrame, after:simFrame};
        simPlanTurn(step, false, () => {
          if (els.mode.value === 'setup') {
            els.notation.value = [...simPlan.steps.slice(0,simIndex).map(s => s.text), move+suffix].join(' ');
          } else {
            // A manual turn creates a new Alg case, as in the existing CIF controls.
            const full = simPlan.steps.flatMap(ftoPhysicalTokens);
            const prefix = simPlan.steps.slice(0,simIndex).flatMap(ftoPhysicalTokens);
            els.notation.value = invertTokens([...invertTokens(full), ...prefix, physical]).map(formatToken).join(' ');
          }
          updateAndRecord();
        });
        return;
      }
      simTurn({move, suffix}, () => {
        const tokens = [...simStateTokens(simIndex), {move, suffix}];
        els.notation.value = (els.mode.value === 'alg' ? invertTokens(tokens) : tokens).map(formatToken).join(' ');
        updateAndRecord();
      });
    };
    simEl('sim-moves').append(button);
  }
}
simCanvas.onpointerdown = event => {
  simPointer = {x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false};
  simCanvas.setPointerCapture(event.pointerId);
};
simCanvas.onpointermove = event => {
  if (!simPointer) return;
  if (Math.hypot(event.clientX-simPointer.startX, event.clientY-simPointer.startY) > 4) simPointer.moved = true;
  if (simPointer.moved) {
    simYaw += (event.clientX-simPointer.x)*0.008; simPitch += (event.clientY-simPointer.y)*0.008;
    simDraw();
  }
  simPointer.x = event.clientX; simPointer.y = event.clientY;
};
simCanvas.onpointerup = event => {
  if (simPointer && !simPointer.moved && (els.markStickers.checked || simEl('sim-paint').checked) && !simAnimation && !simPlaying && simReady()) {
    const rect = simCanvas.getBoundingClientRect(), ratio = window.devicePixelRatio || 1;
    const hit = [...simHits].reverse().find(h => simContext.isPointInPath(h.path, (event.clientX-rect.left)*ratio, (event.clientY-rect.top)*ratio));
    if (hit?.source && els.markStickers.checked) {
      const marking = window.prompt('스티커 마킹 (비우면 삭제)', state.stickerTexts[hit.source] || '');
      if (marking !== null) {
        const value = Array.from(marking.trim()).slice(0, 20).join('');
        if (!value) delete state.stickerTexts[hit.source];
        else state.stickerTexts[hit.source] = value;
        syncStickerTextInput(); updateAndRecord();
      }
    } else if (hit?.source) {state.baseColors[hit.source] = state.selectedColor; state.colorLayoutOrigin = null; updateAndRecord();}
  }
  simPointer = null;
};
simCanvas.onpointercancel = () => {simPointer = null;};
simCanvas.addEventListener('wheel', event => {event.preventDefault(); simZoom = Math.max(0.5, Math.min(2, simZoom*Math.exp(-event.deltaY*0.001))); simDraw();}, {passive:false});
new ResizeObserver(() => {if (state.colors) simDraw();}).observe(simCanvas);
