#!/usr/bin/env node
// Saca de la película los efectos de sonido, en Node y sin navegador: audio e imagen leen el mismo dato.
// Uso, desde la carpeta del proyecto: node ../.claqueta/engines/isometrico/eventos.mjs assets/isometrico/film.js efectos.json [--separacion 1]
// Cada caída suena al aterrizar, un cuadro después de su imagen. Máximo un efecto cada --separacion segundos: se queda lo más importante. Sobre una palabra, baja 5 dB.
// efectos.json es el que lee tools/audio/mezcla.py, y también tools/pista.py mezcla.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const i = args.indexOf("--separacion");
const separacion = i >= 0 ? Number(args.splice(i, 2)[1]) : 1;
const [ruta, salida] = args;
if (!ruta || !salida) {
  console.error("Uso: node eventos.mjs assets/isometrico/film.js efectos.json [--separacion 1]");
  process.exit(2);
}
const absoluta = path.resolve(ruta);
const film = await import(pathToFileURL(absoluta).href);
const { crearPelicula } = await import(pathToFileURL(path.join(path.dirname(absoluta), "motor.js")).href);
const peli = crearPelicula(film);
const efectos = peli.eventos({ separacion });
fs.mkdirSync(path.dirname(path.resolve(salida)), { recursive: true });
fs.writeFileSync(salida, JSON.stringify(efectos, null, 1));
console.log(JSON.stringify({ ok: true, efectos: efectos.length, primero: efectos[0]?.pico ?? null, ultimo: efectos[efectos.length - 1]?.pico ?? null, salida }));
