// Compositor de la prueba: dibuja la pizarra de un instante t, siempre función de t. Adaptado de app.js y stage.js de lemo-opuscar
// (MIT) para vertical, negro cálido y sin la capa WebGL. La pizarra se hornea una sola vez por página, aunque haya dos escenas.
import { clamp } from './lib.js';
import { bake, drawStroke, rng, n1 } from './chalk.js';
import { installDeposit, grainTile } from './r2d.js';
import { build, W, H } from './film.js';

const SLATE = [26, 60, 1054, 1690];                              // x0, y0, x1, y1 en unidades de mundo (a s = 1, 1 unidad = 1 px)
const SALA = { x0: -420, y0: -520, w: 1920, h: 3040 };

function ruido(w, h, seed, rgb, aMax) {
  const o = new OffscreenCanvas(w, h), x = o.getContext('2d'), img = x.createImageData(w, h), R = rng(seed);
  const g = Array.from({ length: (w + 2) * (h + 2) }, R);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const v = (g[j * (w + 2) + i] + g[(j + 1) * (w + 2) + i + 1] + g[(j + 2) * (w + 2) + i + 2] + g[j * (w + 2) + i + 2]) / 4, q = 4 * (j * w + i);
    img.data[q] = rgb[0]; img.data[q + 1] = rgb[1]; img.data[q + 2] = rgb[2]; img.data[q + 3] = Math.round(clamp((v - .2) / .6) * aMax * 255);
  }
  x.putImageData(img, 0, 0); return o;
}
function madera(c, x, y, w, h, horiz, seed, base = '#2c1d0e') {
  const R = rng(seed); c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  c.fillStyle = base; c.fillRect(x, y, w, h);
  for (let i = 0; i < 60; i++) {
    const t = R(), a = .04 + R() * .1; c.lineWidth = .6 + R() * 2.2; c.strokeStyle = R() < .5 ? `rgba(14,8,3,${a})` : `rgba(107,74,30,${a})`; c.beginPath();
    if (horiz) { const yy = y + t * h; c.moveTo(x, yy); for (let k = 1; k <= 24; k++) c.lineTo(x + w * k / 24, yy + (n1(k * .7 + i, seed) - .5) * 4); }
    else { const xx = x + t * w; c.moveTo(xx, y); for (let k = 1; k <= 24; k++) c.lineTo(xx + (n1(k * .7 + i, seed) - .5) * 4, y + h * k / 24); }
    c.stroke();
  }
  const g = horiz ? c.createLinearGradient(0, y, 0, y + h) : c.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, 'rgba(245,198,107,.13)'); g.addColorStop(.45, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.34)');
  c.fillStyle = g; c.fillRect(x, y, w, h); c.restore();
}
function palito(c, x, y, len, r, col, ang) {                     // tiza de verdad en la bandeja: los mismos colores que escriben
  c.save(); c.translate(x, y); c.rotate(ang);
  c.save(); c.filter = 'blur(4px)'; c.fillStyle = 'rgba(0,0,0,.55)'; c.beginPath(); c.ellipse(5, r * .95, len / 2, r * .5, 0, 0, 6.29); c.fill(); c.restore();
  const g = c.createLinearGradient(0, -r, 0, r), f = (k, a = 1) => `rgba(${col.map(v => Math.round(Math.min(255, v * k))).join(',')},${a})`;
  g.addColorStop(0, f(1.06)); g.addColorStop(.45, f(1)); g.addColorStop(1, f(.55));
  c.fillStyle = g; c.beginPath(); c.roundRect(-len / 2, -r, len, r * 2, r * .7); c.fill(); c.restore();
}
function hornearSala() {
  const cv = new OffscreenCanvas(SALA.w, SALA.h), c = cv.getContext('2d'); c.translate(-SALA.x0, -SALA.y0); c.imageSmoothingQuality = 'high';
  const [x0, y0, x1, y1] = SLATE, sw = x1 - x0, sh = y1 - y0;
  c.fillStyle = '#17100a'; c.fillRect(SALA.x0, SALA.y0, SALA.w, SALA.h);                                 // la pared
  c.drawImage(ruido(Math.ceil(SALA.w / 200), Math.ceil(SALA.h / 200), 31, [34, 24, 14], .5), SALA.x0, SALA.y0, SALA.w, SALA.h);
  c.save(); c.filter = 'blur(26px)'; c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(x0 - 26, y0 - 26, sw + 52, sh + 70); c.restore();   // sombra de la pizarra
  c.fillStyle = '#0d0907'; c.fillRect(x0, y0, sw, sh);                                                   // la pizarra: negro cálido parejo
  c.drawImage(ruido(Math.ceil(sw / 240), Math.ceil(sh / 240), 61, [24, 18, 13], .5), x0, y0, sw, sh);
  c.drawImage(ruido(Math.ceil(sw / 60), Math.ceil(sh / 60), 62, [7, 5, 4], .28), x0, y0, sw, sh);
  c.save(); c.beginPath(); c.rect(x0, y0, sw, sh); c.clip(); c.globalCompositeOperation = 'soft-light'; c.globalAlpha = .16;   // grano fino, horneado
  const pat = c.createPattern(grainTile(), 'repeat'); pat.setTransform(new DOMMatrix([.25, 0, 0, .25, 0, 0])); c.fillStyle = pat; c.fillRect(x0, y0, sw, sh); c.restore();
  madera(c, x0 - 30, y0 - 34, sw + 60, 34, true, 5); madera(c, x0 - 30, y0, 30, sh, false, 6); madera(c, x1, y0, 30, sh, false, 7);   // marco
  for (const [xa, wa] of [[x0, 16], [x1 - 16, 16]]) { const g = c.createLinearGradient(xa, 0, xa + wa, 0), izq = xa === x0; g.addColorStop(0, `rgba(0,0,0,${izq ? .4 : 0})`); g.addColorStop(1, `rgba(0,0,0,${izq ? 0 : .4})`); c.fillStyle = g; c.fillRect(xa, y0, wa, sh); }
  { const g = c.createLinearGradient(0, y0, 0, y0 + 18); g.addColorStop(0, 'rgba(0,0,0,.42)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x0, y0, sw, 18); }
  c.save(); c.filter = 'blur(14px)'; c.fillStyle = 'rgba(0,0,0,.7)'; c.fillRect(x0 - 30, y1 + 70, sw + 60, 34); c.restore();            // sombra de la bandeja
  madera(c, x0 - 44, y1 + 28, sw + 88, 54, true, 8, '#3a2712'); madera(c, x0 - 44, y1, sw + 88, 28, true, 9, '#20150a');                // bandeja
  c.save(); c.globalAlpha = .1; c.fillStyle = '#f7ebd3'; c.filter = 'blur(10px)'; c.fillRect(x0 + 120, y1 + 8, sw - 300, 14); c.restore();   // polvo de tiza en la bandeja
  palito(c, 300, y1 + 16, 150, 11, [247, 235, 211], -.03); palito(c, 520, y1 + 18, 96, 11, [245, 198, 107], .05); palito(c, 690, y1 + 15, 62, 10, [247, 235, 211], -.12);
  return { cv };
}

let M = null;
function preparar() {
  if (M) return M;
  const t0 = performance.now();
  installDeposit();
  const F = build();
  for (const s of F.S) bake(s, s.o.R || 2);
  const capa = new OffscreenCanvas(W, H);
  M = { F, sala: hornearSala(), capa, lx: capa.getContext('2d') };
  window.__pizarraBakeMs = Math.round(performance.now() - t0);
  return M;
}

function frente(x, t, s, sx, sy, col, w) {                       // unos granos claros donde escribe la tiza; sin el halo que STYLE.md §9 pide quitar
  const R = rng(Math.floor(t * 240) * 7 + 3), r = Math.max(5, w * s * 1.6), c = col.map(v => Math.round(v * 255)).join(',');
  for (let i = 0; i < 9; i++) {
    const a = R() * 6.28, d = Math.pow(R(), .7) * r * 1.3, z = .8 + R() * 1.6;
    x.fillStyle = `rgba(${c},${.3 + R() * .4})`; x.fillRect(sx + Math.cos(a) * d - z / 2, sy + Math.sin(a) * d - z / 2, z, z);
  }
}

function dibujar(x, t) {
  const { F, sala, capa, lx } = M, c = F.camAt(t), s = c.s, m = [s, 0, 0, s, W / 2 - c.cx * s, H / 2 - c.cy * s], w = F.wipe;
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.filter = 'none';
  x.setTransform(...m); x.imageSmoothingQuality = 'high';
  x.drawImage(sala.cv, SALA.x0, SALA.y0, SALA.w, SALA.h);

  // lo que se borra va en su propia capa; después de la pasada no queda nada que dibujar, solo una neblina muy tenue
  if (t > w.t0) {
    const n = Math.max(2, Math.round(w.path.length * clamp((t - w.t0) / (w.t1 - w.t0)))), p = new Path2D();
    w.path.slice(0, n).forEach(([a, b], i) => i ? p.lineTo(a, b) : p.moveTo(a, b));
    if (t < w.t1) {
      lx.setTransform(1, 0, 0, 1, 0, 0); lx.clearRect(0, 0, W, H); lx.filter = 'none'; lx.globalCompositeOperation = 'source-over'; lx.setTransform(...m);
      for (const st of F.S) if (st.wiped && t > st.t0) drawStroke(lx, st, t);
      lx.globalCompositeOperation = 'destination-out'; lx.filter = `blur(${Math.max(1, 16 * s)}px)`; lx.lineCap = 'round'; lx.lineJoin = 'round'; lx.lineWidth = w.w; lx.strokeStyle = '#000'; lx.stroke(p);
      lx.globalCompositeOperation = 'source-over'; lx.filter = 'none';
      x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(capa, 0, 0); x.setTransform(...m);
    }
    x.save(); x.beginPath(); x.rect(SLATE[0], SLATE[1], SLATE[2] - SLATE[0], SLATE[3] - SLATE[1]); x.clip(); x.filter = `blur(${Math.max(1, 12 * s)}px)`; x.strokeStyle = 'rgba(214,202,180,.009)'; x.lineCap = 'round'; x.lineJoin = 'round'; x.lineWidth = w.w * .9; x.stroke(p); x.restore();
  } else for (const st of F.S) if (st.wiped && t > st.t0) drawStroke(x, st, t);

  for (const st of F.S) if (!st.wiped && t > st.t0) drawStroke(x, st, t);

  // caída de luz suave, siempre igual en pantalla
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'multiply';
  const g = x.createRadialGradient(W * .46, H * .42, H * .3, W * .46, H * .42, H * .78);
  g.addColorStop(0, 'rgb(255,255,255)'); g.addColorStop(1, 'rgb(168,160,150)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.globalCompositeOperation = 'source-over';

  for (const st of F.S) {
    if (t <= st.t0 || t >= st.t1) continue;
    const f = st.prog(t), p = st.at(f * st.len), col = st.color;
    frente(x, t, s, W / 2 + (p[0] - c.cx) * s, H / 2 + (p[1] - c.cy) * s, col, Math.min(st.w, 9));
  }
}

// Una escena pasa su lienzo y recibe la función que dibuja el instante t de la película (no el tiempo local de la escena).
export function montar(canvas) {
  preparar();
  const x = canvas.getContext('2d');
  return t => dibujar(x, t);
}
