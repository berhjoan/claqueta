// Las plantillas de estilo deben cumplir library/plantillas/FORMATO.md. Todo se comprueba leyendo archivos: sin navegador, en milisegundos.
// El render de verdad (check y cuadros) lo hace library/plantillas/probar.mjs; aquí se vigila que nadie rompa el contrato.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const base = path.join(raiz, "library", "plantillas");
// PLANTILLAS_SOLO=S04,S16 limita la prueba a esas carpetas mientras se trabaja en ellas.
const solo = process.env.PLANTILLAS_SOLO?.split(",").map((x) => x.trim()).filter(Boolean);
const carpetas = fs.readdirSync(base, { withFileTypes: true }).filter((d) => d.isDirectory() && (!solo || solo.includes(d.name))).map((d) => d.name).sort();
const leer = (...r) => fs.readFileSync(path.join(base, ...r), "utf8");
const ficha = (id) => JSON.parse(leer(id, "ficha.json"));
const fichaSegura = (id) => { try { return ficha(id); } catch { return null; } };
// Una carpeta sin «probado» en su ficha está en trabajo: solo se le exige tener sus dos archivos. Con «probado» debe cumplir todo el formato.
const probadas = carpetas.filter((id) => fichaSegura(id)?.probado);
const familias = new Set(Object.keys(JSON.parse(fs.readFileSync(path.join(raiz, "assets", "fonts", "fuentes.json"), "utf8")).familias));
// Los nombres de sonido salen del propio sintetizador: si se añade o quita uno, la prueba lo sigue.
const sonidos = new Set([...fs.readFileSync(path.join(raiz, "tools", "audio", "efecto.py"), "utf8").matchAll(/^\s{4}"(\w+)":\s*\(lambda/gm)].map((m) => m[1]));

const ESTILOS = ["S04", "S06", "S10", "S12", "S14", "S16", "S17", "S18", "S20", "S21", "S27", "S28", "S29", "S30", "S40"];
const ESPECIALES = ["rafaga", "transicion-glitch"];
const prefijo = (id) => {
  // «S16» → pl-s16; «transicion-glitch» → pl-glitch (basta con que el nombre corto cierre el id).
  const m = leer(id, "escena.html").match(/<div id="(pl-[a-z0-9]+)"[^>]*data-composition-id="/);
  return m ? m[1] : null;
};

// Tamaño de un JPEG (marcador SOF) y de un WebP (VP8, VP8L o VP8X), sin dependencias.
function tamanoJpeg(b) {
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const t = b[i + 1];
    if (t >= 0xc0 && t <= 0xc3) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    i += 2 + b.readUInt16BE(i + 2);
  }
  return null;
}
function tamanoWebp(b) {
  if (b.toString("ascii", 0, 4) !== "RIFF" || b.toString("ascii", 8, 12) !== "WEBP") return null;
  const tipo = b.toString("ascii", 12, 16);
  if (tipo === "VP8 ") return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  if (tipo === "VP8L") { const v = b.readUInt32LE(21); return [(v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1]; }
  if (tipo === "VP8X") return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  return null;
}

test("están las 15 plantillas de estilo, la ráfaga y la transición glitch, todas probadas", () => {
  for (const id of [...ESTILOS, ...ESPECIALES]) {
    if (solo && !solo.includes(id)) continue;
    assert.ok(carpetas.includes(id), `falta library/plantillas/${id}/`);
    assert.ok(probadas.includes(id), `${id}: su ficha no tiene «probado»`);
  }
});

test("cada carpeta trae escena.html y ficha.json; las probadas, también una muestra de 540×960 de menos de 120 KB", () => {
  for (const id of carpetas) {
    for (const a of ["escena.html", "ficha.json"]) assert.ok(fs.existsSync(path.join(base, id, a)), `${id}: falta ${a}`);
    assert.ok(fichaSegura(id), `${id}: ficha.json no es un JSON válido`);
  }
  for (const id of probadas) {
    assert.ok(fs.existsSync(path.join(base, id, "muestra.jpg")), `${id}: falta muestra.jpg`);
    const m = fs.readFileSync(path.join(base, id, "muestra.jpg"));
    assert.ok(m.length < 120 * 1024, `${id}: muestra.jpg pesa ${m.length} bytes`);
    assert.equal(m[0], 0xff, `${id}: muestra.jpg no es un JPEG`);
    assert.deepEqual(tamanoJpeg(m), [540, 960], `${id}: muestra.jpg debe medir 540×960`);
  }
});

test("ficha.json: datos completos, textos por defecto dentro de su largo máximo y estado probado", () => {
  for (const id of probadas) {
    const f = ficha(id);
    assert.equal(f.id, id, `${id}: el id de la ficha no coincide con la carpeta`);
    assert.ok(typeof f.nombre === "string" && f.nombre, `${id}: falta el nombre`);
    assert.equal(f.duracion, 4, `${id}: dura 4 s`);
    assert.ok(Array.isArray(f.variables), `${id}: variables`);
    const vistos = new Set();
    for (const v of f.variables) {
      assert.match(v.id, /^[a-z][a-z0-9_]*$/, `${id}: id de variable inválido ${v.id}`);
      assert.ok(!vistos.has(v.id), `${id}: variable repetida ${v.id}`);
      vistos.add(v.id);
      assert.ok(v.etiqueta, `${id}.${v.id}: falta la etiqueta`);
      assert.equal(typeof v.defecto, "string", `${id}.${v.id}: el valor por defecto es texto`);
      assert.ok(Number.isInteger(v.max) && v.max > 0, `${id}.${v.id}: max debe ser un entero`);
      assert.ok(v.defecto.length <= v.max, `${id}.${v.id}: el valor por defecto (${v.defecto.length}) pasa de max (${v.max})`);
    }
    for (const k of ["fondo", "tinta", "acento", "segundo", "superficie"]) assert.match(f.paleta?.[k] ?? "", /^#[0-9A-Fa-f]{6}$/, `${id}: paleta.${k}`);
    assert.ok(Array.isArray(f.fuentes), `${id}: fuentes`);
    for (const x of f.fuentes) assert.ok(familias.has(x), `${id}: la fuente «${x}» no está en assets/fonts/fuentes.json`);
    assert.ok(Array.isArray(f.rasgos) && f.rasgos.length >= 2 && f.rasgos.every((r) => typeof r === "string" && r), `${id}: al menos dos rasgos`);
    assert.ok(Array.isArray(f.sonidos), `${id}: sonidos`);
    for (const s of f.sonidos) {
      assert.ok(sonidos.has(s.sonido), `${id}: el sonido «${s.sonido}» no existe en tools/audio/efecto.py`);
      assert.ok(typeof s.t === "number" && s.t >= 0 && s.t < 4, `${id}: t fuera de 0–4 s en ${s.sonido}`);
      assert.ok(typeof s.ganancia === "number" && s.ganancia <= 0, `${id}: ganancia en dB, 0 o menos`);
    }
    assert.ok(["propia"].includes(f.origen) || /^registro:.+/.test(f.origen), `${id}: origen`);
    assert.ok(f.licencia, `${id}: falta la licencia`);
    assert.equal(f.probado?.motor, "hyperframes@0.9.9", `${id}: probado.motor`);
    assert.equal(f.probado?.check, "0 errores", `${id}: probado.check`);
    assert.equal(f.probado?.render, true, `${id}: probado.render`);
    assert.match(f.probado?.fecha ?? "", /^\d{4}-\d{2}-\d{2}$/, `${id}: probado.fecha`);
  }
});

test("escena.html: composición de 1080×1920 con su raíz, sus variables y su línea de tiempo", () => {
  for (const id of probadas) {
    const h = leer(id, "escena.html");
    assert.ok(h.trimStart().startsWith("<template>") && h.trimEnd().endsWith("</template>"), `${id}: debe ir dentro de <template>`);
    // Un valor entre comillas puede llevar «>» (el «> listo» de una terminal): el patrón respeta las comillas.
    const attrs = `(?:[^>"']|"[^"]*"|'[^']*')*`;
    const raizTag = h.match(new RegExp(`<div${attrs}data-composition-id="${id}"${attrs}>`));
    assert.ok(raizTag, `${id}: no hay raíz con data-composition-id="${id}"`);
    for (const a of ['data-start="0"', 'data-duration="4"', 'data-width="1080"', 'data-height="1920"']) assert.ok(raizTag[0].includes(a), `${id}: la raíz necesita ${a}`);
    const vars = JSON.parse(raizTag[0].match(/data-composition-variables='([^']*)'/)?.[1] ?? "null");
    assert.ok(Array.isArray(vars), `${id}: la raíz debe declarar data-composition-variables`);
    const f = ficha(id);
    assert.deepEqual(vars.map((v) => v.id), f.variables.map((v) => v.id), `${id}: las variables de la escena y de la ficha no coinciden`);
    for (const v of vars) {
      const fv = f.variables.find((x) => x.id === v.id);
      assert.equal(v.type, "string", `${id}.${v.id}: tipo`);
      assert.equal(v.default, fv.defecto, `${id}.${v.id}: el defecto de la escena y el de la ficha difieren`);
      assert.ok(new RegExp(`data-var-text="${v.id}"`).test(h), `${id}: la variable ${v.id} no está enlazada con data-var-text`);
    }
    assert.ok(new RegExp(`__timelines\\[\\s*["']${id}["']\\s*\\]\\s*=`).test(h), `${id}: no registra window.__timelines["${id}"]`);
  }
});

test("escena.html: determinista y sin nada externo", () => {
  for (const id of probadas) {
    const h = leer(id, "escena.html");
    for (const prohibido of [/Math\.random/, /Date\.now/, /new Date\b/, /performance\.now/, /\bsetTimeout\b/, /\bsetInterval\b/, /requestAnimationFrame/]) {
      assert.ok(!prohibido.test(h), `${id}: usa ${prohibido}, que no es función del tiempo`);
    }
    const externas = [...h.matchAll(/https?:\/\/[^\s"'<>)]+/g)].map((m) => m[0]).filter((u) => u !== "http://www.w3.org/2000/svg");
    assert.deepEqual(externas, [], `${id}: URL externas`);
    assert.ok(!/<link\b|<script[^>]*\bsrc=|@import|@font-face|fonts\.googleapis/.test(h), `${id}: carga recursos aparte`);
    assert.ok(!/\bfetch\s*\(|XMLHttpRequest|import\s*\(/.test(h), `${id}: pide cosas por red`);
  }
});

test("escena.html: solo fuentes del sistema, y las que usa están en la ficha", () => {
  for (const id of probadas) {
    const h = leer(id, "escena.html");
    const usadas = new Set([...h.matchAll(/var\(--(?:display|cuerpo|datos),\s*"([^"]+)"\)/g)].map((m) => m[1]));
    for (const x of usadas) assert.ok(familias.has(x), `${id}: la fuente «${x}» no está en assets/fonts/fuentes.json`);
    // Una familia puesta a pelo (sin variable) también debe existir.
    for (const m of h.matchAll(/font-family:\s*"([^"]+)"/g)) assert.ok(familias.has(m[1]), `${id}: font-family «${m[1]}» no existe en el sistema`);
    const f = ficha(id);
    for (const x of usadas) assert.ok(f.fuentes.includes(x), `${id}: usa «${x}» y la ficha no lo anota`);
    for (const x of f.fuentes) assert.ok(usadas.has(x), `${id}: la ficha anota «${x}» pero la escena no lo usa`);
  }
});

test("escena.html: ids y clases con prefijo propio, sin dígito al inicio, y sin prefijos repetidos", () => {
  const prefijos = new Map();
  for (const id of probadas) {
    const h = leer(id, "escena.html");
    const p = prefijo(id);
    assert.ok(p, `${id}: la raíz debe llevar un id con prefijo pl-…`);
    assert.ok(!prefijos.has(p), `${id}: el prefijo ${p} ya lo usa ${prefijos.get(p)}`);
    prefijos.set(p, id);
    const sinComentarios = h.replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const m of sinComentarios.matchAll(/\sid="([^"]+)"/g)) assert.ok(m[1].startsWith(p), `${id}: el id «${m[1]}» no empieza por ${p}`);
    for (const m of sinComentarios.matchAll(/\sclass="([^"']+)"/g)) for (const c of m[1].split(/\s+/)) assert.ok(c.startsWith(p), `${id}: la clase «${c}» no empieza por ${p}`);
    // Selectores del <style>: nada global que pise a otra escena.
    for (const estilo of sinComentarios.matchAll(/<style>([\s\S]*?)<\/style>/g)) {
      for (const bloque of estilo[1].matchAll(/([^{}]+)\{/g)) {
        const selector = bloque[1].trim();
        if (selector.startsWith("@")) continue;
        for (const t of selector.matchAll(/[#.]([A-Za-z_][\w-]*)/g)) assert.ok(t[1].startsWith(p), `${id}: el selector «${t[0]}» no empieza por ${p}`);
        assert.ok(!/(^|[\s,>+~])(html|body|\*)([\s,{>+~]|$)/.test(selector), `${id}: el selector «${selector}» es global`);
      }
    }
  }
});

test("miniatura propia: cada estilo tiene assets/thumbs/propias/<id>.webp con el tamaño de la del catálogo", () => {
  for (const id of ESTILOS) {
    const propia = path.join(raiz, "assets", "thumbs", "propias", `${id}.webp`);
    const catalogo = path.join(raiz, "assets", "thumbs", `${id}.webp`);
    assert.ok(fs.existsSync(propia), `${id}: falta assets/thumbs/propias/${id}.webp`);
    const a = tamanoWebp(fs.readFileSync(propia)), b = tamanoWebp(fs.readFileSync(catalogo));
    assert.ok(a && b, `${id}: no se pudo leer el tamaño del webp`);
    assert.deepEqual(a, b, `${id}: la miniatura propia mide ${a} y la del catálogo ${b}`);
  }
});

test("la ráfaga y la transición glitch no dependen de la escena vecina", () => {
  const r = leer("rafaga", "escena.html");
  assert.ok(r.includes("pl-rafaga-catalogo"), "la ráfaga lleva su catálogo de nombres embebido");
  assert.ok(/assets\/thumbs/.test(r), "la ráfaga busca las miniaturas en assets/thumbs");
  const g = leer("transicion-glitch", "escena.html");
  assert.ok(g.includes("mix-blend-mode: difference"), "el glitch invierte lo que hay debajo con mix-blend-mode: difference");
  assert.ok(!/z-index/.test(g), "un z-index aísla la mezcla y el glitch deja de verse");
});
