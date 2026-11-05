// Lo común: formatos y zonas seguras, medida de texto sin navegador, tiempos anclados a la voz y azar con semilla.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// ── Formatos. Las mismas cifras que da el encargo: lo medido en 9:16 no sirve en otro.
export const FORMATOS = { "9:16": [1080, 1920], "16:9": [1920, 1080], "1:1": [1080, 1080], "4:5": [1080, 1350] };
const POR_LINEA = { "9:16": 28, "16:9": 42, "1:1": 32, "4:5": 32 };

export function zonas(formato) {
  if (!FORMATOS[formato]) throw new Error(`no existe el formato ${formato}. Hay: ${Object.keys(FORMATOS).join(", ")}`);
  const [W, H] = FORMATOS[formato];
  const es916 = H / W > 1.6, horizontal = W > H;
  const r = (x) => Math.round(x);
  const sub = es916 ? { y1: 1300, y2: 1540, x0: 72, x1: 960 } : { y1: r(H * 0.78), y2: r(H * 0.92), x0: r(W * 0.1), x1: r(W * 0.9) };
  const x0 = es916 ? 84 : r(W * 0.1), x1 = es916 ? 948 : r(W * 0.9);
  const y0 = es916 ? 240 : r(H * 0.08), y1 = es916 ? 1270 : r(H * 0.76);
  return { W, H, formato, es916, horizontal, x0, x1, y0, y1, ancho: x1 - x0, alto: y1 - y0, sub, minTexto: horizontal ? 36 : 44, porLinea: POR_LINEA[formato] };
}

// ── Medida de texto. Tabla medida en un navegador real: scripts/medir-fuentes.mjs.
const metricas = JSON.parse(fs.readFileSync(path.join(RAIZ, "assets", "fonts", "metricas.json"), "utf8"));
const indice = new Map([...metricas.caracteres].map((c, i) => [c, i]));

function fuenteDe(familia, peso) {
  const candidatos = Object.keys(metricas.fuentes).filter((k) => k.startsWith(`${familia}|`));
  if (!candidatos.length) throw new Error(`no hay medidas de la fuente ${familia}`);
  const cerca = candidatos.map((k) => [Math.abs(Number(k.split("|")[1]) - peso), k]).sort((a, b) => a[0] - b[0])[0][1];
  return metricas.fuentes[cerca];
}

export function ancho(texto, familia, peso, px, tracking = 0) {
  const fuente = fuenteDe(familia, peso);
  let suma = 0;
  for (const c of String(texto)) {
    const i = indice.get(c);
    suma += i === undefined ? 600 : fuente.ancho[i];
  }
  return (suma / 1000) * px + tracking * px * [...String(texto)].length;
}

export const alturaMayuscula = (familia, peso) => fuenteDe(familia, peso).cap / 1000;

const CONECTORES = new Set("a al ante con de del e el en la las lo los o para por que se sin su sus u un una y".split(" "));

// Parte un texto en líneas parejas: sin viudas y sin dejar un conector colgando al final de la línea.
export function envolver(texto, familia, peso, px, anchoMax, tracking = 0) {
  const palabras = String(texto).trim().split(/\s+/);
  const n = palabras.length;
  const costo = new Array(n + 1).fill(Infinity), corte = new Array(n + 1).fill(0);
  costo[0] = 0;
  const anchoDe = (i, j) => ancho(palabras.slice(i, j).join(" "), familia, peso, px, tracking);
  for (let j = 1; j <= n; j++) {
    for (let i = j - 1; i >= 0; i--) {
      const a = anchoDe(i, j);
      if (a > anchoMax && j - i > 1) break;
      const sobra = (anchoMax - a) / anchoMax;
      let c = a > anchoMax ? 1000 + (a - anchoMax) : sobra * sobra * (j === n ? 0.35 : 1);
      if (j < n && CONECTORES.has(palabras[j - 1].toLowerCase())) c += 0.5;
      if (j === n && j - i === 1 && n > 1) c += 0.35;
      if (costo[i] + c < costo[j]) { costo[j] = costo[i] + c; corte[j] = i; }
    }
  }
  const lineas = [];
  for (let j = n; j > 0; j = corte[j]) lineas.unshift(palabras.slice(corte[j], j).join(" "));
  return lineas;
}

// El mayor tamaño con el que el texto cabe en la caja. Respeta los saltos forzados con «|».
export function ajustarCaja(texto, familia, peso, caja, { lh = 1.05, min = 20, max = 400, tracking = 0, frases = false } = {}) {
  const partes = String(texto).split("|").map((s) => s.trim()).filter(Boolean);
  const lineasCon = (px) => partes.flatMap((p) => envolver(p, familia, peso, px, caja.w, tracking));
  const cabe = (px) => {
    const l = lineasCon(px);
    return l.length * px * lh <= caja.h && l.every((x) => ancho(x, familia, peso, px, tracking) <= caja.w);
  };
  if (!cabe(min)) return { px: min, lineas: lineasCon(min), desborda: true };
  let bajo = min, alto = max;
  while (alto - bajo > 1) {
    const m = Math.floor((alto + bajo) / 2);
    if (cabe(m)) bajo = m; else alto = m;
  }
  // Una frase se lee por grupos: mejor un poco más pequeña que una palabra por línea.
  if (frases) {
    const total = partes.join(" ").split(/\s+/).length, tope = Math.max(partes.length, Math.ceil(total / 1.8));
    for (let px = bajo; px >= bajo * 0.68 && px >= min; px -= 2) {
      if (lineasCon(px).length <= tope) { bajo = px; break; }
    }
  }
  return { px: bajo, lineas: lineasCon(bajo), desborda: false };
}

export const ajustarLinea = (texto, familia, peso, anchoMax, { max = 900, tracking = 0 } = {}) => {
  const a1000 = ancho(texto, familia, peso, 1000, tracking);
  return Math.min(max, Math.floor((anchoMax / a1000) * 1000));
};

// ── Tiempos. Todo se ancla a palabras de la voz: si cambia la voz, la imagen la sigue.
export const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^\p{L}\p{N}]/gu, "");

export class Reloj {
  constructor(tiempos = {}, rejilla = null) {
    this.palabras = tiempos.palabras ?? [];
    this.grupos = tiempos.grupos ?? [];
    this.dur = tiempos.dur ?? null;
    this.pausas = tiempos.pausas ?? [];
    this.rejilla = rejilla;
  }

  // "@palabra", "@palabra#2" o un número de segundos; "pulso:12" y "compas:3" si hay rejilla.
  resolver(ancla, desde = 0) {
    if (typeof ancla === "number") return ancla;
    const s = String(ancla);
    if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
    const pm = /^(pulso|compas):(\d+)$/.exec(s);
    if (pm) {
      const lista = pm[1] === "pulso" ? this.rejilla?.pulsos : this.rejilla?.compases;
      if (!lista) throw new Error(`«${s}» necesita assets/audio/rejilla.json: corre primero pista.py musica`);
      const v = lista[Number(pm[2]) - 1];
      const t = typeof v === "object" ? (v.inicio ?? v.t) : v;
      if (t === undefined) throw new Error(`«${s}» no existe: hay ${lista.length}`);
      return t;
    }
    const m = /^@(.+?)(?:#(\d+))?$/.exec(s);
    if (!m) throw new Error(`no entiendo el ancla «${s}». Usa @palabra, @palabra#2 o un número`);
    const objetivo = norm(m[1]);
    const iguales = this.palabras.filter((p) => norm(p.palabra) === objetivo);
    if (!iguales.length) {
      const dichas = [...new Set(this.palabras.map((p) => p.palabra))].slice(0, 80).join(" ");
      throw new Error(`la voz no dice «${m[1]}». Dice: ${dichas}`);
    }
    if (m[2]) {
      const p = iguales[Number(m[2]) - 1];
      if (!p) throw new Error(`«${m[1]}» aparece ${iguales.length} veces, no ${m[2]}`);
      return p.inicio;
    }
    const siguiente = iguales.find((p) => p.inicio >= desde - 0.01);
    return (siguiente ?? iguales[0]).inicio;
  }

  // Busca en un tramo la primera palabra de un texto, para que un elemento caiga cuando se nombra.
  enTramo(texto, t0, t1) {
    const todas = String(texto).split(/\s+/).map(norm).filter(Boolean);
    const largas = todas.filter((w) => w.length > 2);
    for (const w of largas.length ? largas : todas) {
      const p = this.palabras.find((x) => x.inicio >= t0 - 0.05 && x.inicio < t1 && norm(x.palabra) === w);
      if (p) return p.inicio;
    }
    return null;
  }

  // Un corte cae en un pulso si hay uno muy cerca y antes de la palabra.
  alPulso(t) {
    const pulsos = this.rejilla?.pulsos;
    if (!pulsos?.length) return t;
    const lista = pulsos.map((p) => (typeof p === "object" ? (p.inicio ?? p.t) : p));
    return lista.filter((p) => p <= t + 0.03 && p >= t - 0.28).sort((a, b) => b - a)[0] ?? t;
  }
}

// ── Azar con semilla: la misma pieza da siempre lo mismo.
export function azar(semilla) {
  let s = semilla | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Lo que entra desde pieza.json es dato: nunca se trata como código ni como HTML.
export const html = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const hex = (c, respaldo) => (/^#[0-9a-fA-F]{6}$/.test(String(c)) ? c : respaldo);
export function rutaLocal(ruta) {
  const r = String(ruta ?? "").replaceAll("\\", "/");
  if (!r || /^[a-z]+:/i.test(r) || r.startsWith("/") || r.split("/").includes("..")) throw new Error(`ruta no permitida: «${ruta}». Usa una ruta dentro del proyecto, como assets/img/foto.jpg`);
  return r;
}
export const f = (x, d = 3) => Number(Number(x).toFixed(d));

// Luminancia relativa y contraste WCAG, para decidir sin mirar qué color se lee sobre cuál.
export function luminancia(h) {
  const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export const contraste = (a, b) => { const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
export const esClaro = (h) => luminancia(h) > 0.4;

// Mezcla dos colores en hexadecimal. GSAP interpola hexadecimales, no color-mix().
export function mezclar(a, b, u) {
  const c = (h, i) => parseInt(h.slice(i, i + 2), 16);
  const uno = (i) => Math.round(c(a, i) * u + c(b, i) * (1 - u)).toString(16).padStart(2, "0");
  return `#${uno(1)}${uno(3)}${uno(5)}`;
}

const iconos = JSON.parse(fs.readFileSync(path.join(RAIZ, "assets", "iconos", "lucide.json"), "utf8"));
export function icono(nombre, trazo = 2) {
  if (!iconos[nombre]) throw new Error(`no existe el icono «${nombre}». Busca con: python ../.claqueta/tools/medios/icono.py buscar "..."`);
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${trazo}" stroke-linecap="round" stroke-linejoin="round">${iconos[nombre]}</svg>`;
}
