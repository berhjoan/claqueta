// Galería de estilos: filtra, muestra la ficha y asigna papel de principal, secundario o acento.
import { leer, fijar } from "./estado.js";
import { h } from "./vistas.js";

const PAPELES = [["base", "Principal, 70 %"], ["secundario", "Secundario, 20 %"], ["acento", "Acento, 10 %"]];
const ESTADO = { marca: "Hecho en tu marca", prueba: "Probado hoy", adaptar: "Por adaptar" };
const AGUANTE = { alto: "Aguanta negro y oro", medio: "Pierde algo en negro y oro", bajo: "Necesita su propio color" };

export function crearGaleria(estilos, { monitor }) {
  return (ruta) => {
    const filtros = { q: "", fuente: "", estado: "", negro: "" };
    let abierto = null;
    const raiz = h("div", { class: "galeria" });
    const elegidos = h("div", { class: "elegidos" });
    const grilla = h("div", { class: "grilla" });
    const ficha = h("div", { class: "ficha" });
    const contador = h("span", { class: "contador" });

    const sel = (k, opciones, rotulo) => h("select", { class: "campo", "aria-label": rotulo, onchange: (e) => { filtros[k] = e.target.value; pintar(); } }, opciones.map(([v, t]) => h("option", { value: v }, t)));
    const barra = h("div", { class: "filtros" },
      h("input", { class: "campo", type: "search", placeholder: "Buscar: tiza, 3D, papel, noticias…", "aria-label": "Buscar estilo", oninput: (e) => { filtros.q = e.target.value.toLowerCase(); pintar(); } }),
      sel("estado", [["", "Cualquier estado"], ["marca", "Hechos en tu marca"], ["prueba", "Probados"], ["adaptar", "Por adaptar"]], "Filtrar por estado"),
      sel("negro", [["", "Cualquier color"], ["alto", "Aguantan negro y oro"], ["medio", "Pierden algo"], ["bajo", "Necesitan su color"]], "Filtrar por color"),
      sel("fuente", [["", "Todas las fuentes"], ["kit40", "Tu kit de 40"], ["lemo", "Biblioteca de cine"]], "Filtrar por fuente"), contador);

    const pintarElegidos = () => {
      const val = leer(ruta) ?? {};
      elegidos.replaceChildren(...PAPELES.map(([k, t]) => {
        const e = estilos.find((x) => x.id === val[k]);
        return h("div", { class: `elegido${e ? "" : " vacio"}` }, h("small", {}, t), h("b", {}, e ? e.name.es : "Sin elegir"),
          e ? h("button", { type: "button", class: "bt-mini", "aria-label": `Quitar ${e.name.es}`, onclick: () => { fijar(ruta, { ...leer(ruta), [k]: null }); pintar(); } }, "Quitar") : null);
      }));
    };

    function pintarFicha() {
      if (!abierto) { ficha.hidden = true; return; }
      const e = abierto, val = leer(ruta) ?? {};
      ficha.hidden = false;
      ficha.replaceChildren(
        e.thumb ? h("img", { src: e.thumb, alt: `Ejemplo del estilo ${e.name.es}`, loading: "lazy", onerror: (ev) => { ev.target.style.visibility = "hidden"; } }) : h("span", { class: "sin-img" }, e.name.es),
        h("div", { class: "ficha-texto" },
          h("h4", {}, e.name.es), h("p", { class: "ficha-meta" }, `${e.id}, ${e.family.es}. ${ESTADO[e.status]}. ${AGUANTE[e.blackGold]}.`),
          h("p", {}, e.traits.es), e.uses ? h("p", {}, h("b", {}, "Sirve para: "), e.uses.es) : null, e.avoid ? h("p", {}, h("b", {}, "Cuidado: "), e.avoid.es) : null,
          h("div", { class: "ficha-botones" }, PAPELES.map(([k, t]) => h("button", { type: "button", class: "bt", "aria-pressed": String(val[k] === e.id), onclick: () => {
            const nuevo = { ...leer(ruta) };
            for (const [p] of PAPELES) if (nuevo[p] === e.id) nuevo[p] = null;
            nuevo[k] = e.id;
            fijar(ruta, nuevo); pintar();
          } }, t))),
          h("button", { type: "button", class: "bt-mini", onclick: () => { abierto = null; monitor()?.verMuestra(null); pintar(); } }, "Cerrar ficha")));
    }

    function pintar() {
      const val = leer(ruta) ?? {};
      const lista = estilos.filter((e) => (!filtros.fuente || e.source === filtros.fuente) && (!filtros.estado || e.status === filtros.estado) && (!filtros.negro || e.blackGold === filtros.negro)
        && (!filtros.q || `${e.id} ${e.name.es} ${e.name.en} ${e.family.es} ${e.uses?.es ?? ""} ${e.traits?.es ?? ""}`.toLowerCase().includes(filtros.q)));
      contador.textContent = `${lista.length} de ${estilos.length}`;
      grilla.replaceChildren(...lista.map((e) => {
        const papel = PAPELES.find(([k]) => val[k] === e.id);
        const img = e.thumb ? h("img", { src: e.thumb, alt: "", loading: "lazy", onerror: (ev) => { ev.target.replaceWith(h("span", { class: "sin-img" }, e.name.es)); } }) : h("span", { class: "sin-img" }, e.name.es);
        const b = h("button", { type: "button", class: "estilo", "aria-pressed": String(Boolean(papel)), "aria-current": String(abierto?.id === e.id), onclick: () => { abierto = abierto?.id === e.id ? null : e; pintar(); raiz.scrollIntoView({ block: "nearest" }); } },
          img, h("b", {}, e.name.es), h("small", {}, ESTADO[e.status]), papel ? h("em", {}, papel[1].split(",")[0]) : null);
        b.addEventListener("pointerenter", () => monitor()?.verMuestra(e.thumb));
        b.addEventListener("pointerleave", () => monitor()?.verMuestra(null));
        return b;
      }));
      if (!lista.length) grilla.append(h("p", { class: "ct-nota" }, "Ningún estilo coincide. Quita un filtro o busca otra palabra."));
      pintarElegidos();
      pintarFicha();
    }
    if (!estilos.length) { raiz.append(h("p", { class: "ct-nota" }, "No se pudo cargar el catálogo de estilos. Recarga la página.")); return raiz; }
    pintar();
    raiz.append(elegidos, barra, ficha, grilla);
    return raiz;
  };
}
