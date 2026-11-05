#!/usr/bin/env node
// Mantiene data/styles.json al día con lo que hay en disco: qué estilos tienen plantilla probada, su paleta, su miniatura en sus colores,
// y los estilos nuevos de data/estilos-registro.json. También el catálogo que lleva dentro la ráfaga. No toca las fichas.
// Uso: node scripts/unir-estilos.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const rutaEstilos = path.join(raiz, "data", "styles.json");
const estilos = JSON.parse(fs.readFileSync(rutaEstilos, "utf8"));
const rutaRegistro = path.join(raiz, "data", "estilos-registro.json");

let nuevos = 0;
if (fs.existsSync(rutaRegistro)) {
  for (const e of JSON.parse(fs.readFileSync(rutaRegistro, "utf8"))) {
    const i = estilos.findIndex((x) => x.id === e.id);
    if (i < 0) { estilos.push(e); nuevos += 1; } else estilos[i] = { ...estilos[i], ...e };
  }
}

let conPlantilla = 0, conMiniatura = 0;
for (const e of estilos) {
  const dir = path.join(raiz, "library", "plantillas", e.id);
  const hay = fs.existsSync(path.join(dir, "escena.html")) && fs.existsSync(path.join(dir, "ficha.json"));
  if (hay) {
    const ficha = JSON.parse(fs.readFileSync(path.join(dir, "ficha.json"), "utf8"));
    e.plantilla = Boolean(ficha.probado?.render);
    if (e.plantilla) {
      conPlantilla += 1;
      if (e.status === "adaptar") e.status = "prueba";
      // La paleta con la que se renderizó es la que se vio: manda sobre la que se sacó de una miniatura.
      if (ficha.paleta) e.palette = ficha.paleta;
      if (ficha.requiere?.includes("webgpu")) e.gpu = true; else delete e.gpu;
    }
  } else delete e.plantilla;
  const propia = `assets/thumbs/propias/${e.id}.webp`;
  if (fs.existsSync(path.join(raiz, propia))) { e.thumb = propia; conMiniatura += 1; }
}
fs.writeFileSync(rutaEstilos, `${JSON.stringify(estilos, null, 1)}\n`);

// La ráfaga nombra cada miniatura desde un catálogo embebido: se regenera aquí para que un estilo nuevo no quede sin nombre.
const rutaRafaga = path.join(raiz, "library", "plantillas", "rafaga", "escena.html");
if (fs.existsSync(rutaRafaga)) {
  const conMiniatura = estilos.filter((e) => fs.existsSync(path.join(raiz, "assets", "thumbs", "propias", `${e.id}.webp`)) || fs.existsSync(path.join(raiz, "assets", "thumbs", `${e.id}.webp`)));
  const familiaDe = (e) => { const nombre = e.family?.es ?? e.family ?? ""; return nombre; };
  const cat = Object.fromEntries(conMiniatura.map((e) => [e.id, [e.name?.es ?? e.id, familiaDe(e)]]));
  const html = fs.readFileSync(rutaRafaga, "utf8");
  const nuevo = html.replace(/(<script type="application\/json" id="pl-rafaga-catalogo">)[\s\S]*?(<\/script>)/, (_, a, b) => `${a}${JSON.stringify(cat)}${b}`);
  if (nuevo !== html) fs.writeFileSync(rutaRafaga, nuevo);
}
console.log(JSON.stringify({ estilos: estilos.length, nuevos, conPlantilla, conMiniatura }));
