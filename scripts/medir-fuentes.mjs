#!/usr/bin/env node
// Mide en un navegador real el ancho de cada letra de cada fuente y peso, y qué letras del español le faltan.
// Escribe assets/fonts/metricas.json: el kit de escenas lo usa para que un texto quepa sin abrir un navegador.
// Uso: CHROME=ruta/a/chrome-headless-shell node scripts/medir-fuentes.mjs  (la ruta sale de: npx hyperframes@0.9.9 browser path)
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const carpeta = path.join(raiz, "assets", "fonts");
const { familias } = JSON.parse(fs.readFileSync(path.join(carpeta, "fuentes.json"), "utf8"));
const chrome = process.env.CHROME;
if (!chrome) { console.error("Falta CHROME: npx hyperframes@0.9.9 browser path"); process.exit(2); }

const PESOS = { Sora: [400, 600, 700, 800], "JetBrains Mono": [400, 500, 700], "Archivo Black": [400], Archivo: [400, 600, 800], "Bebas Neue": [400], Barlow: [400, 500, 700], Anton: [400], Fraunces: [400, 600, 800], "Source Sans 3": [400, 600], "DM Serif Display": [400], "DM Sans": [400, 600, 700], Syne: [600, 800], Manrope: [400, 600, 800], Unbounded: [600, 800], Onest: [400, 600, 700], "Poiret One": [400], "Josefin Sans": [400, 600], VT323: [400] };
const ASCII = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join("");
const CARACTERES = `${ASCII}¡¿«»°·×÷ÁÉÍÓÚÜÑáéíóúüñÀÈÌÒÙàèìòùÇçãõâêîôû€£—–…“”‘’•`;
const ESENCIALES = "áéíóúüñÁÉÍÓÚÜÑ¿¡«»—…“”%$€";

const fuentesCss = Object.entries(familias).flatMap(([f, d]) => d.archivos.map((a) => `@font-face{font-family:"${f}";src:url("${pathToFileURL(path.join(carpeta, a.archivo)).href}");font-weight:${a.pesos};font-style:normal;font-display:block}`)).join("\n");
const html = `<!doctype html><meta charset="utf-8"><style>${fuentesCss}</style><pre id="out"></pre><script>
(async()=>{
  const PESOS=${JSON.stringify(PESOS)}, CAR=${JSON.stringify(CARACTERES)}, ESE=${JSON.stringify(ESENCIALES)};
  const c=document.createElement('canvas').getContext('2d'), salida={};
  for(const [f,ps] of Object.entries(PESOS)) for(const p of ps){
    await document.fonts.load(p+' 100px "'+f+'"', CAR);
    c.font=p+' 1000px "'+f+'"';
    const ancho=[...CAR].map(ch=>Math.round(c.measureText(ch).width));
    const a=(x,fb)=>{c.font=p+' 1000px "'+f+'", '+fb;return c.measureText(x).width};
    const faltan=[...ESE].filter(ch=>a(ch,'serif')!==a(ch,'monospace'));
    c.font=p+' 1000px "'+f+'"';
    const m=c.measureText('Hxg');
    salida[f+'|'+p]={ancho,faltan,sube:Math.round(m.actualBoundingBoxAscent),baja:Math.round(m.actualBoundingBoxDescent),cap:Math.round(c.measureText('H').actualBoundingBoxAscent),x:Math.round(c.measureText('x').actualBoundingBoxAscent)};
  }
  document.getElementById('out').textContent=JSON.stringify(salida);
  document.title='listo';
})();
</script>`;
const tmp = path.join(os.tmpdir(), `medir-fuentes-${process.pid}.html`);
fs.writeFileSync(tmp, html);
const dom = execFileSync(chrome, ["--headless", "--disable-gpu", "--allow-file-access-from-files", "--virtual-time-budget=20000", "--dump-dom", pathToFileURL(tmp).href], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
fs.rmSync(tmp);
const m = /<pre id="out">([^<]*)<\/pre>/.exec(dom);
if (!m || !m[1]) { console.error("El navegador no devolvió medidas"); process.exit(1); }
const medidas = JSON.parse(m[1].replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">"));
fs.writeFileSync(path.join(carpeta, "metricas.json"), JSON.stringify({ caracteres: CARACTERES, fuentes: medidas }));
const conFaltas = Object.entries(medidas).filter(([, v]) => v.faltan.length).map(([k, v]) => `${k}: ${v.faltan.join("")}`);
console.log(JSON.stringify({ fuentes: Object.keys(medidas).length, bytes: fs.statSync(path.join(carpeta, "metricas.json")).size, conFaltas }, null, 0));
