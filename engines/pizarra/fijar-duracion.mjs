#!/usr/bin/env node
// Cambia la duración de la película en todos los archivos donde se repite, y el momento en que entra la frase de cierre.
// Corre desde la carpeta del proyecto: node ../.claqueta/engines/pizarra/fijar-duracion.mjs 9.9 [--lema 7.85]
// Sin --lema, la frase entra 2,5 s antes del final. check avisa line_unread si queda menos de 2 s en pantalla.
// Sirve para una película de una sola escena. Con varias, ajusta a mano las escenas que hayas copiado.
import fs from "node:fs";

const args = process.argv.slice(2);
const i = args.indexOf("--lema");
const lemaPedido = i >= 0 ? Number(args.splice(i, 2)[1]) : null;
const nueva = Number(args[0]);
if (!(nueva > 0) || (lemaPedido !== null && !(lemaPedido >= 0 && lemaPedido < nueva))) {
  console.error("Uso: node fijar-duracion.mjs 9.9 [--lema 7.85]. La frase debe entrar antes del final.");
  process.exit(2);
}
const FILM = "assets/pizarra/film.js";
if (!fs.existsSync(FILM)) {
  console.error(`Error: no encuentro ${FILM}. Corre esto desde la carpeta del proyecto.`);
  process.exit(2);
}
const dosDecimales = (x) => Math.round(x * 1000) / 1000;
const texto = fs.readFileSync(FILM, "utf8");
const previa = texto.match(/\bDUR = ([\d.]+)/);
if (!previa) {
  console.error(`Error: ${FILM} no tiene DUR.`);
  process.exit(2);
}
fs.writeFileSync(FILM, texto.replace(/\bDUR = [\d.]+/, `DUR = ${nueva}`));

const tocados = [FILM];
const faltan = [];
const inicio = lemaPedido ?? Math.max(0, dosDecimales(nueva - 2.5));
const patron = new RegExp(`data-duration="${previa[1].replace(".", "\\.")}"`, "g");
for (const ruta of ["index.html", "compositions/pizarra.html", "compositions/capa.html"]) {
  if (!fs.existsSync(ruta)) { faltan.push(ruta); continue; }
  let s = fs.readFileSync(ruta, "utf8").replace(patron, `data-duration="${nueva}"`).replace(/\bD = [\d.]+/, `D = ${nueva}`);
  if (ruta.endsWith("capa.html")) {
    s = s.replace(/(id="ca-frase"[^>]*data-start=")[\d.]+(" data-duration=")[\d.]+/, `$1${inicio}$2${dosDecimales(nueva - inicio)}`);
    s = s.replace(/(tl\.fromTo\("#ca-frase-txt"[^;]*,\s*)[\d.]+(\);)/, `$1${inicio}$2`);
  }
  fs.writeFileSync(ruta, s);
  tocados.push(ruta);
}
const enPantalla = dosDecimales(nueva - inicio);
console.log(JSON.stringify({ ok: true, antes: Number(previa[1]), ahora: nueva, lema_entra: inicio, lema_en_pantalla: enPantalla, tocados, faltan, aviso: enPantalla < 2 ? "La frase queda menos de 2 s: check avisará line_unread." : null }));
