#!/usr/bin/env node
// Convierte assets/tiempos.json en un módulo que la película puede importar en Node y en el navegador, sin fetch.
// También deja duración y formato iguales en index.html y compositions/isometrico.html. Córrelo cada vez que cambie la voz.
// Uso, desde la carpeta del proyecto:
//   node ../.claqueta/engines/isometrico/tiempos.mjs                       lee assets/tiempos.json (de tools/pista.py voz)
//   node ../.claqueta/engines/isometrico/tiempos.mjs --formato 16:9        otro formato: 9:16, 16:9, 1:1 o 4:5
//   node ../.claqueta/engines/isometrico/tiempos.mjs --dur 15              sin voz: una película de 15 s sin palabras
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const toma = (k) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const durPedida = toma("--dur"), formatoPedido = toma("--formato"), salidaPedida = toma("--salida"), entradaPedida = toma("--entrada");
const TAM = { "9:16": [1080, 1920], "16:9": [1920, 1080], "1:1": [1080, 1080], "4:5": [1080, 1350] };

const entrada = entradaPedida ?? "assets/tiempos.json";
let datos;
if (fs.existsSync(entrada)) datos = JSON.parse(fs.readFileSync(entrada, "utf8"));
else if (durPedida) datos = { dur: Number(durPedida), fin_voz: 0, formato: "9:16", palabras: [], pausas: [], grupos: [] };
else { console.error(`Error: no existe ${entrada}. Corre antes tools/pista.py voz, o indica --dur 15 si la pieza no lleva voz.`); process.exit(2); }
if (durPedida) datos.dur = Number(durPedida);
if (formatoPedido) datos.formato = formatoPedido;
if (!TAM[datos.formato]) { console.error(`Error: el formato ${datos.formato} no existe. Usa ${Object.keys(TAM).join(", ")}.`); process.exit(2); }
if (!(datos.dur > 0)) { console.error("Error: la duración debe ser mayor que 0."); process.exit(2); }

const salida = salidaPedida ?? "assets/isometrico/tiempos.js";
const { voz, motor, nombre_voz, fin_voz, dur, formato, palabras, pausas, grupos } = datos;
const util = { voz, motor, nombre_voz, fin_voz, dur, formato, palabras, pausas, grupos };
const modulo = `// Generado por tiempos.mjs desde assets/tiempos.json. No se edita: cambia la voz y vuelve a correrlo.
export const TIEMPOS = ${JSON.stringify(util)};
const limpia = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
function busca(palabra, n) {
  const q = limpia(palabra), hay = TIEMPOS.palabras.filter((p) => limpia(p.palabra) === q);
  if (!hay.length) throw new Error(\`W: «\${palabra}» no está en la voz. Palabras: \${TIEMPOS.palabras.map((p) => p.palabra).join(' ')}\`);
  if (n < 1 || n > hay.length) throw new Error(\`W: «\${palabra}» aparece \${hay.length} vez o veces y pediste la \${n}.\`);
  return hay[n - 1];
}
// W('palabra') es el segundo en que empieza esa palabra; W('palabra', 2), la segunda vez que se dice. F() es el segundo en que termina. Sin tildes ni mayúsculas también vale.
export const W = (palabra, n = 1) => busca(palabra, n).inicio;
export const F = (palabra, n = 1) => busca(palabra, n).fin;
`;
fs.mkdirSync(path.dirname(path.resolve(salida)), { recursive: true });
fs.writeFileSync(salida, modulo);

// Las métricas viajan con la película: mismo ancho de letra en Node y en el video.
const metricas = path.join(AQUI, "..", "..", "assets", "fonts", "metricas.json");
if (fs.existsSync(metricas)) {
  const m = JSON.parse(fs.readFileSync(metricas, "utf8")), fu = {};
  for (const [k, v] of Object.entries(m.fuentes)) fu[k] = { ancho: v.ancho, cap: v.cap, x: v.x };
  fs.writeFileSync(path.join(path.dirname(path.resolve(salida)), "metricas.js"), `// Anchos de letra medidos en un navegador real, de assets/fonts/metricas.json. Lo regenera tiempos.mjs. Dan el mismo texto en Node y en el video.\nexport const CARACTERES = ${JSON.stringify(m.caracteres)};\nexport const FUENTES = ${JSON.stringify(fu)};\n`);
}

// Duración y tamaño en los HTML del proyecto, si ya están.
const [w, h] = TAM[formato];
const tocados = [];
for (const ruta of ["index.html", "compositions/isometrico.html"]) {
  if (!fs.existsSync(ruta)) continue;
  let s = fs.readFileSync(ruta, "utf8");
  s = s.replace(/data-duration="[\d.]+"/g, `data-duration="${dur}"`).replace(/data-width="\d+"/g, `data-width="${w}"`).replace(/data-height="\d+"/g, `data-height="${h}"`)
    .replace(/content="width=\d+, height=\d+"/, `content="width=${w}, height=${h}"`).replace(/data-resolution="[a-z]+"/, `data-resolution="${w > h ? "landscape" : w === h ? "square" : "portrait"}"`)
    .replace(/width: \d+px; height: \d+px/g, `width: ${w}px; height: ${h}px`).replace(/ width="\d+" height="\d+"/g, ` width="${w}" height="${h}"`)
    .replace(/\bD = [\d.]+/, `D = ${dur}`);
  fs.writeFileSync(ruta, s);
  tocados.push(ruta);
}
console.log(JSON.stringify({ ok: true, modulo: salida, dur, formato, palabras: palabras.length, tocados }));
