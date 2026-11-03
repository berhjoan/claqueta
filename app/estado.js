// Estado del panel: valores, planos, guardado local y enlace para compartir.
import { DEPTOS, opcion, valoresPorDefecto } from "./catalogo.js";
import { duracionPlanos, generarPlanos } from "./planos.js";
import { recetas } from "../data/recetas.js";
import { voces } from "../data/voces.js";

const CLAVE = "claqueta.proyecto.v1";

export const estado = { valores: valoresPorDefecto(), planos: [], planosManuales: false };
const oyentes = new Set();

export const alCambiar = (fn) => (oyentes.add(fn), () => oyentes.delete(fn));
let aviso = null;
function avisar(que) {
  clearTimeout(aviso);
  guardarPronto();
  for (const fn of oyentes) fn(que);
}

export const leer = (ruta) => ruta.split(".").reduce((o, k) => o?.[k], estado.valores);

const AFECTAN_PLANOS = new Set(["entrega.duracion", "guion.estructura", "montaje.ritmo", "montaje.patron", "camara.movs", "montaje.transiciones"]);

export function fijar(ruta, valor) {
  const partes = ruta.split(".");
  const ultimo = partes.pop();
  const obj = partes.reduce((o, k) => o[k], estado.valores);
  obj[ultimo] = valor;
  if (AFECTAN_PLANOS.has(ruta) && !estado.planosManuales) estado.planos = generarPlanos(estado.valores);
  if (ruta === "entrega.duracion" && estado.planosManuales) reescalarPlanos(Number(valor));
  avisar(ruta);
}

// Con planos editados a mano, cambiar la duración los reparte en proporción, sin perder el orden ni los textos.
function reescalarPlanos(total) {
  const actual = duracionPlanos(estado.planos);
  if (!(total > 0) || !(actual > 0)) return;
  const k = total / actual;
  for (const p of estado.planos) p.dur = Math.max(0.3, Math.round(p.dur * k * 10) / 10);
}

// Y al revés: si la lista de planos cambia, la duración del encargo la sigue.
function duracionDesdePlanos() {
  estado.valores.entrega.duracion = Math.max(5, Math.min(600, Math.round(duracionPlanos(estado.planos) * 10) / 10));
}

export function aplicarReceta(id) {
  const r = recetas.find((x) => x.id === id);
  if (!r) return;
  // Conserva lo que escribió la persona: una receta cambia la dirección, no el contenido.
  const previo = estado.valores;
  estado.valores = valoresPorDefecto();
  for (const k of ["titulo", "objetivo", "audiencia", "texto", "notas"]) estado.valores.guion[k] = previo.guion?.[k] ?? "";
  for (const [ruta, valor] of Object.entries(r.cambios)) {
    const partes = ruta.split(".");
    const ultimo = partes.pop();
    partes.reduce((o, k) => o[k], estado.valores)[ultimo] = structuredClone(valor);
  }
  estado.planosManuales = false;
  estado.planos = generarPlanos(estado.valores);
  estado.receta = id;
  avisar("receta");
}

export function reiniciar() {
  estado.valores = valoresPorDefecto();
  estado.planosManuales = false;
  estado.planos = generarPlanos(estado.valores);
  estado.receta = null;
  avisar("receta");
}

export function rehacerPlanos() {
  estado.planosManuales = false;
  estado.planos = generarPlanos(estado.valores);
  avisar("planos");
}

export function cambiarPlano(id, cambios) {
  const p = estado.planos.find((x) => x.id === id);
  if (!p) return;
  Object.assign(p, cambios);
  estado.planosManuales = true;
  duracionDesdePlanos();
  avisar("planos");
}

export function moverPlano(desde, hasta) {
  const [p] = estado.planos.splice(desde, 1);
  estado.planos.splice(hasta, 0, p);
  estado.planosManuales = true;
  avisar("planos");
}

export function agregarPlano(despuesDe) {
  const i = estado.planos.findIndex((x) => x.id === despuesDe);
  const base = estado.planos[i] ?? estado.planos[estado.planos.length - 1];
  const nuevo = { ...base, id: `p${Date.now().toString(36)}`, titulo: "Plano nuevo", texto: "", nota: "", dur: 3 };
  estado.planos.splice(i + 1, 0, nuevo);
  estado.planosManuales = true;
  duracionDesdePlanos();
  avisar("planos");
  return nuevo.id;
}

export function quitarPlano(id) {
  if (estado.planos.length <= 1) return;
  estado.planos = estado.planos.filter((x) => x.id !== id);
  estado.planosManuales = true;
  duracionDesdePlanos();
  avisar("planos");
}

// Guardado local. Puede fallar en modo privado: el panel sigue funcionando sin él.
let temporizador = null;
function guardarPronto() {
  clearTimeout(temporizador);
  temporizador = setTimeout(() => {
    try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch { /* sin guardado local */ }
  }, 250);
}
function cargarGuardado() {
  try { return JSON.parse(localStorage.getItem(CLAVE) ?? "null"); } catch { return null; }
}

// Lo que llega de un enlace o del guardado de otra versión no es de fiar. Solo entran controles conocidos, con el tipo que les toca.
// Lo que no encaja se descarta y queda el valor normal.
const LARGO_MAX = 20000;
const COLOR = /^#[0-9a-fA-F]{6}$/;
const ID_ESTILO = /^[A-Za-z0-9_-]{1,40}$/;

function valorSano(c, val, def) {
  switch (c.t) {
    case "texto":
    case "area":
      return typeof val === "string" ? val.slice(0, LARGO_MAX) : def;
    case "rango": {
      const n = Number(val);
      return val === null || val === "" || !Number.isFinite(n) ? def : Math.min(c.max, Math.max(c.min, n));
    }
    case "interruptor":
      return typeof val === "boolean" ? val : def;
    case "voces":
      return voces.some((v) => v.id === val) ? val : def;
    case "galeria": {
      if (!val || typeof val !== "object") return def;
      const salida = {};
      for (const k of Object.keys(def)) salida[k] = typeof val[k] === "string" && ID_ESTILO.test(val[k]) ? val[k] : def[k];
      return salida;
    }
    case "paleta": {
      if (typeof val === "string") return c.opciones.some((o) => o.id === val) ? val : def;
      if (!val || typeof val !== "object") return def;
      const base = c.opciones[0].c, salida = {};
      for (const k of Object.keys(base)) {
        if (!COLOR.test(val[k] ?? "")) return def;
        salida[k] = val[k];
      }
      return salida;
    }
    default: {
      const conocida = (id) => c.opciones?.some((o) => o.id === id);
      if (c.multi) return Array.isArray(val) ? [...new Set(val.filter(conocida))].slice(0, c.multi) : def;
      return conocida(val) ? val : def;
    }
  }
}

function valoresSanos(extra) {
  const base = valoresPorDefecto();
  if (!extra || typeof extra !== "object") return base;
  for (const d of DEPTOS) {
    const propio = Object.hasOwn(extra, d.id) ? extra[d.id] : null;
    if (!propio || typeof propio !== "object") continue;
    for (const g of d.grupos) for (const c of g.controles) {
      if (Object.hasOwn(propio, c.k)) base[d.id][c.k] = valorSano(c, propio[c.k], base[d.id][c.k]);
    }
  }
  return base;
}

function planosSanos(lista, valores) {
  if (!Array.isArray(lista) || !lista.length) return null;
  const texto = (x, largo) => (typeof x === "string" ? x.slice(0, largo) : "");
  return lista.slice(0, 200).map((p, i) => {
    const dur = Number(p?.dur);
    return {
      id: texto(p?.id, 40) || `p${i}`,
      titulo: texto(p?.titulo, 120) || `Plano ${i + 1}`,
      texto: texto(p?.texto, 4000),
      dur: dur >= 0.2 && dur <= 600 ? dur : 3,
      cam: opcion("camara", "movs", p?.cam) ? p.cam : valores.camara.movs[0] ?? "fija",
      tr: opcion("montaje", "transiciones", p?.tr) ? p.tr : "corte",
      nota: texto(p?.nota, 2000),
    };
  });
}

// Enlace: solo guarda lo que difiere de lo normal, para que quede corto.
function diferencias(valores) {
  const d = {}, def = valoresPorDefecto();
  for (const [dep, vals] of Object.entries(valores)) for (const [k, val] of Object.entries(vals)) {
    if (JSON.stringify(val) !== JSON.stringify(def[dep]?.[k])) (d[dep] ??= {})[k] = val;
  }
  return d;
}
const aB64 = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
const deB64 = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replaceAll("-", "+").replaceAll("_", "/")), (c) => c.charCodeAt(0)));

export function enlaceCompartir() {
  const datos = { v: diferencias(estado.valores) };
  if (estado.planosManuales) datos.p = estado.planos;
  return `${location.origin}${location.pathname}#c=${aB64(JSON.stringify(datos))}`;
}

export function iniciarEstado() {
  const hash = new URLSearchParams(location.hash.slice(1)).get("c");
  if (hash) {
    try {
      const d = JSON.parse(deB64(hash));
      estado.valores = valoresSanos(d?.v);
      const planos = planosSanos(d?.p, estado.valores);
      estado.planos = planos ?? generarPlanos(estado.valores);
      estado.planosManuales = Boolean(planos);
      history.replaceState(null, "", location.pathname);
      return;
    } catch { /* enlace dañado: sigue con lo guardado */ }
  }
  const g = cargarGuardado();
  if (g?.valores) {
    estado.valores = valoresSanos(g.valores);
    estado.planos = planosSanos(g.planos, estado.valores) ?? generarPlanos(estado.valores);
    estado.planosManuales = Boolean(g.planosManuales);
    estado.receta = g.receta ?? null;
  } else {
    estado.planos = generarPlanos(estado.valores);
  }
}
