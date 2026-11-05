// Geometría del motor isométrico: proyección, matrices y sólidos. No usa el DOM, así que también corre en Node.
// Mundo en unidades: x baja a la derecha, y baja a la izquierda, z sube. Se mira siempre desde (1, 1, 1): una sola proyección, sin perspectiva.
export const COS30 = Math.sqrt(3) / 2;
export const iso = (x, y, z) => [(x - y) * COS30, (x + y) / 2 - z];
export const deIso = (u, v, z = 0) => { const a = u / COS30, b = 2 * (v + z); return [(b + a) / 2, (b - a) / 2]; };

// La luz viene de arriba a la izquierda. Por cada unidad de altura, la sombra corre esto en x y en y: a la derecha en pantalla.
export const SOMBRA = [0.62, -0.4];
export const LUZ = norma([-SOMBRA[0], -SOMBRA[1], 1]);

export function norma(v) { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }

// Azar con semilla: lo único que se usa aquí como azar. Nunca Math.random.
export function rng(semilla) {
  let a = semilla | 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function azar2(i, j, s = 0) {
  let h = (Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263) + Math.imul(s | 0, 1013904223)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ── Matrices 3×4 ─────────────────────────────────────────────────────────────
export const M = {
  id: () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0],
  mover: (x, y, z) => [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z],
  escala: (a, b = a, c = a) => [a, 0, 0, 0, 0, b, 0, 0, 0, 0, c, 0],
  rotX: (r) => { const c = Math.cos(r), s = Math.sin(r); return [1, 0, 0, 0, 0, c, -s, 0, 0, s, c, 0]; },
  rotY: (r) => { const c = Math.cos(r), s = Math.sin(r); return [c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0]; },
  rotZ: (r) => { const c = Math.cos(r), s = Math.sin(r); return [c, -s, 0, 0, s, c, 0, 0, 0, 0, 1, 0]; },
  por: (a, b) => [
    a[0] * b[0] + a[1] * b[4] + a[2] * b[8], a[0] * b[1] + a[1] * b[5] + a[2] * b[9], a[0] * b[2] + a[1] * b[6] + a[2] * b[10], a[0] * b[3] + a[1] * b[7] + a[2] * b[11] + a[3],
    a[4] * b[0] + a[5] * b[4] + a[6] * b[8], a[4] * b[1] + a[5] * b[5] + a[6] * b[9], a[4] * b[2] + a[5] * b[6] + a[6] * b[10], a[4] * b[3] + a[5] * b[7] + a[6] * b[11] + a[7],
    a[8] * b[0] + a[9] * b[4] + a[10] * b[8], a[8] * b[1] + a[9] * b[5] + a[10] * b[9], a[8] * b[2] + a[9] * b[6] + a[10] * b[10], a[8] * b[3] + a[9] * b[7] + a[10] * b[11] + a[11],
  ],
};
export const punto = (m, p) => [m[0] * p[0] + m[1] * p[1] + m[2] * p[2] + m[3], m[4] * p[0] + m[5] * p[1] + m[6] * p[2] + m[7], m[8] * p[0] + m[9] * p[1] + m[10] * p[2] + m[11]];
export const vector = (m, p) => [m[0] * p[0] + m[1] * p[1] + m[2] * p[2], m[4] * p[0] + m[5] * p[1] + m[6] * p[2], m[8] * p[0] + m[9] * p[1] + m[10] * p[2]];

// ── Polígonos, siempre en sentido antihorario visto en (x, y) ────────────────
export function rectR(w, d, r = 0, seg = 0) {
  const a = w / 2, b = d / 2, q = Math.min(r, a, b), pts = [];
  const esquinas = [[a - q, b - q, 0], [-a + q, b - q, 90], [-a + q, -b + q, 180], [a - q, -b + q, 270]];
  for (const [cx, cy, a0] of esquinas) {
    for (let i = 0; i <= seg; i++) {
      const g = ((seg ? a0 + (90 * i) / seg : a0 + 45) * Math.PI) / 180;
      pts.push([cx + q * Math.cos(g), cy + q * Math.sin(g)]);
    }
  }
  if (seg === 0 && q === 0) return [[a, b], [-a, b], [-a, -b], [a, -b]];
  return pts;
}
export function circulo(r, n = 40) {
  const pts = [];
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; pts.push([r * Math.cos(a), r * Math.sin(a)]); }
  return pts;
}
// Mete el polígono hacia adentro una distancia b, también si no es convexo.
export function adentro(pts, b) {
  const n = pts.length;
  return pts.map((p, i) => {
    const a = pts[(i - 1 + n) % n], c = pts[(i + 1) % n];
    let e1x = p[0] - a[0], e1y = p[1] - a[1], e2x = c[0] - p[0], e2y = c[1] - p[1];
    const l1 = Math.hypot(e1x, e1y) || 1, l2 = Math.hypot(e2x, e2y) || 1;
    e1x /= l1; e1y /= l1; e2x /= l2; e2y /= l2;
    let bx = -e1y - e2y, by = e1x + e2x;
    const lb = Math.hypot(bx, by) || 1;
    bx /= lb; by /= lb;
    const co = Math.max(0.35, bx * -e1y + by * e1x);
    return [p[0] + (bx * b) / co, p[1] + (by * b) / co];
  });
}

// ── Mallas: una lista de caras con sus adornos. Se pintan con luz y sombra en pintor.js ──
function malla(o) {
  return { k: 'malla', caras: [], deco: [], color: o.color ?? '#808080', mat: o.mat ?? 'mate', sombra: o.sombra !== false, recibe: Boolean(o.recibe), convexa: o.convexa !== false, alfa: o.alfa ?? 1, ao: o.ao ?? 0.42, nombre: o.nombre };
}
function agregaDeco(m, o, x, y, z, w, d, h) {
  if (!o.deco) return;
  const zt = z + h;
  if (o.deco.arriba) m.deco.push({ o: [x, y, zt], u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1], cmds: o.deco.arriba });
  if (o.deco.izq) m.deco.push({ o: [x, y + d / 2, z + h / 2], u: [1, 0, 0], v: [0, 0, -1], n: [0, 1, 0], cmds: o.deco.izq });
  if (o.deco.der) m.deco.push({ o: [x + w / 2, y, z + h / 2], u: [0, -1, 0], v: [0, 0, -1], n: [1, 0, 0], cmds: o.deco.der });
}
// Varios anillos apilados; cada par forma lados y el último es la tapa.
export function loft(anillos, o = {}) {
  const m = malla(o), n = anillos[0].p.length;
  if (o.debajo) m.caras.push({ p: anillos[0].p.slice().reverse().map((q) => [q[0], q[1], anillos[0].z]), debajo: true, color: o.debajo === true ? undefined : o.debajo });
  for (let r = 0; r < anillos.length - 1; r++) {
    const A = anillos[r], B = anillos[r + 1];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      m.caras.push({ p: [[A.p[i][0], A.p[i][1], A.z], [A.p[j][0], A.p[j][1], A.z], [B.p[j][0], B.p[j][1], B.z], [B.p[i][0], B.p[i][1], B.z]], piso: r === 0 && !o.sinPiso });
    }
  }
  const T = anillos[anillos.length - 1];
  m.caras.push({ p: T.p.map((q) => [q[0], q[1], T.z]), tapa: true });
  return m;
}
export function caja(w, d, h, o = {}) {
  const x = o.x ?? 0, y = o.y ?? 0, z = o.z ?? 0, r = Math.min(o.r ?? 0, Math.min(w, d) / 2), b = Math.min(o.b ?? 0, h * 0.45, Math.min(w, d) * 0.25), seg = o.seg ?? (r > 0 ? 5 : 0);
  const P = (ww, dd, rr) => rectR(ww, dd, rr, seg).map((q) => [q[0] + x, q[1] + y]);
  const an = b > 0 ? [{ p: P(w, d, r), z }, { p: P(w, d, r), z: z + h - b }, { p: P(w - 2 * b, d - 2 * b, Math.max(0, r - b)), z: z + h }] : [{ p: P(w, d, r), z }, { p: P(w, d, r), z: z + h }];
  const m = loft(an, o);
  agregaDeco(m, o, x, y, z, w, d, h);
  return m;
}
export function cilindro(r, h, o = {}) {
  const x = o.x ?? 0, y = o.y ?? 0, z = o.z ?? 0, n = o.n ?? 44, r2 = o.r2 ?? r, b = Math.min(o.b ?? 0, h * 0.45, r2 * 0.4);
  const C = (rr) => circulo(rr, n).map((q) => [q[0] + x, q[1] + y]);
  const an = b > 0 ? [{ p: C(r), z }, { p: C(r2), z: z + h - b }, { p: C(r2 - b), z: z + h }] : [{ p: C(r), z }, { p: C(r2), z: z + h }];
  const m = loft(an, o);
  agregaDeco(m, o, x, y, z, 2 * r, 2 * r, h);
  return m;
}
export function prisma(pts, h, o = {}) {
  const x = o.x ?? 0, y = o.y ?? 0, z = o.z ?? 0, b = o.b ?? 0;
  const P = (q) => q.map((s) => [s[0] + x, s[1] + y]);
  const an = b > 0 ? [{ p: P(pts), z }, { p: P(pts), z: z + h - b }, { p: P(adentro(pts, b)), z: z + h }] : [{ p: P(pts), z }, { p: P(pts), z: z + h }];
  const m = loft(an, { convexa: false, ...o });
  agregaDeco(m, o, x, y, z, 0, 0, h);
  return m;
}
// Media esfera sobre z, útil para domos y para el pelo de una persona.
export function domo(r, o = {}) {
  const x = o.x ?? 0, y = o.y ?? 0, z = o.z ?? 0, n = o.n ?? 28, pisos = o.pisos ?? 7, an = [];
  for (let i = 0; i <= pisos; i++) {
    const a = (i / pisos) * (Math.PI / 2) * 0.985, rr = r * Math.cos(a);
    an.push({ p: circulo(rr, n).map((q) => [q[0] + x, q[1] + y]), z: z + r * Math.sin(a) });
  }
  return loft(an, o);
}
export function bola(r, o = {}) {
  return { k: 'bola', c: [o.x ?? 0, o.y ?? 0, o.z ?? 0], r, color: o.color ?? '#808080', mat: o.mat ?? 'mate', sombra: o.sombra !== false, alfa: o.alfa ?? 1 };
}
// Tubo que sigue una lista de puntos [x, y, z] o [x, y, z, radio]. No es convexo: sus caras se ordenan una a una.
export function tubo(puntos, r, o = {}) {
  const n = o.n ?? 12, m = malla({ ...o, convexa: false });
  const tan = puntos.map((p, i) => {
    const a = puntos[Math.max(0, i - 1)], b = puntos[Math.min(puntos.length - 1, i + 1)];
    return norma([b[0] - a[0], b[1] - a[1], b[2] - a[2]]);
  });
  let u = norma(Math.abs(tan[0][2]) > 0.9 ? [1, 0, 0] : [-tan[0][1], tan[0][0], 0]);
  const anillos = puntos.map((p, i) => {
    const t = tan[i], d = u[0] * t[0] + u[1] * t[1] + u[2] * t[2];
    u = norma([u[0] - t[0] * d, u[1] - t[1] * d, u[2] - t[2] * d]);
    const w = [t[1] * u[2] - t[2] * u[1], t[2] * u[0] - t[0] * u[2], t[0] * u[1] - t[1] * u[0]], rr = p[3] ?? r, an = [];
    for (let j = 0; j < n; j++) {
      const g = (j / n) * Math.PI * 2, c = Math.cos(g) * rr, s = Math.sin(g) * rr;
      an.push([p[0] + u[0] * c + w[0] * s, p[1] + u[1] * c + w[1] * s, p[2] + u[2] * c + w[2] * s]);
    }
    return an;
  });
  for (let i = 0; i < anillos.length - 1; i++) {
    for (let j = 0; j < n; j++) {
      const k = (j + 1) % n;
      m.caras.push({ p: [anillos[i][j], anillos[i][k], anillos[i + 1][k], anillos[i + 1][j]] });
    }
  }
  return m;
}
// Barra de extremos redondos entre dos puntos.
export function capsula(a, b, r, o = {}) {
  const t = norma([b[0] - a[0], b[1] - a[1], b[2] - a[2]]), pts = [];
  for (let i = 0; i <= 3; i++) { const g = ((i / 3 - 1) * Math.PI) / 2; pts.push([a[0] + t[0] * r * Math.sin(g), a[1] + t[1] * r * Math.sin(g), a[2] + t[2] * r * Math.sin(g), Math.max(0.001, r * Math.cos(g))]); }
  for (let i = 0; i <= 3; i++) { const g = (i / 3) * Math.PI / 2; pts.push([b[0] + t[0] * r * Math.sin(g), b[1] + t[1] * r * Math.sin(g), b[2] + t[2] * r * Math.sin(g), Math.max(0.001, r * Math.cos(g))]); }
  return tubo(pts, r, o);
}

// ── Transformar y medir ──────────────────────────────────────────────────────
export function transformar(pr, m) {
  if (pr.k === 'bola') {
    pr.c = punto(m, pr.c);
    pr.r *= Math.cbrt(Math.abs(m[0] * (m[5] * m[10] - m[6] * m[9]) - m[1] * (m[4] * m[10] - m[6] * m[8]) + m[2] * (m[4] * m[9] - m[5] * m[8])));
    return pr;
  }
  if (pr.k === 'letras') {
    pr.o = punto(m, pr.o); pr.u = vector(m, pr.u); pr.v = vector(m, pr.v); pr.e = vector(m, pr.e);
    return pr;
  }
  for (const c of pr.caras) c.p = c.p.map((q) => punto(m, q));
  for (const d of pr.deco) { d.o = punto(m, d.o); d.u = vector(m, d.u); d.v = vector(m, d.v); d.n = norma(vector(m, d.n)); }
  return pr;
}
export function medirCaja(pr) {
  let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
  const mira = (x, y, z) => { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z; };
  if (pr.k === 'bola') { const [x, y, z] = pr.c, r = pr.r; mira(x - r, y - r, z - r); mira(x + r, y + r, z + r); }
  else if (pr.k === 'letras') { for (const q of esquinasLetras(pr)) mira(q[0], q[1], q[2]); }
  else for (const c of pr.caras) for (const q of c.p) mira(q[0], q[1], q[2]);
  pr.aabb = [x0, y0, z0, x1, y1, z1];
  return pr;
}
export function esquinasLetras(pr) {
  const { o, u, v, e, ancho, alto } = pr, s = [];
  for (const a of [-ancho / 2, ancho / 2]) for (const b of [-alto / 2, alto / 2]) for (const c of [0, 1]) s.push([o[0] + u[0] * a + v[0] * b + e[0] * c, o[1] + u[1] * a + v[1] * b + e[1] * c, o[2] + u[2] * a + v[2] * b + e[2] * c]);
  return s;
}
// Los vértices de un sólido, para su sombra y para medirlo en pantalla.
export function vertices(pr) {
  if (pr.k === 'bola') { const [x, y, z] = pr.c, r = pr.r, s = []; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; s.push([x + r * Math.cos(a), y + r * Math.sin(a), z]); } s.push([x, y, z + r], [x, y, z - r]); return s; }
  if (pr.k === 'letras') return esquinasLetras(pr);
  const s = [];
  for (const c of pr.caras) for (const q of c.p) s.push(q);
  return s;
}
export function cajaIso(prs) {
  let u0 = Infinity, v0 = Infinity, u1 = -Infinity, v1 = -Infinity;
  for (const pr of prs) {
    if (pr.k === 'bola') { const [a, b] = iso(pr.c[0], pr.c[1], pr.c[2]); u0 = Math.min(u0, a - pr.r); u1 = Math.max(u1, a + pr.r); v0 = Math.min(v0, b - pr.r); v1 = Math.max(v1, b + pr.r); continue; }
    for (const q of vertices(pr)) { const [a, b] = iso(q[0], q[1], q[2]); if (a < u0) u0 = a; if (a > u1) u1 = a; if (b < v0) v0 = b; if (b > v1) v1 = b; }
  }
  return { u0, v0, u1, v1 };
}

// ── Orden de pintado. A va antes que B si hay un eje en que A queda detrás de B, mirando desde (1, 1, 1). ──
export function ordenar(prs) {
  const n = prs.length, entran = new Int32Array(n), sale = Array.from({ length: n }, () => []);
  const E = 1e-4;
  for (let i = 0; i < n; i++) {
    const a = prs[i].aabb;
    for (let j = i + 1; j < n; j++) {
      const b = prs[j].aabb;
      const ab = a[3] <= b[0] + E || a[4] <= b[1] + E || a[5] <= b[2] + E;
      const ba = b[3] <= a[0] + E || b[4] <= a[1] + E || b[5] <= a[2] + E;
      if (ab && ba) continue;
      if (ab) { sale[i].push(j); entran[j]++; continue; }
      if (ba) { sale[j].push(i); entran[i]++; continue; }
      // Cajas que se cruzan: dentro de un objeto manda el orden de su lista; entre objetos, el eje donde menos se meten.
      const mismo = prs[i].grupo !== undefined && prs[i].grupo === prs[j].grupo;
      const metX = Math.min(a[3], b[3]) - Math.max(a[0], b[0]), metY = Math.min(a[4], b[4]) - Math.max(a[1], b[1]), metZ = Math.min(a[5], b[5]) - Math.max(a[2], b[2]);
      const eje = metZ <= metX && metZ <= metY ? 2 : metX <= metY ? 0 : 1;
      if (mismo || a[eje] + a[eje + 3] <= b[eje] + b[eje + 3]) { sale[i].push(j); entran[j]++; } else { sale[j].push(i); entran[i]++; }
    }
  }
  const salida = [], hecho = new Uint8Array(n);
  const prof = prs.map((p) => p.aabb[0] + p.aabb[3] + p.aabb[1] + p.aabb[4] + p.aabb[2] + p.aabb[5]);
  for (let vuelta = 0; vuelta < n; vuelta++) {
    let mejor = -1, libre = false;
    for (let i = 0; i < n; i++) {
      if (hecho[i]) continue;
      const esLibre = entran[i] === 0;
      if (mejor < 0 || (esLibre && !libre) || (esLibre === libre && prof[i] < prof[mejor])) { mejor = i; libre = esLibre; }
    }
    hecho[mejor] = 1;
    salida.push(prs[mejor]);
    for (const j of sale[mejor]) entran[j]--;
  }
  return salida;
}

// Casco convexo de puntos en 2D, siempre en el mismo sentido: la unión de sombras no deja huecos.
export function casco(pts) {
  const s = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (s.length < 3) return s;
  const cruz = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], hi = [];
  for (const p of s) { while (lo.length >= 2 && cruz(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = s.length - 1; i >= 0; i--) { const p = s[i]; while (hi.length >= 2 && cruz(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
  lo.pop(); hi.pop();
  return lo.concat(hi);
}
