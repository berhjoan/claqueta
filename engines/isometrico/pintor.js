// Pinta un instante de la película en un lienzo. Siempre función de t: nada de azar sin semilla, relojes ni estado entre cuadros.
// La luz es una sola: cara de arriba más clara, izquierda media, derecha oscura, sombras hacia la derecha. Para una pieza normal, aquí no se toca nada.
import { COS30, LUZ, SOMBRA, casco, deIso, norma, ordenar, rng, vertices } from './solidos.js';
import { brillo, hex, mez, rgb } from './motor.js';

const MAT = {
  suelo: { a: 0.05, i: 0.02, d: 0.34, e: 0, p: 30 },
  mate: { a: 0.14, i: 0.1, d: 0.52, e: 0.2, p: 30 },
  papel: { a: 0.3, i: 0.13, d: 0.44, e: 0.05, p: 26 },
  carton: { a: 0.1, i: 0.14, d: 0.48, e: 0.05, p: 26 },
  metal: { a: 0.24, i: 0.18, d: 0.6, e: 0.75, p: 34 },
  vidrio: { a: 0.3, i: 0.1, d: 0.3, e: 0.6, p: 34 },
};
const VISTA = norma([1, 1, 1]);
const MEDIO = norma([LUZ[0] + VISTA[0], LUZ[1] + VISTA[1], LUZ[2] + VISTA[2]]);

function newell(p) {
  let nx = 0, ny = 0, nz = 0;
  const n = p.length;
  for (let i = 0; i < n; i++) {
    const a = p[i], b = p[i + 1 === n ? 0 : i + 1];
    nx += (a[1] - b[1]) * (a[2] + b[2]);
    ny += (a[2] - b[2]) * (a[0] + b[0]);
    nz += (a[0] - b[0]) * (a[1] + b[1]);
  }
  const l = Math.hypot(nx, ny, nz);
  return l < 1e-9 ? null : [nx / l, ny / l, nz / l];
}

export function crearPintor(canvas, peli) {
  const { W, H, c } = peli;
  if (canvas.width !== W) canvas.width = W;
  if (canvas.height !== H) canvas.height = H;
  const ctx = canvas.getContext('2d', { alpha: false });
  const F_TIT = `"${peli.FAM.titulos}", sans-serif`;

  // ── Tonos ─────────────────────────────────────────────────────────────────
  const LUMINOSO = mez(c.papel, '#FFFFFF', 0.45), LUZ_TIBIA = mez(c.secundario, c.papel, 0.42), SOMBRA_CALIDA = mez(c.secundario, c.negro, 0.62), NEGRO = rgb(c.negro);
  const rampas = new Map();
  function rampa(color, mat = 'mate') {
    const clave = color + mat;
    let r = rampas.get(clave);
    if (r) return r;
    const m = MAT[mat] ?? MAT.mate, b = brillo(color), oscuro = 1 - Math.min(1, b / 0.34);
    const luzHacia = mez(LUMINOSO, LUZ_TIBIA, oscuro);
    const arriba = mez(color, luzHacia, m.a * (0.55 + 1.15 * oscuro)), izq = oscuro > 0.6 ? mez(color, luzHacia, m.i * 1.3 * oscuro) : mez(color, SOMBRA_CALIDA, m.i), der = mez(color, oscuro > 0.6 ? c.negro : SOMBRA_CALIDA, m.d * (oscuro > 0.6 ? 0.5 : 1));
    r = { arriba: rgb(arriba), izq: rgb(izq), der: rgb(der), espalda: rgb(mez(der, c.negro, 0.25)), m, base: rgb(color), cssArriba: arriba, cssIzq: izq, cssDer: der };
    rampas.set(clave, r);
    return r;
  }
  const blanco = rgb(LUMINOSO);
  function tono(rp, n) {
    const xx = n[0] * n[0], yy = n[1] * n[1], zz = n[2] * n[2];
    const X = n[0] > 0 ? rp.der : rp.izq, Y = n[1] > 0 ? rp.izq : rp.der, Z = n[2] > 0 ? rp.arriba : rp.espalda;
    let r = xx * X[0] + yy * Y[0] + zz * Z[0], g = xx * X[1] + yy * Y[1] + zz * Z[1], b = xx * X[2] + yy * Y[2] + zz * Z[2];
    const q = n[0] * MEDIO[0] + n[1] * MEDIO[1] + n[2] * MEDIO[2];
    if (q > 0.5 && rp.m.e > 0) { const s = Math.pow(q, rp.m.p) * rp.m.e; r += (blanco[0] - r) * s; g += (blanco[1] - g) * s; b += (blanco[2] - b) * s; }
    return `rgb(${r | 0},${g | 0},${b | 0})`;
  }

  const sombraC = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(Math.ceil(W / 2), Math.ceil(H / 2)) : null, sombraX = sombraC ? sombraC.getContext('2d') : null;

  // ── Grano, de una sola semilla ────────────────────────────────────────────
  let grano = null;
  if (typeof OffscreenCanvas !== 'undefined') {
    const G = new OffscreenCanvas(256, 256), g = G.getContext('2d'), im = g.createImageData(256, 256), R = rng(77);
    for (let i = 0; i < 256 * 256; i++) { const v = 128 + (R() + R() - 1) * 120; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
    g.putImageData(im, 0, 0);
    grano = ctx.createPattern(G, 'repeat');
  }

  // ── Colores del suelo ─────────────────────────────────────────────────────
  const baseSuelo = c.oscuro ? mez(c.superficie, c.tinta, 0.035) : c.superficie;
  const juntas = c.oscuro ? mez(c.fondo, c.superficie, 0.3) : mez(c.superficie, c.negro, 0.09);
  const NIVELES = 5, apaga = (d) => Math.min(NIVELES - 1, Math.floor(Math.max(0, d - 2.5) / 3));
  const fundido = (nivel) => (nivel / (NIVELES - 1)) * (c.oscuro ? 0.62 : 0.3);
  const tonosSuelo = Array.from({ length: NIVELES }, (_, n) => Array.from({ length: peli.S.tonos }, (_, i) => mez(mez(baseSuelo, c.oscuro ? c.tinta : '#FFFFFF', (c.oscuro ? 0.017 : 0.1) * i), c.oscuro ? c.fondo : c.superficie, fundido(n))));
  const relieveMat = (h, d) => rampa(mez(mez(baseSuelo, c.oscuro ? c.tinta : c.negro, c.oscuro ? Math.min(0.1, 0.02 + h * 0.024) : Math.min(0.16, 0.02 + h * 0.03)), c.oscuro ? c.fondo : c.superficie, fundido(apaga(d))), 'suelo');

  function pintarMundo(x, t) {
    const E = peli.escena(t), cam = E.cam, k = cam.k;
    const sx = (a, b, z) => W / 2 + ((a - b) * COS30 - cam.cu) * k;
    const sy = (a, b, z) => H / 2 + ((a + b) / 2 - z - cam.cv) * k;
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalAlpha = 1; x.filter = 'none'; x.globalCompositeOperation = 'source-over'; x.lineCap = 'butt'; x.lineJoin = 'round'; x.setLineDash([]);
    x.fillStyle = juntas;
    x.fillRect(0, 0, W, H);

    // Plano horizontal a altura z: (a, b) en el mundo a pantalla.
    const plano = (z) => x.setTransform(COS30 * k, 0.5 * k, -COS30 * k, 0.5 * k, sx(0, 0, z), sy(0, 0, z));
    const pantalla = () => x.setTransform(1, 0, 0, 1, 0, 0);

    // ── 1. Losas ────────────────────────────────────────────────────────────
    const cel = peli.S.celda;
    const esquinas = [[-60, -60], [W + 60, -60], [-60, H + 60], [W + 60, H + 60]].map(([a, b]) => deIso((a - W / 2) / k + cam.cu, (b - H / 2) / k + cam.cv, 0));
    const margenAlto = 4 / cel;
    const i0 = Math.floor(Math.min(...esquinas.map((q) => q[0])) / cel) - 1, i1 = Math.ceil(Math.max(...esquinas.map((q) => q[0])) / cel) + 1 + margenAlto;
    const j0 = Math.floor(Math.min(...esquinas.map((q) => q[1])) / cel) - 1, j1 = Math.ceil(Math.max(...esquinas.map((q) => q[1])) / cel) + 1 + margenAlto;
    const altos = [], capasTono = Array.from({ length: NIVELES * peli.S.tonos }, () => []), hueco = Math.max(0.012, 1.1 / k);
    const uMax = (W + 90) / k + cam.cu - W / 2 / k, uMin = -90 / k + cam.cu - W / 2 / k, vMin = -90 / k + cam.cv - H / 2 / k, vMax = (H + 90) / k + cam.cv - H / 2 / k;
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const a0 = i * cel, b0 = j * cel, u = (a0 - b0) * COS30, v = (a0 + b0) / 2;
        if (u < uMin - cel * 1.8 || u > uMax + cel * 1.8 || v < vMin - cel * 1.8 || v > vMax + 5) continue;
        const h = peli.alturaCelda(i, j, t), d = peli.celda(i, j);
        if (h > 0.02) altos.push({ i, j, h, d });
        else capasTono[apaga(d.d) * peli.S.tonos + d.tono].push(i, j);
      }
    }
    plano(0);
    capasTono.forEach((lista, q) => {
      if (!lista.length) return;
      x.fillStyle = tonosSuelo[Math.floor(q / peli.S.tonos)][q % peli.S.tonos];
      x.beginPath();
      for (let n = 0; n < lista.length; n += 2) x.rect(lista[n] * cel + hueco / 2, lista[n + 1] * cel + hueco / 2, cel - hueco, cel - hueco);
      x.fill();
    });
    // Algunas losas llevan un marco fino. Solo si se alcanza a ver.
    if (k > 70) {
      x.lineWidth = 1 / k;
      x.strokeStyle = c.oscuro ? mez(baseSuelo, c.tinta, 0.12) : mez(baseSuelo, c.negro, 0.1);
      x.beginPath();
      capasTono.forEach((lista) => { for (let n = 0; n < lista.length; n += 2) { const d = peli.celda(lista[n], lista[n + 1]); if (d.panel) x.rect(lista[n] * cel + cel * 0.14, lista[n + 1] * cel + cel * 0.14, cel * 0.72, cel * 0.72); } });
      x.stroke();
    }

    // ── 2. Caminos sobre el suelo ───────────────────────────────────────────
    for (const cm of E.caminos) if (!cm.aereo) pintarCamino(x, cm, t, plano);

    // ── 3. Sombras sobre el suelo: las del relieve y las de cada sólido ─────
    const casters = E.prims.filter((p) => p.sombra !== false && p.alfa !== 0);
    const sombraEn = (zr, pr) => {
      const pts = [];
      const v = pr._v ?? (pr._v = vertices(pr));
      for (const q of v) {
        const dz = q[2] - zr;
        if (dz < -0.001) continue;
        const a = q[0] + dz * SOMBRA[0], b = q[1] + dz * SOMBRA[1];
        pts.push([sx(a, b, zr), sy(a, b, zr)]);
      }
      return pts.length >= 3 ? casco(pts) : null;
    };
    const trazar = (hull, g = x) => { g.moveTo(hull[0][0], hull[0][1]); for (let n = 1; n < hull.length; n++) g.lineTo(hull[n][0], hull[n][1]); g.closePath(); };
    pantalla();
    const desen = (px) => Math.max(1, Math.min(30, px));
    // Una sombra blanda: se dibuja chica, se difumina y se agranda. Mucho más barato que difuminar en grande.
    const blanda = (cascos, radio, alfa, region) => {
      if (!cascos.length) return;
      const esc = radio <= 2.5 ? 0.5 : radio <= 7 ? 0.34 : radio <= 16 ? 0.2 : 0.125, [rx, ry, rw, rh] = region ?? [0, 0, W, H];
      const g = sombraX;
      g.setTransform(1, 0, 0, 1, 0, 0); g.filter = 'none'; g.clearRect(0, 0, sombraC.width, sombraC.height);
      g.setTransform(esc, 0, 0, esc, 0, 0);
      g.filter = `blur(${Math.max(0.4, radio * esc).toFixed(2)}px)`;
      g.fillStyle = tintaSombraCss;
      g.beginPath();
      for (const h of cascos) trazar(h, g);
      g.fill();
      x.globalAlpha = alfa; x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'medium';
      x.drawImage(sombraC, rx * esc, ry * esc, rw * esc, rh * esc, rx, ry, rw, rh);
      x.globalAlpha = 1;
    };
    const tintaSombra = c.oscuro ? '0,0,0' : NEGRO.join(','), tintaSombraCss = `rgb(${tintaSombra})`;
    x.beginPath();
    for (const a of altos) {
      const A = a.i * cel, B = a.j * cel, h = a.h, of = [h * SOMBRA[0], h * SOMBRA[1]];
      trazar(casco([[A, B], [A + cel, B], [A + cel, B + cel], [A, B + cel], [A + of[0], B + of[1]], [A + cel + of[0], B + of[1]], [A + cel + of[0], B + cel + of[1]], [A + of[0], B + cel + of[1]]].map(([p, q]) => [sx(p, q, 0), sy(p, q, 0)])));
    }
    x.fillStyle = `rgba(${tintaSombra},${c.oscuro ? 0.5 : 0.16})`;
    x.fill();
    // Lejos del suelo la sombra es más suave y más clara; pegada, oscura y corta.
    const cercanas = [], lejanas = [], contacto = [];
    for (const pr of casters) {
      const h = sombraEn(0, pr);
      if (h) (pr.aabb[2] > 1.4 ? lejanas : cercanas).push(h);
      if (pr.aabb[2] <= 0.05 && pr.k === 'malla') { const v = (pr._v ?? (pr._v = vertices(pr))).filter((q) => q[2] < pr.aabb[2] + 0.02); if (v.length >= 3) contacto.push(casco(v.map((q) => [sx(q[0], q[1], 0), sy(q[0], q[1], 0)]))); }
    }
    blanda(cercanas, desen(0.1 * k), c.oscuro ? 0.66 : 0.3);
    blanda(lejanas, desen(0.26 * k), c.oscuro ? 0.42 : 0.2);
    blanda(contacto, desen(0.035 * k), c.oscuro ? 0.8 : 0.35);

    // ── 4. Relieve, de atrás hacia adelante ─────────────────────────────────
    altos.sort((p, q) => p.i + p.j - (q.i + q.j));
    for (const a of altos) {
      const A = a.i * cel + hueco / 2, B = a.j * cel + hueco / 2, L = cel - hueco, h = a.h, rp = relieveMat(a.d.h, a.d.d);
      const p = (u, v, z) => [sx(u, v, z), sy(u, v, z)];
      const t1 = p(A, B, h), t2 = p(A + L, B, h), t3 = p(A + L, B + L, h), t4 = p(A, B + L, h), b2 = p(A + L, B, 0), b3 = p(A + L, B + L, 0), b4 = p(A, B + L, 0);
      x.fillStyle = rp.cssDer; x.beginPath(); x.moveTo(t2[0], t2[1]); x.lineTo(t3[0], t3[1]); x.lineTo(b3[0], b3[1]); x.lineTo(b2[0], b2[1]); x.closePath(); x.fill();
      x.fillStyle = rp.cssIzq; x.beginPath(); x.moveTo(t4[0], t4[1]); x.lineTo(t3[0], t3[1]); x.lineTo(b3[0], b3[1]); x.lineTo(b4[0], b4[1]); x.closePath(); x.fill();
      x.fillStyle = rp.cssArriba; x.beginPath(); x.moveTo(t1[0], t1[1]); x.lineTo(t2[0], t2[1]); x.lineTo(t3[0], t3[1]); x.lineTo(t4[0], t4[1]); x.closePath(); x.fill();
      // El canto que da a la luz, finísimo.
      x.strokeStyle = c.oscuro ? mez(rp.cssArriba, c.tinta, 0.18) : mez(rp.cssArriba, '#FFFFFF', 0.5);
      x.lineWidth = Math.max(0.6, 0.012 * k);
      x.beginPath(); x.moveTo(t4[0], t4[1]); x.lineTo(t3[0], t3[1]); x.lineTo(t2[0], t2[1]); x.stroke();
      if (a.d.led && k > 40) {
        const q = plano;
        q(h);
        x.fillStyle = c.acento;
        x.globalAlpha = 0.55 + 0.45 * Math.sin(t * 2 + a.i * 3.1 + a.j * 1.7);
        x.beginPath(); x.rect(A + L * 0.42, B + L * 0.42, L * 0.16, L * 0.16); x.fill();
        x.globalAlpha = 1;
        pantalla();
      }
    }

    // ── 5. Sólidos, en orden de profundidad ─────────────────────────────────
    const proyecta = (q) => [sx(q[0], q[1], q[2]), sy(q[0], q[1], q[2])];
    function recibir(pr, cara) {
      const zr = pr.aabb[5], tope = cara.p;
      const cerca = [], pegados = [];
      for (const o of casters) {
        if (o === pr || o.aabb[5] <= zr + 0.02 || o.aabb[2] < zr - 0.2) continue;
        const h = sombraEn(zr, o);
        if (h) cerca.push(h);
        if (o.k === 'malla' && Math.abs(o.aabb[2] - zr) <= 0.06) {
          const v = (o._v ?? (o._v = vertices(o))).filter((q) => q[2] < o.aabb[2] + 0.02);
          if (v.length >= 3) pegados.push(casco(v.map((q) => [sx(q[0], q[1], zr), sy(q[0], q[1], zr)])));
        }
      }
      if (!cerca.length) return;
      let a0 = Infinity, b0 = Infinity, a1 = -Infinity, b1 = -Infinity;
      x.save();
      x.beginPath();
      tope.forEach((q, n) => { const s = proyecta(q); a0 = Math.min(a0, s[0]); a1 = Math.max(a1, s[0]); b0 = Math.min(b0, s[1]); b1 = Math.max(b1, s[1]); if (n) x.lineTo(s[0], s[1]); else x.moveTo(s[0], s[1]); });
      x.closePath();
      x.clip();
      a0 = Math.max(0, Math.floor(a0)); b0 = Math.max(0, Math.floor(b0)); a1 = Math.min(W, Math.ceil(a1)); b1 = Math.min(H, Math.ceil(b1));
      if (a1 > a0 && b1 > b0) {
        blanda(cerca, desen(0.075 * k), c.oscuro ? 0.62 : 0.28, [a0, b0, a1 - a0, b1 - b0]);
        blanda(pegados, desen(0.028 * k), c.oscuro ? 0.72 : 0.3, [a0, b0, a1 - a0, b1 - b0]);
      }
      x.restore();
    }
    function pintarDeco(d, rp) {
      const n = d.n;
      if (n[0] + n[1] + n[2] < 1e-3) return;
      const o = proyecta(d.o), u = proyecta([d.o[0] + d.u[0], d.o[1] + d.u[1], d.o[2] + d.u[2]]), v = proyecta([d.o[0] + d.v[0], d.o[1] + d.v[1], d.o[2] + d.v[2]]);
      x.setTransform(u[0] - o[0], u[1] - o[1], v[0] - o[0], v[1] - o[1], o[0], o[1]);
      const col = (hexa, op) => (op.luz ? hexa : tono(rampa(hexa, op.mat ?? 'mate'), n));
      for (const cmd of d.cmds) {
        const tipo = cmd[0];
        if (tipo === 'r') {
          const [, cx, cy, w, h, color, op] = cmd;
          x.globalAlpha = op.a ?? 1; x.fillStyle = col(color, op); x.beginPath();
          if (op.r) x.roundRect(cx - w / 2, cy - h / 2, w, h, op.r); else x.rect(cx - w / 2, cy - h / 2, w, h);
          x.fill();
        } else if (tipo === 'c') {
          const [, cx, cy, r, color, op] = cmd;
          x.globalAlpha = op.a ?? 1; x.fillStyle = col(color, op); x.beginPath(); x.arc(cx, cy, r, 0, 6.2832); x.fill();
        } else if (tipo === 'l') {
          const [, x0, y0, x1, y1, w, color, op] = cmd;
          x.globalAlpha = op.a ?? 1; x.strokeStyle = col(color, op); x.lineWidth = w; x.lineCap = op.cap ?? 'butt'; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke();
        } else if (tipo === 'p') {
          const [, pts, color, op] = cmd;
          x.globalAlpha = op.a ?? 1; x.fillStyle = col(color, op); x.beginPath(); pts.forEach((q, i) => (i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]))); x.closePath(); x.fill();
        } else if (tipo === 'm') {
          const [, cx, cy, w, h, g, color, op] = cmd;
          x.globalAlpha = op.a ?? 1; x.strokeStyle = col(color, op); x.lineWidth = g; x.beginPath();
          if (op.r) x.roundRect(cx - w / 2, cy - h / 2, w, h, op.r); else x.rect(cx - w / 2, cy - h / 2, w, h);
          x.stroke();
        } else if (tipo === 't') {
          const [, texto, cx, cy, tam, color, op] = cmd;
          x.save();
          x.globalAlpha = op.a ?? 1; x.fillStyle = col(color, op); x.font = `${op.peso ?? 700} 200px ${F_TIT}`; x.textAlign = 'center'; x.textBaseline = 'middle';
          x.translate(cx, cy); x.scale(tam / 200, (tam * (op.alto ?? 1)) / 200); x.fillText(texto, 0, 8);
          x.restore();
        }
      }
      x.globalAlpha = 1; x.lineCap = 'butt';
      pantalla();
    }
    function pintarMalla(pr) {
      const rp = rampa(pr.color, pr.mat), vis = [];
      let tapa = null;
      for (const cara of pr.caras) {
        const n = newell(cara.p);
        if (!n || n[0] + n[1] + n[2] <= 1e-4) continue;
        const item = { cara, n, s: cara.p.map(proyecta) };
        if (!pr.convexa) { let d = 0; for (const q of cara.p) d += q[0] + q[1] + q[2]; item.d = d / cara.p.length; }
        if (cara.tapa) tapa = item; else vis.push(item);
      }
      if (!pr.convexa) vis.sort((a, b) => a.d - b.d);
      x.globalAlpha = pr.alfa ?? 1;
      x.lineWidth = 0.9;
      for (const it of vis) {
        const col = it.cara.color ? tono(rampa(it.cara.color, pr.mat), it.n) : tono(rp, it.n);
        x.fillStyle = col; x.strokeStyle = col;
        x.beginPath();
        const s = it.s;
        x.moveTo(s[0][0], s[0][1]);
        for (let n = 1; n < s.length; n++) x.lineTo(s[n][0], s[n][1]);
        x.closePath(); x.fill(); x.stroke();
      }
      // Oclusión: donde el sólido toca lo que tiene debajo, sus lados se oscurecen hacia la base.
      if (pr.ao > 0 && pr.alfa === 1) {
        const alto = Math.min((pr.aabb[5] - pr.aabb[2]) * 0.7, 0.42) * k;
        if (alto > 1.5) for (const it of vis) {
          if (!it.cara.piso || it.n[2] > 0.6) continue;
          const s = it.s, mx = (s[0][0] + s[1][0]) / 2, my = (s[0][1] + s[1][1]) / 2;
          let ex = s[1][0] - s[0][0], ey = s[1][1] - s[0][1];
          const le = Math.hypot(ex, ey);
          if (le < 0.01) continue;
          ex /= le; ey /= le;
          // Hacia arriba y perpendicular a la base: así el oscurecido es parejo a lo largo de todo el borde.
          const sube = ex > 0 ? 1 : -1, dist = alto * Math.abs(ex);
          const g = x.createLinearGradient(mx, my, mx + ey * sube * dist, my - ex * sube * dist);
          g.addColorStop(0, `rgba(${tintaSombra},${pr.ao})`); g.addColorStop(1, `rgba(${tintaSombra},0)`);
          x.fillStyle = g;
          x.beginPath(); x.moveTo(s[0][0], s[0][1]); for (let n = 1; n < s.length; n++) x.lineTo(s[n][0], s[n][1]); x.closePath(); x.fill();
        }
      }
      if (tapa) {
        const s = tapa.s, col = tono(rp, tapa.n);
        let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
        for (const q of s) { if (q[0] < a0) a0 = q[0]; if (q[0] > a1) a1 = q[0]; if (q[1] < b0) b0 = q[1]; if (q[1] > b1) b1 = q[1]; }
        x.beginPath(); x.moveTo(s[0][0], s[0][1]); for (let n = 1; n < s.length; n++) x.lineTo(s[n][0], s[n][1]); x.closePath();
        // La tapa grande no es plana del todo: la luz cae suave de la esquina de atrás a la de adelante.
        if ((a1 - a0) * (b1 - b0) > 3000) { const b = hex(col.slice(4, -1).split(',').map(Number)), g = x.createLinearGradient(a0, b0, a1, b1); g.addColorStop(0, mez(b, LUMINOSO, 0.07)); g.addColorStop(1, mez(b, c.negro, 0.09)); x.fillStyle = g; } else x.fillStyle = col;
        x.fill();
        if (pr.recibe && !pr.deco.length) recibir(pr, tapa.cara);
      }
      x.globalAlpha = 1;
      for (const d of pr.deco) pintarDeco(d, rp);
      // Las sombras de lo que está encima caen sobre los adornos de la tapa.
      if (tapa && pr.recibe && pr.deco.length) recibir(pr, tapa.cara);
    }
    function pintarBola(pr) {
      const rp = rampa(pr.color, pr.mat), [cx, cy] = proyecta(pr.c), r = pr.r * k;
      if (r < 0.3) return;
      const g = x.createRadialGradient(cx - r * 0.32, cy - r * 0.42, r * 0.05, cx, cy, r * 1.02);
      g.addColorStop(0, rp.cssArriba); g.addColorStop(0.52, mez(rp.cssArriba, rp.cssIzq, 0.65)); g.addColorStop(0.86, rp.cssIzq); g.addColorStop(1, rp.cssDer);
      x.globalAlpha = pr.alfa ?? 1;
      x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 6.2832); x.fill();
      x.globalAlpha = 1;
    }
    function pintarLetras(pr) {
      const rp = rampa(pr.color, pr.mat), o = proyecta(pr.o), u = proyecta([pr.o[0] + pr.u[0], pr.o[1] + pr.u[1], pr.o[2] + pr.u[2]]), v = proyecta([pr.o[0] + pr.v[0], pr.o[1] + pr.v[1], pr.o[2] + pr.v[2]]);
      const ex = proyecta([pr.o[0] + pr.e[0], pr.o[1] + pr.e[1], pr.o[2] + pr.e[2]]), dx = ex[0] - o[0], dy = ex[1] - o[1], E = 100 / pr.letra;
      const pasos = Math.min(40, Math.max(2, Math.ceil(Math.hypot(dx, dy) / 1.2)));
      const sobreSuelo = pr.e[2] > 0;
      x.font = `${pr.peso} 100px ${F_TIT}`; x.textAlign = 'center'; x.textBaseline = 'middle';
      for (let n = 0; n <= pasos; n++) {
        const q = n / pasos, ox = o[0] + dx * q, oy = o[1] + dy * q;
        x.setTransform((u[0] - o[0]) / E, (u[1] - o[1]) / E, (v[0] - o[0]) / E, (v[1] - o[1]) / E, ox, oy);
        x.fillStyle = n === pasos ? (sobreSuelo ? rp.cssArriba : rp.cssIzq) : mez(sobreSuelo ? rp.cssIzq : rp.cssDer, rp.cssDer, 1 - q);
        x.fillText(pr.texto, 0, 0);
      }
      pantalla();
    }
    for (const pr of ordenar(E.prims)) {
      if (pr.k === 'malla') pintarMalla(pr);
      else if (pr.k === 'bola') pintarBola(pr);
      else if (pr.k === 'letras') pintarLetras(pr);
    }

    // ── 6. Rutas por el aire, sobre todo ────────────────────────────────────
    for (const cm of E.caminos) if (cm.aereo) pintarAereo(x, cm, t, proyecta);
    return E;
  }

  function pintarCamino(x, cm, t, plano) {
    const f = cm.crece ? Math.min(1, Math.max(0, (t - cm.t0) / (cm.t1 - cm.t0))) : 1;
    if (f <= 0) return;
    const u = f * f * (3 - 2 * f), L = cm.largo * u, ancho = cm.ancho ?? 0.62, r = cm.radio ?? 0.6, color = cm.color ?? c.secundario, rp = rampa(color, 'mate');
    const P = cm.puntos;
    const camino = () => {
      x.beginPath();
      x.moveTo(P[0][0], P[0][1]);
      for (let i = 1; i < P.length - 1; i++) x.arcTo(P[i][0], P[i][1], P[i + 1][0], P[i + 1][1], r);
      x.lineTo(P[P.length - 1][0], P[P.length - 1][1]);
    };
    x.lineCap = 'round'; x.lineJoin = 'round';
    const dash = cm.largo * 1.02;
    const conLargo = (extra) => { x.setLineDash([Math.max(0.001, L - extra), dash * 3]); };
    // Sombra corta, costado, cara de arriba y raya central.
    plano(0);
    x.translate(0.05, -0.03);
    conLargo(0); x.strokeStyle = 'rgba(0,0,0,.42)'; x.lineWidth = ancho + 0.14; camino(); x.stroke();
    plano(0);
    conLargo(0); x.strokeStyle = rp.cssDer; x.lineWidth = ancho; camino(); x.stroke();
    plano(0.075);
    conLargo(0); x.strokeStyle = rp.cssArriba; x.lineWidth = ancho; camino(); x.stroke();
    conLargo(0); x.strokeStyle = mez(rp.cssArriba, c.negro, 0.38); x.lineWidth = ancho * 0.56; camino(); x.stroke();
    // Lo que fluye por el camino: píldoras en la dirección del proceso.
    const flujo = cm.flujo;
    if (flujo !== false) {
      const paso = cm.paso ?? 1.05, off = (flujo === undefined ? t : Math.max(0, Math.min(t, flujo[1]) - flujo[0])) * (cm.velocidad ?? 2.4);
      x.setLineDash([0.3, paso - 0.3]);
      x.lineDashOffset = -off;
      x.strokeStyle = cm.color_flujo ?? c.acento; x.lineWidth = ancho * 0.2;
      if (u >= 0.999) { camino(); x.stroke(); }
      x.lineDashOffset = 0;
    }
    // La punta que avanza.
    if (u < 0.999) {
      const q = peli.puntoEn(cm, u);
      x.setLineDash([]);
      x.fillStyle = c.acento;
      x.beginPath(); x.arc(q[0], q[1], ancho * 0.42, 0, 6.2832); x.fill();
    }
    x.setLineDash([]); x.lineCap = 'butt';
    x.setTransform(1, 0, 0, 1, 0, 0);
  }
  function pintarAereo(x, cm, t, proyecta) {
    const f = cm.crece ? Math.min(1, Math.max(0, (t - cm.t0) / (cm.t1 - cm.t0))) : 1;
    if (f <= 0) return;
    const u = f * f * (3 - 2 * f), n = Math.max(2, Math.round(cm.puntos.length * u));
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.strokeStyle = cm.color ?? c.acento; x.lineWidth = Math.max(4, (cm.ancho ?? 0.1) * peli.camara(t).k); x.lineCap = 'round';
    x.setLineDash([0.01, x.lineWidth * 2.6]);
    x.beginPath();
    for (let i = 0; i < n; i++) { const s = proyecta(cm.puntos[i]); if (i) x.lineTo(s[0], s[1]); else x.moveTo(s[0], s[1]); }
    x.stroke();
    x.setLineDash([]); x.lineCap = 'butt';
  }

  // ── Post: caída de luz y grano. La película debe verse igual en toda pantalla. ──
  function postproceso(x, E) {
    x.setTransform(1, 0, 0, 1, 0, 0);
    const z = peli.F.zona, cx = (z[0] + z[2]) / 2, cy = (z[1] + z[3]) / 2, R = Math.hypot(W, H), nv = c.oscuro ? '0,0,0' : NEGRO.join(',');
    const g = x.createRadialGradient(cx, cy, R * 0.26, cx, cy, R * 0.6);
    g.addColorStop(0, `rgba(${nv},0)`); g.addColorStop(1, `rgba(${nv},${c.oscuro ? 0.5 : 0.14})`);
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    if (grano) {
      x.globalCompositeOperation = 'soft-light'; x.globalAlpha = c.oscuro ? 0.11 : 0.08;
      x.fillStyle = grano; x.fillRect(0, 0, W, H);
      x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    }
  }

  // ── Textos, siempre planos y nítidos ──────────────────────────────────────
  function pintarTextos(x, E) {
    x.setTransform(1, 0, 0, 1, 0, 0);
    const colorDe = (n) => (n === 'acento' ? c.acento : n === 'tinta' || !n ? (c.oscuro ? c.tinta : c.negro) : n), rgbaFondo = `rgba(${rgb(c.fondo).join(',')},.72)`;
    for (const T of E.textos) {
      if (T.tipo === 'titulo') {
        // Un velo muy suave detrás: se lee sobre cualquier cosa, sin caja.
        const velo = c.oscuro ? rgb(c.fondo).join(',') : rgb(c.superficie).join(','), lado = T.lugar === 'izquierda';
        const finVelo = lado ? T.caja[2] + T.tam * 0.8 : T.caja[3] + T.tam * 0.34, g = lado ? x.createLinearGradient(0, 0, finVelo, 0) : x.createLinearGradient(0, 0, 0, finVelo);
        g.addColorStop(0, `rgba(${velo},${0.8 * T.velo})`); g.addColorStop(0.72, `rgba(${velo},${0.5 * T.velo})`); g.addColorStop(1, `rgba(${velo},0)`);
        x.fillStyle = g; x.fillRect(0, 0, lado ? finVelo : W, lado ? H : finVelo);
        x.font = `${T.peso} ${T.tam}px ${F_TIT}`; x.textAlign = 'left'; x.textBaseline = 'alphabetic';
        for (const l of T.lineas) {
          x.save();
          x.beginPath(); x.rect(0, l.y - T.tam * 0.05, W, l.alto + T.tam * 0.13); x.clip();
          for (const w of l.palabras) {
            if (w.rev <= 0) continue;
            const dy = (1 - w.rev) * l.alto * 1.05 - w.fuera * l.alto * 1.05;
            x.shadowColor = c.oscuro ? 'rgba(0,0,0,.8)' : 'rgba(255,255,255,.8)'; x.shadowBlur = T.tam * 0.3; x.shadowOffsetY = 0;
            x.strokeStyle = c.oscuro ? rgbaFondo : 'rgba(255,255,255,.7)'; x.lineWidth = T.tam * 0.1; x.lineJoin = 'round';
            x.strokeText(w.texto, w.x, l.y + T.tam * 0.92 + dy);
            x.shadowBlur = 0;
            x.fillStyle = colorDe(w.color);
            x.fillText(w.texto, w.x, l.y + T.tam * 0.92 + dy);
          }
          x.restore();
        }
      } else if (T.tipo === 'rotulo') {
        const { ax, ay, cx, cy, ancho, alto, rev, crece, tam, peso, texto } = T;
        const ex = Math.max(cx - ancho / 2 + 6, Math.min(cx + ancho / 2 - 6, ax)), ey = Math.max(cy - alto / 2, Math.min(cy + alto / 2, ay));
        x.strokeStyle = c.acento; x.lineWidth = 3; x.lineCap = 'round';
        x.beginPath(); x.moveTo(ax, ay); x.lineTo(ax + (ex - ax) * crece, ay + (ey - ay) * crece); x.stroke();
        x.fillStyle = c.oscuro ? c.fondo : '#FFFFFF'; x.beginPath(); x.arc(ax, ay, 9, 0, 6.2832); x.fill();
        x.lineWidth = 4; x.beginPath(); x.arc(ax, ay, 9, 0, 6.2832); x.stroke();
        x.lineCap = 'butt';
        if (rev > 0) {
          x.save();
          x.beginPath(); x.rect(cx - (ancho / 2) * rev, cy - alto / 2, ancho * rev, alto); x.clip();
          x.fillStyle = c.oscuro ? mez(c.fondo, c.superficie, 0.45) : '#FFFFFF'; x.globalAlpha = 0.94;
          x.beginPath(); x.roundRect(cx - ancho / 2, cy - alto / 2, ancho, alto, 6); x.fill();
          x.globalAlpha = 1;
          x.strokeStyle = c.oscuro ? c.secundario : c.negro; x.lineWidth = 2; x.stroke();
          x.font = `${peso} ${tam}px ${F_TIT}`; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
          x.fillStyle = T.color === 'acento' ? c.acento : c.oscuro ? c.tinta : c.negro;
          x.fillText(texto, cx, cy + tam * 0.36);
          x.restore();
        }
      } else if (T.tipo === 'subtitulo') {
        const [a0, b0, a1, b1] = T.caja, o = Math.min(T.entra, T.sale);
        x.globalAlpha = o;
        x.fillStyle = c.oscuro ? c.fondo : '#FFFFFF'; x.globalAlpha = o * 0.84;
        x.beginPath(); x.roundRect(a0, b0, a1 - a0, b1 - b0, 6); x.fill();
        x.globalAlpha = o;
        x.font = `${T.peso} ${T.tam}px ${F_TIT}`; x.textAlign = 'left'; x.textBaseline = 'middle';
        for (const l of T.lineas) for (const w of l.palabras) {
          x.fillStyle = w.activa ? (c.oscuro ? mez(c.acento, '#FFFFFF', 0.22) : c.acento) : c.oscuro ? c.tinta : c.negro;
          x.fillText(w.texto, w.x, l.y + T.tam * 0.04);
        }
        x.globalAlpha = 1;
      }
    }
  }

  // ── Desenfoque de movimiento real: varias muestras dentro del obturador, solo cuando la cámara corre. ──
  let capa = null, capaX = null;
  const OBTURADOR = 0.42 / 30;
  function muestras(t) {
    if (peli.sinDesenfoque || typeof OffscreenCanvas === 'undefined') return 1;
    const a = peli.camara(t - OBTURADOR), b = peli.camara(t), rz = Math.abs(Math.log(b.k / a.k)) * Math.hypot(W, H) * 0.32, mov = Math.hypot(b.cu - a.cu, b.cv - a.cv) * b.k;
    const px = rz + mov;
    return px < 6 ? 1 : Math.min(9, 1 + Math.ceil(px / 7));
  }
  function pintar(t) {
    const n = muestras(t);
    let E;
    if (n <= 1) E = pintarMundo(ctx, t);
    else {
      if (!capa) { capa = new OffscreenCanvas(W, H); capaX = capa.getContext('2d', { alpha: false }); }
      for (let j = 0; j < n; j++) {
        const te = t - (OBTURADOR * j) / Math.max(1, n - 1);
        E = pintarMundo(capaX, te);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1 / (j + 1);
        ctx.drawImage(capa, 0, 0);
      }
      ctx.globalAlpha = 1;
      E = peli.escena(t);
    }
    postproceso(ctx, E);
    pintarTextos(ctx, E);
  }
  return pintar;
}
