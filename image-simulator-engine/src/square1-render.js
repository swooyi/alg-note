import { SQUARE1_COLORS, square1Geometry, sqTransform, sqRotation } from './square1-engine.js';

export const SQUARE1_CAMERA = Object.freeze({ yaw: -.6, pitch: .5, zoom: 1 });
export const square1ViewSize = view => view === 'vertical' ? [320,620] : view === 'horizontal' ? [620,320] : [600,500];
const sqPoints = points => points.map(point => point.map(value => value.toFixed(3)).join(',')).join(' ');
const sqPolygon = (points, fill, attributes = '') => `<polygon points="${sqPoints(points)}" fill="${fill}" ${attributes}/>`;
const sqInset = (points, amount) => {
  const center = points[0].map((_,i) => points.reduce((sum, point) => sum+point[i],0)/points.length);
  return points.map(point => point.map((value,i) => center[i]+(value-center[i])*amount));
};
const sqCapPoints = points => {
  // Clip the sticker tips to leave the small central clearance.
  const index = points.findIndex(p => Math.hypot(p[0],p[2]) < 1e-7);
  if (index < 0) return points;
  const tip = points[index], previous = points[(index+points.length-1)%points.length], next = points[(index+1)%points.length];
  const toward = point => tip.map((value,i) => value+(point[i]-value)*.055);
  return [...points.slice(0,index), toward(previous), toward(next), ...points.slice(index+1)];
};

function sqFlat(state, colors, view) {
  const vertical = view === 'vertical', centers = vertical ? [[160,155],[160,465]] : [[155,160],[465,160]];
  const geometry = square1Geometry(state);
  const extent = Math.max(...geometry.filter(piece => piece.kind !== 'middle').flatMap(piece => piece.faces[0].points.flatMap(point => [Math.abs(point[0]),Math.abs(point[2])])));
  const scale = Math.min(196, 140 / (extent * 1.25));
  let svg = '';
  for (let layer = 0; layer < 2; layer++) {
    const sign = layer === 0 ? 1 : -1, [cx,cy] = centers[layer];
    // D is viewed from below: F lies at the top of this diagram.
    const project = point => [cx+point[0]*scale, cy+point[2]*sign*scale];
    for (const piece of geometry.filter(piece => piece.kind !== 'middle' && piece.center[1]*sign > 0)) {
      const cap = piece.faces.find(face => face.normal[1]*sign > .999);
      const capY = cap.points[0][1];
      for (const face of piece.faces.filter(face => face.sticker && Math.abs(face.normal[1]) < 1e-6)) {
        const edge = face.points.filter(point => Math.abs(point[1]-capY) < 1e-7);
        if (edge.length !== 2) continue;
        const a = edge[0], b = edge[1];
        const band = [a,b,b.map((value,i) => i===1 ? value : value*1.25),a.map((value,i) => i===1 ? value : value*1.25)];
        svg += sqPolygon(band.map(project), colors[face.sticker], `stroke="#25282b" stroke-width="1.1" stroke-linejoin="round" data-piece="${piece.id}" data-sticker="${face.sticker}"`);
      }
      const sticker = sqInset(sqCapPoints(cap.points), .975);
      svg += sqPolygon(sticker.map(project), colors[cap.sticker] || '#292d31', `stroke="#22272d" stroke-width="1" stroke-linejoin="round" data-piece="${piece.id}" data-sticker="${cap.sticker}"`);
    }
  }
  return svg;
}

// Split intersecting depth ranges before painting so internal faces never cover
// an outer sticker merely because their average depth happens to be greater.
function sqDepthOrder(faces) {
  if (faces.length < 2) return faces;
  const plane = faces[0], normal = plane.normal;
  const distance = point => point.reduce((sum,value,i) => sum + normal[i]*(value-plane.points[0][i]), 0);
  const front = [], back = [], same = [];
  for (const face of faces) {
    const distances = face.points.map(distance);
    if (Math.min(...distances) >= -1e-7 && Math.max(...distances) <= 1e-7) { same.push(face); continue; }
    if (Math.min(...distances) >= -1e-7) { front.push(face); continue; }
    if (Math.max(...distances) <= 1e-7) { back.push(face); continue; }
    const positive = [], negative = [];
    face.points.forEach((point,i) => {
      const d = distances[i], j = (i+1)%face.points.length;
      if (d >= -1e-7) positive.push(point);
      if (d <= 1e-7) negative.push(point);
      if (d*distances[j] < -1e-14) {
        const t = d/(d-distances[j]);
        const cut = point.map((value,k) => value+t*(face.points[j][k]-value));
        positive.push(cut); negative.push(cut);
      }
    });
    front.push({ ...face, points: positive }); back.push({ ...face, points: negative });
  }
  return normal[2] > 0 ? [...sqDepthOrder(back),...same,...sqDepthOrder(front)] : [...sqDepthOrder(front),...same,...sqDepthOrder(back)];
}

function sqThreeD(state, colors, camera, animation) {
  const yaw = sqRotation([0,1,0], camera.yaw), pitch = sqRotation([1,0,0], camera.pitch);
  const transform = point => sqTransform(pitch, sqTransform(yaw, point));
  const scale = 235 * camera.zoom, project = point => [300+point[0]*scale,250-point[1]*scale];
  const faces = [];
  for (const piece of square1Geometry(state, animation)) {
    for (const face of piece.faces) {
      if (transform(face.normal)[2] <= 1e-7) continue;
      const points = face.points.map(transform);
      faces.push({ ...face, id: piece.id, normal: transform(face.normal), points, fill: '#24282d' });
      if (face.sticker) faces.push({ ...face, id: piece.id, normal: transform(face.normal), points: sqInset(points,.95), fill: colors[face.sticker] });
    }
  }
  return sqDepthOrder(faces).map(face => sqPolygon(face.points.map(project),face.fill,`data-piece="${face.id}" data-sticker="${face.sticker || ''}"`)).join('');
}

export function square1Svg(state, palette = SQUARE1_COLORS, view = '3d', options = {}) {
  const colors = { ...SQUARE1_COLORS, ...palette }, [width,height] = square1ViewSize(view);
  const camera = { ...SQUARE1_CAMERA, ...options.camera };
  const content = view === '3d' ? sqThreeD(state, colors, camera, options.animation) : sqFlat(state, colors, view);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Square-1 ${view === '3d' ? '3D' : view === 'vertical' ? '평면 세로' : '평면 가로'}">${content}</svg>`;
}
