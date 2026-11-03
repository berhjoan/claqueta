#!/usr/bin/env node
// Genera el encargo sin abrir el panel: útil para automatizar o para que una IA arme su propia configuración.
// Uso: node tools/prompt.mjs proyecto.json --lang en --salida encargo.md
// proyecto.json lleva solo lo que cambia, por departamento: { "guion": { "titulo": "..." }, "camara": { "movs": ["push"] } }
// Con --receta pizarra parte de una receta. Sin archivo, usa los valores normales.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { valoresPorDefecto } from "../app/catalogo.js";
import { planosSanos, valoresSanos } from "../app/estado.js";
import { generarPlanos } from "../app/planos.js";
import { construirPrompt } from "../app/prompt.js";
import { recetas } from "../data/recetas.js";

const args = process.argv.slice(2);
const toma = (k) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : null; };
const lang = toma("--lang") ?? "es", salida = toma("--salida"), receta = toma("--receta");
const compacto = args.includes("--compacto") ? (args.splice(args.indexOf("--compacto"), 1), true) : false;
const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

let valores = valoresPorDefecto();
if (receta) {
  const r = recetas.find((x) => x.id === receta);
  if (!r) { console.error(`Error: no existe la receta ${receta}. Hay: ${recetas.map((x) => x.id).join(", ")}`); process.exit(2); }
  for (const [ruta, val] of Object.entries(r.cambios)) { const [d, k] = ruta.split("."); valores[d][k] = val; }
}
if (args[0]) {
  const propio = JSON.parse(fs.readFileSync(args[0], "utf8"));
  for (const [d, vals] of Object.entries(propio)) {
    if (d === "planos") continue;
    if (!Object.hasOwn(valores, d)) { console.error(`Error: no existe el departamento ${d}`); process.exit(2); }
    Object.assign(valores[d], vals);
  }
  var planosPropios = propio.planos;
  valores = valoresSanos(valores);
}
const estilos = JSON.parse(fs.readFileSync(path.join(raiz, "data", "styles.json"), "utf8"));
const estado = { valores, planos: planosSanos(planosPropios, valores) ?? generarPlanos(valores) };
const texto = construirPrompt(estado, { lang, estilos, compacto });
if (salida) { fs.writeFileSync(salida, texto, "utf8"); console.log(salida); }
else process.stdout.write(texto);
