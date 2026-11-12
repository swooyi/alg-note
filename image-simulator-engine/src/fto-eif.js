import { FACE_NORMALS, STICKERS, parseNotation, applyTokens, invertTokens, identityState, formatToken } from './fto-engine.js';

const eifDot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);
const eifCross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const eifUnit = v => v.map(x => x / Math.hypot(...v));
export const ftoIdentityFrame = () => ({ mode: 'CIF', matrix: [[1,0,0],[0,1,0],[0,0,1]], faces: Object.fromEntries(Object.keys(FACE_NORMALS).map(f => [f,f])) });
export const ftoTransform = (matrix, point) => matrix.map(row => eifDot(row, point));
const eifTranspose = m => m[0].map((_, i) => m.map(row => row[i]));
const eifProduct = (a, b) => a.map(row => eifTranspose(b).map(col => eifDot(row, col)));
function eifAxes(u, f) {
  const up = eifUnit(u);
  const front = eifUnit(f.map((v, i) => v - eifDot(f, up) * up[i]));
  return [up, front, eifCross(up, front)];
}
function eifAlignment(u, f, targetU, targetF) {
  return eifProduct(eifTranspose(eifAxes(targetU, targetF)), eifAxes(u, f));
}
// EIF reached from CIF by {B,U}; R and L retain their physical faces.
const eifTilt = eifAlignment(FACE_NORMALS.B, FACE_NORMALS.U, FACE_NORMALS.U, [-1/3,-1/3,5/3]);
const eifOldFaces = { U:'B', F:'U', D:'F', B:'D', R:'R', L:'L', BR:'BR', BL:'BL' };
export const EIF_NORMALS = Object.fromEntries(Object.entries(eifOldFaces).map(([f, old]) => [f, ftoTransform(eifTilt, FACE_NORMALS[old])]));

export function ftoReorient(frame, top, front) {
  const u = FACE_NORMALS[frame.faces[top]], f = FACE_NORMALS[frame.faces[front]];
  if (top === front || eifDot(u, f) === -3) throw new Error(`불가능한 시점변환: {${top},${front}}`);
  const mode = eifDot(u, f) > 0 ? 'EIF' : 'CIF';
  const normals = mode === 'EIF' ? EIF_NORMALS : FACE_NORMALS;
  const matrix = eifAlignment(u, f, normals.U, normals.F);
  const faces = Object.fromEntries(Object.entries(normals).map(([label, normal]) => {
    const physical = Object.keys(FACE_NORMALS).find(face => ftoTransform(matrix, FACE_NORMALS[face]).every((v,i) => Math.abs(v-normal[i]) < 1e-7));
    if (!physical) throw new Error('시점변환 면 대응 오류');
    return [label, physical];
  }));
  return { mode, matrix, faces };
}

export function compileFtoSimulation(input, initialFrame = ftoIdentityFrame()) {
  input = input.replace(/B[rl]/g, face => face.toUpperCase());
  let frame = initialFrame, position = 0;
  const steps = [], ranges = [];
  // Keep original offsets, including comments and whitespace, for input highlighting.
  const pattern = /\/\/[^\n]*|\{[^}]*\}|\s+|[()[\],/]|[SHI]w?(?:2['’′]?|['’′]2?)?-?|(?:BLw|BRw|[UFLRBD]w|[UFRL]s|BL|BR|[UFLRBD]|T)(?:2['’′]?|['’′]2?)?|\./gy;
  while (position < input.length) {
    if (input[position] === '[') {
      let depth = 1, braces = 0, end = position + 1, separator = -1;
      for (; end < input.length && depth; end++) {
        const char = input[end];
        if (char === '{') braces++;
        else if (char === '}') braces--;
        else if (!braces && char === '[') depth++;
        else if (!braces && char === ']') depth--;
        else if (!braces && depth === 1 && (char === ':' || char === ',')) {
          if (separator !== -1) throw new Error('대괄호 안의 구분 기호를 확인하세요.');
          separator = end;
        }
      }
      if (depth) throw new Error('닫는 대괄호가 없습니다.');
      const close = end - 1;
      const part = (start, finish) => {
        const plan = compileFtoSimulation(input.slice(start, finish), frame);
        return {
          ...plan,
          steps: plan.steps.map(step => ({ ...step, start: step.start + start, end: step.end + start })),
          ranges: plan.ranges.map(range => ({ ...range, start: range.start + start, end: range.end + start })),
        };
      };
      const left = part(position + 1, separator === -1 ? close : separator);
      if (separator === -1) {
        steps.push(...left.steps);
        ranges.push({start:position,end:position+1,mode:frame.mode}, ...left.ranges, {start:close,end,mode:left.frame.mode});
        frame = left.frame;
      } else {
        const right = part(separator + 1, close);
        if ([...left.steps, ...right.steps].some(step => !step.physical)) throw new Error('대괄호 안의 면 시점변환은 아직 지원하지 않습니다.');
        const inverse = plan => [...plan.steps].reverse().map(step => ({ ...step, physical: invertTokens([step.physical])[0] }));
        steps.push(...left.steps, ...right.steps, ...inverse(left));
        if (input[separator] === ',') steps.push(...inverse(right));
        ranges.push({start:position,end:position+1,mode:frame.mode}, ...left.ranges,
          {start:separator,end:separator+1,mode:frame.mode}, ...right.ranges, {start:close,end,mode:frame.mode});
      }
      position = end;
      continue;
    }
    pattern.lastIndex = position;
    const match = pattern.exec(input);
    if (!match) throw new Error(`지원하지 않는 표기: ${input.slice(position).split(/\s/)[0]}`);
    const text = match[0], start = position;
    position = pattern.lastIndex;
    const pair = text.match(/^\{\s*(BL|BR|[UFLRBD])\s*,\s*(BL|BR|[UFLRBD])\s*\}$/);
    if (pair) {
      const after = ftoReorient(frame, pair[1], pair[2]);
      steps.push({ text, start, end: position, before: frame, after, physical: null });
      frame = after;
    } else if (!/^(?:\s|[()[\],/])/.test(text)) {
      for (const token of parseNotation(text, true)) {
        const face = token.move.replace(/[wso]$/, '');
        let physical = token;
        if (face in frame.faces) physical = { ...token, move: frame.faces[face] + token.move.slice(face.length) };
        if (token.move === 'T' && frame.mode === 'EIF') throw new Error('EIF에서는 T 대신 {면,면} 시점변환을 입력해 주세요.');
        const axis = token.move === 'T' ? ftoTransform(eifTranspose(frame.matrix), [0,0,1]) : null;
        steps.push({ text: formatToken(token), start, end: position, before: frame, after: frame, physical, vertexAxis: axis });
      }
    }
    ranges.push({ start, end: position, mode: frame.mode });
  }
  return { steps, ranges, frame };
}

export function applyFtoSimulationStep(values, step, inverse = false) {
  if (!step.physical) return { ...values };
  const token = inverse ? invertTokens([step.physical])[0] : step.physical;
  if (token.move !== 'T' || step.vertexAxis.every((v,i) => Math.abs(v-[0,0,1][i]) < 1e-7)) return applyTokens(values, [token]);
  const axis = step.vertexAxis;
  const turns = token.suffix.includes('2') ? 2 : token.suffix === "'" ? 3 : 1;
  const turn = p => p.map((_,i) => Math.round(axis[i]*eifDot(axis,p)-eifCross(axis,p)[i]));
  const result = {};
  for (const sticker of STICKERS) {
    let p = sticker.position, n = sticker.normal;
    for (let i=0; i<turns; i++) { p=turn(p); n=turn(n); }
    const destination = STICKERS.find(s => s.position.every((v,i) => v===p[i]) && s.normal.every((v,i) => v===n[i]));
    result[destination.id] = values[sticker.id];
  }
  return result;
}

export function ftoSimulationState(plan, index, mode = 'setup', initial = identityState()) {
  let values = { ...initial };
  if (mode === 'alg') for (const step of [...plan.steps].reverse()) values = applyFtoSimulationStep(values, step, true);
  for (const step of plan.steps.slice(0,index)) values = applyFtoSimulationStep(values, step);
  return { values, frame: index ? plan.steps[index-1].after : ftoIdentityFrame() };
}

// Express a resolved physical step in the legacy CIF engine's vocabulary.
export function parseFtoImageNotation(input) {
  return /\{[^}]*,/.test(input) ? compileFtoSimulation(input).steps.flatMap(ftoPhysicalTokens) : parseNotation(input);
}

export function ftoPhysicalTokens(step) {
  if (!step.physical) return [];
  if (step.physical.move !== 'T') return [step.physical];
  const axis = step.vertexAxis;
  const dimension = axis.findIndex(v => Math.abs(v) > 0.5);
  const token = axis[dimension] < 0 ? invertTokens([step.physical])[0] : step.physical;
  if (dimension === 2) return [token];
  const orientation = {move:'Uo', suffix:dimension === 0 ? '' : "'"};
  return [orientation, token, ...invertTokens([orientation])];
}

export function ftoFrameRotation(before, after) {
  const m = eifProduct(after.matrix, eifTranspose(before.matrix));
  const angle = Math.acos(Math.max(-1, Math.min(1, (m[0][0]+m[1][1]+m[2][2]-1)/2)));
  if (angle < 1e-7) return { axis:[0,0,1], angle:0 };
  if (Math.PI-angle < 1e-7) {
    const i = [0,1,2].reduce((a,b) => m[a][a] > m[b][b] ? a : b);
    const axis = [0,0,0]; axis[i] = Math.sqrt((m[i][i]+1)/2);
    for (let j=0;j<3;j++) if (j!==i) axis[j]=(m[i][j]+m[j][i])/(4*axis[i]);
    return {axis, angle};
  }
  return {axis:eifUnit([m[2][1]-m[1][2],m[0][2]-m[2][0],m[1][0]-m[0][1]]), angle};
}
