#!/usr/bin/env node
// Saca de la película los eventos de sonido, en Node y sin navegador: el audio y la imagen leen el mismo dato.
// Uso: node engines/pizarra/eventos.mjs assets/pizarra/film.js assets/audio/eventos.json
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [film, salida] = process.argv.slice(2);
if (!film || !salida) {
  console.error("Uso: node eventos.mjs film.js eventos.json");
  process.exit(2);
}
const { build, DUR } = await import(pathToFileURL(path.resolve(film)).href);
const F = build();

const capDe = {};
for (const l of F.L) for (const s of F.S) if (s.t0 >= l.t0 - 1e-6 && s.t1 <= l.t1 + 1e-6) capDe[s.seed] = l.cap;

const trazos = F.S.map((s) => ({
  t0: +s.t0.toFixed(4),
  d: +(s.t1 - s.t0).toFixed(4),
  len: Math.round(s.len),
  x: Math.round((s.start[0] + s.end[0]) / 2),
  cap: capDe[s.seed] ?? 120,
  acento: s.bloque === "respuesta",
  baja: s.end[1] > s.start[1],
}));
fs.mkdirSync(path.dirname(path.resolve(salida)), { recursive: true });
fs.writeFileSync(salida, JSON.stringify({ dur: DUR, trazos, borrador: F.wipe ? { t0: F.wipe.t0, t1: F.wipe.t1 } : null }));
console.log(JSON.stringify({ ok: true, trazos: trazos.length, escritura_s: +trazos.reduce((a, s) => a + s.d, 0).toFixed(2), salida }));
