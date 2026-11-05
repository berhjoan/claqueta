// El motor isométrico sin navegador: objetos, tiempos, cámara, zonas, orden de pintado y sonido. Rápido: todo corre en Node.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const motor = path.join(raiz, "engines", "isometrico");
const carga = (nombre) => import(pathToFileURL(path.join(motor, nombre)).href);
const { BIBLIOTECA } = await carga("objetos.js");
const { crearPelicula, coloresDe, FORMATOS, medirTexto, repartirSubtitulos } = await carga("motor.js");
const solidos = await carga("solidos.js");
const { crearPintor } = await carga("pintor.js");
const film = await carga("film.js");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "claqueta-iso-"));
test.after(() => fs.rmSync(dir, { recursive: true, force: true }));
const correr = (args, cwd = raiz) => spawnSync(process.execPath, args, { cwd, encoding: "utf8" });
const c = { ...coloresDe(film.PALETA), medir: (t, tam, peso) => medirTexto(t, tam, peso) };
const estado = { t: 1, abre: 1, enciende: 1, avisa: 0.5, escribe: 1, levanta: 1, saca: 1, crece: 1, traza: 1, gira: 1 };

test("están todos los objetos que pide un video normal", () => {
  for (const t of ["sobre", "documento", "servidor", "persona", "telefono", "caja", "barras", "moneda", "engranaje", "nube", "candado", "flecha", "plataforma", "aprobado", "estante", "lupa", "globo", "pantalla", "chip", "bloque", "letras"]) assert.ok(BIBLIOTECA[t], `falta ${t}`);
});

test("cada objeto da piezas con coordenadas finitas y un alto que sirve para apoyar otro encima", () => {
  for (const [tipo, lib] of Object.entries(BIBLIOTECA)) {
    const p = { tipo, id: tipo, texto: "Año", escala: 1 };
    const piezas = lib.crear(p, estado, c);
    assert.ok(piezas.length > 0, tipo);
    for (const pr of piezas) {
      solidos.medirCaja(pr);
      assert.ok(pr.aabb.every(Number.isFinite), `${tipo}: caja no finita`);
      for (const q of solidos.vertices(pr)) assert.ok(q.every(Number.isFinite), `${tipo}: vértice no finito`);
      assert.ok(pr.aabb[2] > -1, `${tipo}: se mete bajo el suelo`);
    }
    const alto = typeof lib.alto === "function" ? lib.alto(p) : lib.alto;
    assert.ok(alto > 0, `${tipo}: sin alto`);
  }
});

test("las caras apuntan hacia afuera: de un cubo se ven solo tres", () => {
  const cubo = solidos.caja(2, 2, 2, { x: 5, y: 5 });
  const vistas = cubo.caras.filter((f) => { let nx = 0, ny = 0, nz = 0; f.p.forEach((a, i) => { const b = f.p[(i + 1) % f.p.length]; nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1]); }); return nx + ny + nz > 1e-6; });
  assert.equal(vistas.length, 3);
});

test("la proyección es una sola y verdadera: 1 unidad mide lo mismo en los tres ejes", () => {
  const largo = (x, y, z) => { const [u, v] = solidos.iso(x, y, z); return Math.hypot(u, v); };
  assert.ok(Math.abs(largo(1, 0, 0) - 1) < 1e-9);
  assert.ok(Math.abs(largo(0, 1, 0) - 1) < 1e-9);
  assert.ok(Math.abs(largo(0, 0, 1) - 1) < 1e-9);
  const [x, y] = solidos.deIso(...solidos.iso(3, -2, 0), 0);
  assert.ok(Math.abs(x - 3) < 1e-9 && Math.abs(y + 2) < 1e-9);
});

test("el orden de pintado va de atrás hacia adelante y de abajo hacia arriba", () => {
  const caja = (id, x, y, z, w = 1, d = 1, h = 1) => { const pr = solidos.caja(w, d, h, { x, y, z }); pr.id = id; return solidos.medirCaja(pr); };
  const nombres = (l) => solidos.ordenar(l).map((p) => p.id);
  assert.deepEqual(nombres([caja("adelante", 3, 3, 0), caja("atras", 0, 0, 0)]), ["atras", "adelante"]);
  assert.deepEqual(nombres([caja("encima", 0, 0, 1), caja("base", 0, 0, 0, 3, 3, 1)]), ["base", "encima"]);
  // Una tabla larga y baja frente a una torre: si se ordenara por el centro, saldría al revés.
  const o = nombres([caja("torre", 0, 0, 0, 1, 1, 6), caja("tabla", 1.2, 0, 0, 1, 8, 0.2)]);
  assert.deepEqual(o, ["torre", "tabla"]);
});

test("W lee la voz, falla con un mensaje claro y acepta palabras sin tilde", async () => {
  const { W, F, TIEMPOS } = await carga("tiempos.js");
  assert.equal(W("Llega"), TIEMPOS.palabras[0].inicio);
  assert.equal(W("tu"), W("Tú"));
  assert.ok(W("IA", 2) > W("IA", 1));
  assert.ok(F("mensaje") > W("mensaje"));
  assert.throws(() => W("gato"), /no está en la voz/);
  assert.throws(() => W("IA", 3), /aparece 2/);
});

test("tiempos.mjs convierte el JSON en módulo, cambia duración y formato, y funciona sin voz", async () => {
  const p = path.join(dir, "proyecto");
  fs.mkdirSync(path.join(p, "assets"), { recursive: true });
  fs.mkdirSync(path.join(p, "compositions"));
  fs.copyFileSync(path.join(motor, "ejemplo", "index.html"), path.join(p, "index.html"));
  fs.copyFileSync(path.join(motor, "ejemplo", "isometrico.html"), path.join(p, "compositions", "isometrico.html"));
  fs.writeFileSync(path.join(p, "assets", "tiempos.json"), JSON.stringify({ voz: "v.mp3", fin_voz: 2, dur: 3.5, formato: "16:9", palabras: [{ palabra: "Año.", inicio: 0.5, fin: 1 }], pausas: [], grupos: [] }));
  const script = path.join(motor, "tiempos.mjs");
  let r = correr([script], p);
  assert.equal(r.status, 0, r.stderr);
  const m = await import(pathToFileURL(path.join(p, "assets", "isometrico", "tiempos.js")).href);
  assert.equal(m.W("año"), 0.5);
  assert.equal(m.TIEMPOS.formato, "16:9");
  const html = fs.readFileSync(path.join(p, "index.html"), "utf8"), escena = fs.readFileSync(path.join(p, "compositions", "isometrico.html"), "utf8");
  assert.match(html, /data-duration="3\.5"/);
  assert.match(html, /data-width="1920"/);
  assert.match(html, /width: 1920px; height: 1080px/);
  assert.doesNotMatch(html, /1080px; height: 1920px/);
  assert.match(escena, /width="1920" height="1080"/);
  assert.match(escena, /\bD = 3\.5/);
  r = correr([script, "--formato", "4:5", "--dur", "9"], p);
  assert.equal(r.status, 0, r.stderr);
  assert.match(fs.readFileSync(path.join(p, "index.html"), "utf8"), /data-height="1350"/);
  fs.rmSync(path.join(p, "assets", "tiempos.json"));
  r = correr([script, "--dur", "6"], p);
  assert.equal(r.status, 0, r.stderr);
  r = correr([script], fs.mkdtempSync(path.join(dir, "vacio-")));
  assert.equal(r.status, 2);
  assert.match(r.stderr, /no existe/);
});

test("si cambia la voz, la imagen la sigue sin tocar el film: zonas y sonido siguen bien", async () => {
  const base = JSON.parse(JSON.stringify(film.TIEMPOS));
  for (const [nombre, k] of [["lenta", 1.25], ["rapida", 0.85]]) {
    const p = path.join(dir, `voz-${nombre}`), a = path.join(p, "assets", "isometrico");
    fs.mkdirSync(a, { recursive: true });
    for (const f of fs.readdirSync(motor).filter((n) => n.endsWith(".js"))) fs.copyFileSync(path.join(motor, f), path.join(a, f));
    const escala = (x) => +(x * k).toFixed(3), voz = { ...base, dur: escala(base.dur), fin_voz: escala(base.fin_voz) };
    voz.palabras = base.palabras.map((w) => ({ ...w, inicio: escala(w.inicio), fin: escala(w.fin) }));
    voz.grupos = base.grupos.map((g) => ({ ...g, inicio: escala(g.inicio), fin: escala(g.fin), palabras: g.palabras.map((w) => ({ ...w, inicio: escala(w.inicio), fin: escala(w.fin) })) }));
    fs.writeFileSync(path.join(p, "assets", "tiempos.json"), JSON.stringify(voz));
    let r = correr([path.join(motor, "tiempos.mjs")], p);
    assert.equal(r.status, 0, r.stderr);
    r = correr([path.join(motor, "zonas.mjs"), "assets/isometrico/film.js", "--todos"], p);
    assert.equal(r.status, 0, `${nombre}: ${r.stdout}`);
    const s = path.join(p, "efectos.json");
    r = correr([path.join(motor, "eventos.mjs"), "assets/isometrico/film.js", s], p);
    assert.equal(r.status, 0, r.stderr);
    const primero = JSON.parse(fs.readFileSync(s, "utf8"))[0];
    assert.ok(Math.abs(primero.pico - (voz.palabras[2].inicio + 1 / 30)) < 0.01, `${nombre}: ${primero.pico}`);
  }
});

test("la película de muestra cumple zonas y sujeto en los cuatro formatos", () => {
  const r = correr([path.join(motor, "zonas.mjs"), path.join(motor, "film.js"), "--todos"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const d = JSON.parse(r.stdout);
  assert.equal(d.formatos.length, 4);
  for (const f of d.formatos) for (const e of f.encuadres) assert.ok(e.lado >= 0.4, `${f.formato}: ${e.mira} ${e.lado}`);
});

test("el mismo film cambia solo de composición según el formato", () => {
  const v = crearPelicula(film, { formato: "9:16" }), h = crearPelicula(film, { formato: "16:9" });
  assert.equal(v.espejo, false);
  assert.equal(h.espejo, true);
  assert.equal(v.W, 1080);
  assert.equal(h.W, 1920);
  for (const f of Object.keys(FORMATOS)) {
    const p = crearPelicula(film, { formato: f });
    const banda = p.F.banda;
    assert.ok(banda[0] >= p.F.zona[3], `${f}: la banda pisa el contenido`);
    for (const t of [0.5, 3, 6.5, 9]) { const s = p.textosEn(t).find((x) => x.tipo === "subtitulo"); if (s) { assert.ok(s.caja[1] >= banda[0] && s.caja[3] <= banda[1], `${f} ${t}`); assert.ok(s.lineas.length <= 2); } }
  }
});

test("subtítulos: máximo dos líneas y el ancho del formato, partiendo en las comas", () => {
  const palabras = "La IA lo lee, busca el pedido y prepara la respuesta.".split(" ").map((palabra, i) => ({ palabra, inicio: i, fin: i + 0.9 }));
  const g = repartirSubtitulos([{ inicio: 0, fin: 10, lineas: [], palabras }], 28);
  assert.equal(g.length, 2);
  assert.equal(g[0].lineas.flat().map((p) => p.palabra).join(" "), "La IA lo lee,");
  for (const s of g) { assert.ok(s.lineas.length <= 2); for (const l of s.lineas) assert.ok(l.map((p) => p.palabra).join(" ").length <= 28); }
  assert.equal(g[0].fin, g[1].inicio);
});

test("errores claros si el film nombra algo que no existe", () => {
  const base = { ...film, OBJETOS: film.OBJETOS, CAMARA: film.CAMARA };
  assert.throws(() => crearPelicula({ ...base, OBJETOS: [{ id: "a", tipo: "marciano" }] }), /no existe/);
  assert.throws(() => crearPelicula({ ...base, OBJETOS: [{ id: "a", tipo: "caja", sobre: "b" }], CAMARA: [{ desde: 0, mira: "a" }], CAMINOS: [], TEXTOS: [] }), /«b»/);
  assert.throws(() => crearPelicula({ ...base, CAMARA: [{ desde: 0, mira: "nadie" }] }), /nadie/);
  assert.throws(() => crearPelicula({ ...base, PALETA: { ...film.PALETA, acento: "oro" } }), /hexadecimal/);
  assert.throws(() => crearPelicula(base, { formato: "3:2" }), /no existe/);
});

test("la paleta manda: también funciona con un fondo claro", () => {
  const PALETA = { fondo: "#F1E8D8", tinta: "#2A2E29", acento: "#D0573A", secundario: "#3D6B59", superficie: "#EAE2D3" };
  const p = crearPelicula({ ...film, PALETA }, {});
  assert.equal(p.c.oscuro, false);
  assert.ok(p.escena(5).prims.length > 0);
  const x = lienzoFalso(p.W, p.H);
  crearPintor(x.canvas, p)(5);
  assert.ok(x.llamadas.length > 100);
});

// Un lienzo de mentira que anota lo que se le pide: sirve para probar el pintor sin navegador.
function lienzoFalso(W, H) {
  const llamadas = [];
  const degradado = { addColorStop() {} };
  const ctx = new Proxy({}, {
    get(o, k) {
      if (k in o) return o[k];
      if (k === "createLinearGradient" || k === "createRadialGradient") return () => degradado;
      if (k === "createPattern") return () => ({});
      if (k === "createImageData") return (a, b) => ({ data: new Uint8ClampedArray(a * b * 4) });
      if (k === "canvas") return canvas;
      return (...a) => { llamadas.push([k, ...a.map((v) => (typeof v === "number" ? +v.toFixed(3) : typeof v === "string" ? v : "o"))]); };
    },
    set(o, k, v) { o[k] = v; llamadas.push(["=", k, typeof v === "object" ? "o" : String(v)]); return true; },
  });
  const canvas = { width: W, height: H, getContext: () => ctx };
  globalThis.OffscreenCanvas = class { constructor(w, h) { this.width = w; this.height = h; } getContext() { return ctx; } };
  return { canvas, llamadas };
}

test("el catálogo trae todos los objetos y se puede pintar", async () => {
  const catalogo = await carga("ejemplo/catalogo.js");
  const p = crearPelicula(catalogo, {});
  assert.deepEqual([...new Set(catalogo.OBJETOS.map((o) => o.tipo))].sort(), Object.keys(BIBLIOTECA).sort());
  const x = lienzoFalso(p.W, p.H);
  crearPintor(x.canvas, p)(1);
  assert.ok(x.llamadas.length > 500);
});

test("función pura del tiempo: ir atrás y adelante da las mismas órdenes de dibujo", () => {
  const p = crearPelicula(film, {});
  p.sinDesenfoque = true;
  const { canvas, llamadas } = lienzoFalso(p.W, p.H);
  const pintar = crearPintor(canvas, p);
  const huella = (t) => { llamadas.length = 0; pintar(t); return JSON.stringify(llamadas); };
  const a = huella(4.2), b = huella(9.3), a2 = huella(4.2), b2 = huella(9.3);
  assert.ok(a.length > 1000);
  assert.equal(a, a2);
  assert.equal(b, b2);
  assert.notEqual(a, b);
});

test("recorre toda la película sin fallar, y el primer cuadro ya tiene imagen", () => {
  const p = crearPelicula(film, {});
  for (let t = 0; t < p.DUR; t += 0.25) {
    const e = p.escena(t);
    assert.ok(Number.isFinite(e.cam.k) && e.cam.k > 0, `cámara en ${t}`);
    assert.ok(e.prims.length > 0, `cuadro vacío en ${t}`);
  }
  assert.ok(p.escena(0).prims.some((pr) => pr.grupo !== undefined));
});

test("eventos.mjs deja un efectos.json que mezcla.py entiende, en orden y separado", () => {
  const salida = path.join(dir, "efectos.json");
  const r = correr([path.join(motor, "eventos.mjs"), path.join(motor, "film.js"), salida]);
  assert.equal(r.status, 0, r.stderr);
  const lista = JSON.parse(fs.readFileSync(salida, "utf8"));
  assert.ok(lista.length >= 5);
  for (const e of lista) {
    assert.ok(e.pico >= 0 && e.pico <= film.DUR, `${e.pico}`);
    assert.ok(typeof e.sonido === "string");
    assert.ok(e.ganancia <= 0);
  }
  for (let i = 1; i < lista.length; i++) assert.ok(lista[i].pico >= lista[i - 1].pico);
  // El pico cae un cuadro después de la imagen: la caída del sobre aterriza en «mensaje».
  const primero = lista[0];
  assert.ok(Math.abs(primero.pico - (film.TIEMPOS.palabras[2].inicio + 1 / 30)) < 0.01, `${primero.pico}`);
});

test("nada de azar sin semilla, relojes ni fetch en lo que se copia al proyecto", () => {
  for (const f of fs.readdirSync(motor).filter((n) => n.endsWith(".js") && n !== "metricas.js" && n !== "tiempos.js")) {
    const s = fs.readFileSync(path.join(motor, f), "utf8").replace(/\/\/.*$/gm, "");
    for (const prohibido of ["Math.random", "Date.now", "new Date", "requestAnimationFrame", "setTimeout", "setInterval", "fetch(", "performance.now"]) assert.ok(!s.includes(prohibido), `${f}: ${prohibido}`);
  }
});

test("las métricas del motor son las de assets/fonts", async () => {
  const m = JSON.parse(fs.readFileSync(path.join(raiz, "assets", "fonts", "metricas.json"), "utf8"));
  const { FUENTES, CARACTERES } = await carga("metricas.js");
  assert.equal(CARACTERES, m.caracteres);
  assert.deepEqual(FUENTES["Sora|700"].ancho, m.fuentes["Sora|700"].ancho);
  assert.ok(medirTexto("¿Cuánto añó?", 100, 700) > 300);
});

test("el ejemplo es un proyecto de HyperFrames con GSAP local y reloj proxy", () => {
  const html = fs.readFileSync(path.join(motor, "ejemplo", "index.html"), "utf8"), escena = fs.readFileSync(path.join(motor, "ejemplo", "isometrico.html"), "utf8");
  assert.match(html, /assets\/lib\/gsap\.min\.js/);
  assert.doesNotMatch(html, /cdn|https?:/);
  assert.match(html, /assets\/fonts\/fuentes\.css/);
  assert.match(escena, /\.\/assets\/isometrico\/mundo\.js/);
  assert.match(escena, /onUpdate/);
  assert.doesNotMatch(escena.replace(/\/\/.*$/gm, ""), /requestAnimationFrame/);
});
