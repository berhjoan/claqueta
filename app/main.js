// Arranque del panel: arma la claqueta, el equipo, la mesa de trabajo, la cabina y la línea de tiempo.
import { DEPTOS, opcion, medidas } from "./catalogo.js";
import { estado, iniciarEstado, alCambiar, fijar, leer, aplicarReceta, reiniciar, enlaceCompartir } from "./estado.js";
import { construirPrompt } from "./prompt.js";
import { Monitor } from "./monitor.js";
import { LineaTiempo } from "./linea.js";
import { pintarNotaLectura, h, control, configurarVistas } from "./vistas.js";
import { crearGaleria } from "./galeria.js";
import { vistaBiblioteca, vistaRadar, vistaAyuda } from "./biblioteca.js";
import { traducirNotas } from "./traducir.js";
import { textoASvg } from "./tiza.js";
import { tiempo, duracionPlanos } from "./planos.js";
import { recetas } from "../data/recetas.js";
import { vozPorId } from "../data/voces.js";

const app = document.getElementById("app");
let estilos = [];
let deptoActual = "guion";
let idioma = "es", compacto = false, traducciones = {};
let monitor;
const reduceMovimiento = matchMedia("(prefers-reduced-motion: reduce)").matches;

const ESPECIALES = [
  { id: "biblioteca", nombre: "Biblioteca", resumen: "Skills, motores y guías", vista: vistaBiblioteca, titulo: "Biblioteca", ayuda: "Lo que recibe la IA junto con el prompt. Todo es público y gratuito." },
  { id: "radar", nombre: "Radar de GitHub", resumen: "Repos revisados", vista: vistaRadar, titulo: "Radar de GitHub", ayuda: "Repositorios revisados para este sistema, con su licencia y un veredicto." },
  { id: "ayuda", nombre: "Cómo se usa", resumen: "En tres pasos", vista: vistaAyuda, titulo: "Cómo se usa", ayuda: "" },
];

function resumen(id) {
  const v = estado.valores, n = (d, k, val = v[d][k]) => opcion(d, k, val)?.n[0] ?? "";
  switch (id) {
    case "guion": return (v.guion.titulo ?? "").trim() || n("guion", "estructura");
    case "arte": { const e = estilos.find((x) => x.id === v.arte.estilos?.base); return e ? e.name.es : "Sin estilo"; }
    case "camara": return `${v.camara.movs?.length ?? 0} movimientos, ${v.camara.lente === "macro" || v.camara.lente === "tilt" ? n("camara", "lente") : `${v.camara.lente} mm`}`;
    case "profundidad": return n("profundidad", "modo");
    case "movimiento": return n("movimiento", "curva");
    case "montaje": return n("montaje", "ritmo");
    case "sonido": return v.sonido.narracion ? (vozPorId(v.sonido.voz)?.nombre ?? "Voz") : "Sin voz";
    case "subtitulos": return v.subtitulos.activos ? n("subtitulos", "estilo") : "Sin subtítulos";
    case "motor": return n("motor", "motor");
    case "entrega": { const m = medidas(v); return `${v.entrega.formato}, ${m.seg} s`; }
    default: return "";
  }
}

// ---------- Claqueta (cabecera)
const palo = h("div", { class: "palo", "aria-hidden": "true" });
const tituloVista = h("div", { class: "titulo-tiza", "aria-hidden": "true" });
const tituloInput = h("input", { class: "titulo-input", type: "text", "aria-label": "Título o tema del video", placeholder: "Escribe el tema del video",
  oninput: (e) => fijar("guion.titulo", e.target.value),
  onblur: () => pintarTitulo(false) });
const campoFormato = h("select", { class: "campo-claqueta", "aria-label": "Formato", onchange: (e) => fijar("entrega.formato", e.target.value) });
const campoDur = h("input", { class: "campo-claqueta dato", type: "number", min: 5, max: 600, step: 1, "aria-label": "Duración en segundos", onchange: (e) => fijar("entrega.duracion", Math.max(5, Math.min(600, Number(e.target.value) || 60))) });
const campoFps = h("select", { class: "campo-claqueta dato", "aria-label": "Cuadros por segundo", onchange: (e) => fijar("entrega.fps", e.target.value) }, ["24", "25", "30", "50", "60"].map((f) => h("option", { value: f }, f)));
const campoReceta = h("select", { class: "campo-claqueta", "aria-label": "Partir de una receta", onchange: (e) => { if (e.target.value === "__nuevo") reiniciar(); else if (e.target.value) aplicarReceta(e.target.value); e.target.value = ""; refrescarTodo(); } },
  h("option", { value: "" }, "Elegir receta"), recetas.map((r) => h("option", { value: r.id, title: r.d }, r.nombre)), h("option", { value: "__nuevo" }, "Empezar de cero"));

function pintarTitulo(animar) {
  const t = (leer("guion.titulo") ?? "").trim();
  tituloVista.classList.toggle("vacio", !t);
  const { svg } = textoASvg(t || "Escribe el tema", { anchoLinea: 13, maxPorLinea: 200 });
  tituloVista.innerHTML = svg; // Solo contiene trazos generados aquí, sin texto de la persona.
  if (animar && !reduceMovimiento) {
    tituloVista.querySelectorAll("path").forEach((p, i) => {
      p.setAttribute("pathLength", "1");
      p.style.strokeDasharray = "1"; p.style.strokeDashoffset = "1";
      p.style.animation = `escribir .16s ${i * 0.045}s linear forwards`;
    });
  }
}

function golpeClaqueta() {
  if (reduceMovimiento) return;
  palo.classList.remove("golpe"); void palo.offsetWidth; palo.classList.add("golpe");
}

const aviso = h("div", { class: "aviso", role: "status", "aria-live": "polite" });
let tAviso;
function avisar(texto) {
  aviso.textContent = texto; aviso.classList.add("ver");
  clearTimeout(tAviso); tAviso = setTimeout(() => aviso.classList.remove("ver"), 3200);
}

// El portapapeles puede rechazar, o no responder nunca, según el navegador. Nada aquí puede dejar un botón esperando.
async function copiar(texto) {
  if (navigator.clipboard?.writeText) {
    const hecho = await Promise.race([
      navigator.clipboard.writeText(texto).then(() => true, () => false),
      new Promise((res) => setTimeout(() => res(false), 1500)),
    ]);
    if (hecho) return true;
  }
  const foco = document.activeElement;
  const t = h("textarea", { value: texto, readOnly: true, "aria-hidden": "true" });
  t.style.cssText = "position:fixed;opacity:0;left:0;top:0;width:1px;height:1px";
  document.body.append(t);
  t.select();
  let ok = false;
  try { ok = document.execCommand("copy"); } catch { ok = false; }
  t.remove();
  foco?.focus?.();
  return ok;
}

async function copiarPrompt() {
  const ok = await copiar(textoPrompt());
  golpeClaqueta();
  avisar(ok ? (idioma === "en" ? "Prompt copiado en inglés. El video se pide en español." : "Prompt copiado en español.") : "No se pudo copiar. Selecciona el texto del prompt a mano.");
}

async function traducirYCopiar() {
  btTraducir.disabled = true; btTraducir.textContent = "Traduciendo…";
  idioma = "en"; pintarIdioma(); pintarPrompt();
  // Se copia de una vez, dentro del clic: si la traducción tarda, ya hay un prompt válido en el portapapeles.
  const antes = textoPrompt();
  const copiado = await copiar(antes);
  try { traducciones = await traducirNotas(estado); } catch { traducciones = {}; }
  pintarPrompt();
  const despues = textoPrompt();
  const alDia = despues === antes ? copiado : await copiar(despues);
  btTraducir.disabled = false; btTraducir.textContent = "Traducir y copiar";
  golpeClaqueta();
  const pendientes = ["objetivo", "audiencia", "notas"].some((k) => (leer(`guion.${k}`) ?? "").trim() && !traducciones[`guion.${k}`]);
  if (alDia) avisar(pendientes ? "Copiado en inglés. Una nota quedó en español porque no se pudo traducir." : "Copiado en inglés. El video se pide en español.");
  else if (copiado) avisar("Copiado en inglés, con las notas en español. Toca «Copiar prompt» para llevar también su traducción.");
  else avisar("El prompt ya está en inglés. Toca «Copiar prompt» o selecciónalo a mano.");
}

const btCopiar = h("button", { type: "button", class: "bt bt-oro", onclick: copiarPrompt }, "Copiar prompt");
const btTraducir = h("button", { type: "button", class: "bt", onclick: traducirYCopiar }, "Traducir y copiar");

const campo = (rotulo, el) => h("label", { class: "cq-campo" }, h("span", {}, rotulo), el);
const claqueta = h("header", { class: "claqueta" }, palo,
  h("div", { class: "cq-fila" },
    h("div", { class: "marca" }, h("b", {}, "Claqueta"), h("span", {}, "Panel de dirección")),
    h("label", { class: "cq-campo cq-titulo" }, h("span", {}, "Tema"), h("div", { class: "cq-titulo-caja" }, tituloVista, tituloInput)),
    campo("Formato", campoFormato), campo("Segundos", campoDur), campo("FPS", campoFps), campo("Receta", campoReceta),
    h("div", { class: "cq-acciones" }, btCopiar, btTraducir)));

// ---------- Equipo (navegación)
const equipo = h("nav", { class: "equipo", "aria-label": "Departamentos" });
function pintarEquipo() {
  const fila = (id, nombre, res) => h("button", { type: "button", class: "eq", "aria-current": deptoActual === id ? "page" : "false", onclick: () => irA(id) }, h("b", {}, nombre), h("small", {}, res));
  equipo.replaceChildren(
    ...DEPTOS.map((d) => fila(d.id, d.nombre, resumen(d.id))),
    h("div", { class: "eq-sep" }),
    ...ESPECIALES.map((e) => fila(e.id, e.nombre, e.resumen)));
}

// ---------- Mesa de trabajo
const mesa = h("main", { class: "mesa", tabIndex: -1 });
function pintarMesa() {
  const esp = ESPECIALES.find((e) => e.id === deptoActual);
  mesa.replaceChildren();
  if (esp) {
    mesa.append(h("header", { class: "mesa-tit" }, h("h2", {}, esp.titulo), esp.ayuda ? h("p", {}, esp.ayuda) : null), esp.vista());
    return;
  }
  const d = DEPTOS.find((x) => x.id === deptoActual);
  mesa.append(h("header", { class: "mesa-tit" }, h("h2", {}, d.nombre)));
  for (const g of d.grupos) {
    const sec = h("section", { class: "grupo" }, h("h3", {}, g.titulo), g.ayuda ? h("p", { class: "ct-ayuda" }, g.ayuda) : null);
    const envoltura = h("div", { class: "grupo-cuerpo" });
    for (const c of g.controles) envoltura.append(control(d, c));
    sec.append(envoltura);
    mesa.append(sec);
  }
}
function irA(id) { deptoActual = id; pintarEquipo(); pintarMesa(); mesa.scrollTop = 0; document.body.dataset.vista = "elegir"; pintarPestanas(); }

// ---------- Cabina: monitor y prompt
const lienzo = h("div", { class: "monitor", role: "img", "aria-label": "Previsualización del video" });
const guias = h("div", { class: "guias", hidden: true, "aria-hidden": "true" }, h("i", { class: "g-sup" }), h("i", { class: "g-inf" }), h("i", { class: "g-riel" }));
const tally = h("span", { class: "tally", "aria-hidden": "true" });
const reloj = h("output", { class: "reloj" }, "0:00.0");
const nombrePlano = h("span", { class: "plano-actual" }, "");
const btPlay = h("button", { type: "button", class: "bt-tr", "aria-label": "Reproducir", onclick: alternar });
const barraT = h("input", { type: "range", class: "barra-t", min: 0, max: 1000, value: 0, "aria-label": "Posición en el video", oninput: (e) => { monitor.pausar(); monitor.ir((e.target.value / 1000) * monitor.total); pintarPlay(); } });
const btGuias = h("button", { type: "button", class: "bt-mini", "aria-pressed": "false", onclick: (e) => { guias.hidden = !guias.hidden; e.currentTarget.setAttribute("aria-pressed", String(!guias.hidden)); } }, "Zonas seguras");
const btBucle = h("button", { type: "button", class: "bt-mini", "aria-pressed": "false", onclick: (e) => { monitor.bucle = !monitor.bucle; e.currentTarget.setAttribute("aria-pressed", String(monitor.bucle)); } }, "Repetir");

function alternar() { monitor.corriendo ? monitor.pausar() : monitor.reproducir(); pintarPlay(); }
function pintarPlay() {
  btPlay.classList.toggle("pausa", monitor.corriendo);
  btPlay.setAttribute("aria-label", monitor.corriendo ? "Pausar" : "Reproducir");
  tally.classList.toggle("on", monitor.corriendo);
}

const promptTexto = h("pre", { class: "prompt-texto", tabIndex: 0, "aria-label": "Prompt generado" });
const tabEs = h("button", { type: "button", class: "tab", onclick: () => { idioma = "es"; pintarIdioma(); pintarPrompt(); } }, "Español");
const tabEn = h("button", { type: "button", class: "tab", onclick: async () => { idioma = "en"; pintarIdioma(); pintarPrompt(); traducciones = await traducirNotas(estado); pintarPrompt(); } }, "Inglés");
const cuenta = h("span", { class: "cuenta" });
const btCompacto = h("button", { type: "button", class: "bt-mini", "aria-pressed": "false", title: "Deja solo nombres y referencias a las fichas", onclick: (e) => { compacto = !compacto; e.currentTarget.setAttribute("aria-pressed", String(compacto)); pintarPrompt(); } }, "Compacto");
const btAmpliar = h("button", { type: "button", class: "bt-mini", "aria-pressed": "false", onclick: (e) => { const on = document.body.classList.toggle("prompt-grande"); e.currentTarget.setAttribute("aria-pressed", String(on)); e.currentTarget.textContent = on ? "Reducir" : "Ampliar"; } }, "Ampliar");
const btBajar = h("button", { type: "button", class: "bt-mini", onclick: () => {
  const nombre = (leer("guion.titulo") || "video").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "video";
  const a = h("a", { href: URL.createObjectURL(new Blob([textoPrompt()], { type: "text/markdown;charset=utf-8" })), download: `encargo-${nombre}-${idioma}.md` });
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  avisar("Encargo descargado.");
} }, "Descargar");
const btEnlace = h("button", { type: "button", class: "bt-mini", onclick: async () => { const ok = await copiar(enlaceCompartir()); avisar(ok ? "Enlace copiado: abre este proyecto en otro dispositivo." : "No se pudo copiar el enlace."); } }, "Compartir enlace");

function pintarIdioma() { tabEs.setAttribute("aria-selected", String(idioma === "es")); tabEn.setAttribute("aria-selected", String(idioma === "en")); }
const textoPrompt = () => construirPrompt(estado, { lang: idioma, estilos, traducciones, compacto });
function pintarPrompt() {
  const t = textoPrompt();
  promptTexto.textContent = t;
  cuenta.textContent = `${t.trim().split(/\s+/).length.toLocaleString("es")} palabras`;
}

const cabina = h("aside", { class: "cabina" },
  h("div", { class: "cabina-monitor" },
    h("div", { class: "monitor-marco" }, h("div", { class: "monitor-caja" }, lienzo, guias, tally)),
    h("div", { class: "transporte" }, btPlay, h("div", { class: "tr-centro" }, barraT, h("div", { class: "tr-info" }, reloj, nombrePlano)), btBucle, btGuias)),
  h("div", { class: "cabina-prompt" },
    h("div", { class: "prompt-barra", role: "tablist", "aria-label": "Idioma del prompt" }, tabEs, tabEn, cuenta, btCompacto, btAmpliar),
    promptTexto,
    h("div", { class: "prompt-pie" }, btBajar, btEnlace)));

// ---------- Línea de tiempo
const lineaRaiz = h("section", { class: "linea", "aria-label": "Línea de tiempo" });

// ---------- Pestañas en teléfono
const pestanas = h("div", { class: "pestanas" });
function pintarPestanas() {
  const actual = document.body.dataset.vista ?? "elegir";
  pestanas.replaceChildren(...[["elegir", "Elegir"], ["monitor", "Monitor"], ["prompt", "Prompt"]].map(([id, t]) => h("button", { type: "button", "aria-current": String(actual === id), onclick: () => { document.body.dataset.vista = id; pintarPestanas(); } }, t)));
}

// ---------- Refrescos
function pintarClaqueta() {
  const v = estado.valores;
  campoDur.value = v.entrega.duracion;
  campoFps.value = v.entrega.fps;
  campoFormato.value = v.entrega.formato;
  if (document.activeElement !== tituloInput) { tituloInput.value = v.guion.titulo ?? ""; pintarTitulo(false); }
  for (const el of mesa.querySelectorAll("[data-ruta]")) if (el !== document.activeElement) el.value = leer(el.dataset.ruta) ?? "";
  const m = medidas(v);
  guias.dataset.vertical = String(m.h > m.w);
  pintarNotaLectura();
}
let tPintado;
function pintarVivo(que) {
  if (que === "entrega.plataforma") {
    const formato = opcion("entrega", "plataforma", leer(que))?.formato;
    if (formato && formato !== leer("entrega.formato")) {
      fijar("entrega.formato", formato);
      if (deptoActual === "entrega") pintarMesa();
    }
  }
  pintarEquipo();
  clearTimeout(tPintado);
  tPintado = setTimeout(() => { pintarPrompt(); monitor.configurar(estado); pintarClaqueta(); }, 90);
  if (que === "planos" || que === "receta") linea.pintar();
  if (["entrega.duracion", "guion.estructura", "montaje.ritmo", "montaje.patron", "camara.movs", "montaje.transiciones"].includes(que)) linea.pintar();
}
function refrescarTodo() { pintarClaqueta(); pintarEquipo(); pintarMesa(); pintarPrompt(); monitor.configurar(estado); linea.pintar(); }

let linea;
const fuentesCargadas = new Set(["Sora", "JetBrains Mono", "EMS Delight"]);
function cargarFuenteWeb(nombre) {
  if (fuentesCargadas.has(nombre)) return;
  fuentesCargadas.add(nombre);
  document.head.append(h("link", { rel: "stylesheet", href: `https://fonts.googleapis.com/css2?family=${encodeURIComponent(nombre).replace(/%20/g, "+")}:wght@400;700;800&display=swap` }));
}

async function iniciar() {
  iniciarEstado();
  try { estilos = await (await fetch("data/styles.json")).json(); } catch { estilos = []; }
  const { formatos } = await import("../data/motor.js");
  campoFormato.append(...formatos.map((f) => h("option", { value: f.id }, f.id)));

  monitor = new Monitor(lienzo, (t) => {
    reloj.textContent = tiempo(t);
    if (document.activeElement !== barraT) barraT.value = Math.round((t / monitor.total) * 1000);
    linea?.moverCabezal(t);
    const p = estado.planos[monitor.indice];
    if (p) nombrePlano.textContent = `Plano ${monitor.indice + 1}: ${p.titulo}`;
  });
  monitor.alParar = pintarPlay;
  configurarVistas({ monitor, galeria: crearGaleria(estilos, { monitor: () => monitor }), cargarFuente: cargarFuenteWeb, refrescarDepto: pintarEquipo });

  linea = new LineaTiempo(lineaRaiz, { alBuscar: (t) => { monitor.pausar(); monitor.ir(t); pintarPlay(); } });
  if (estado.desdeEnlace) {
    const banda = h("div", { class: "banda-enlace", role: "status" },
      h("span", {}, "Este proyecto llegó por un enlace. Revisa el guion, las notas y los textos de los planos antes de copiar: tu IA los va a leer."),
      h("button", { type: "button", class: "bt-mini", onclick: () => banda.remove() }, "Entendido"));
    claqueta.append(banda);
  }
  app.append(claqueta, equipo, mesa, cabina, lineaRaiz, pestanas, aviso);
  document.body.dataset.vista = "elegir";
  pintarPestanas();
  pintarIdioma();
  pintarClaqueta();
  pintarEquipo();
  pintarMesa();
  pintarPrompt();
  linea.pintar();
  monitor.configurar(estado);
  alCambiar(pintarVivo);
  alCambiar((q) => { if (q === "arte.tipografia") { const t = opcion("arte", "tipografia", leer("arte.tipografia")); if (t?.display) cargarFuenteWeb(t.display); } });

  addEventListener("keydown", (e) => {
    if (e.code !== "Space" || e.target.closest("input, textarea, select, button, [contenteditable]")) return;
    e.preventDefault(); alternar();
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden && monitor.corriendo) { monitor.pausar(); pintarPlay(); } });

  // Único momento de apertura: la claqueta se escribe a tiza y se cierra; el monitor arranca.
  pintarTitulo(true);
  if (!reduceMovimiento) {
    palo.classList.add("abierto");
    setTimeout(() => { palo.classList.remove("abierto"); golpeClaqueta(); }, 650);
    setTimeout(() => { monitor.reproducir(); pintarPlay(); }, 900);
  }
  window.__claqueta = { estado, monitor, construirPrompt: (o) => construirPrompt(estado, { estilos, ...o }) };
}

iniciar();
