// El catálogo es la materia prima: cada opción debe poder mostrarse en el panel y pedirse en los dos idiomas.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEPTOS, valoresPorDefecto } from "../app/catalogo.js";
import { recetas } from "../data/recetas.js";
import { voces, motoresVoz } from "../data/voces.js";
import { musicas, animos } from "../data/sonido.js";
import { movimientos } from "../data/camara.js";

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const existe = (r) => fs.existsSync(path.join(raiz, r));
const controles = DEPTOS.flatMap((d) => d.grupos.flatMap((g) => g.controles.map((c) => ({ d, c }))));

test("cada opción tiene nombre en español e inglés y un id único", () => {
  for (const { d, c } of controles) {
    if (!c.opciones) continue;
    const ids = new Set();
    for (const o of c.opciones) {
      assert.ok(o.id, `${d.id}.${c.k}: opción sin id`);
      assert.ok(!ids.has(o.id), `${d.id}.${c.k}: id repetido ${o.id}`);
      ids.add(o.id);
      assert.ok(Array.isArray(o.n) && o.n[0] && o.n[1], `${d.id}.${c.k}.${o.id}: falta nombre en algún idioma`);
    }
  }
});

test("lo que entra al prompt existe en los dos idiomas", () => {
  for (const { d, c } of controles) {
    for (const o of c.opciones ?? []) {
      if (o.p === undefined || o.p === null) continue;
      assert.ok(Array.isArray(o.p) && o.p[0] && o.p[1], `${d.id}.${c.k}.${o.id}: falta texto de prompt en algún idioma`);
    }
    if (c.t === "interruptor" && c.p) assert.ok(c.p[0] && c.p[1], `${d.id}.${c.k}: interruptor sin los dos idiomas`);
  }
});

test("el valor por defecto de cada control existe", () => {
  const v = valoresPorDefecto();
  for (const { d, c } of controles) {
    if (!c.opciones || c.t === "paleta") continue;
    const val = v[d.id][c.k];
    if (val === null || val === undefined || val === "") continue;
    for (const id of Array.isArray(val) ? val : [val]) assert.ok(c.opciones.some((o) => o.id === id), `${d.id}.${c.k}: defecto inexistente ${id}`);
  }
});

test("las recetas solo tocan controles y opciones que existen", () => {
  assert.ok(recetas.length >= 10);
  for (const r of recetas) {
    for (const [ruta, val] of Object.entries(r.cambios)) {
      const [did, k] = ruta.split(".");
      const c = controles.find((x) => x.d.id === did && x.c.k === k)?.c;
      assert.ok(c, `receta ${r.id}: no existe ${ruta}`);
      if (!c.opciones || c.t === "paleta") continue;
      for (const id of Array.isArray(val) ? val : [val]) assert.ok(c.opciones.some((o) => o.id === id), `receta ${r.id}: ${ruta} no tiene la opción ${id}`);
    }
  }
});

test("hay muchos movimientos de cámara, y cada uno se puede previsualizar", () => {
  assert.ok(movimientos.length >= 25);
  for (const m of movimientos) assert.ok(m.cam, `${m.id} sin curva de cámara`);
});

test("cada estilo tiene datos en los dos idiomas y su documento", () => {
  const estilos = JSON.parse(fs.readFileSync(path.join(raiz, "data/styles.json"), "utf8"));
  assert.equal(estilos.length, 106);
  assert.equal(new Set(estilos.map((e) => e.id)).size, 106);
  for (const e of estilos) {
    assert.ok(e.name.es && e.name.en, `${e.id} sin nombre`);
    assert.ok(e.traits.es && e.traits.en, `${e.id} sin rasgos`);
    if (e.doc) assert.ok(existe(e.doc.split("#")[0]), `${e.id}: no existe ${e.doc}`);
    if (e.thumb) assert.ok(existe(e.thumb), `${e.id}: no existe ${e.thumb}`);
  }
});

test("no se publican las miniaturas que parecen homenajes", () => {
  for (const id of ["L-scifi-toon", "L-brick-toy", "L-paper-popup"]) assert.ok(!existe(`assets/thumbs/${id}.webp`), id);
});

test("cada voz y cada carácter musical tienen muestra", () => {
  for (const v of voces) {
    assert.ok(existe(v.muestra), `falta ${v.muestra}`);
    assert.ok(motoresVoz[v.motor]?.instalar, `motor sin instalación: ${v.motor}`);
    if (v.motor !== "edge") assert.ok(v.licencia, `${v.id} sin licencia`);
  }
  for (const a of animos) assert.ok(existe(a.muestra), `falta ${a.muestra}`);
});

test("el panel no ofrece motores de música con pesos no comerciales", () => {
  const texto = JSON.stringify(musicas);
  assert.ok(!/MusicGen|audiocraft/i.test(texto));
});

test("la biblioteca lista archivos que existen", () => {
  const m = JSON.parse(fs.readFileSync(path.join(raiz, "library/manifest.json"), "utf8"));
  assert.ok(m.items.length > 150);
  for (const i of m.items) {
    assert.ok(existe(i.ruta), `falta ${i.ruta}`);
    assert.ok(i.titulo && i.licencia && i.cat, `incompleto: ${i.ruta}`);
  }
});

test("el radar tiene los campos que el panel lee", () => {
  const r = JSON.parse(fs.readFileSync(path.join(raiz, "data/radar.json"), "utf8"));
  assert.equal(r.length, 50);
  for (const x of r) {
    assert.match(x.url, /^https:\/\/github\.com\//);
    assert.ok(x.es && x.en && x.why, x.repo);
    assert.ok(["adoptar", "probar", "vigilar", "descartar"].includes(x.verdict), x.repo);
  }
});
