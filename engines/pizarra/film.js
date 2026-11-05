// Tu película: todo lo que pasa en la pizarra, como datos. Para una pieza normal, es el único archivo que editas.
// No usa el DOM, así que también corre en Node: de aquí salen los eventos de sonido (eventos.mjs), un sonido por trazo.
import { catmull, Stroke } from './chalk.js';
import { writeLatin, latinWidth } from './latin.js';

// ── 1. Duración y formato. DUR debe coincidir con data-duration en index.html y en las escenas.
export const W = 1080, H = 1920, DUR = 15;

// ── 2. Colores del encargo, en hexadecimal. Los lee también la sala de board.js.
export const PALETA = { tinta: '#F7EBD3', acento: '#E9A93B', secundario: '#B8692E', pizarra: '#0B0806', pared: '#1A120A' };
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const TINTA = rgb(PALETA.tinta), ACENTO = rgb(PALETA.acento), SEGUNDO = rgb(PALETA.secundario);

// Margen izquierdo. Con 72 px y sin acercar la cámara, una línea cabe hasta x = 960, antes del riel derecho.
const X0 = 72;

// Escribe una línea y reparte sus trazos en `dur` segundos. Con `null`, usa la velocidad natural de la mano y `.t1` dice cuándo termina.
// Con `borrador: n`, la pasada número n se la lleva.
function linea(S, L, txt, by, cap, t0, dur, o = {}) {
  const x = o.x ?? X0, s = writeLatin(txt, x, by, cap, t0, o);
  dur ??= s.end - t0;
  const k = dur / (s.end - t0);
  for (const st of s) {
    st.t0 = t0 + (st.t0 - t0) * k; st.t1 = t0 + (st.t1 - t0) * k;
    st.cap = cap; st.acento = o.color === ACENTO; st.borrador = o.borrador ?? -1; st.linea = txt;
    S.push(st);
  }
  const l = { txt, x0: x, x1: s.x, ancho: s.x - x, by, cap, t0, t1: t0 + dur, trazos: s.length, sPorTrazo: dur / s.length };
  L.push(l);
  return l;
}

// Un trazo suelto: subrayado, flecha, marca o globo. `puntos` es una lista de [x, y].
function trazo(S, puntos, t0, t1, o = {}) {
  const st = new Stroke(catmull(puntos, o.suavizado ?? 10), { kind: 'write', w: o.w ?? 9.5, color: o.color ?? TINTA, taper: .3, taperLen: .3, land: 1, wob: 1.6, wav: 200, skip: .15, press: o.press ?? 1.05, endSpecks: true, specks: .5, seed: o.seed ?? 71, R: o.R });
  st.t0 = t0; st.t1 = t1; st.cap = o.cap ?? 90; st.acento = (o.color ?? TINTA) === ACENTO; st.borrador = o.borrador ?? -1;
  S.push(st);
  return st;
}

// Curva cúbica de Bézier, como cubic-bezier() de CSS. Para respetar la curva de cámara que pida el encargo.
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (t) => ((ax * t + bx) * t + cx) * t, Y = (t) => ((ay * t + by) * t + cy) * t;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 32; i++) { if (X(t) < x) lo = t; else hi = t; t = (lo + hi) / 2; }
    return Y(t);
  };
}
const curvaCamara = bezier(.65, 0, .35, 1);

export function build() {
  const S = [], L = [];

  // ── 3. El texto: cada línea es (texto, y, altura de letra, empieza, dura, opciones). Un segundo negativo ya está escrito al abrir.
  linea(S, L, '¿Qué hace un', 430, 76, -.45, 1.6, { color: TINTA, seed: 1, press: 1.1 });
  linea(S, L, 'agente de IA?', 560, 74, 1.6, 1.3, { color: TINTA, seed: 2, press: 1.1 });
  const error = linea(S, L, 'Contesta.', 850, 116, 3.15, .9, { color: TINTA, seed: 3, borrador: 0 });
  const respuesta = linea(S, L, 'Actúa.', 900, 176, 7.0, .95, { color: ACENTO, seed: 4, R: 2.5 });
  linea(S, L, 'Diseña, ejecuta', 1090, 72, 8.6, 1.55, { color: TINTA, seed: 5, press: 1.1 });
  linea(S, L, 'y revisa.', 1210, 72, 10.2, .85, { color: TINTA, seed: 6, press: 1.1 });

  // ── 4. Trazos sueltos: el subrayado de la respuesta, justo al terminar la palabra.
  const a = respuesta;
  trazo(S, [[X0 + 14, a.by + 62], [X0 + a.ancho * .45, a.by + 50], [X0 + a.ancho - 10, a.by + 44]], 7.97, 8.27, { color: ACENTO, cap: 176 });

  // ── 5. El borrador: una lista de pasadas. Cada una se lleva las líneas y los trazos con su número en `borrador`.
  const e = error, ey = e.by - e.cap * .55;
  const wipes = [
    { t0: 6.1, t1: 6.6, w: 300, path: catmull([[e.x0 + e.ancho + 90, ey + 18], [e.x0 + e.ancho * .6, ey - 8], [e.x0 + e.ancho * .25, ey + 10], [e.x0 - 110, ey - 6]], 16) },
  ];

  // ── 6. La cámara, siempre de frente. Cada clave es [segundo, centro x, centro y, escala].
  const C = [[-1, 372, 660, 1.55], [.1, 372, 660, 1.55], [.95, 610, 660, 1.55], [1.95, 540, 960, 1], [99, 540, 960, 1]];
  const camAt = (t) => {
    let i = 0;
    while (i < C.length - 2 && t >= C[i + 1][0]) i++;
    const [t0, x0, y0, s0] = C[i], [t1, x1, y1, s1] = C[i + 1], u = curvaCamara((t - t0) / (t1 - t0));
    return { cx: x0 + (x1 - x0) * u, cy: y0 + (y1 - y0) * u, s: s0 * Math.pow(s1 / s0, u) };
  };

  return { S, L, wipes, camAt, DUR, paleta: PALETA, colores: { TINTA, ACENTO, SEGUNDO } };
}
export { latinWidth };
