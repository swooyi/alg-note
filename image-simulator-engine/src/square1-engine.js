export const SQUARE1_COLORS = Object.freeze({ U: '#4a4d52', D: '#ffffff', F: '#dc3535', R: '#37a85b', B: '#f19a38', L: '#3178d5' });

export function solvedSquare1() {
  return { poses: Object.fromEntries(SQUARE1_PIECES.map(piece => [piece.id, [1,0,0, 0,1,0, 0,0,1]])), middle: 0 };
}

export function copySquare1(state) {
  return { poses: Object.fromEntries(Object.entries(state.poses).map(([id, pose]) => [id, [...pose]])), middle: state.middle };
}

function coordinate(value, offset) {
  if (!Number.isInteger(value) || value < -5 || value > 6) throw new Error(`${offset + 1}번째 문자 부근: 회전량은 -5~6이어야 합니다.`);
  return value;
}

export function parseSquare1(text) {
  const moves = [];
  let i = 0;
  const skip = () => { while (/\s/.test(text[i] || '')) i++; };
  const number = () => {
    skip();
    const offset = i;
    const match = text.slice(i).match(/^-?\d+/);
    if (!match) throw new Error(`${i + 1}번째 문자 부근: 회전량을 입력하세요.`);
    i += match[0].length;
    return coordinate(Number(match[0]), offset);
  };
  while (i < text.length) {
    skip();
    if (i >= text.length) break;
    if (text[i] === '/') { moves.push({ type: 'slash' }); i++; continue; }
    const offset = i;
    const explicit = text[i] === '(';
    if (explicit) i++;
    let top, bottom;
    if (explicit) {
      top = number(); skip();
      if (text[i] !== ',') throw new Error(`${i + 1}번째 문자 부근: 쉼표가 필요합니다.`);
      i++; bottom = number(); skip();
      if (text[i] !== ')') throw new Error(`${i + 1}번째 문자 부근: 닫는 괄호가 필요합니다.`);
      i++;
    } else {
      const start = i;
      const first = text.slice(i).match(/^-?[0-6]/);
      if (!first || first[0] === '-0' || first[0] === '-6') throw new Error(`${i + 1}번째 문자 부근: 축약 회전량을 확인하세요.`);
      top = Number(first[0]); i += first[0].length;
      skip();
      if (text[i] === ',') i++;
      skip();
      const second = text.slice(i).match(/^-?[0-6]/);
      if (!second || second[0] === '-0' || second[0] === '-6') throw new Error(`${i + 1}번째 문자 부근: 두 번째 회전량을 확인하세요.`);
      bottom = Number(second[0]); i += second[0].length;
      if (/\d/.test(text[i] || '')) throw new Error(`${start + 1}번째 문자 부근: 축약 표기는 회전량마다 한 자리 숫자를 사용합니다.`);
    }
    if (top === 0 && bottom === 0) throw new Error(`${offset + 1}번째 문자 부근: (0,0)은 사용할 수 없습니다.`);
    moves.push({ type: 'turn', top, bottom });
    skip();
    if (i < text.length && text[i] !== '/' && text[i] !== '(' && !/[-0-6]/.test(text[i])) {
      throw new Error(`${i + 1}번째 문자 부근: 알 수 없는 기호입니다.`);
    }
  }
  return moves;
}

export function formatSquare1(moves) {
  return moves.map(move => move.type === 'slash' ? '/' : `(${move.top},${move.bottom})`).join(' ');
}

export function invertSquare1(moves) {
  return moves.slice().reverse().map(move => move.type === 'slash' ? { type: 'slash' } : { type: 'turn', top: -move.top === -6 ? 6 : -move.top, bottom: -move.bottom === -6 ? 6 : -move.bottom });
}

export function applySquare1Move(state, move) {
  if (move.type === 'slash' && !canSliceSquare1(state)) throw new Error('이 상태에서는 / 회전을 할 수 없습니다. 코너가 절단면을 가로지릅니다.');
  const next = { poses: square1MovePoses(state, move, 1), middle: state.middle ^ (move.type === 'slash' ? 1 : 0) };
  return next;
}

export function square1States(moves, initial = solvedSquare1()) {
  const states = [copySquare1(initial)];
  for (let index = 0; index < moves.length; index++) {
    try { states.push(applySquare1Move(states.at(-1), moves[index])); }
    catch (error) { throw new Error(`${index + 1}번째 수: ${error.message}`); }
  }
  return states;
}

// x: right, y: up, z: front. Top clockwise is a negative rotation about +y;
// bottom clockwise is positive. The slice meets F on the left of its centre.
export const SQUARE1_HEIGHT = 1 / Math.cos(Math.PI / 12);
export const SQUARE1_LAYER_HEIGHT = SQUARE1_HEIGHT / 3;
export const SQUARE1_SLICE_AXIS = [Math.cos(Math.PI / 12), 0, Math.sin(Math.PI / 12)];
export const sqDot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
export const sqTransform = (matrix, point) => [0,1,2].map(row => sqDot(matrix.slice(row * 3, row * 3 + 3), point));
const sqMean = points => [0,1,2].map(i => points.reduce((sum, point) => sum + point[i], 0) / points.length);
const sqClean = value => Math.round(value * 1e12) / 1e12;
export function sqRotation(axis, angle) {
  const [x,y,z] = axis, c = Math.cos(angle), s = Math.sin(angle), t = 1 - c;
  return [t*x*x+c,t*x*y-s*z,t*x*z+s*y, t*x*y+s*z,t*y*y+c,t*y*z-s*x, t*x*z-s*y,t*y*z+s*x,t*z*z+c];
}
function sqMultiply(a, b) {
  return Array.from({ length: 9 }, (_, index) => {
    const row = Math.floor(index / 3), col = index % 3;
    return sqClean(a[row*3]*b[col] + a[row*3+1]*b[col+3] + a[row*3+2]*b[col+6]);
  });
}
function sqBoundary(angle) {
  const c = Math.cos(angle), s = Math.sin(angle), radius = .5 / Math.max(Math.abs(c), Math.abs(s));
  return [radius * c, radius * s];
}
function sqWedge(start, end) {
  const angles = [start, end];
  for (let i = -4; i < 8; i++) {
    const angle = Math.PI / 4 + i * Math.PI / 2;
    if (angle > start + 1e-8 && angle < end - 1e-8) angles.push(angle);
  }
  return [[0,0], ...angles.sort((a,b) => a-b).map(sqBoundary)];
}
function sqPrism(id, outline, low, high, cap) {
  const faces = [
    { points: outline.map(([x,z]) => [x,high,z]), normal: [0,1,0], sticker: cap === 'U' ? 'U' : null },
    { points: outline.map(([x,z]) => [x,low,z]), normal: [0,-1,0], sticker: cap === 'D' ? 'D' : null }
  ];
  outline.forEach(([x,z], index) => {
    const [xx,zz] = outline[(index+1) % outline.length];
    const length = Math.hypot(xx-x,zz-z);
    const sticker = Math.abs(x-.5)<1e-8 && Math.abs(xx-.5)<1e-8 ? 'R' :
      Math.abs(x+.5)<1e-8 && Math.abs(xx+.5)<1e-8 ? 'L' :
      Math.abs(z-.5)<1e-8 && Math.abs(zz-.5)<1e-8 ? 'F' :
      Math.abs(z+.5)<1e-8 && Math.abs(zz+.5)<1e-8 ? 'B' : null;
    faces.push({ points: [[x,low,z],[xx,low,zz],[xx,high,zz],[x,high,z]], normal: [(zz-z)/length,0,-(xx-x)/length], sticker });
  });
  return { id, kind: cap ? (id[1] === 'C' ? 'corner' : 'edge') : 'middle', center: sqMean(faces[0].points).map((v,i) => i === 1 ? (low+high)/2 : v), faces };
}
function sqPieces() {
  const pieces = [], h = SQUARE1_HEIGHT / 2, inner = h / 3;
  for (const layer of ['U','D']) {
    const low = layer === 'U' ? inner : -h, high = layer === 'U' ? h : -inner;
    for (let i = 0; i < 4; i++) {
      const corner = -Math.PI/4 + i*Math.PI/2, edge = i*Math.PI/2;
      pieces.push(sqPrism(`${layer}C${i}`, sqWedge(corner-Math.PI/6, corner+Math.PI/6), low, high, layer));
      pieces.push(sqPrism(`${layer}E${i}`, sqWedge(edge-Math.PI/12, edge+Math.PI/12), low, high, layer));
    }
  }
  const cut = .5 * Math.tan(Math.PI/12);
  pieces.push(sqPrism('ML', [[-.5,-.5],[cut,-.5],[-cut,.5],[-.5,.5]], -inner, inner, null));
  pieces.push(sqPrism('MR', [[cut,-.5],[.5,-.5],[.5,.5],[-cut,.5]], -inner, inner, null));
  return pieces;
}
export const SQUARE1_PIECES = sqPieces();

export function canSliceSquare1(state) {
  return SQUARE1_PIECES.filter(piece => piece.kind !== 'middle').every(piece => {
    const distances = piece.faces[0].points.map(point => sqDot(sqTransform(state.poses[piece.id], point), SQUARE1_SLICE_AXIS));
    return !(Math.min(...distances) < -1e-8 && Math.max(...distances) > 1e-8);
  });
}

// Used by both the discrete engine and every intermediate animation frame.
export function square1MovePoses(state, move, fraction) {
  return Object.fromEntries(SQUARE1_PIECES.map(piece => {
    const pose = state.poses[piece.id], center = sqTransform(pose, piece.center);
    let angle = 0, axis = [0,1,0];
    if (move.type === 'slash') {
      axis = SQUARE1_SLICE_AXIS;
      if (sqDot(center, axis) > 1e-8) angle = Math.PI * (move.direction || 1);
    } else if (center[1] > SQUARE1_LAYER_HEIGHT / 2 + 1e-8) angle = -move.top * Math.PI / 6;
    else if (center[1] < -SQUARE1_LAYER_HEIGHT / 2 - 1e-8) angle = move.bottom * Math.PI / 6;
    return [piece.id, angle ? sqMultiply(sqRotation(axis, angle*fraction), pose) : [...pose]];
  }));
}

export function square1Geometry(state, animation = null) {
  const poses = animation ? square1MovePoses(state, animation.move, animation.progress) : state.poses;
  return SQUARE1_PIECES.map(piece => ({ ...piece, center: sqTransform(poses[piece.id], piece.center),
    faces: piece.faces.map(face => ({ ...face, normal: sqTransform(poses[piece.id], face.normal), points: face.points.map(point => sqTransform(poses[piece.id], point)) })) }));
}

export function traceSquare1(moves, initial = solvedSquare1()) {
  const states = [copySquare1(initial)];
  for (let index = 0; index < moves.length; index++) {
    try { states.push(applySquare1Move(states.at(-1), moves[index])); }
    catch (error) { return { states, error: `${index+1}번째 수: ${error.message}`, errorIndex: index }; }
  }
  return { states, error: '', errorIndex: -1 };
}
