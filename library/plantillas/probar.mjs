#!/usr/bin/env node
// Prueba una plantilla de verdad: la monta sola en un proyecto de HyperFrames, corre check, renderiza y saca cuadros.
// Uso:
//   node library/plantillas/probar.mjs --trabajo RUTA S21 corto
//   node library/plantillas/probar.mjs --trabajo RUTA S21 max
//   node library/plantillas/probar.mjs --trabajo RUTA S21 ambos --sin-render
// RUTA es una carpeta FUERA del repositorio. Si no existe RUTA/proyecto, se crea con `hyperframes init`.
// «corto» usa los textos por defecto de ficha.json; «max» usa, en cada variable, un texto con su largo máximo (el peor caso realista).
// Opciones: --sin-render (solo check), --solo-render (sin check), --rapido (cuadros con `snapshot`, sin render: para iterar el diseño),
//           --con S21 (monta debajo otra plantilla con sus textos por defecto: sirve para ver la transición de cristal o glitch sobre una escena),
//           --valores '{"lista":"S21,S40"}' (pisa variables concretas en la prueba),
//           --paleta '{"fondo":"#000"}', --duracion 4, --cuadros 0.1,1,2,3.8
// Deja en RUTA/salidas/<id>-<variante>.{check.json,mp4,jpg}: el jpg junta los cuadros pedidos en una tira de 540×960 cada uno.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(import.meta.dirname, "..", "..");
const HF = "hyperframes@0.9.9";

const args = process.argv.slice(2);
const opc = (n, def) => { const i = args.indexOf(n); if (i < 0) return def; const v = args[i + 1]; args.splice(i, 2); return v; };
const bandera = (n) => { const i = args.indexOf(n); if (i < 0) return false; args.splice(i, 1); return true; };
const trabajo = opc("--trabajo", process.env.CLAQUETA_TRABAJO);
const paleta = JSON.parse(opc("--paleta", "{}"));
const duracion = Number(opc("--duracion", "4"));
const cuadros = opc("--cuadros", "0.1,1,2,3.8").split(",").map(Number);
const sinRender = bandera("--sin-render");
const rapido = bandera("--rapido");
const con = opc("--con", null);
const valores = JSON.parse(opc("--valores", "{}"));
const soloRender = bandera("--solo-render");
const [id, variante = "corto"] = args;
if (!trabajo || !id) {
  console.error("Uso: node library/plantillas/probar.mjs --trabajo RUTA <id> [corto|max|ambos] [--sin-render] [--paleta JSON]");
  process.exit(2);
}
const plantilla = path.join(RAIZ, "library", "plantillas", id);
const ficha = JSON.parse(fs.readFileSync(path.join(plantilla, "ficha.json"), "utf8"));

// Palabras anchas, con tildes y eñes, para construir un texto del largo máximo sin que sea una sola palabra imposible.
const POOL = ["Comunicación", "Máquinas", "Mañana", "Wikipedia", "Montaje", "Imágenes", "Ejecución", "Mundial", "Diseño", "Proyección", "Música", "Más", "Cámara", "Ñandú", "Animación", "Secuencia", "Mejor", "Movimiento", "Wifi", "Noche", "Mi", "Muy", "Imán"];
export function largoMax(n, semilla = 0) {
  let s = "";
  let i = semilla;
  for (let k = 0; k < POOL.length; k++) {
    const p = POOL[i++ % POOL.length];
    const t = s ? `${s} ${p}` : p;
    if (t.length > n) continue;
    s = t;
  }
  // Rellena con palabras cortas hasta el largo exacto, para medir el peor caso.
  for (const w of ["Imán", "Más", "Muy", "Mi", "mw", "m"]) {
    while (s.length + 1 + w.length <= n) s += " " + w;
  }
  while (s.length < n) s += "m";
  return s.slice(0, n);
}

// Variables que mandan sobre la estructura (listas, rutas, cifras): en la prueba «max» conservan su valor, o la plantilla no tendría qué mostrar.
const ESTRUCTURALES = new Set(["lista", "paradas", "cadencia", "pausa", "mosaico", "carpeta", "semilla", "cuadros"]);
const textos = (v) => ({ ...Object.fromEntries(ficha.variables.map((x, k) => [x.id, v === "max" && !ESTRUCTURALES.has(x.id) ? largoMax(x.max, k * 3) : x.defecto])), ...valores });

function correr(cmd, cmdArgs, opciones = {}) {
  const r = spawnSync(cmd, cmdArgs, { encoding: "utf8", shell: process.platform === "win32", maxBuffer: 256 * 1024 * 1024, ...opciones });
  return r;
}

const proyecto = path.join(trabajo, "proyecto");
if (!fs.existsSync(path.join(proyecto, "hyperframes.json"))) {
  fs.mkdirSync(trabajo, { recursive: true });
  const r = correr("npx", ["--yes", HF, "init", "proyecto", "--resolution", "portrait", "--non-interactive", "--skip-skills"], { cwd: trabajo });
  if (r.status !== 0) { console.error(r.stdout, r.stderr); process.exit(1); }
}
const salidas = path.join(trabajo, "salidas");
fs.mkdirSync(salidas, { recursive: true });

function prepararBase() {
  fs.mkdirSync(path.join(proyecto, "assets", "lib"), { recursive: true });
  fs.mkdirSync(path.join(proyecto, "compositions"), { recursive: true });
  fs.copyFileSync(path.join(RAIZ, "tools", "lib", "gsap.min.js"), path.join(proyecto, "assets", "lib", "gsap.min.js"));
  // Todas las fuentes del sistema, con su CSS: así se prueba lo que la plantilla pide por nombre.
  const dest = path.join(proyecto, "assets", "fonts");
  fs.mkdirSync(dest, { recursive: true });
  const cat = JSON.parse(fs.readFileSync(path.join(RAIZ, "assets", "fonts", "fuentes.json"), "utf8"));
  const css = [];
  for (const [fam, datos] of Object.entries(cat.familias)) {
    for (const a of datos.archivos) {
      fs.copyFileSync(path.join(RAIZ, "assets", "fonts", a.archivo), path.join(dest, a.archivo));
      const formato = a.archivo.endsWith(".woff2") ? "woff2" : "truetype";
      css.push(`@font-face { font-family: "${fam}"; src: url("${a.archivo}") format("${formato}"); font-weight: ${a.pesos}; font-style: normal; font-display: block; }`);
    }
  }
  fs.writeFileSync(path.join(dest, "fuentes.css"), css.join("\n") + "\n");
  if (fs.existsSync(path.join(plantilla, "..", "..", "..", "assets", "thumbs"))) {
    // Las miniaturas del catálogo (para la ráfaga): se copian solo si la plantilla las nombra.
    const html = fs.readFileSync(path.join(plantilla, "escena.html"), "utf8");
    if (html.includes("assets/thumbs")) {
      const t = path.join(proyecto, "assets", "thumbs");
      fs.mkdirSync(t, { recursive: true });
      for (const f of fs.readdirSync(path.join(RAIZ, "assets", "thumbs"))) fs.copyFileSync(path.join(RAIZ, "assets", "thumbs", f), path.join(t, f));
    }
  }
}

function montar(v) {
  const valores = JSON.stringify(textos(v)).replace(/'/g, "&#39;");
  const estilo = Object.entries(paleta).map(([k, x]) => `--${k}: ${x}`).join("; ");
  fs.copyFileSync(path.join(plantilla, "escena.html"), path.join(proyecto, "compositions", `${id}.html`));
  // Se quitan las escenas de pruebas anteriores para que check no las mida.
  for (const f of fs.readdirSync(path.join(proyecto, "compositions"))) if (f !== `${id}.html` && f !== `${con}.html` && f.endsWith(".html")) fs.rmSync(path.join(proyecto, "compositions", f));
  let debajo = "";
  if (con) {
    const fichaCon = JSON.parse(fs.readFileSync(path.join(RAIZ, "library", "plantillas", con, "ficha.json"), "utf8"));
    fs.copyFileSync(path.join(RAIZ, "library", "plantillas", con, "escena.html"), path.join(proyecto, "compositions", `${con}.html`));
    const vc = JSON.stringify(Object.fromEntries(fichaCon.variables.map((x) => [x.id, x.defecto]))).replace(/'/g, "&#39;");
    debajo = `<div id="el-${con}" data-composition-id="${con}" data-composition-src="compositions/${con}.html" data-variable-values='${vc}' data-start="0" data-duration="${duracion}" data-track-index="0" data-track-kind="graphics" data-width="1080" data-height="1920"></div>`;
  }
  const index = `<!doctype html>
<html lang="es" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="assets/lib/gsap.min.js"></script>
    <link rel="stylesheet" href="assets/fonts/fuentes.css" />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: #000; }
      #root { position: relative; width: 100%; height: 100%; background: #000; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${duracion}" data-width="1080" data-height="1920">
      ${debajo}
      <div id="el-${id}" data-composition-id="${id}" data-composition-src="compositions/${id}.html" data-variable-values='${valores}' ${estilo ? `style="${estilo}"` : ""} data-start="0" data-duration="${duracion}" data-track-index="1" data-track-kind="graphics" data-width="1080" data-height="1920"></div>
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`;
  fs.writeFileSync(path.join(proyecto, "index.html"), index);
}

function hojaDePng(carpeta, destino) {
  const archivos = cuadros.map((t) => path.join(carpeta, `at-${String(t)}s.png`));
  const filtros = archivos.map((_, i) => `[${i}:v]scale=540:960[v${i}]`).join(";");
  const union = archivos.map((_, i) => `[v${i}]`).join("") + `hstack=inputs=${archivos.length}`;
  const r = correr("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...archivos.flatMap((a) => ["-i", a]), "-filter_complex", `${filtros};${union}`, "-frames:v", "1", "-q:v", "3", destino]);
  if (r.status !== 0) console.error(r.stderr);
}

function hoja(mp4, destino) {
  const filtros = cuadros.map((_, i) => `[${i}:v]scale=540:960[v${i}]`).join(";");
  const union = cuadros.map((_, i) => `[v${i}]`).join("") + `hstack=inputs=${cuadros.length}`;
  const entradas = cuadros.flatMap((t) => ["-ss", String(t), "-i", mp4]);
  const r = correr("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...entradas, "-filter_complex", `${filtros};${union}`, "-frames:v", "1", "-q:v", "3", destino]);
  if (r.status !== 0) console.error(r.stderr);
}

let fallo = false;
const variantes = variante === "ambos" ? ["corto", "max"] : [variante];
prepararBase();
for (const v of variantes) {
  montar(v);
  const nombre = `${id}-${v}`;
  if (!soloRender) {
    const r = correr("npx", ["--yes", HF, "check", "--json"], { cwd: proyecto });
    const salida = (r.stdout || "") + (r.stderr || "");
    fs.writeFileSync(path.join(salidas, `${nombre}.check.json`), salida);
    let resumen = "";
    try {
      const j = JSON.parse(r.stdout.slice(r.stdout.indexOf("{")));
      const lista = (x) => (Array.isArray(x) ? x : []);
      const errores = lista(j.errors ?? j.errores), avisos = lista(j.warnings ?? j.avisos);
      resumen = `${errores.length} errores, ${avisos.length} avisos`;
      for (const e of [...errores, ...avisos]) console.log(`   · ${e.code ?? e.codigo ?? ""} ${(e.message ?? e.mensaje ?? JSON.stringify(e)).slice(0, 220)}`);
      if (errores.length) fallo = true;
    } catch {
      resumen = `salida no JSON (código ${r.status})`;
      console.log(salida.slice(0, 1500));
      if (r.status !== 0) fallo = true;
    }
    console.log(`${nombre}: check → ${resumen}`);
  }
  if (rapido) {
    const carpeta = path.join(salidas, `${nombre}-png`);
    fs.rmSync(carpeta, { recursive: true, force: true });
    const r = correr("npx", ["--yes", HF, "snapshot", "--at", cuadros.join(","), "--no-end", "--keep", "--output", carpeta], { cwd: proyecto });
    if (r.status !== 0) { console.error(r.stdout, r.stderr); fallo = true; continue; }
    hojaDePng(carpeta, path.join(salidas, `${nombre}-rapido.jpg`));
    console.log(`${nombre}: cuadros rápidos → ${path.join(salidas, `${nombre}-rapido.jpg`)}`);
    continue;
  }
  if (!sinRender) {
    fs.mkdirSync(path.join(proyecto, "renders"), { recursive: true });
    const mp4 = path.join(salidas, `${nombre}.mp4`);
    const t0 = Date.now();
    const r = correr("npx", ["--yes", HF, "render", "--output", mp4, "--fps", "30", "--crf", "18", "--workers", "2"], { cwd: proyecto, stdio: ["ignore", "pipe", "pipe"] });
    if (r.status !== 0 || !fs.existsSync(mp4)) { console.error(`${nombre}: render falló\n`, (r.stdout || "").slice(-1500), (r.stderr || "").slice(-1500)); fallo = true; continue; }
    console.log(`${nombre}: render → ${((Date.now() - t0) / 1000).toFixed(0)} s, ${(fs.statSync(mp4).size / 1e6).toFixed(1)} MB`);
    hoja(mp4, path.join(salidas, `${nombre}.jpg`));
    console.log(`${nombre}: cuadros → ${path.join(salidas, `${nombre}.jpg`)}`);
  }
}
process.exit(fallo ? 1 : 0);
