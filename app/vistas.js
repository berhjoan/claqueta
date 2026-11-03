// Dibuja los controles de cada departamento a partir de los datos. Los textos del usuario entran solo por propiedades, nunca como HTML.
import { leer, fijar, estado } from "./estado.js";
import { paletaActual } from "./prompt.js";
import { camaraEn } from "./monitor.js";
import { voces, motoresVoz } from "../data/voces.js";

export const h = (tag, props = {}, ...hijos) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k in el && k !== "list") { try { el[k] = v; } catch { el.setAttribute(k, v); } }
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of hijos.flat()) if (c !== null && c !== undefined && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
};

let ctx = {};
export const configurarVistas = (c) => { ctx = c; };

export function control(depto, c) {
  const ruta = `${depto.id}.${c.k}`;
  const titulo = c.titulo ? h("div", { class: "ct-titulo" }, c.titulo) : null;
  const ayuda = c.ayuda && c.t !== "interruptor" ? h("p", { class: "ct-ayuda" }, c.ayuda) : null;
  let cuerpo;
  switch (c.t) {
    case "texto": cuerpo = campoTexto(ruta, c); break;
    case "area": cuerpo = campoArea(ruta, c); break;
    case "rango": return rango(ruta, c);
    case "interruptor": return interruptor(ruta, c);
    case "paleta": cuerpo = paleta(ruta, c); break;
    case "voces": cuerpo = selectorVoces(ruta); break;
    case "galeria": cuerpo = ctx.galeria(ruta); break;
    default: cuerpo = opciones(ruta, c);
  }
  return h("div", { class: `ct ct-${c.t}` }, titulo, ayuda, cuerpo);
}

function campoTexto(ruta, c) {
  return h("input", { class: "campo", type: "text", "data-ruta": ruta, value: leer(ruta) ?? "", placeholder: c.holder ?? "", "aria-label": c.titulo, oninput: (e) => fijar(ruta, e.target.value) });
}
// Lo que dura un guion pegado se ve antes de pedir el video, no después.
export function pintarNotaLectura() {
  const nota = document.querySelector(".nota-lectura");
  if (!nota) return;
  const palabras = (leer("guion.texto") ?? "").trim().split(/\s+/).filter(Boolean).length;
  if (!palabras) { nota.replaceChildren(); return; }
  const seg = Math.max(1, Math.round(palabras / 2.3));
  const pedido = Number(leer("entrega.duracion"));
  const ideal = Math.max(5, seg + 2);
  const lejos = Math.abs(ideal - pedido) / pedido > 0.15;
  nota.replaceChildren(`Se lee en unos ${seg} s (${palabras} palabras). El video está en ${pedido} s.`,
    lejos ? h("button", { type: "button", class: "bt-mini", onclick: () => fijar("entrega.duracion", ideal) }, `Ajustar a ${ideal} s`) : "");
}

function campoArea(ruta, c) {
  if (ruta === "guion.texto") {
    const campo = h("textarea", { class: "campo", rows: c.filas ?? 3, "data-ruta": ruta, value: leer(ruta) ?? "", placeholder: c.holder ?? "", "aria-label": c.titulo, oninput: (e) => fijar(ruta, e.target.value) });
    const nota = h("p", { class: "ct-nota nota-lectura" });
    queueMicrotask(pintarNotaLectura);
    return h("div", {}, campo, nota);
  }
  return h("textarea", { class: "campo", rows: c.filas ?? 3, "data-ruta": ruta, value: leer(ruta) ?? "", placeholder: c.holder ?? "", "aria-label": c.titulo, oninput: (e) => fijar(ruta, e.target.value) });
}

function rango(ruta, c) {
  const salida = h("output", { class: "valor" }, `${leer(ruta)} ${c.unidad ?? ""}`.trim());
  const input = h("input", { type: "range", min: c.min, max: c.max, step: c.paso, value: leer(ruta), "aria-label": c.titulo,
    oninput: (e) => { const n = Number(e.target.value); salida.textContent = `${n} ${c.unidad ?? ""}`.trim(); fijar(ruta, n); } });
  return h("label", { class: "ct ct-rango" }, h("span", { class: "ct-titulo" }, c.titulo), salida, input);
}

function interruptor(ruta, c) {
  const on = Boolean(leer(ruta));
  return h("button", { class: "interruptor", type: "button", role: "switch", "aria-checked": String(on),
    onclick: (e) => { const nuevo = !leer(ruta); e.currentTarget.setAttribute("aria-checked", String(nuevo)); fijar(ruta, nuevo); ctx.refrescarDepto?.(); } },
    h("span", { class: "led", "aria-hidden": "true" }),
    h("span", {}, h("b", {}, c.titulo), c.ayuda ? h("small", {}, c.ayuda) : null));
}

function opciones(ruta, c) {
  const multi = c.multi ?? 0;
  const esta = (id) => (multi ? (leer(ruta) ?? []).includes(id) : leer(ruta) === id);
  const elegir = (id, boton, cont) => {
    if (multi) {
      let lista = [...(leer(ruta) ?? [])];
      if (lista.includes(id)) lista = lista.filter((x) => x !== id);
      else { lista.push(id); if (lista.length > multi) lista.shift(); }
      fijar(ruta, lista);
    } else fijar(ruta, id);
    for (const b of cont.querySelectorAll("[data-id]")) b.setAttribute("aria-pressed", String(esta(b.dataset.id)));
  };
  const vista = c.vista ?? "chips";
  if (vista === "lista") {
    const sel = h("select", { class: "campo", "aria-label": c.titulo, onchange: (e) => { fijar(ruta, e.target.value); nota.textContent = c.opciones.find((o) => o.id === e.target.value)?.d ?? ""; } },
      c.opciones.map((o) => h("option", { value: o.id, selected: leer(ruta) === o.id }, o.n[0])));
    const nota = h("p", { class: "ct-nota" }, c.opciones.find((o) => o.id === leer(ruta))?.d ?? "");
    return h("div", {}, sel, nota);
  }
  const cont = h("div", { class: `op op-${vista}` });
  for (const o of c.opciones) {
    const b = h("button", { type: "button", class: "op-b", "data-id": o.id, "aria-pressed": String(esta(o.id)), onclick: () => elegir(o.id, b, cont) });
    if (vista === "camara") {
      const mini = miniCamara(o);
      b.append(mini.el, h("b", {}, o.n[0]), h("small", {}, o.d ?? ""));
      b.addEventListener("pointerenter", () => { mini.empezar(); ctx.monitor?.probar("camara", o.id); });
      b.addEventListener("pointerleave", () => { mini.parar(); ctx.monitor?.salirPrueba(); });
      b.addEventListener("focus", () => ctx.monitor?.probar("camara", o.id));
      b.addEventListener("blur", () => ctx.monitor?.salirPrueba());
    } else if (vista === "transicion") {
      b.append(h("b", {}, o.n[0]), h("small", {}, o.d ?? ""));
      b.addEventListener("pointerenter", () => ctx.monitor?.probar("transicion", o.id));
      b.addEventListener("pointerleave", () => ctx.monitor?.salirPrueba());
      b.addEventListener("focus", () => ctx.monitor?.probar("transicion", o.id));
      b.addEventListener("blur", () => ctx.monitor?.salirPrueba());
    } else if (vista === "tipo") {
      const muestra = h("span", { class: "tipo-muestra" }, "Actúa, señal");
      muestra.style.fontFamily = `'${o.display}', ${o.css}`;
      if (o.peso) muestra.style.fontWeight = o.peso;
      b.append(muestra, h("small", {}, `${o.n[0]}. ${o.d ?? ""}`));
      b.addEventListener("pointerenter", () => ctx.cargarFuente?.(o.display), { once: true });
    } else if (vista === "tarjetas" || vista === "formas") {
      b.append(h("b", {}, o.n[0]), o.d ? h("small", {}, o.d) : null);
    } else {
      b.append(o.n[0]);
      if (o.d) b.title = o.d;
    }
    if (o.muestra) { cont.append(h("span", { class: "op-con-oir" }, botonOir(`op:${o.id}`, o.muestra, `Oír ${o.n[0]}`), b)); continue; }
    cont.append(b);
  }
  return cont;
}

// Mini escena para ver un movimiento de cámara sin salir de la lista.
function miniCamara(o) {
  const mundo = h("div", { class: "mini-mundo" }, h("i", { class: "m1" }), h("i", { class: "m2" }), h("i", { class: "m3" }));
  const el = h("div", { class: "mini" }, mundo);
  let id = 0, ini = 0;
  const pintar = (t) => {
    const q = camaraEn(o, t, 2, 1);
    mundo.style.transform = `translate3d(${q.x}%,${q.y}%,${q.z * 0.3}px) rotateX(${q.rx}deg) rotateY(${q.ry}deg) rotateZ(${q.rz}deg) scale(${q.s})`;
  };
  pintar(0);
  const paso = (ahora) => {
    if (!ini) ini = ahora;
    pintar(((ahora - ini) / 1000) % 2.4);
    id = requestAnimationFrame(paso);
  };
  return { el, empezar: () => { ini = 0; cancelAnimationFrame(id); id = requestAnimationFrame(paso); }, parar: () => { cancelAnimationFrame(id); pintar(0); } };
}

function paleta(ruta, c) {
  const cont = h("div", { class: "paletas" });
  const nombres = { fondo: "Fondo", tinta: "Tinta", acento: "Acento", segundo: "Secundario", superficie: "Superficie" };
  const pintarSel = () => {
    for (const b of cont.querySelectorAll("[data-id]")) b.setAttribute("aria-pressed", String(leer(ruta) === b.dataset.id));
    pintarPropia();
  };
  for (const o of c.opciones) {
    cont.append(h("button", { type: "button", class: "paleta", "data-id": o.id, "aria-pressed": String(leer(ruta) === o.id), onclick: () => { fijar(ruta, o.id); pintarSel(); } },
      h("span", { class: "tiras" }, Object.values(o.c).map((col) => { const s = h("i", {}); s.style.background = col; return s; })),
      h("b", {}, o.n[0]), h("small", {}, o.d ?? "")));
  }
  const propia = h("div", { class: "paleta-propia" });
  const pintarPropia = () => {
    const actual = paletaActual(estado.valores);
    propia.replaceChildren(...Object.entries(nombres).map(([k, n]) => h("label", {}, n, h("input", { type: "color", value: actual[k], oninput: (e) => { fijar(ruta, { ...paletaActual(estado.valores), [k]: e.target.value }); for (const b of cont.querySelectorAll("[data-id]")) b.setAttribute("aria-pressed", "false"); } }))));
  };
  pintarPropia();
  return h("div", {}, cont, h("div", { class: "ct-titulo" }, "Colores exactos"), propia);
}

let audioActual = null;

// Botón de muestra: un solo audio suena a la vez y se oye desde el catálogo, sin instalar nada.
function botonOir(id, src, etiqueta) {
  const oir = h("button", { type: "button", class: "oir", "aria-label": etiqueta, title: etiqueta, onclick: (e) => {
    e.stopPropagation();
    if (audioActual && !audioActual.paused && audioActual.dataset.id === id) { audioActual.pause(); oir.classList.remove("sonando"); return; }
    audioActual?.pause();
    document.querySelectorAll(".oir.sonando").forEach((x) => x.classList.remove("sonando"));
    audioActual = new Audio(src);
    audioActual.dataset.id = id;
    audioActual.onended = () => oir.classList.remove("sonando");
    audioActual.onerror = () => { oir.classList.remove("sonando"); oir.title = "No se pudo cargar la muestra"; };
    audioActual.play().catch(() => oir.classList.remove("sonando"));
    oir.classList.add("sonando");
  } });
  return oir;
}
export function selectorVoces(ruta) {
  const cont = h("div", { class: "voces" });
  const filtros = { pais: "", genero: "" };
  const lista = h("div", {});
  const paises = [...new Set(voces.map((v) => v.pais))];
  const barra = h("div", { class: "voces-filtros" },
    h("select", { class: "campo", "aria-label": "Filtrar por país", onchange: (e) => { filtros.pais = e.target.value; pintar(); } }, h("option", { value: "" }, "Todos los países"), paises.map((p) => h("option", { value: p }, p))),
    h("select", { class: "campo", "aria-label": "Filtrar por tipo de voz", onchange: (e) => { filtros.genero = e.target.value; pintar(); } }, h("option", { value: "" }, "Femeninas y masculinas"), h("option", { value: "Femenina" }, "Femeninas"), h("option", { value: "Masculina" }, "Masculinas")));
  function pintar() {
    lista.replaceChildren();
    for (const [motor, info] of Object.entries(motoresVoz)) {
      const delMotor = voces.filter((v) => v.motor === motor && (!filtros.pais || v.pais === filtros.pais) && (!filtros.genero || v.genero === filtros.genero));
      if (!delMotor.length) continue;
      lista.append(h("div", { class: "voz-motor" }, h("b", {}, info.nombre), h("small", {}, info.d)));
      for (const v of delMotor) {
        const fila = h("div", { class: "voz", "aria-current": String(leer(ruta) === v.id) });
        const oir = botonOir(v.id, v.muestra, `Oír a ${v.nombre}`);
        fila.append(oir,
          h("button", { type: "button", class: "voz-elegir", "aria-pressed": String(leer(ruta) === v.id), onclick: () => { fijar(ruta, v.id); pintar(); } },
            h("b", {}, v.nombre), h("small", {}, `${v.pais}, ${v.genero.toLowerCase()}${v.licencia ? `. ${v.licencia}` : ""}`)));
        lista.append(fila);
      }
    }
    if (!lista.children.length) lista.append(h("p", { class: "ct-nota" }, "Ninguna voz coincide con ese filtro. Prueba con otro país."));
  }
  pintar();
  cont.append(barra, lista);
  return cont;
}
