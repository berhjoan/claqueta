#!/usr/bin/env node
// Mide dónde queda la tinta en pantalla, con la cámara aplicada, y la compara con las zonas seguras. También revisa la velocidad de la mano.
// Uso: node ../.claqueta/engines/pizarra/zonas.mjs assets/pizarra/film.js [--izq 72] [--der 960] [--arriba 220] [--abajo 1280]
// Solo cuenta lo ya escrito, con la cámara casi quieta y sin primer plano: un detalle que se ve grande mientras la cámara abre no es un fallo.
// --escala fija hasta dónde deja de ser primer plano. Por defecto, 1.25.
// La tinta incluye el grosor del trazo, así que puede pasarse aunque el ancho de la línea quepa.
// Termina con error si algo se sale. No sustituye a mirar los cuadros.
import path from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const toma = (k, def) => { const i = args.indexOf(k); return i >= 0 ? Number(args.splice(i, 2)[1]) : def; };
const maxEscala = toma("--escala", 1.25);
const margen = { izq: toma("--izq", 72), der: toma("--der", 960), arriba: toma("--arriba", 220), abajo: toma("--abajo", 1280) };
const film = args[0];
if (!film) {
  console.error("Uso: node zonas.mjs film.js [--izq 72] [--der 960] [--arriba 220] [--abajo 1280]");
  process.exit(2);
}
const { build, DUR, W, H } = await import(pathToFileURL(path.resolve(film)).href);
const F = build();
const redondo = (x) => Math.round(x);

const camara = (t) => F.camAt(t);
const quieta = (t) => {
  const a = camara(t - 0.05), b = camara(t + 0.05);
  return Math.abs(b.s - a.s) / a.s < 0.008 && Math.abs(b.cx - a.cx) < 8 && Math.abs(b.cy - a.cy) < 8;
};
const momentos = [];
for (let t = 0; t <= DUR + 1e-6; t += 1 / 15) if (quieta(t) && camara(t).s <= maxEscala) momentos.push(t);

const grupos = new Map();
for (const st of F.S) {
  const m = st.w ?? 0;
  const xs = st.pts.map((p) => p[0]), ys = st.pts.map((p) => p[1]);
  const caja = [Math.min(...xs) - m, Math.max(...xs) + m, Math.min(...ys) - m, Math.max(...ys) + m];
  const fin = st.borrador >= 0 && F.wipes?.[st.borrador] ? F.wipes[st.borrador].t0 : DUR;
  const clave = st.linea ?? "trazo suelto";
  const g = grupos.get(clave) ?? { texto: clave, x: [Infinity, -Infinity], y: [Infinity, -Infinity], cuando: {} };
  for (const t of momentos) {
    if (t < st.t1 || t >= fin) continue;
    const c = camara(t);
    const x0 = W / 2 + (caja[0] - c.cx) * c.s, x1 = W / 2 + (caja[1] - c.cx) * c.s, y0 = H / 2 + (caja[2] - c.cy) * c.s, y1 = H / 2 + (caja[3] - c.cy) * c.s;
    if (x0 < g.x[0]) { g.x[0] = x0; g.cuando.izq = t; }
    if (x1 > g.x[1]) { g.x[1] = x1; g.cuando.der = t; }
    if (y0 < g.y[0]) { g.y[0] = y0; g.cuando.arriba = t; }
    if (y1 > g.y[1]) { g.y[1] = y1; g.cuando.abajo = t; }
  }
  grupos.set(clave, g);
}

const avisos = [];
const lineas = [];
for (const g of grupos.values()) {
  if (!Number.isFinite(g.x[0])) continue;
  lineas.push({ texto: g.texto, x: g.x.map(redondo), y: g.y.map(redondo) });
  const en = (k) => `en ${g.cuando[k].toFixed(1)} s`;
  if (g.x[0] < margen.izq) avisos.push(`«${g.texto}»: la tinta empieza en x ${redondo(g.x[0])} y el margen es ${margen.izq}, ${en("izq")}.`);
  if (g.x[1] > margen.der) avisos.push(`«${g.texto}»: la tinta llega a x ${redondo(g.x[1])} y el límite es ${margen.der}, ${en("der")}.`);
  if (g.y[0] < margen.arriba) avisos.push(`«${g.texto}»: la tinta sube hasta y ${redondo(g.y[0])} y el límite es ${margen.arriba}, ${en("arriba")}.`);
  if (g.y[1] > margen.abajo) avisos.push(`«${g.texto}»: la tinta baja hasta y ${redondo(g.y[1])} y el límite es ${margen.abajo}, ${en("abajo")}.`);
}
for (const l of F.L) {
  if (l.t1 <= 0 || l.sPorTrazo >= 0.06) continue;
  avisos.push(`«${l.txt}»: ${l.sPorTrazo.toFixed(3)} s por trazo, la mano se ve apurada. Dale más tiempo o pasa null como duración.`);
}
console.log(JSON.stringify({ ok: avisos.length === 0, lineas, avisos }, null, 1));
process.exit(avisos.length ? 1 : 0);
