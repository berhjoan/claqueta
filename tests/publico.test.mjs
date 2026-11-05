// Este repositorio es público. Ninguna llave, correo ni ruta local puede colarse.
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const TEXTO = /\.(md|txt|js|mjs|json|py|html|css|svg|sh|yml|yaml|toml)$/i;

function caminar(dir, salida = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if ([".git", "node_modules", "__pycache__"].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) caminar(p, salida);
    else if (TEXTO.test(e.name)) salida.push(p);
  }
  return salida;
}

const archivos = caminar(raiz);
const PATRONES = [
  ["llave de Anthropic u OpenAI", /\bsk-(?:ant-)?[A-Za-z0-9_-]{20,}/],
  ["llave de Google", /\bAIza[0-9A-Za-z_-]{30,}/],
  ["token de GitHub", /\bgh[pousr]_[A-Za-z0-9]{30,}/],
  ["llave privada", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["ruta de este computador", /[A-Za-z]:[\\/]+Users[\\/]+PC\b|\/c\/Users\/PC\b/],
];

test("no hay secretos ni rutas locales en lo publicado", () => {
  const halla = [];
  for (const f of archivos) {
    const t = fs.readFileSync(f, "utf8");
    for (const [nombre, re] of PATRONES) {
      const m = t.match(re);
      if (m && !f.endsWith("publico.test.mjs")) halla.push(`${path.relative(raiz, f)}: ${nombre}`);
    }
  }
  assert.deepEqual(halla, []);
});

test("la voz clonada no se menciona", () => {
  const motion = fs.readFileSync(path.join(raiz, "library/marca/bg-system-ia/MOTION.md"), "utf8");
  assert.ok(!/voz clonada/i.test(motion));
});

test("las licencias de lo copiado siguen a su lado", () => {
  for (const r of ["LICENSE", "NOTICE.md", "library/hyperframes/LICENSE", "library/hyperframes-clasico/LICENSE", "library/lemo-opuscar/LICENSE", "engines/pizarra/LICENSE-lemo-opuscar.txt", "engines/pizarra/OFL-EMS.txt"]) {
    assert.ok(fs.existsSync(path.join(raiz, r)), r);
  }
});

test("no se publican capturas del video ajeno", () => {
  const dir = path.join(raiz, "library/estilos-40/referencias");
  for (const a of fs.readdirSync(dir)) {
    const n = Number(a.match(/^S(\d+)/)?.[1]);
    assert.ok(n >= 21, `no debería estar ${a}`);
  }
  assert.ok(!fs.existsSync(path.join(raiz, "library/hyperframes/skills/style-sampling")), "style-sampling es de pago");
});

test("la copia local de GSAP es la versión comprobada y llega igual a cualquier clon", () => {
  const copia = fs.readFileSync(path.join(raiz, "tools/lib/gsap.min.js"));
  const hash = `sha384-${createHash("sha384").update(copia).digest("base64")}`;
  assert.equal(hash, "sha384-XmJ9SoHtVOHoQUcKvFAzVXwdkKo1Ie3bhmSoIAkcdsHGaIrVJIkmozyq0FJeb/Ly");
  const ejemplo = fs.readFileSync(path.join(raiz, "engines/pizarra/ejemplo/index.html"), "utf8");
  assert.ok(ejemplo.includes('src="assets/lib/gsap.min.js"'), "el ejemplo debe usar la copia local");
  assert.ok(!ejemplo.includes("data-hf-id"), "el ejemplo no lleva atributos del Studio");
  assert.match(fs.readFileSync(path.join(raiz, ".gitattributes"), "utf8"), /^\* -text$/m, "sin esto, autocrlf cambia el hash al clonar en Windows");
});
