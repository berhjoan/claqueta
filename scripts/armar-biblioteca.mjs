#!/usr/bin/env node
// Genera library/manifest.json (lo que lista el panel) y library/guias/diccionario.md (todas las opciones, en español e inglés).
// Uso: node scripts/armar-biblioteca.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEPTOS } from "../app/catalogo.js";
import { voces } from "../data/voces.js";

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const a = (...p) => path.join(raiz, ...p);
const rel = (p) => path.relative(raiz, p).replaceAll("\\", "/");

function caminar(dir, salida = []) {
  if (!fs.existsSync(dir)) return salida;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) caminar(p, salida);
    else salida.push(p);
  }
  return salida;
}

function frontmatter(texto) {
  const m = texto.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const nombre = m[1].match(/^name:\s*(.+)$/m)?.[1]?.trim();
  let d = m[1].match(/^description:\s*(.*)$/m)?.[1]?.trim() ?? "";
  if (d === ">" || d === "|" || d === ">-" || d === "|-") d = (m[1].split(/^description:.*$/m)[1] ?? "").split(/\n[a-z_-]+:/)[0].replace(/\s+/g, " ").trim();
  return { nombre, desc: d.replace(/^["']|["']$/g, "") };
}

function resumen(texto) {
  const sin = texto.replace(/^---[\s\S]*?\n---/, "");
  const lineas = sin.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const titulo = lineas.find((l) => l.startsWith("# "))?.replace(/^#+\s*/, "");
  const parrafo = lineas.find((l) => !/^[#|>`\-*!\[]/.test(l) && l.length > 30);
  return { titulo, desc: parrafo };
}

const corto = (s, n = 180) => {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  return t.length <= n ? t : `${t.slice(0, n - 1).replace(/\s+\S*$/, "")}…`;
};

const items = [];
function poner(ruta, cat, catNombre, licencia, titulo, desc) {
  const texto = fs.readFileSync(ruta, "utf8");
  const f = frontmatter(texto);
  const r = resumen(texto);
  items.push({ titulo: titulo ?? f.nombre ?? r.titulo ?? path.basename(ruta), desc: corto(desc ?? f.desc ?? r.desc), ruta: rel(ruta), cat, catNombre, licencia });
}

// Guías primero: es lo que conviene leer antes que nada.
for (const [archivo, titulo] of [
  ["direccion.md", "Dirección: cómo no parecer generado"],
  ["motores.md", "Motores: qué usar para cada video"],
  ["sonido.md", "Sonido sin pagar"],
  ["aprendizajes.md", "Aprendizajes de producción"],
  ["diccionario.md", "Diccionario de opciones"],
]) if (fs.existsSync(a("library", "guias", archivo)) || archivo === "diccionario.md") { if (archivo !== "diccionario.md") poner(a("library", "guias", archivo), "guias", "Guías de la casa", "MIT", titulo); }

poner(a("AGENTS.md"), "guias", "Guías de la casa", "MIT", "AGENTS: instrucciones para cualquier IA");
poner(a("docs", "radar.md"), "guias", "Guías de la casa", "MIT", "Radar: herramientas revisadas en GitHub");

// Herramientas.
poner(a("tools", "tts", "README.md"), "herramientas", "Herramientas gratis", "MIT", "Voces gratis en español");
poner(a("engines", "pizarra", "README.md"), "herramientas", "Herramientas gratis", "MIT y OFL", "Motor de pizarra");
const docTool = { "tools/audio/musica.py": "Música original con rejilla exacta", "tools/audio/efecto.py": "Efectos sintetizados", "tools/audio/mezcla.py": "Mezcla con la música cediendo bajo la voz", "tools/audio/masterizar.py": "Máster a -14 LUFS", "tools/audio/tiza.py": "Sonido de tiza trazo a trazo", "tools/audio/sfx.py": "Biblioteca de síntesis de efectos", "tools/audio/pluck.py": "Cuerdas por modelo físico", "tools/imagen/grano.py": "Grano fino con semilla fija", "tools/audio/notas.py": "Música escasa, nota por nota", "tools/qa/comparar_voz.py": "Comprueba que se oye lo que dice el guion", "tools/subtitulos/tiempos.py": "Afina tiempos de palabra contra el audio", "tools/subtitulos/srt.py": "SRT con frases y el texto exacto del guion", "tools/tts/hablar.py": "Narración gratis, un comando para tres motores", "tools/subtitulos/alinear.py": "Tiempos de palabra pegados al guion", "tools/qa/verificar_video.py": "Mide formato, duración y volumen del MP4", "tools/qa/hoja_cuadros.py": "Hoja de cuadros de un video", "tools/qa/saltos.py": "Busca saltos y cuadros negros", "tools/doctor.py": "Revisa qué falta en este computador", "tools/prompt.mjs": "Genera el encargo sin abrir el panel" };
for (const [ruta, titulo] of Object.entries(docTool)) {
  const lic = /sfx|pluck/.test(ruta) ? "MIT (lemo-opuscar)" : "MIT";
  poner(a(ruta), "herramientas", "Herramientas gratis", lic, titulo, ruta);
}

// HyperFrames: cada skill y sus referencias.
for (const p of caminar(a("library", "hyperframes", "skills")).filter((x) => x.endsWith(".md")).sort()) {
  const r = rel(p);
  const skill = r.split("/")[3];
  if (p.endsWith("SKILL.md")) poner(p, "hyperframes", "HyperFrames 0.9.9", "Apache-2.0", `${skill}: skill`);
  else if (r.includes("/references/")) poner(p, "hyperframes", "HyperFrames 0.9.9", "Apache-2.0");
}
poner(a("library", "hyperframes", "ORIGEN.md"), "hyperframes", "HyperFrames 0.9.9", "Apache-2.0", "Origen de HyperFrames 0.9.9");

for (const p of caminar(a("library", "hyperframes-clasico", "skills")).filter((x) => x.endsWith("SKILL.md")).sort()) {
  const skill = rel(p).split("/")[3];
  poner(p, "clasico", "HyperFrames clásico 0.8.150", "Apache-2.0", `${skill}: flujo clásico`);
}
poner(a("library", "hyperframes-clasico", "ORIGEN.md"), "clasico", "HyperFrames clásico 0.8.150", "Apache-2.0", "Por qué existe esta copia");

// Estilos.
const estilos = JSON.parse(fs.readFileSync(a("data", "styles.json"), "utf8"));
poner(a("library", "estilos-40", "LEEME.md"), "estilos", "Estilos", "Propio", "Atlas de 40 estilos: léeme");
poner(a("library", "estilos-40", "GUIA_ESTILOS_CLAUDE.md"), "estilos", "Estilos", "Propio", "Atlas: las 40 fichas");
for (const s of estilos.filter((e) => e.source === "lemo" && e.doc)) {
  if (fs.existsSync(a(s.doc))) poner(a(s.doc), "estilos", "Estilos", "MIT (lemo-opuscar)", s.name.es, s.traits?.es);
}

// lemo-opuscar.
for (const [archivo, titulo] of [["ORIGEN.md", "Origen y avisos de lemo-opuscar"], ["DIRECTOR.md", "Director de lemo-opuscar"], ["TECHNIQUE.md", "Técnica de lemo-opuscar"], ["MY-STYLES.md", "Crear estilos propios"], ["core/README.md", "Núcleo de lemo-opuscar"], ["core/audio/INSTRUMENTS.md", "Instrumentos: muestreador y cuerdas"]]) {
  if (fs.existsSync(a("library", "lemo-opuscar", archivo))) poner(a("library", "lemo-opuscar", archivo), "lemo", "lemo-opuscar", "MIT", titulo);
}

// Método propio y marca.
poner(a("library", "skills-propias", "LEEME.md"), "propias", "Método de la casa", "Propio", "Skills de la casa");
poner(a("library", "skills-propias", "motion-system", "SKILL.md"), "propias", "Método de la casa", "Propio", "Motion system: resumen");
poner(a("library", "skills-propias", "motion-system", "GUIA-MAESTRA.md"), "propias", "Método de la casa", "Propio", "Motion system: guía completa");
poner(a("library", "skills-propias", "video-con-codigo", "SKILL.md"), "propias", "Método de la casa", "Propio", "Video con personajes en Remotion");
poner(a("library", "marca", "LEEME.md"), "propias", "Método de la casa", "Propio", "Cómo escribir tu MOTION.md");
poner(a("library", "marca", "bg-system-ia", "MOTION.md"), "propias", "Método de la casa", "Propio", "Ejemplo: MOTION.md de BG System IA");

// Diccionario, generado desde los mismos datos que usa el panel.
const lineas = ["# Diccionario de opciones", "", "Todas las opciones del panel, con su nombre en español e inglés y lo que le pide a la IA. Se genera con `node scripts/armar-biblioteca.mjs`; no lo edites a mano.", ""];
const limpio = (s) => String(s ?? "").replaceAll("|", "/").replace(/\s+/g, " ").trim();
for (const d of DEPTOS) {
  lineas.push(`## ${d.nombre}`, "");
  for (const g of d.grupos ?? []) for (const c of g.controles ?? []) {
    if (!c.opciones?.length) continue;
    lineas.push(`### ${c.titulo ?? c.k}`, "", "| Español | English | Qué pide |", "|---|---|---|");
    for (const o of c.opciones) lineas.push(`| ${limpio(o.n?.[0])} | ${limpio(o.n?.[1])} | ${limpio(o.p?.[0] ?? o.d ?? "")} |`);
    lineas.push("");
  }
}
lineas.push("## Voces", "", "| Voz | País | Motor | Comando |", "|---|---|---|---|");
for (const v of voces) lineas.push(`| ${v.nombre} | ${v.pais} | ${v.motor} | \`--motor ${v.motor} --voz ${v.voz}\` |`);
lineas.push("");
fs.mkdirSync(a("library", "guias"), { recursive: true });
fs.writeFileSync(a("library", "guias", "diccionario.md"), lineas.join("\n"), "utf8");
poner(a("library", "guias", "diccionario.md"), "guias", "Guías de la casa", "MIT", "Diccionario de opciones", "Todas las opciones del panel, en español e inglés, con lo que le pide a la IA.");
// Las guías van al inicio de la lista.
items.sort((x, y) => (x.cat === "guias" ? 0 : 1) - (y.cat === "guias" ? 0 : 1));

fs.writeFileSync(a("library", "manifest.json"), `${JSON.stringify({ generado: "scripts/armar-biblioteca.mjs", total: items.length, items }, null, 1)}\n`, "utf8");
const porCat = {};
for (const i of items) porCat[i.catNombre] = (porCat[i.catNombre] ?? 0) + 1;
console.log(JSON.stringify({ total: items.length, porCat }, null, 1));
