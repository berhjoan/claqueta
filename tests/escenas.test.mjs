// El kit de escenas: de pieza.json a un proyecto, sin navegador. Lo visual se comprueba con render real, no aquí.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ajustarCaja, ancho, envolver, FORMATOS, norm, Reloj, rutaLocal, zonas } from "../engines/escenas/lib/base.mjs";
import { BLOQUES } from "../engines/escenas/lib/bloques.mjs";
import { PIELES } from "../engines/escenas/lib/pieles.mjs";

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const armar = path.join(raiz, "engines", "escenas", "armar.mjs");

function proyecto(pieza, { tiempos, rejilla } = {}) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "escenas-"));
  fs.mkdirSync(path.join(d, "assets", "audio"), { recursive: true });
  if (tiempos) fs.writeFileSync(path.join(d, "assets", "tiempos.json"), JSON.stringify(tiempos));
  if (rejilla) fs.writeFileSync(path.join(d, "assets", "audio", "rejilla.json"), JSON.stringify(rejilla));
  fs.writeFileSync(path.join(d, "pieza.json"), JSON.stringify(pieza));
  return d;
}
const correr = (d) => spawnSync(process.execPath, [armar, "pieza.json"], { cwd: d, encoding: "utf8" });
const leer = (d, r) => fs.readFileSync(path.join(d, r), "utf8");

const palabras = "Hacer video ya no cuesta dinero. Eliges copias y pegas. Cero dólares al mes.".split(" ").map((p, i) => ({ palabra: p, inicio: i * 0.5, fin: i * 0.5 + 0.4 }));
const TIEMPOS = { palabras, dur: 8, fin_voz: 6.9, pausas: [], grupos: [{ inicio: 0, fin: 3, lineas: ["Hacer video ya no", "cuesta dinero."], palabras: palabras.slice(0, 6) }, { inicio: 3, fin: 5.5, lineas: ["Eliges copias y pegas."], palabras: palabras.slice(6, 10) }] };
const PIEZA = {
  formato: "9:16", piel: "infografia", paleta: "bg",
  planos: [
    { tipo: "titulo", texto: "Hacer video ya no cuesta dinero", acento: "dinero" },
    { tipo: "pasos", desde: "@Eliges", items: [{ texto: "Eliges", icono: "copy" }, { texto: "copias" }, { texto: "pegas" }] },
    { tipo: "cifra", desde: "@Cero", valor: 0, prefijo: "US$ ", rotulo: "al mes" },
  ],
};

test("cada formato tiene sus zonas, y las cifras son las del encargo", () => {
  const v = zonas("9:16");
  assert.deepEqual([v.W, v.H, v.sub.y1, v.sub.y2, v.y0, v.y1], [1080, 1920, 1300, 1540, 240, 1270]);
  const h = zonas("16:9");
  assert.deepEqual([h.sub.y1, h.sub.y2, h.minTexto], [842, 994, 36]);
  for (const f of Object.keys(FORMATOS)) {
    const z = zonas(f);
    assert.ok(z.x0 > 0 && z.x1 < z.W && z.y0 > 0 && z.y1 <= z.sub.y1 && z.sub.y2 < z.H, f);
  }
  assert.throws(() => zonas("3:2"), /no existe el formato/);
});

test("el texto se mide con la fuente real y cabe en su caja", () => {
  assert.ok(ancho("Actúa", "Sora", 800, 100) > ancho("Actúa", "Bebas Neue", 400, 100), "Bebas es condensada");
  const a = ajustarCaja("Un encargo claro hace un video claro.", "Sora", 800, { w: 864, h: 800 }, { frases: true, lh: 1.04 });
  assert.equal(a.desborda, false);
  for (const l of a.lineas) assert.ok(ancho(l, "Sora", 800, a.px) <= 864, l);
  assert.ok(a.lineas.length * a.px * 1.04 <= 800);
  const forzado = ajustarCaja("Hacer video|ya no cuesta", "Sora", 800, { w: 864, h: 800 });
  assert.ok(forzado.lineas.length >= 2 && forzado.lineas[0].startsWith("Hacer"));
  assert.ok(ajustarCaja("palabra ".repeat(200), "Sora", 800, { w: 300, h: 100 }, { min: 40 }).desborda, "lo que no cabe se avisa");
});

test("el partido de líneas no deja un conector colgando", () => {
  const l = envolver("La inteligencia de los equipos crece con la práctica", "Sora", 700, 80, 860);
  for (const x of l.slice(0, -1)) assert.ok(!/ (de|la|los|con|y|en|el)$/.test(x), x);
});

test("una palabra de la voz da el tiempo, también si se repite", () => {
  const r = new Reloj({ palabras: [{ palabra: "Claro,", inicio: 1 }, { palabra: "Código", inicio: 2 }, { palabra: "claro.", inicio: 3 }] });
  assert.equal(norm("¿Código?"), "codigo");
  assert.equal(r.resolver("@código"), 2);
  assert.equal(r.resolver("@claro#2"), 3);
  assert.equal(r.resolver("@claro", 2), 3, "busca después del plano anterior");
  assert.equal(r.resolver(4.5), 4.5);
  assert.throws(() => r.resolver("@nada"), /la voz no dice «nada»/);
  assert.equal(r.enTramo("Claro y simple", 0, 9), 1);
});

test("un corte cae en un pulso cercano y anterior, nunca lejos", () => {
  const r = new Reloj({ palabras: [] }, { pulsos: [1, 2, 3] });
  assert.equal(r.alPulso(2.1), 2);
  assert.equal(r.alPulso(2.5), 2.5, "demasiado lejos: manda la voz");
  assert.equal(new Reloj({}).alPulso(2.1), 2.1);
});

test("arma un proyecto completo, editable y sin nada externo", () => {
  const d = proyecto(PIEZA, { tiempos: TIEMPOS });
  const r = correr(d);
  assert.equal(r.status, 0, r.stderr);
  const info = JSON.parse(r.stdout);
  assert.equal(info.escenas.length, 3);
  assert.equal(info.dur, 8);
  for (const f of ["index.html", "compositions/p01.html", "compositions/p02.html", "compositions/p03.html", "compositions/subtitulos.html", "compositions/transiciones.html", "assets/lib/gsap.min.js", "assets/escenas/piel.css", "assets/escenas/grano.png", "assets/fonts/Sora-Variable.ttf", "assets/audio/mezcla.wav", "efectos.json"]) assert.ok(fs.existsSync(path.join(d, f)), f);
  const index = leer(d, "index.html");
  assert.ok(index.includes('lang="es"') && index.includes('src="assets/lib/gsap.min.js"'));
  for (const f of ["index.html", "compositions/p01.html", "compositions/p02.html", "compositions/p03.html", "compositions/subtitulos.html", "compositions/transiciones.html", "assets/escenas/piel.css"]) {
    const t = leer(d, f);
    assert.ok(!/https?:\/\/(?!www\.w3\.org)/.test(t), `${f}: URL externa`);
    assert.ok(!/Math\.random|Date\.now|setTimeout|requestAnimationFrame/.test(t), `${f}: no determinista`);
  }
  assert.ok(leer(d, "compositions/p03.html").includes("US$ 0"));
  const efectos = JSON.parse(leer(d, "efectos.json"));
  assert.ok(efectos.length >= 3);
  efectos.reduce((a, b) => { assert.ok(b.pico - a.pico >= 0.6, "dos efectos encima"); return b; });
  assert.ok(efectos.every((e) => e.semilla !== undefined), "cada toma varía");
});

test("armar dos veces da lo mismo", () => {
  const d = proyecto(PIEZA, { tiempos: TIEMPOS });
  correr(d);
  const a = leer(d, "compositions/p02.html"), e = leer(d, "efectos.json");
  correr(d);
  assert.equal(leer(d, "compositions/p02.html"), a);
  assert.equal(leer(d, "efectos.json"), e);
});

test("si cambia la voz, la imagen la sigue", () => {
  const d = proyecto(PIEZA, { tiempos: TIEMPOS });
  const antes = JSON.parse(correr(d).stdout).escenas;
  const lenta = { ...TIEMPOS, dur: 16, palabras: TIEMPOS.palabras.map((p) => ({ ...p, inicio: p.inicio * 2, fin: p.fin * 2 })) };
  fs.writeFileSync(path.join(d, "assets", "tiempos.json"), JSON.stringify(lenta));
  const despues = JSON.parse(correr(d).stdout).escenas;
  assert.ok(Math.abs(despues[1].inicio - (antes[1].inicio + 0.06) * 2 + 0.06) < 0.02, `${antes[1].inicio} → ${despues[1].inicio}`);
});

test("los subtítulos usan el guion exacto y se callan cuando el plano ya lo dice", () => {
  const d = proyecto(PIEZA, { tiempos: TIEMPOS });
  correr(d);
  const s = leer(d, "compositions/subtitulos.html");
  assert.ok(s.includes("copias"), "el segundo grupo sí sale");
  assert.ok(!s.includes(">dinero.<"), "el título ya dice lo mismo que la voz");
});

test("todo lo que entra de pieza.json es dato", () => {
  const malo = { ...PIEZA, planos: [{ tipo: "titulo", texto: "<script>alert(1)</script> & cía" }, PIEZA.planos[2]] };
  const d = proyecto(malo, { tiempos: TIEMPOS });
  assert.equal(correr(d).status, 0);
  const t = leer(d, "compositions/p01.html");
  assert.ok(!t.includes("<script>alert"), "el texto entró como HTML");
  assert.ok(t.includes("&lt;script"));
  assert.throws(() => rutaLocal("../secreto.png"), /ruta no permitida/);
  assert.throws(() => rutaLocal("https://x.com/a.png"), /ruta no permitida/);
  assert.throws(() => rutaLocal("C:/Windows/a.png"), /ruta no permitida/);
  assert.equal(rutaLocal("assets/img/foto.jpg"), "assets/img/foto.jpg");
  const color = proyecto({ ...PIEZA, paleta: { fondo: "red;}</style><script>", tinta: "#111111" } }, { tiempos: TIEMPOS });
  assert.equal(correr(color).status, 0);
  assert.ok(!leer(color, "assets/escenas/piel.css").includes("<script>"));
  const imagen = proyecto({ ...PIEZA, planos: [PIEZA.planos[0], { tipo: "imagen", desde: 2, src: "../../secreto.jpg" }] }, { tiempos: TIEMPOS });
  const r = correr(imagen);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /ruta no permitida/);
});

test("los errores dicen qué plano y qué hacer", () => {
  const casos = [
    [{ ...PIEZA, planos: [PIEZA.planos[0], { tipo: "pasos", items: [{ texto: "x" }] }] }, /no dice cuándo empieza/],
    [{ ...PIEZA, planos: [PIEZA.planos[0], { tipo: "nada", desde: 2 }] }, /tipo que no existe: nada/],
    [{ ...PIEZA, piel: "marciana" }, /no existe la piel marciana/],
    [{ ...PIEZA, paleta: "nada" }, /no existe la paleta nada/],
    [{ ...PIEZA, planos: [PIEZA.planos[0], { tipo: "cifra", desde: "@marte", valor: 1 }] }, /la voz no dice «marte»/],
    [{ ...PIEZA, planos: [PIEZA.planos[0], { tipo: "pasos", desde: 2, items: [{ texto: "x", icono: "no-existe" }] }] }, /no existe el icono/],
    [{ ...PIEZA, planos: [] }, /no tiene planos/],
    [{ formato: "9:16", planos: [{ tipo: "titulo", texto: "x" }] }, /falta la duración/],
  ];
  for (const [pieza, error] of casos) {
    const d = proyecto(pieza, { tiempos: pieza.planos?.length === 1 ? undefined : TIEMPOS });
    const r = correr(d);
    assert.notEqual(r.status, 0, JSON.stringify(pieza).slice(0, 80));
    assert.match(r.stderr, error);
  }
});

test("cada plano puede llevar su piel y sus colores, y los subtítulos no cambian", () => {
  const pieza = { formato: "9:16", dur: 8, planos: [
    { tipo: "titulo", texto: "Uno", piel: "cartel", estilo: "S07" },
    { tipo: "frase", desde: 3, texto: "Dos", piel: "collage", estilo: "S22" },
    { tipo: "cifra", desde: 6, valor: 3, piel: "terminal", paleta: "noche" },
  ] };
  const d = proyecto(pieza, { tiempos: { ...TIEMPOS, grupos: TIEMPOS.grupos } });
  const r = correr(d);
  assert.equal(r.status, 0, r.stderr);
  const css = leer(d, "assets/escenas/piel.css");
  for (const p of ["cartel", "collage", "terminal"]) assert.ok(css.includes(`.piel-${p}{`), p);
  assert.ok(css.includes("Bebas Neue") && css.includes("VT323") && css.includes("Archivo Black"), "fuentes de cada piel");
  const estilos = JSON.parse(fs.readFileSync(path.join(raiz, "data", "styles.json"), "utf8"));
  assert.ok(leer(d, "compositions/p02.html").includes(estilos.find((e) => e.id === "S22").palette.fondo.toUpperCase()) || leer(d, "compositions/p02.html").toLowerCase().includes(estilos.find((e) => e.id === "S22").palette.fondo.toLowerCase()), "usa los colores de su estilo");
  assert.ok(leer(d, "compositions/p03.html").includes("#050A08"), "o una paleta elegida");
  assert.ok(leer(d, "compositions/subtitulos.html").includes("--sub-fondo:#0C0C0C"), "caja común");
});

test("los pulsos también sirven de ancla, sin voz", () => {
  const pieza = { formato: "1:1", piel: "cartel", dur: 6, planos: [{ tipo: "titulo", texto: "Uno" }, { tipo: "titulo", desde: "pulso:3", texto: "Dos" }, { tipo: "titulo", desde: "compas:2", texto: "Tres" }] };
  const d = proyecto(pieza, { rejilla: { pulsos: [0, 1, 2, 3, 4, 5], compases: [0, 4] } });
  const r = correr(d);
  assert.equal(r.status, 0, r.stderr);
  const e = JSON.parse(r.stdout).escenas;
  assert.ok(Math.abs(e[1].inicio - 2) < 0.01 && Math.abs(e[2].inicio - 4) < 0.01, JSON.stringify(e));
});

test("todas las pieles y todos los bloques arman, en todos los formatos", () => {
  const planos = (piel) => [
    { tipo: "titulo", texto: "Un título para probar", acento: "probar", piel },
    { tipo: "cifra", desde: 2, valor: 74, sufijo: " %", rotulo: "de algo", barra: 0.7, fuente: "Prueba", piel },
    { tipo: "cifras", desde: 4, items: [{ valor: 1, rotulo: "uno" }, { valor: 22, rotulo: "veintidós" }], piel },
    { tipo: "barras", desde: 6, titulo: "Barras", items: [{ rotulo: "A", valor: 3 }, { rotulo: "B", valor: 9, acento: true }], piel },
    { tipo: "linea", desde: 8, titulo: "Línea", serie: [1, 3, 2, 8], etiquetas: ["A", "B"], final: "+8", piel },
    { tipo: "pasos", desde: 10, items: [{ texto: "Uno", detalle: "detalle" }, { texto: "Dos", icono: "copy" }], piel },
    { tipo: "comparar", desde: 12, a: { titulo: "Antes", texto: "Mucho" }, b: { titulo: "Ahora", texto: "Poco" }, piel },
    { tipo: "frase", desde: 14, texto: "Una frase que se enciende", acento: "enciende", piel },
    { tipo: "diagrama", desde: 16, centro: "IA", nodos: [{ texto: "A" }, { texto: "B" }, { texto: "C" }], piel },
    { tipo: "diagrama", desde: 18, forma: "flujo", nodos: [{ texto: "A" }, { texto: "B" }], piel },
    { tipo: "codigo", desde: 20, lineas: ["uno dos", { texto: "listo", salida: true, acento: true }], piel },
    { tipo: "imagen", desde: 22, src: "assets/foto.jpg", texto: "Una foto", piel },
    { tipo: "video", desde: 23, src: "toma.mp4", texto: "Una toma", piel },
    { tipo: "captura", desde: 24, src: "assets/captura.png", foco: [0.1, 0.1, 0.4, 0.2], cursor: [[0.1, 0.1], [0.5, 0.5]], texto: "Una captura", piel },
    { tipo: "cierre", desde: 26, frase: "El cierre", marca: "Marca", llamado: "Sígueme", piel },
  ];
  assert.deepEqual(Object.keys(BLOQUES).filter((b) => !["plantilla", "propia"].includes(b)).sort(), [...new Set(planos("x").map((p) => p.tipo))].sort(), "un bloque sin probar");
  for (const piel of Object.keys(PIELES)) for (const formato of Object.keys(FORMATOS)) {
    const d = proyecto({ formato, dur: 30, piel, paleta: "bg", planos: planos(piel) });
    const r = correr(d);
    assert.equal(r.status, 0, `${piel} ${formato}: ${r.stderr}`);
    const info = JSON.parse(r.stdout);
    assert.deepEqual(info.avisos.filter((a) => /no cabe/.test(a)), [], `${piel} ${formato}`);
    for (const e of info.escenas) assert.ok(!leer(d, `compositions/${e.id}.html`).includes("undefined"), `${piel} ${formato} ${e.tipo}`);
    fs.rmSync(d, { recursive: true, force: true });
  }
});

test("la ayuda lista lo que hay", () => {
  const ayuda = JSON.parse(execFileSync(process.execPath, [armar, "--ayuda"], { encoding: "utf8" }));
  assert.deepEqual(Object.keys(ayuda.bloques).sort(), Object.keys(BLOQUES).sort());
  assert.ok(ayuda.pieles.collage && ayuda.formatos.includes("4:5"));
});

test("una toma real va muda y al compás de la pieza", () => {
  const d = proyecto({ formato: "9:16", dur: 8, piel: "noticia", planos: [{ tipo: "video", src: "toma-limpia.mp4" }, { tipo: "cifra", desde: 3, valor: 5 }, { tipo: "video", desde: 5, src: "toma-limpia.mp4" }] });
  assert.equal(correr(d).status, 0);
  const t = leer(d, "compositions/p03.html");
  assert.ok(t.includes('muted') && t.includes('data-media-start="5"') && t.includes('class="clip foto"'), t.slice(0, 400));
});

test("una escena propia se monta tal cual y se valida su formato", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "propia-"));
  fs.mkdirSync(path.join(d, "escenas"));
  const escena = (id, w = 1080, h = 1920) => `<template><div data-composition-id="${id}" data-start="0" data-duration="4" data-width="${w}" data-height="${h}"><p data-var-text="titulo">Hola</p></div></template>`;
  fs.writeFileSync(path.join(d, "escenas", "mia.html"), escena("mi-escena"));
  fs.writeFileSync(path.join(d, "pieza.json"), JSON.stringify({ dur: 6, formato: "9:16", planos: [{ tipo: "titulo", texto: "Inicio" }, { tipo: "propia", desde: 2, archivo: "escenas/mia.html", textos: { titulo: "Mi título" } }] }));
  const correr = () => spawnSync(process.execPath, [armar, "pieza.json"], { cwd: d, encoding: "utf8" });
  let r = correr();
  assert.equal(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(path.join(d, "compositions", "mi-escena.html")));
  const indice = fs.readFileSync(path.join(d, "index.html"), "utf8");
  assert.match(indice, /data-composition-src="compositions\/mi-escena\.html"/);
  assert.match(indice, /Mi título/);
  // Otro formato: se detiene y lo dice.
  fs.writeFileSync(path.join(d, "escenas", "mia.html"), escena("mi-escena", 1920, 1080));
  r = correr();
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Recompón/);
  // Un id que usa el kit: se detiene.
  fs.writeFileSync(path.join(d, "escenas", "mia.html"), escena("p01"));
  r = correr();
  assert.equal(r.status, 2);
  assert.match(r.stderr, /lo usa el kit/);
  // Fuera de la carpeta: no.
  fs.writeFileSync(path.join(d, "pieza.json"), JSON.stringify({ dur: 6, planos: [{ tipo: "propia", archivo: "../fuera.html" }] }));
  r = correr();
  assert.equal(r.status, 2);
  assert.match(r.stderr, /ruta no permitida/);
  // Una plantilla vertical en un video horizontal: se detiene y dice qué hacer.
  fs.writeFileSync(path.join(d, "pieza.json"), JSON.stringify({ dur: 6, formato: "16:9", planos: [{ tipo: "plantilla", estilo: "S07" }] }));
  r = correr();
  assert.equal(r.status, 2);
  assert.match(r.stderr, /vertical/);
});

test("una escena montada no hereda los colores ni las fuentes de la pieza", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "montada-"));
  fs.mkdirSync(path.join(d, "escenas"));
  fs.writeFileSync(path.join(d, "escenas", "mia.html"), `<template><div data-composition-id="mi-escena" data-start="0" data-duration="4" data-width="1080" data-height="1920" style="background:var(--fondo,#123456);font-family:var(--display,'Anton')"></div></template>`);
  const anfitrion = (pieza) => {
    fs.writeFileSync(path.join(d, "pieza.json"), JSON.stringify(pieza));
    const r = spawnSync(process.execPath, [armar, "pieza.json"], { cwd: d, encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
    const indice = fs.readFileSync(path.join(d, "index.html"), "utf8");
    return { host: indice.match(/<div id="el-mi-escena"[^>]*>/)[0], indice };
  };
  const planos = (extra = {}) => [{ tipo: "titulo", texto: "Inicio" }, { tipo: "propia", desde: 2, archivo: "escenas/mia.html", ...extra }];
  // Con sus propios colores: las variables se cortan y mandan los respaldos de la escena.
  let { host, indice } = anfitrion({ dur: 9, estilo: "S18", paleta: "propia", planos: planos({ paleta: "propia" }) });
  for (const v of ["--fondo", "--tinta", "--acento", "--display", "--cuerpo", "--datos"]) assert.ok(host.includes(`${v}:initial`), `${v} se hereda de la pieza`);
  assert.ok(!/--fondo:#/.test(host));
  // La lleva una cámara suave, para que un plano largo no se quede quieto.
  assert.match(indice, /"#el-mi-escena",\{scale:1,/);
  // Con la paleta de la pieza: sus colores van encima del corte.
  ({ host, indice } = anfitrion({ dur: 9, paleta: "bg", planos: planos({ camara: "fija" }) }));
  assert.match(host, /--fondo:initial;.*--fondo:#/);
  assert.doesNotMatch(indice, /"#el-mi-escena",\{scale/, "camara fija no se mueve");
});

test("una plantilla sin textos avisa que lleva los de ejemplo", () => {
  const dir = path.join(raiz, "library", "plantillas");
  const id = fs.readdirSync(dir).find((n) => fs.existsSync(path.join(dir, n, "ficha.json")) && JSON.parse(fs.readFileSync(path.join(dir, n, "ficha.json"), "utf8")).variables?.length);
  assert.ok(id, "no hay plantillas con variables");
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "ejemplo-"));
  fs.writeFileSync(path.join(d, "pieza.json"), JSON.stringify({ dur: 8, planos: [{ tipo: "titulo", texto: "Inicio" }, { tipo: "plantilla", desde: 2, estilo: id, textos: {} }] }));
  const salida = JSON.parse(execFileSync(process.execPath, [armar, "pieza.json"], { cwd: d, encoding: "utf8" }));
  assert.ok(salida.avisos.some((a) => a.includes("texto de ejemplo")), JSON.stringify(salida.avisos));
});

test("la ráfaga calcula cuántas miniaturas caben, respeta las paradas y copia sus miniaturas", () => {
  const d = proyecto({ dur: 7, planos: [
    { tipo: "titulo", texto: "Inicio" },
    { tipo: "plantilla", desde: 1, estilo: "rafaga", paradas: ["S40", "S04"], cadencia: 3 },
    { tipo: "titulo", desde: 5, texto: "Fin" },
  ] });
  const r = correr(d);
  assert.equal(r.status, 0, r.stderr);
  const html = fs.readFileSync(path.join(d, "index.html"), "utf8");
  const m = html.match(/id="el-rafaga"[^>]*data-variable-values='([^']+)'/);
  assert.ok(m, "el anfitrión lleva sus variables");
  const v = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&"));
  const lista = v.lista.split(",");
  assert.ok(lista.includes("S40") && lista.includes("S04"));
  assert.equal(lista.at(-1), "S04", "la última parada cierra la baraja");
  assert.equal(v.mosaico, "no");
  // 4 s de plano, menos 0,4 s para la transición y 2 paradas de 0,5 s, a 3 cuadros por miniatura: caben 26 sueltas.
  const sueltas = lista.filter((x) => !["S40", "S04"].includes(x));
  assert.equal(sueltas.length, 26);
  assert.ok(fs.existsSync(path.join(d, "assets", "thumbs", "S40.webp")));
  assert.deepEqual(fs.readFileSync(path.join(d, "assets", "thumbs", "S04.webp")), fs.readFileSync(path.join(raiz, "assets", "thumbs", "propias", "S04.webp")), "la miniatura en sus colores manda");
  const mal = correr(proyecto({ dur: 4, planos: [{ tipo: "plantilla", estilo: "rafaga", paradas: ["NO-EXISTE"] }] }));
  assert.notEqual(mal.status, 0);
  assert.ok(`${mal.stderr}${mal.stdout}`.includes("NO-EXISTE"));
});

test("si la pieza pide los colores de cada estilo, un plano sin paleta usa los suyos", () => {
  const d = proyecto({ dur: 8, paleta: "propia", estilo: "S21", planos: [{ tipo: "titulo", texto: "Inicio" }, { tipo: "plantilla", desde: 2, estilo: "rafaga", paradas: ["S40"] }] });
  const r = correr(d);
  assert.equal(r.status, 0, r.stderr);
  const anfitrion = leer(d, "index.html").match(/id="el-rafaga"[^>]*style="([^"]*)"/)?.[1];
  assert.ok(anfitrion, "el anfitrión lleva sus variables de estilo");
  assert.ok(!/--fondo:#/i.test(anfitrion), `no debe imponer colores: ${anfitrion}`);
});

test("una plantilla que abre la pieza arranca adelantada, y solo esa", () => {
  const d = proyecto({ dur: 10, paleta: "propia", planos: [
    { tipo: "plantilla", estilo: "S12", textos: { onomatopeya: "¡PUM!", globo: "Hola", caja: "Uno" } },
    { tipo: "plantilla", desde: 5, estilo: "S21", textos: {} },
  ] });
  const r = correr(d);
  assert.equal(r.status, 0, r.stderr);
  const abre = leer(d, "compositions/S12.html");
  assert.match(abre, /window\.__timelines\["S12"\] = gsap\.timeline\(\{ paused: true \}\)\.to\(adelanto/);
  assert.ok(abre.includes(".pause(0.7)"));
  assert.ok(!leer(d, "compositions/S21.html").includes("adelanto"), "la que no abre va tal cual");
  const original = fs.readFileSync(path.join(raiz, "library", "plantillas", "S21", "escena.html"), "utf8");
  assert.equal(leer(d, "compositions/S21.html"), original);
  const sin = proyecto({ dur: 6, paleta: "propia", planos: [{ tipo: "plantilla", estilo: "S12", adelanto: 0, textos: {} }] });
  assert.equal(correr(sin).status, 0);
  assert.ok(!leer(sin, "compositions/S12.html").includes("adelanto"));
});
