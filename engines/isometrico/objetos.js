// La biblioteca de objetos. Cada uno se arma con sólidos de solidos.js, en unidades de mundo, con la base en z = 0 y centrado en (0, 0).
// `crear(p, e, c)` recibe lo que escribiste en film.js (p), el estado de sus acciones en este instante (e) y los colores (c), y devuelve piezas.
// El orden de las piezas importa: `como: 'arma'` las hace caer en ese orden. Sin DOM: también corre en Node.
// Para añadir un objeto: una entrada más aquí, con `alto`, `acciones` si las tiene y `crear`.
import { M, azar2, bola, caja, capsula, cilindro, circulo, domo, loft, prisma, rng, transformar, tubo } from './solidos.js';

const sat = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const liso = (x) => { x = sat(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, u) => a + (b - a) * u;
const dims = (t, def) => (Array.isArray(t) ? [t[0] ?? def[0], t[1] ?? def[1], t[2] ?? def[2]] : def);

// Órdenes de dibujo sobre una cara, en unidades de mundo y con el origen en su centro. `luz: true` no recibe sombra de la cara: brilla.
const R = (cx, cy, w, h, color, o = {}) => ['r', cx, cy, w, h, color, o];
const O = (cx, cy, r, color, o = {}) => ['c', cx, cy, r, color, o];
const L = (x0, y0, x1, y1, ancho, color, o = {}) => ['l', x0, y0, x1, y1, ancho, color, o];
const P = (pts, color, o = {}) => ['p', pts, color, o];
const Q = (cx, cy, w, h, ancho, color, o = {}) => ['m', cx, cy, w, h, ancho, color, o];
const T = (texto, cx, cy, tam, color, o = {}) => ['t', texto, cx, cy, tam, color, o];

function antihorario(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; }
  return a < 0 ? pts.slice().reverse() : pts;
}
// Convierte una línea quebrada en un polígono con grosor.
function polilinea(pts, ancho) {
  const izq = [], der = [], n = pts.length, h = ancho / 2;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[i], d = pts[Math.min(n - 1, i + 1)];
    let e1x = b[0] - a[0], e1y = b[1] - a[1], e2x = d[0] - b[0], e2y = d[1] - b[1];
    const l1 = Math.hypot(e1x, e1y) || 1, l2 = Math.hypot(e2x, e2y) || 1;
    e1x /= l1; e1y /= l1; e2x /= l2; e2y /= l2;
    if (i === 0) { e1x = e2x; e1y = e2y; }
    if (i === n - 1) { e2x = e1x; e2y = e1y; }
    let nx = -e1y - e2y, ny = e1x + e2x;
    const ln = Math.hypot(nx, ny) || 1;
    nx /= ln; ny /= ln;
    const k = h / Math.max(0.4, nx * -e1y + ny * e1x);
    izq.push([b[0] + nx * k, b[1] + ny * k]);
    der.push([b[0] - nx * k, b[1] - ny * k]);
  }
  return antihorario(izq.concat(der.reverse()));
}
// De coordenadas de pantalla (a a la derecha, b hacia abajo) al suelo: el símbolo queda derecho para quien mira.
const dePantalla = ([a, b]) => [(a + b) / Math.SQRT2, (-a + b) / Math.SQRT2];

const tira = (pr, m) => transformar(pr, m);

export const BIBLIOTECA = {
  // ── Básicos ────────────────────────────────────────────────────────────────
  bloque: {
    alto: (p) => dims(p.tam, [2, 2, 1])[2],
    crear(p, e, c) {
      const [w, d, h] = dims(p.tam, [2, 2, 1]);
      return [caja(w, d, h, { r: p.radio ?? 0.08, b: p.bisel ?? 0.03, color: p.color ?? c.cuerpo, mat: p.material ?? 'mate', recibe: p.recibe ?? true })];
    },
  },
  columna: {
    alto: (p) => dims(p.tam, [1, 1, 2])[2],
    crear(p, e, c) {
      const [w, , h] = dims(p.tam, [1, 1, 2]);
      return [cilindro(w / 2, h, { b: 0.03, color: p.color ?? c.cuerpo, mat: p.material ?? 'mate', recibe: true })];
    },
  },
  esfera: {
    alto: (p) => 2 * (p.radio ?? 1),
    crear(p, e, c) { const r = p.radio ?? 1; return [bola(r, { z: r, color: p.color ?? c.acento, mat: p.material ?? 'mate' })]; },
  },
  plataforma: {
    alto: (p) => dims(p.tam, [4, 4, 0.42])[2],
    acciones: ['enciende'],
    crear(p, e, c) {
      const [w, d, h] = dims(p.tam, [4, 4, 0.42]), col = p.color ?? c.cuerpo, borde = p.borde ?? c.secundario, m = 0.17, on = e.enciende ?? 0;
      const campo = c.mez(col, c.fondo, 0.34), arriba = [R(0, 0, w - 2 * m, d - 2 * m, campo, { r: 0.14 })];
      if (p.losas) {
        const paso = p.losas === true ? 1 : p.losas, a = w - 2 * m, b = d - 2 * m;
        for (let i = paso - a / 2; i < a / 2 - 0.01; i += paso) arriba.push(L(i, -b / 2 + 0.03, i, b / 2 - 0.03, paso * 0.012, c.mez(campo, c.papel, 0.1)));
        for (let j = paso - b / 2; j < b / 2 - 0.01; j += paso) arriba.push(L(-a / 2 + 0.03, j, a / 2 - 0.03, j, paso * 0.012, c.mez(campo, c.papel, 0.1)));
      }
      arriba.push(Q(0, 0, w - 2 * m, d - 2 * m, 0.028, c.mez(borde, c.fondo, 0.15), { r: 0.14 }));
      if (on > 0) arriba.push(Q(0, 0, w - 2 * m, d - 2 * m, 0.05, c.acento, { r: 0.14, luz: true, a: on }));
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) arriba.push(O((a * (w - 0.2)) / 2, (b * (d - 0.2)) / 2, 0.028, c.mez(borde, c.papel, 0.25)));
      const raya = (lado) => [R(0, -h / 2 + 0.11, lado - 0.5, 0.035, c.mez(borde, c.fondo, 0.12), { r: 0.015 })];
      return [caja(w, d, h, { r: 0.2, b: 0.05, seg: 6, color: col, recibe: true, mat: 'mate', deco: { arriba, izq: raya(w), der: raya(d) } })];
    },
  },
  // ── Personas: sencillas y sin rostro. La cara clara mira hacia quien ve, el pelo cubre la parte de atrás. ──
  persona: {
    alto: () => 2.22,
    acciones: ['levanta'],
    crear(p, e, c) {
      const col = p.color ?? c.secundario, piel = p.piel ?? c.papel, pierna = c.mez(c.cuerpo, c.fondo, 0.1), pelo = p.pelo ?? c.mez(c.fondo, c.secundario, 0.34), lv = e.levanta ?? 0, s2 = Math.SQRT1_2, pz = [];
      const elipse = (a, b, n = 30) => { const q = []; for (let i = 0; i < n; i++) { const g = (i / n) * Math.PI * 2, ca = Math.cos(g) * a, sb = Math.sin(g) * b; q.push([(ca + sb) * s2, (-ca + sb) * s2]); } return q; };
      for (const s of [-1, 1]) pz.push(capsula([s * 0.15 * s2, -s * 0.15 * s2, 0.13], [s * 0.15 * s2, -s * 0.15 * s2, 0.9], 0.13, { color: pierna, mat: 'mate', n: 12 }));
      pz.push(loft([[0.8, 0.29, 0.22], [0.98, 0.31, 0.24], [1.22, 0.33, 0.25], [1.42, 0.38, 0.26], [1.53, 0.34, 0.24], [1.61, 0.2, 0.16]].map(([z, a, b]) => ({ p: elipse(a, b), z })), { color: col, mat: 'mate', sinPiso: true }));
      for (const s of [-1, 1]) {
        const arriba = s > 0 ? lv : 0, sx = 0.43, hx = lerp(0.47, 0.5, arriba), hz = lerp(0.84, 2.3, arriba), ho = lerp(0.06, 0.14, arriba);
        pz.push(capsula([s * sx * s2, -s * sx * s2, 1.44], [(s * hx + ho) * s2, (-s * hx + ho) * s2, hz], 0.095, { color: c.mez(col, c.papel, 0.06), mat: 'mate', n: 10, sombra: false }));
        pz.push(bola(0.105, { x: (s * hx + ho) * s2, y: (-s * hx + ho) * s2, z: hz, color: piel, mat: 'papel', sombra: false }));
      }
      pz.push(cilindro(0.1, 0.18, { z: 1.56, n: 14, color: c.mez(piel, c.sombraPapel, 0.26), mat: 'papel', sombra: false }));
      pz.push(bola(0.27, { z: 1.94, color: piel, mat: 'papel' }));
      pz.push(tira(domo(0.283, { color: pelo, mat: 'mate', sombra: false, n: 24, pisos: 6 }), M.por(M.mover(-0.012, -0.012, 1.95), M.por(M.rotZ(Math.PI / 4), M.rotY(-0.86)))));
      return pz;
    },
  },
  // ── Mensajes y papeles ─────────────────────────────────────────────────────
  sobre: {
    alto: () => 0.28,
    acciones: ['abre', 'escanea'],
    crear(p, e, c) {
      const w = 2.4, d = 1.7, h = 0.24, col = p.color ?? c.papel, ab = e.abre ?? 0, sello = p.sello ?? c.acento;
      const linea = c.mez(col, c.sombraPapel, 0.34), an = 0.022;
      const pz = [caja(w, d, h, { r: 0.08, b: 0.022, seg: 3, color: col, mat: 'papel', ao: 0.5, deco: { arriba: [
        L(-w / 2 + 0.05, d / 2 - 0.05, -0.08, 0.14, an, linea), L(w / 2 - 0.05, d / 2 - 0.05, 0.08, 0.14, an, linea),
        ...(ab > 0.02 ? [P([[-w / 2 + 0.06, -d / 2 + 0.05], [w / 2 - 0.06, -d / 2 + 0.05], [0, 0.34]], c.mez(col, c.sombraPapel, 0.48))] : []),
      ] } })];
      // La carta sube cuando la solapa ya abrió.
      const sube = liso((ab - 0.42) / 0.58);
      if (sube > 0) {
        const lineas = [], rr = rng(11), ww = w - 0.42, dd = d - 0.2;
        lineas.push(R(-ww * 0.2, -dd / 2 + 0.24, ww * 0.42, 0.11, c.acento, { r: 0.03 }));
        for (let i = 0; i < 4; i++) lineas.push(R(-(ww * (0.05 + rr() * 0.16)) / 2, -dd / 2 + 0.52 + i * 0.22, ww * (0.72 + rr() * 0.12), 0.06, c.linea, { r: 0.03, a: 0.66 }));
        // La lectura: una barra de luz que recorre la hoja. Lo ya leído queda teñido.
        const es = e.escanea ?? 0;
        if (es > 0 && es < 1) {
          const y = -dd / 2 + 0.06 + es * (dd - 0.12);
          lineas.push(R(0, (y - dd / 2) / 2, ww, y + dd / 2, c.acento, { a: 0.2, luz: true }), R(0, y, ww + 0.14, 0.055, c.acento, { luz: true }));
        }
        pz.push(caja(ww, dd, 0.035, { z: h + 0.03 + sube * 0.95, r: 0.03, color: c.claroPapel, mat: 'papel', deco: { arriba: lineas } }));
      }
      // La solapa gira sobre el borde de atrás; por dentro se ve más oscura.
      const tri = antihorario([[-w / 2 + 0.05, 0], [w / 2 - 0.05, 0], [0, d * 0.58]]);
      const solapa = prisma(tri, 0.03, { color: c.mez(col, c.claroPapel, 0.45), mat: 'papel', b: 0.008, debajo: c.mez(col, c.sombraPapel, 0.42), sombra: false, deco: {} });
      const giro = M.por(M.mover(0, -d / 2 + 0.03, h), M.rotX(ab * 2.75));
      tira(solapa, giro);
      pz.push(solapa);
      const se = cilindro(0.2, 0.05, { y: d * 0.45, z: 0.03, n: 22, b: 0.012, color: sello, mat: 'metal', sombra: false, deco: { arriba: [O(0, 0, 0.12, c.mez(sello, c.fondo, 0.2))] } });
      tira(se, giro);
      pz.push(se);
      return pz;
    },
  },
  documento: {
    alto: (p) => 0.06 + 0.05 * (p.hojas ?? 3),
    acciones: ['escribe'],
    crear(p, e, c) {
      const w = 1.75, d = 2.35, n = p.hojas ?? 3, grosor = 0.05, col = p.color ?? c.papel, rr = rng(p.semilla ?? 5), pz = [], lineas = p.lineas ?? 7;
      for (let i = 0; i < n - 1; i++) {
        const a = (rr() - 0.5) * 0.09, hoja = caja(w, d, grosor, { z: i * (grosor + 0.008), r: 0.02, color: c.mez(col, c.sombraPapel, 0.09 + (n - i) * 0.04), mat: 'papel', ao: 0.55 });
        tira(hoja, M.por(M.mover((rr() - 0.5) * 0.08, (rr() - 0.5) * 0.08, 0), M.rotZ(a)));
        pz.push(hoja);
      }
      const esc = e.escribe ?? 1, arriba = [R(-w * 0.17, -d / 2 + 0.34, w * 0.5, 0.2, p.acento ?? c.acento, { r: 0.04 })];
      for (let i = 0; i < lineas; i++) {
        const u = sat(esc * lineas - i);
        if (u <= 0) continue;
        const largo = (w - 0.38) * (i === lineas - 1 ? 0.55 : 0.82 + rr() * 0.18) * u;
        arriba.push(R(-(w - 0.38) / 2 + largo / 2, -d / 2 + 0.72 + i * ((d - 1.02) / Math.max(1, lineas - 1)), largo, 0.07, c.linea, { r: 0.03, a: 0.72 }));
      }
      // Esquina doblada arriba a la derecha.
      arriba.push(P([[w / 2 - 0.34, -d / 2], [w / 2, -d / 2 + 0.34], [w / 2 - 0.34, -d / 2 + 0.34]], c.mez(col, c.sombraPapel, 0.34)));
      pz.push(caja(w, d, grosor, { z: (n - 1) * (grosor + 0.008), r: 0.02, b: 0.008, color: col, mat: 'papel', ao: 0.5, deco: { arriba } }));
      return pz;
    },
  },
  globo: {
    alto: () => 0.72,
    crear(p, e, c) {
      const w = 2.9, d = 2, h = 0.5, col = p.color ?? c.papel, z = 0.22;
      const cola = prisma(antihorario([[-0.8, d / 2 - 0.12], [-0.1, d / 2 - 0.12], [-1.05, d / 2 + 0.55]]), h * 0.8, { z: z + h * 0.05, color: col, mat: 'papel', sombra: false });
      const puntos = [-0.72, 0, 0.72].map((a) => O(a, 0, 0.2, p.puntos ?? c.acento));
      return [caja(w * 0.8, d * 0.74, z, { r: 0.4, color: c.mez(col, c.sombraPapel, 0.25), mat: 'papel', sombra: false }), cola, caja(w, d, h, { z, r: 0.5, b: 0.08, seg: 8, color: col, mat: 'papel', deco: { arriba: puntos } })];
    },
  },
  // ── Aparatos ───────────────────────────────────────────────────────────────
  telefono: {
    alto: () => 0.17,
    acciones: ['enciende', 'avisa'],
    crear(p, e, c) {
      const w = 1.75, d = 3.4, h = 0.17, col = p.color ?? c.cuerpo, on = e.enciende ?? 1, av = e.avisa ?? 0, vidrio = c.mez(c.fondo, c.superficie, 0.5), brillo = c.mez(vidrio, c.secundario, 0.06 + on * 0.12);
      const arriba = [R(0, 0, w - 0.13, d - 0.13, c.fondo, { r: 0.23 }), R(0, 0, w - 0.19, d - 0.19, brillo, { r: 0.2, luz: true }), R(0, -d / 2 + 0.26, 0.42, 0.085, c.fondo, { r: 0.04, luz: true })];
      const claro = c.papel, gold = c.acento, a = sat(on * 1.4);
      arriba.push(R(-0.2, -0.82, 0.98, 0.42, c.mez(brillo, claro, 0.86), { r: 0.1, luz: true, a }), R(-0.26, -0.87, 0.68, 0.055, c.linea, { r: 0.02, luz: true, a: a * 0.75 }), R(-0.32, -0.73, 0.54, 0.055, c.linea, { r: 0.02, luz: true, a: a * 0.75 }));
      arriba.push(R(0.2, -0.2, 0.98, 0.36, gold, { r: 0.1, luz: true, a }), R(0.22, -0.2, 0.68, 0.055, c.fondo, { r: 0.02, luz: true, a: a * 0.7 }));
      arriba.push(R(-0.14, 0.4, 1.1, 0.52, c.mez(brillo, claro, 0.86), { r: 0.1, luz: true, a }), R(-0.18, 0.31, 0.8, 0.055, c.linea, { r: 0.02, luz: true, a: a * 0.75 }), R(-0.28, 0.42, 0.6, 0.055, c.linea, { r: 0.02, luz: true, a: a * 0.75 }), R(-0.24, 0.53, 0.68, 0.055, c.linea, { r: 0.02, luz: true, a: a * 0.75 }));
      arriba.push(R(0, d / 2 - 0.36, 1.22, 0.15, c.mez(brillo, claro, 0.34), { r: 0.07, luz: true, a }));
      // El aviso: dos anillos que salen del centro de la pantalla.
      if (av > 0 && av < 1) for (const k of [0, 0.3]) { const u = sat((av - k) / 0.7); if (u > 0 && u < 1) arriba.push(Q(0, 0, 0.4 + u * 2.4, 0.4 + u * 2.4, 0.05, c.acento, { r: 0.2 + u * 1.2, luz: true, a: 1 - u })); }
      const pz = [caja(w, d, h, { r: 0.28, b: 0.03, seg: 8, color: col, mat: 'metal', deco: { arriba } })];
      pz.push(caja(0.03, 0.46, 0.05, { x: w / 2 + 0.008, y: -0.72, z: 0.06, color: c.mez(col, c.papel, 0.25), mat: 'metal', sombra: false }));
      pz.push(caja(0.03, 0.26, 0.05, { x: w / 2 + 0.008, y: -0.2, z: 0.06, color: c.mez(col, c.papel, 0.25), mat: 'metal', sombra: false }));
      return pz;
    },
  },
  pantalla: {
    alto: () => 2.75,
    acciones: ['enciende'],
    crear(p, e, c) {
      const w = 3.3, h = 2.05, col = p.color ?? c.cuerpo, on = e.enciende ?? 1, vidrio = c.mez(c.fondo, c.secundario, 0.14 + on * 0.1), a = sat(on * 1.4);
      const izq = [R(0, 0, w - 0.14, h - 0.14, vidrio, { r: 0.05, luz: true })];
      const barras = [0.3, 0.46, 0.38, 0.62, 0.8];
      barras.forEach((v, i) => izq.push(R(-0.95 + i * 0.32, 0.55 - v * 0.6, 0.22, v * 1.2, i === 4 ? c.acento : c.mez(vidrio, c.papel, 0.5), { r: 0.03, luz: true, a })));
      izq.push(R(0.95, -0.42, 0.78, 0.09, c.mez(vidrio, c.papel, 0.5), { r: 0.03, luz: true, a }), R(0.95, -0.16, 0.78, 0.09, c.mez(vidrio, c.papel, 0.35), { r: 0.03, luz: true, a }), R(0.95, 0.1, 0.78, 0.09, c.mez(vidrio, c.papel, 0.35), { r: 0.03, luz: true, a }));
      return [cilindro(0.72, 0.08, { b: 0.02, color: col, mat: 'metal' }), caja(0.26, 0.16, 0.66, { y: 0, z: 0.08, r: 0.04, color: c.mez(col, c.fondo, 0.25), mat: 'metal' }), caja(w, 0.16, h, { z: 0.7, r: 0.06, b: 0.02, seg: 3, color: col, mat: 'metal', deco: { izq } })];
    },
  },
  servidor: {
    alto: (p) => 0.14 + (p.bandejas ?? 5) * 0.66 + 0.12,
    acciones: ['enciende'],
    crear(p, e, c) {
      const w = 2.3, d = 2.3, n = p.bandejas ?? 5, hb = 0.6, g = 0.06, col = p.color ?? c.cuerpo, on = e.enciende ?? 1, t = e.t ?? 0;
      const hueco = c.mez(col, c.fondo, 0.62), borde = c.mez(col, c.secundario, 0.45);
      const pz = [caja(w + 0.14, d + 0.14, 0.14, { r: 0.1, b: 0.02, color: c.mez(col, c.fondo, 0.3), mat: 'metal' })];
      for (let i = 0; i < n; i++) {
        const z = 0.14 + i * (hb + g), izq = [R(0, 0, w - 0.12, hb - 0.12, hueco, { r: 0.03 })], der = [];
        for (let k = 0; k < 5; k++) {
          const x = -w / 2 + 0.3 + k * 0.28, chispa = on * (azar2(i, k, Math.floor(t * 7)) > 0.42 ? 1 : 0.28);
          izq.push(R(x, 0.02, 0.2, hb - 0.3, c.mez(hueco, c.cuerpo, 0.8), { r: 0.015 }));
          izq.push(O(x, -hb / 2 + 0.17, 0.03, k === 0 ? c.acento : c.papel, { luz: true, a: 0.25 + 0.75 * chispa }));
        }
        izq.push(R(w / 2 - 0.42, 0, 0.5, 0.12, c.mez(hueco, borde, 0.8), { r: 0.02 }), O(w / 2 - 0.42, 0, 0.035, c.acento, { luz: true, a: 0.3 + 0.7 * on }));
        der.push(R(0, 0, w - 0.12, hb - 0.12, hueco, { r: 0.03 }));
        for (let k = 0; k < 9; k++) der.push(L(-w / 2 + 0.25 + k * 0.23, -hb / 2 + 0.14, -w / 2 + 0.25 + k * 0.23, hb / 2 - 0.14, 0.05, c.mez(hueco, borde, 0.55), { cap: 'round' }));
        pz.push(caja(w, d, hb, { z, r: 0.07, b: 0.02, seg: 3, color: col, mat: 'metal', deco: { izq, der } }));
      }
      const zt = 0.14 + n * (hb + g), ww = w + 0.06;
      const arriba = [R(0, 0, ww - 0.16, ww - 0.16, p.tapa ?? c.mez(col, c.fondo, 0.3), { r: 0.08 }), Q(0, 0, ww - 0.16, ww - 0.16, 0.02, borde, { r: 0.08 })];
      if (p.losas) {
        const paso = p.losas, a = ww - 0.18;
        for (let i = paso - a / 2; i < a / 2; i += paso) arriba.push(L(i, -a / 2, i, a / 2, paso * 0.018, c.mez(c.mez(col, c.fondo, 0.3), c.papel, 0.14)), L(-a / 2, i, a / 2, i, paso * 0.018, c.mez(c.mez(col, c.fondo, 0.3), c.papel, 0.14)));
      }
      pz.push(caja(ww, ww, 0.12, { z: zt, r: 0.09, b: 0.025, seg: 4, color: borde, mat: 'metal', recibe: true, deco: { arriba } }));
      return pz;
    },
  },
  chip: {
    alto: () => 0.42,
    crear(p, e, c) {
      const w = 2.4, col = p.color ?? c.cuerpo, pz = [], pat = c.mez(c.papel, c.secundario, 0.35);
      for (let i = 0; i < 6; i++) {
        const q = -w / 2 + 0.3 + i * 0.36;
        pz.push(caja(0.14, 0.34, 0.05, { x: q, y: w / 2 + 0.1, color: pat, mat: 'metal', sombra: false }), caja(0.14, 0.34, 0.05, { x: q, y: -w / 2 - 0.1, color: pat, mat: 'metal', sombra: false }), caja(0.34, 0.14, 0.05, { x: w / 2 + 0.1, y: q, color: pat, mat: 'metal', sombra: false }), caja(0.34, 0.14, 0.05, { x: -w / 2 - 0.1, y: q, color: pat, mat: 'metal', sombra: false }));
      }
      pz.push(caja(w, w, 0.26, { z: 0.02, r: 0.12, b: 0.03, color: col, mat: 'mate', recibe: true, deco: { arriba: [Q(0, 0, w - 0.3, w - 0.3, 0.02, c.mez(col, c.secundario, 0.7), { r: 0.08 }), O(-w / 2 + 0.32, -w / 2 + 0.32, 0.07, c.mez(col, c.papel, 0.5))] } }));
      pz.push(caja(1.25, 1.25, 0.14, { z: 0.28, r: 0.08, b: 0.03, color: p.acento ?? c.acento, mat: 'metal' }));
      return pz;
    },
  },
  // ── Cosas de bodega y de negocio ───────────────────────────────────────────
  caja: {
    alto: () => 1.3,
    acciones: ['abre'],
    crear(p, e, c) {
      const w = 1.8, d = 1.8, h = 1.3, col = p.color ?? c.mez(c.secundario, c.papel, 0.12), cinta = c.mez(col, c.papel, 0.42), ab = e.abre ?? 0;
      const arriba = [L(-w / 2 + 0.03, 0, w / 2 - 0.03, 0, 0.02, c.mez(col, c.fondo, 0.5))];
      if (ab <= 0) arriba.push(R(0, 0, 0.36, d - 0.06, cinta, { r: 0.005 }));
      const izq = [R(0, -h / 2 + 0.16, 0.36, 0.34, cinta), R(-0.3, 0.2, 0.86, 0.5, c.claroPapel, { r: 0.03 }), R(-0.42, 0.08, 0.44, 0.07, c.linea, { a: 0.7 }), R(-0.3, 0.22, 0.68, 0.05, c.linea, { a: 0.5 }), R(-0.36, 0.33, 0.56, 0.05, c.linea, { a: 0.5 })];
      const der = [L(-d / 2 + 0.2, h / 2 - 0.2, -d / 2 + 0.2, h / 2 - 0.52, 0.05, c.mez(col, c.fondo, 0.55)), L(-d / 2 + 0.42, h / 2 - 0.2, -d / 2 + 0.42, h / 2 - 0.52, 0.05, c.mez(col, c.fondo, 0.55))];
      const pz = [caja(w, d, h, { r: 0.03, b: 0.02, seg: 2, color: col, mat: 'carton', recibe: true, deco: { arriba, izq, der } })];
      if (ab > 0) {
        for (const [sx, sy] of [[1, 0], [-1, 0]]) {
          const f = caja(d, 0.9, 0.03, { color: c.mez(col, c.papel, 0.08), mat: 'carton', sombra: false, debajo: true });
          tira(f, M.por(M.mover(0, (sx * d) / 2, h), M.por(M.rotX(-sx * ab * 1.9), M.mover(0, (-sx * 0.9) / 2, 0))));
          pz.push(f);
        }
      }
      return pz;
    },
  },
  estante: {
    alto: () => 3.2,
    acciones: ['saca'],
    crear(p, e, c) {
      const w = 3.4, d = 1.1, h = 3.2, col = p.color ?? c.mez(c.cuerpo, c.secundario, 0.35), pz = [], rr = rng(p.semilla ?? 9), pisos = 3, fila = 3, alto = h / pisos, acento = p.destacada ?? [1, 1], sa = e.saca ?? 0;
      for (const [a, b] of [[-1, -1], [1, -1]]) pz.push(caja(0.1, 0.1, h, { x: (a * (w - 0.1)) / 2, y: (b * (d - 0.1)) / 2, color: col, mat: 'metal', sombra: true }));
      for (let i = 0; i < pisos; i++) {
        const z = i * alto + 0.06;
        pz.push(caja(w, d, 0.07, { z, r: 0.02, color: col, mat: 'metal', recibe: true }));
        for (let k = 0; k < fila; k++) {
          const es = i === acento[0] && k === acento[1], bw = 0.74 + rr() * 0.12, bh = 0.56 + rr() * 0.26, x = -w / 2 + (w / fila) * (k + 0.5) + (rr() - 0.5) * 0.08, tono = c.mez(c.mez(c.secundario, c.papel, 0.08 + rr() * 0.26), c.fondo, rr() * 0.22);
          if (es && sa >= 1) continue; // Ya salió: desde aquí sigue otro objeto, el que viaja.
          pz.push(caja(bw, 0.82, bh, { x, y: 0.02 + (es ? sa * 1.15 : 0), z: z + 0.07 + (es ? sa * 0.18 : 0), r: 0.02, b: 0.012, seg: 2, color: es ? c.acento : tono, mat: 'carton', deco: { izq: [R(0, 0, 0.16, bh, c.mez(es ? c.acento : tono, c.papel, 0.35)), R(-bw / 2 + 0.2, bh / 2 - 0.16, 0.24, 0.14, c.claroPapel)], arriba: [R(0, 0, 0.16, 0.8, c.mez(es ? c.acento : tono, c.papel, 0.35))] } }));
        }
      }
      for (const [a, b] of [[-1, 1], [1, 1]]) pz.push(caja(0.1, 0.1, h, { x: (a * (w - 0.1)) / 2, y: (b * (d - 0.1)) / 2, color: col, mat: 'metal' }));
      pz.push(caja(w, d, 0.07, { z: h - 0.07, r: 0.02, color: col, mat: 'metal' }));
      return pz;
    },
  },
  lupa: {
    alto: () => 2.2,
    crear(p, e, c) {
      // Mira de frente a la cámara: en pantalla es un círculo, con el mango hacia abajo a la derecha.
      const r = 0.95, col = p.color ?? c.acento, an = [], s = Math.SQRT1_2;
      for (let i = 0; i <= 56; i++) { const a = (i / 56) * Math.PI * 2; an.push([r * Math.cos(a), r * Math.sin(a), 0]); }
      const de = M.por(M.mover(0, 0, 1.2), M.por(M.rotZ(Math.PI / 4), M.rotY(0.9553)));
      const vidrio = cilindro(r, 0.012, { z: -0.006, color: c.papel, mat: 'vidrio', alfa: 0.14, sombra: false, n: 48, ao: 0, deco: { arriba: [L(-0.62, 0.14, -0.14, 0.62, 0.07, '#FFFFFF', { luz: true, a: 0.55, cap: 'round' }), L(-0.42, -0.06, -0.3, 0.06, 0.05, '#FFFFFF', { luz: true, a: 0.4, cap: 'round' })] } });
      const aro = tubo(an, 0.12, { color: col, mat: 'metal', n: 12 });
      const cuello = capsula([(r + 0.04) * s, -(r + 0.04) * s, 0], [(r + 0.34) * s, -(r + 0.34) * s, 0], 0.09, { color: c.mez(col, c.papel, 0.3), mat: 'metal', n: 10, sombra: false });
      const mango = capsula([(r + 0.34) * s, -(r + 0.34) * s, 0], [(r + 1.22) * s, -(r + 1.22) * s, 0], 0.17, { color: c.cuerpo, mat: 'metal', n: 14 });
      return [tira(vidrio, de), tira(aro, de), tira(cuello, de), tira(mango, de)];
    },
  },
  barras: {
    alto: (p) => 3,
    acciones: ['crece'],
    crear(p, e, c) {
      const valores = p.valores ?? [0.42, 0.62, 0.8, 1], n = valores.length, ancho = 0.82, paso = 0.98, cr = e.crece ?? 1, largo = n * paso + 0.3;
      const pz = [caja(1.6, largo, 0.16, { r: 0.1, b: 0.03, color: c.cuerpo, recibe: true, deco: { arriba: [Q(0, 0, 1.42, largo - 0.18, 0.02, c.secundario, { r: 0.07 })] } })];
      for (let i = 0; i < n; i++) {
        const u = liso(cr * (n + 1) - i * 0.9), h = Math.max(0.02, valores[i] * 2.9 * u), ul = i === n - 1, y = ((n - 1) / 2 - i) * paso, col = p.colores?.[i] ?? (ul ? c.acento : c.mez(c.secundario, c.papel, 0.1 + i * 0.05));
        const raya = [];
        for (let k = 1; k * 0.5 < h - 0.1; k++) raya.push(R(0, h / 2 - k * 0.5, ancho - 0.1, 0.018, c.mez(col, c.fondo, 0.4)));
        pz.push(caja(ancho, ancho, h, { y, z: 0.16, r: 0.06, b: 0.03, seg: 3, color: col, mat: ul ? 'metal' : 'mate', deco: { izq: raya } }));
      }
      return pz;
    },
  },
  moneda: {
    alto: (p) => (p.pila ?? 1) * 0.3,
    crear(p, e, c) {
      const r = 1, col = p.color ?? c.acento, n = p.pila ?? 1, pz = [];
      for (let i = 0; i < n; i++) {
        const z = i * 0.3, ult = i === n - 1;
        const an = [{ p: circulo(r, 96), z }, { p: circulo(r, 96), z: z + 0.24 }, { p: circulo(r - 0.04, 96), z: z + 0.28 }, { p: circulo(r - 0.14, 96), z: z + 0.28 }, { p: circulo(r - 0.18, 96), z: z + 0.235 }];
        const m = loft(an, { color: col, mat: 'metal', convexa: false, recibe: !ult });
        if (ult) m.deco.push({ o: [0, 0, z + 0.235], u: [1 / Math.SQRT2, -1 / Math.SQRT2, 0], v: [1 / Math.SQRT2, 1 / Math.SQRT2, 0], n: [0, 0, 1], cmds: [T(p.texto ?? '$', 0.015, 0.03, 1.1, c.mez(col, c.fondo, 0.5), { peso: 700, alto: 1.32 }), T(p.texto ?? '$', 0, 0, 1.1, c.mez(col, c.claroPapel, 0.55), { peso: 700, alto: 1.32 })] });
        pz.push(m);
      }
      return pz;
    },
  },
  engranaje: {
    alto: () => 0.58,
    acciones: ['gira'],
    crear(p, e, c) {
      const R0 = 1.25, R1 = 0.98, dientes = p.dientes ?? 10, col = p.color ?? c.secundario, pts = [], giro = (e.gira ?? 0) * (p.velocidad ?? 1.8);
      for (let i = 0; i < dientes; i++) {
        const a = (i / dientes) * Math.PI * 2, s = (Math.PI * 2) / dientes;
        for (const [da, rr] of [[-0.3, R1], [-0.17, R0], [0.17, R0], [0.3, R1]]) pts.push([rr * Math.cos(a + da * s), rr * Math.sin(a + da * s)]);
      }
      const rueda = prisma(pts, 0.38, { color: col, mat: 'metal', b: 0.03, recibe: true });
      const cuerpo = cilindro(0.62, 0.1, { z: 0.38, b: 0.02, color: c.mez(col, c.papel, 0.12), mat: 'metal', n: 32, sombra: false });
      const eje = cilindro(0.27, 0.1, { z: 0.48, b: 0.02, color: c.cuerpo, mat: 'metal', n: 24, sombra: false, deco: { arriba: [O(0, 0, 0.1, c.fondo)] } });
      const rot = M.rotZ(giro);
      for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.6; cuerpo.deco.push({ o: [0, 0, 0.48], u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1], cmds: [O(0.44 * Math.cos(a), 0.44 * Math.sin(a), 0.045, c.mez(col, c.fondo, 0.45))] }); }
      return [tira(rueda, rot), tira(cuerpo, rot), tira(eje, rot)];
    },
  },
  // ── Símbolos ───────────────────────────────────────────────────────────────
  nube: {
    alto: () => 2.5,
    crear(p, e, c) {
      const col = p.color ?? c.papel, z = 1.5;
      const piezas = [[-0.28, -0.28, 0.1, 0.72], [0.62, -0.62, -0.05, 0.64], [-0.86, 0.86, -0.1, 0.56], [0.1, 0.1, 0.42, 0.86], [0.58, 0.58, -0.08, 0.5], [-0.46, 0.46, -0.08, 0.68], [0, -1.3 / 1.4, -0.22, 0.42]];
      return [...piezas.map(([x, y, dz, r]) => bola(r, { x, y, z: z + dz, color: col, mat: 'papel' }))];
    },
  },
  candado: {
    alto: () => 2.3,
    acciones: ['abre'],
    crear(p, e, c) {
      const w = 1.75, d = 0.9, h = 1.3, col = p.color ?? c.acento, ab = e.abre ?? 0, metal = c.mez(c.papel, c.secundario, 0.3), arco = [];
      const q = c.mez(col, c.fondo, 0.72);
      const izq = [O(0, -0.08, 0.17, q), P([[-0.09, -0.04], [0.09, -0.04], [0.13, 0.32], [-0.13, 0.32]], q)];
      const base = caja(w, d, h, { r: 0.2, b: 0.05, seg: 6, color: col, mat: 'metal', deco: { izq } });
      arco.push([-0.52, 0, h - 0.05]);
      for (let i = 0; i <= 16; i++) { const a = Math.PI - (i / 16) * Math.PI; arco.push([0.52 * Math.cos(a), 0, h + 0.3 + 0.62 * Math.sin(a)]); }
      arco.push([0.52, 0, h - 0.05]);
      const gancho = tubo(arco, 0.12, { color: metal, mat: 'metal', n: 12 });
      if (ab > 0) tira(gancho, M.por(M.mover(-0.52, 0, ab * 0.36), M.por(M.rotZ(ab * -1.1), M.mover(0.52, 0, 0))));
      return [gancho, base];
    },
  },
  flecha: {
    alto: () => 0.36,
    acciones: ['crece'],
    crear(p, e, c) {
      const L0 = p.largo ?? 4, t = 0.34, hw = 0.92, hd = 1.15, u = e.crece ?? 1, largo = Math.max(hd + 0.02, L0 * u);
      const pts = [[-L0 / 2, -t], [-L0 / 2 + largo - hd, -t], [-L0 / 2 + largo - hd, -hw], [-L0 / 2 + largo, 0], [-L0 / 2 + largo - hd, hw], [-L0 / 2 + largo - hd, t], [-L0 / 2, t]];
      const rot = M.rotZ(((p.angulo ?? 0) * Math.PI) / 180);
      return [tira(prisma(pts, 0.36, { color: p.color ?? c.acento, mat: 'metal', b: 0.05, convexa: false }), rot)];
    },
  },
  aprobado: {
    alto: () => 0.62,
    acciones: ['traza'],
    crear(p, e, c) {
      const r = 1.3, col = p.color ?? c.acento, signo = p.signo ?? c.oscuroSobre(col), u = e.traza ?? 1, disco = [{ p: circulo(r, 120), z: 0 }, { p: circulo(r, 120), z: 0.24 }, { p: circulo(r - 0.05, 120), z: 0.29 }, { p: circulo(r - 0.17, 120), z: 0.29 }, { p: circulo(r - 0.22, 120), z: 0.24 }];
      const m = loft(disco, { color: col, mat: 'metal', convexa: false, recibe: true });
      const pz = [m];
      if (u > 0) {
        const trazo = [[-0.62, -0.04], [-0.17, 0.46], [0.72, -0.56]].map(([a, b]) => [a * 0.98, b * 1.24]);
        const pts = polilinea(trazo.map(dePantalla), 0.34);
        const k = 0.2 + 0.8 * u, ch = prisma(pts, 0.16 * Math.max(0.3, u), { z: 0.24, color: signo, mat: 'mate', b: 0.03, convexa: false, sombra: false });
        tira(ch, M.por(M.mover(0, 0, 0.24), M.por(M.escala(k, k, 1), M.mover(0, 0, -0.24))));
        pz.push(ch);
      }
      return pz;
    },
  },
  // Letras en volumen. Plano 'suelo': acostadas, se leen hacia arriba a la derecha. Plano 'pared': de pie, de frente al lado izquierdo.
  letras: {
    alto: (p) => (p.plano === 'suelo' ? (p.grosor ?? 0.3) : (p.letra ?? 1.6) * 0.8),
    crear(p, e, c) {
      const letra = p.letra ?? 1.6, grosor = p.grosor ?? 0.3, peso = p.peso ?? 800, ancho = c.medir(p.texto, letra, peso), suelo = p.plano === 'suelo', alto = letra * 0.86;
      return [{
        k: 'letras', texto: p.texto, letra, peso, familia: p.familia, ancho, alto, color: p.color ?? c.acento, mat: p.material ?? 'metal', sombra: true,
        o: suelo ? [0, 0, 0] : [0, 0, alto / 2], u: suelo ? [0, -1, 0] : [1, 0, 0], v: suelo ? [1, 0, 0] : [0, 0, -1], e: suelo ? [0, 0, grosor] : [0, -grosor, 0],
      }];
    },
  },
};

export const TIPOS = Object.keys(BIBLIOTECA);
