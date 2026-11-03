// Prueba desechable: todo lo que pasa en la pizarra, como datos. Sin DOM, para poder leerlo también desde Node (eventos de audio).
import { eio } from './lib.js';
import { catmull, Stroke } from './chalk.js';
import { writeLatin, latinWidth } from './latin.js';

export const W = 1080, H = 1920, DUR = 15, CORTE = 7.6;
const CREMA = [247, 235, 211].map(v => v / 255), ORO = [245, 198, 107].map(v => v / 255);
const X0 = 72;                                                   // margen de MOTION.md; ninguna línea pasa de x = 960 (riel derecho)

// Escribe una línea y reparte sus trazos en `dur` segundos.
function linea(S, txt, by, cap, t0, dur, o = {}) {
  const s = writeLatin(txt, X0, by, cap, t0, o), k = dur / (s.end - t0);
  for (const st of s) { st.t0 = t0 + (st.t0 - t0) * k; st.t1 = t0 + (st.t1 - t0) * k; st.bloque = o.bloque; st.wiped = !!o.wiped; S.push(st); }
  return { txt, x0: X0, x1: s.x, ancho: s.x - X0, by, cap, t0, t1: t0 + dur, trazos: s.length, sPorTrazo: dur / s.length };
}

export function build() {
  const S = [], L = [];
  L.push(linea(S, '¿Qué hace un', 430, 76, -.45, 1.6, { color: CREMA, seed: 1, bloque: 'pregunta', press: 1.1 }));
  L.push(linea(S, 'agente de IA?', 560, 76, 1.6, 1.3, { color: CREMA, seed: 2, bloque: 'pregunta', press: 1.1 }));
  L.push(linea(S, 'Contesta.', 850, 116, 3.15, .9, { color: CREMA, seed: 3, bloque: 'error', wiped: true }));
  L.push(linea(S, 'Actúa.', 900, 176, 7.0, .95, { color: ORO, seed: 4, bloque: 'respuesta', R: 2.5 }));
  L.push(linea(S, 'Diseña, ejecuta', 1090, 72, 8.6, 1.55, { color: CREMA, seed: 5, bloque: 'detalle', press: 1.1 }));
  L.push(linea(S, 'y revisa.', 1210, 72, 10.2, .85, { color: CREMA, seed: 6, bloque: 'detalle', press: 1.1 }));

  // subrayado de la respuesta: un trazo con causa, justo al terminar la palabra
  const a = L[3], sub = new Stroke(catmull([[X0 + 6, a.by + 62], [X0 + a.ancho * .45, a.by + 50], [X0 + a.ancho - 10, a.by + 44]], 10),
    { kind: 'write', w: 9.5, color: ORO, taper: .3, taperLen: .3, land: 1, wob: 1.6, wav: 200, skip: .15, press: 1.05, endSpecks: true, specks: .5, seed: 71 });
  sub.t0 = 7.97; sub.t1 = 8.27; sub.bloque = 'respuesta'; sub.wiped = false; S.push(sub);

  // una sola pasada de borrador sobre el error
  const e = L[2], ey = e.by - e.cap * .55;
  const wipe = { t0: 6.1, t1: 6.6, w: 300, path: catmull([[e.x0 + e.ancho + 90, ey + 18], [e.x0 + e.ancho * .6, ey - 8], [e.x0 + e.ancho * .25, ey + 10], [e.x0 - 110, ey - 6]], 16) };

  // Cámara siempre de frente. Cada tramo: [t, cx, cy, s]; entre claves, curva cúbica de entrada y salida.
  const C = [[-1, 372, 660, 1.55], [.1, 372, 660, 1.55], [.95, 610, 660, 1.55], [1.95, 540, 960, 1], [6.95, 540, 960, 1], [8.3, 545, 850, 1.045], [8.45, 545, 850, 1.045], [9.25, 540, 960, 1], [99, 540, 960, 1]];
  const camAt = t => {
    let i = 0; while (i < C.length - 2 && t >= C[i + 1][0]) i++;
    const [t0, x0, y0, s0] = C[i], [t1, x1, y1, s1] = C[i + 1], u = eio((t - t0) / (t1 - t0));
    return { cx: x0 + (x1 - x0) * u, cy: y0 + (y1 - y0) * u, s: s0 * Math.pow(s1 / s0, u) };
  };
  return { S, L, wipe, camAt, DUR };
}
export { latinWidth };
