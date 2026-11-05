// Galería de estilos: secciones por familia, filtros y ficha. En Mezcla asigna principal, secundario o acento; en Recorrido arma una lista ordenada.
import { alCambiar, leer, fijar, repartirRecorrido, agregarRafaga, estado } from "./estado.js";
import { h } from "./vistas.js";

const PAPELES = [["base", "Principal, 70 %"], ["secundario", "Secundario, 20 %"], ["acento", "Acento, 10 %"]];
const ESTADO = { marca: "Ya usado en un video", prueba: "Probado", adaptar: "Por adaptar" };
const NOMBRE_COLOR = { fondo: "Fondo", tinta: "Tinta", acento: "Acento", segundo: "Secundario", superficie: "Superficie" };

// Las familias del catálogo se agrupan en secciones que se pueden recorrer.
const SECCIONES = [
  ["Gráfica y tipografía", /gráfica|tipograf|diseño gráfico|editorial|composición|dirección artística|fondo|impresión y grabado/i],
  ["Dibujo y pintura", /dibujo|trazo|pintura/i],
  ["Papel e impresión", /impresión|material gráfico/i],
  ["Información y datos", /información|keynote|interfaz/i],
  ["Montaje y documental", /montaje|documental|evidencias/i],
  ["Materiales y 3D", /material|3d|representación 3d|proyección|profundidad|procedural|representación$/i],
  ["Cine y luz", /cine|tratamiento|luz|temporalidad/i],
  ["Dibujos animados", /animados|anime|tradiciones/i],
  ["Videojuegos", /videojuego|raster/i],
  ["Efectos y campos de color", /transición|campos|cosmos|vfx|shader|código vivo|títulos|clima/i],
];
const seccionDe = (e) => (SECCIONES.find(([, re]) => re.test(e.family?.es ?? "")) ?? ["Otros"])[0];

const lum = (h6) => {
  const c = [1, 3, 5].map((i) => parseInt(h6.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
function tono(h6) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h6.slice(i, i + 2), 16));
  return r > b + 18 ? "calido" : b > r + 18 ? "frio" : "neutro";
}
const encajaColor = (e, f) => {
  const p = e.palette;
  if (!f) return true;
  if (!p) return false;
  if (f === "claro") return lum(p.fondo) > 0.4;
  if (f === "oscuro") return lum(p.fondo) <= 0.4;
  return tono(p.acento) === f;
};
const tieneMotor = (e, f) => {
  if (!f) return true;
  if (f === "kit") return Boolean(e.piel);
  if (f === "plantilla") return Boolean(e.plantilla);
  return e.engine === f;
};
const encajaEstado = (e, f) => {
  if (!f) return true;
  if (f === "listo") return Boolean(e.plantilla || e.piel || e.motorListo);
  return e.status === f;
};

function tiras(p) {
  if (!p) return null;
  return h("span", { class: "tiras-estilo", "aria-hidden": "true" }, ["fondo", "superficie", "tinta", "acento", "segundo"].map((k) => { const s = h("i", {}); s.style.background = p[k]; return s; }));
}

export function crearGaleria(estilos, { monitor, avisar, alCambiarPlanos }) {
  return (ruta) => {
    const filtros = { q: "", fuente: "", estado: "", color: "", motor: "" };
    let abierto = null;
    const raiz = h("div", { class: "galeria" });
    const elegidos = h("div", { class: "elegidos" });
    const bandeja = h("div", { class: "bandeja" });
    const grilla = h("div", { class: "grilla-secciones" });
    const ficha = h("div", { class: "ficha" });
    const contador = h("span", { class: "contador" });
    const esRecorrido = () => leer("arte.modo") === "recorrido";
    const lista = () => leer("arte.recorrido") ?? [];
    const busca = (id) => estilos.find((e) => e.id === id);

    const sel = (k, opciones, rotulo) => h("select", { class: "campo", "aria-label": rotulo, onchange: (e) => { filtros[k] = e.target.value; pintar(); } }, opciones.map(([v, t]) => h("option", { value: v }, t)));
    const barra = h("div", { class: "filtros" },
      h("input", { class: "campo", type: "search", placeholder: "Buscar: tiza, 3D, papel, noticias…", "aria-label": "Buscar estilo", oninput: (e) => { filtros.q = e.target.value.toLowerCase(); pintar(); } }),
      sel("estado", [["", "Cualquier estado"], ["listo", "Listos para usar"], ["marca", "Ya usados en un video"], ["prueba", "Probados"], ["adaptar", "Por adaptar"]], "Filtrar por estado"),
      sel("motor", [["", "Cualquier motor"], ["kit", "Kit de escenas"], ["plantilla", "Con plantilla probada"], ["canvas2d", "Canvas"], ["threejs", "three.js"], ["hyperframes", "HyperFrames"], ["webgl", "WebGL"], ["mixto", "Mixto"]], "Filtrar por motor"),
      sel("color", [["", "Cualquier color"], ["oscuro", "Fondo oscuro"], ["claro", "Fondo claro"], ["calido", "Acento cálido"], ["frio", "Acento frío"]], "Filtrar por color"),
      sel("fuente", [["", "Todas las fuentes"], ["kit40", "Kit de 40"], ["lemo", "Biblioteca de cine"], ["registro", "Registro de HyperFrames"]], "Filtrar por fuente"), contador);

    const pintarElegidos = () => {
      const val = leer(ruta) ?? {};
      elegidos.hidden = esRecorrido();
      elegidos.replaceChildren(...PAPELES.map(([k, t]) => {
        const e = busca(val[k]);
        return h("div", { class: `elegido${e ? "" : " vacio"}` }, h("small", {}, t), h("b", {}, e ? e.name.es : "Sin elegir"),
          e ? h("button", { type: "button", class: "bt-mini", "aria-label": `Quitar ${e.name.es}`, onclick: () => { fijar(ruta, { ...leer(ruta), [k]: null }); pintar(); } }, "Quitar") : null);
      }));
    };

    const moverEn = (i, destino) => {
      const l = [...lista()];
      if (destino < 0 || destino >= l.length) return;
      const [x] = l.splice(i, 1);
      l.splice(destino, 0, x);
      fijar("arte.recorrido", l);
      pintar();
    };

    // Bandeja del recorrido: fichas numeradas que se arrastran, con botones para quien usa el teclado.
    const pintarBandeja = () => {
      bandeja.hidden = !esRecorrido();
      if (bandeja.hidden) return;
      const l = lista();
      const fichas = l.map((id, i) => {
        const e = busca(id);
        const f = h("div", { class: "b-ficha", draggable: true, role: "listitem" },
          h("span", { class: "b-num" }, String(i + 1)),
          e?.thumb ? h("img", { src: e.thumb, alt: "", loading: "lazy" }) : null,
          h("span", { class: "b-nombre" }, e?.name.es ?? id),
          h("span", { class: "b-acc" },
            h("button", { type: "button", class: "bt-ico", "aria-label": `Subir ${e?.name.es ?? id}`, disabled: i === 0, onclick: () => moverEn(i, i - 1) }, "←"),
            h("button", { type: "button", class: "bt-ico", "aria-label": `Bajar ${e?.name.es ?? id}`, disabled: i === l.length - 1, onclick: () => moverEn(i, i + 1) }, "→"),
            h("button", { type: "button", class: "bt-ico", "aria-label": `Quitar ${e?.name.es ?? id}`, onclick: () => { fijar("arte.recorrido", l.filter((x) => x !== id)); pintar(); } }, "×")));
        f.addEventListener("dragstart", (ev) => { ev.dataTransfer.setData("text/plain", String(i)); ev.dataTransfer.effectAllowed = "move"; f.classList.add("moviendo"); });
        f.addEventListener("dragend", () => f.classList.remove("moviendo"));
        f.addEventListener("dragover", (ev) => { ev.preventDefault(); f.classList.add("destino"); });
        f.addEventListener("dragleave", () => f.classList.remove("destino"));
        f.addEventListener("drop", (ev) => { ev.preventDefault(); f.classList.remove("destino"); const de = Number(ev.dataTransfer.getData("text/plain")); if (Number.isInteger(de)) moverEn(de, i); });
        return f;
      });
      const repartir = () => {
        const sobran = repartirRecorrido();
        alCambiarPlanos?.();
        if (!sobran.length) { avisar?.(`${l.length} estilos repartidos en los planos.`); pintar(); return; }
        agregarRafaga(sobran);
        alCambiarPlanos?.();
        avisar?.(`No cabían ${sobran.length}: van en un plano de ráfaga.`);
        pintar();
      };
      bandeja.replaceChildren(
        h("div", { class: "b-cabeza" }, h("b", {}, l.length ? `Recorrido: ${l.length} ${l.length === 1 ? "estilo" : "estilos"}` : "Recorrido"),
          l.length ? h("button", { type: "button", class: "bt-mini", onclick: repartir }, "Repartir en los planos") : null,
          l.length ? h("button", { type: "button", class: "bt-mini", onclick: () => { agregarRafaga([...l]); alCambiarPlanos?.(); avisar?.("Plano de ráfaga agregado."); } }, "Agregar ráfaga") : null,
          l.length ? h("button", { type: "button", class: "bt-mini", onclick: () => { fijar("arte.recorrido", []); pintar(); } }, "Vaciar") : null),
        l.length ? h("div", { class: "b-fichas", role: "list" }, fichas) : h("p", { class: "ct-nota" }, "Toca las miniaturas en el orden en que deben salir. Cada una será un plano."));
    };

    function pintarFicha() {
      if (!abierto) { ficha.hidden = true; return; }
      const e = abierto, val = leer(ruta) ?? {};
      ficha.hidden = false;
      const enLista = lista().includes(e.id);
      ficha.replaceChildren(
        e.thumb ? h("img", { src: e.thumb, alt: `Ejemplo del estilo ${e.name.es}`, loading: "lazy", onerror: (ev) => { ev.target.style.visibility = "hidden"; } }) : h("span", { class: "sin-img" }, e.name.es),
        h("div", { class: "ficha-texto" },
          h("h4", {}, e.name.es), h("p", { class: "ficha-meta" }, `${e.id}, ${e.family.es}. ${ESTADO[e.status] ?? e.status}.${e.plantilla ? " Con plantilla probada." : ""}${e.piel ? " Lo hace el kit de escenas." : ""}`),
          e.palette ? h("div", { class: "ficha-paleta" }, Object.entries(NOMBRE_COLOR).map(([k, n]) => { const s = h("span", { title: `${n}: ${e.palette[k]}` }, h("i", {}), n); s.firstChild.style.background = e.palette[k]; return s; })) : null,
          h("p", {}, e.traits.es), e.uses ? h("p", {}, h("b", {}, "Sirve para: "), e.uses.es) : null, e.avoid ? h("p", {}, h("b", {}, "Cuidado: "), e.avoid.es) : null,
          esRecorrido()
            ? h("div", { class: "ficha-botones" }, h("button", { type: "button", class: "bt", "aria-pressed": String(enLista), onclick: () => { alternar(e); pintar(); } }, enLista ? "Quitar del recorrido" : "Agregar al recorrido"))
            : h("div", { class: "ficha-botones" }, PAPELES.map(([k, t]) => h("button", { type: "button", class: "bt", "aria-pressed": String(val[k] === e.id), onclick: () => {
              const nuevo = { ...leer(ruta) };
              for (const [p] of PAPELES) if (nuevo[p] === e.id) nuevo[p] = null;
              nuevo[k] = e.id;
              fijar(ruta, nuevo); pintar();
            } }, t))),
          h("button", { type: "button", class: "bt-mini", onclick: () => { abierto = null; monitor()?.verMuestra(null); pintar(); } }, "Cerrar ficha")));
    }

    const alternar = (e) => {
      const l = lista();
      fijar("arte.recorrido", l.includes(e.id) ? l.filter((x) => x !== e.id) : [...l, e.id]);
    };

    function tarjeta(e, val) {
      const papel = PAPELES.find(([k]) => val[k] === e.id);
      const orden = lista().indexOf(e.id);
      const marcado = esRecorrido() ? orden >= 0 : Boolean(papel);
      const img = e.thumb ? h("img", { src: e.thumb, alt: "", loading: "lazy", onerror: (ev) => { ev.target.replaceWith(h("span", { class: "sin-img" }, e.name.es)); } }) : h("span", { class: "sin-img" }, e.name.es);
      const b = h("button", { type: "button", class: "estilo", "aria-pressed": String(marcado), "aria-current": String(abierto?.id === e.id), "aria-label": `${e.name.es}. ${ESTADO[e.status] ?? ""}`, onclick: () => {
        if (esRecorrido()) { alternar(e); abierto = e; pintar(); return; }
        abierto = abierto?.id === e.id ? null : e;
        pintar();
        if (abierto) monitor()?.verMuestra(e.thumb);
      } },
        img, tiras(e.palette), h("b", {}, e.name.es), h("small", {}, e.plantilla ? "Con plantilla probada" : e.piel ? "Kit de escenas" : ESTADO[e.status] ?? ""),
        esRecorrido() && orden >= 0 ? h("em", {}, String(orden + 1)) : papel ? h("em", {}, papel[1].split(",")[0]) : null);
      b.addEventListener("pointerenter", () => monitor()?.verMuestra(e.thumb));
      b.addEventListener("pointerleave", () => monitor()?.verMuestra(null));
      return b;
    }

    function pintar() {
      const val = leer(ruta) ?? {};
      const encontrados = estilos.filter((e) => (!filtros.fuente || e.source === filtros.fuente) && encajaEstado(e, filtros.estado) && encajaColor(e, filtros.color) && tieneMotor(e, filtros.motor)
        && (!filtros.q || `${e.id} ${e.name.es} ${e.name.en} ${e.family.es} ${e.uses?.es ?? ""} ${e.traits?.es ?? ""}`.toLowerCase().includes(filtros.q)));
      contador.textContent = `${encontrados.length} de ${estilos.length}`;
      const grupos = new Map();
      for (const e of encontrados) { const s = seccionDe(e); if (!grupos.has(s)) grupos.set(s, []); grupos.get(s).push(e); }
      const orden = [...SECCIONES.map(([n]) => n), "Otros"].filter((n) => grupos.has(n));
      grilla.replaceChildren(...orden.map((n) => h("section", { class: "seccion-estilos", "aria-label": n }, h("h4", {}, n, h("small", {}, String(grupos.get(n).length))), h("div", { class: "grilla" }, grupos.get(n).map((e) => tarjeta(e, val))))));
      if (!encontrados.length) grilla.append(h("p", { class: "ct-nota" }, "Ningún estilo coincide. Quita un filtro o busca otra palabra."));
      pintarElegidos();
      pintarBandeja();
      pintarFicha();
    }
    if (!estilos.length) { raiz.append(h("p", { class: "ct-nota" }, "No se pudo cargar el catálogo de estilos. Recarga la página.")); return raiz; }
    pintar();
    const soltar = alCambiar((que) => {
      if (!raiz.isConnected && raiz.parentNode === null && estado) { soltar(); return; }
      if (que === "arte.modo" || que === "receta") pintar();
    });
    raiz.append(elegidos, bandeja, barra, ficha, grilla);
    return raiz;
  };
}
