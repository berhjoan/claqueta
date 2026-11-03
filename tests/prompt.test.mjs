// El prompt es el producto. Debe servir para cualquier combinación, sin referencias rotas ni texto vacío, y sin traducir lo literal.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEPTOS, valoresPorDefecto } from "../app/catalogo.js";
import { generarPlanos } from "../app/planos.js";
import { construirPrompt, REPO, SITIO } from "../app/prompt.js";
import { recetas } from "../data/recetas.js";
import { voces } from "../data/voces.js";
import { musicas } from "../data/sonido.js";
import { motores, destinos } from "../data/motor.js";

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const estilos = JSON.parse(fs.readFileSync(path.join(raiz, "data/styles.json"), "utf8"));

function armar(cambios = {}, receta) {
  const valores = valoresPorDefecto();
  if (receta) for (const [ruta, val] of Object.entries(receta.cambios)) { const [d, k] = ruta.split("."); valores[d][k] = val; }
  for (const [ruta, val] of Object.entries(cambios)) { const [d, k] = ruta.split("."); valores[d][k] = val; }
  return { valores, planos: generarPlanos(valores) };
}
const texto = (estado, lang = "es", extra = {}) => construirPrompt(estado, { lang, estilos, ...extra });

function sinBasura(t, nombre) {
  for (const mala of ["undefined", "[object Object]", "NaN", "null,"]) assert.ok(!t.includes(mala), `${nombre}: contiene «${mala}»`);
  assert.ok(!/^- *$/m.test(t), `${nombre}: viñeta vacía`);
}

// Rutas del repositorio que el prompt cita. Lo creado en el proyecto del usuario (assets/, renders/) no cuenta.
function rutasCitadas(t) {
  const encontradas = new Set();
  for (const m of t.matchAll(/(?:\.claqueta\/)?\b((?:library|tools|engines|docs)\/[A-Za-z0-9_.\/-]+)/g)) encontradas.add(m[1].replace(/[.,:;)]+$/, ""));
  for (const m of t.matchAll(/\.claqueta\/([A-Za-z0-9_.-]+\.(?:md|txt))/g)) encontradas.add(m[1]);
  return [...encontradas];
}
function rutasExisten(t, nombre) {
  // tools/fetch.sh es del clon de lemo-opuscar que el propio prompt manda a bajar.
  for (const r of rutasCitadas(t).filter((x) => x !== "tools/fetch.sh")) assert.ok(fs.existsSync(path.join(raiz, r)), `${nombre}: cita ${r}, que no existe`);
}

test("el prompt en inglés deja claro que el video va en español", () => {
  const t = texto(armar({ "guion.titulo": "Qué hace un agente" }), "en");
  assert.match(t, /must be in Spanish|in Spanish/);
  assert.match(t, /Spanish/);
  assert.ok(t.startsWith("#"));
});

test("el guion y el texto en pantalla siguen literales en español dentro del prompt en inglés", () => {
  const frase = "¿Qué hace un agente de IA? Actúa: diseña, ejecuta y revisa, señal tras señal.";
  const estado = armar({ "guion.titulo": "Niño, señal y acción", "guion.texto": frase });
  const en = texto(estado, "en");
  assert.ok(en.includes("Niño, señal y acción"), "el título se tradujo o se perdió");
  assert.ok(en.includes(frase), "el guion se tradujo o se perdió");
});

test("las notas libres se traducen si llega la traducción y se avisan si no", () => {
  const estado = armar({ "guion.notas": "Quiero un cierre tranquilo" });
  assert.ok(texto(estado, "en").includes("Quiero un cierre tranquilo"));
  const traducido = construirPrompt(estado, { lang: "en", estilos, traducciones: { "guion.notas": "I want a calm ending" } });
  assert.ok(traducido.includes("I want a calm ending"));
  assert.ok(!traducido.includes("Quiero un cierre tranquilo"));
});

test("cada receta genera un prompt completo y sin referencias rotas, en los dos idiomas", () => {
  for (const r of recetas) {
    const estado = armar({ "guion.titulo": "Prueba" }, r);
    for (const lang of ["es", "en"]) {
      const t = texto(estado, lang);
      sinBasura(t, `${r.id}/${lang}`);
      rutasExisten(t, `${r.id}/${lang}`);
      assert.ok(t.split(/\s+/).length > 800, `${r.id}/${lang}: demasiado corto`);
      assert.ok(t.includes(REPO), `${r.id}/${lang}: no dice de dónde bajar el sistema`);
    }
  }
});

test("cada motor, destino y fuente de música generan un prompt válido", () => {
  for (const m of motores) { const t = texto(armar({ "motor.motor": m.id }), "en"); sinBasura(t, m.id); rutasExisten(t, m.id); }
  for (const d of destinos) { const t = texto(armar({ "motor.destino": d.id })); sinBasura(t, d.id); rutasExisten(t, d.id); }
  for (const mu of musicas) { const t = texto(armar({ "sonido.musica": mu.id })); sinBasura(t, mu.id); rutasExisten(t, mu.id); }
});

test("cada voz trae su comando exacto", () => {
  for (const v of voces) {
    const t = texto(armar({ "sonido.voz": v.id, "sonido.narracion": true }));
    assert.ok(t.includes(`--motor ${v.motor} --voz ${v.voz}`), v.id);
    if (v.motor !== "edge") assert.ok(t.includes("tools/subtitulos/alinear.py"), `${v.id}: faltan tiempos de palabra`);
  }
});

test("la música compuesta aquí trae el comando con los valores elegidos", () => {
  const t = texto(armar({ "sonido.musica": "codigo", "sonido.animo": "lofi", "sonido.bpm": 82, "entrega.duracion": 40 }));
  assert.ok(t.includes("--caracter lofi --bpm 82 --dur 40"));
  assert.ok(t.includes("tools/audio/mezcla.py"));
});

test("el prompt no pide pagar ni usa comandos de pago como instrucción", () => {
  for (const r of recetas) {
    const t = texto(armar({}, r), "en");
    assert.match(t, /Pay for nothing/);
    for (const cmd of ["hyperframes cloud", "hyperframes lambda", "hyperframes templates", "hyperframes@0.9.9 cloud", "hyperframes@0.9.9 templates", "elevenlabs_voz"]) assert.ok(!t.includes(cmd), `${r.id}: ${cmd}`);
  }
});

test("un texto hostil no rompe la tabla de planos", () => {
  const estado = armar();
  estado.planos[0].texto = "a | b\n| c";
  const t = texto(estado);
  const fila = t.split("\n").find((l) => l.startsWith("| 1 |"));
  assert.ok(fila.split("|").length <= 9, fila);
});

test("los departamentos del catálogo cubren lo que se pidió", () => {
  const ids = DEPTOS.map((d) => d.id);
  for (const id of ["guion", "arte", "camara", "profundidad", "movimiento", "montaje", "sonido", "subtitulos", "motor", "entrega"]) assert.ok(ids.includes(id), id);
});

test("los enlaces públicos apuntan al mismo sistema", () => {
  assert.equal(REPO, "https://github.com/berhjoan/claqueta");
  assert.equal(SITIO, "https://berhjoan.github.io/claqueta");
});
