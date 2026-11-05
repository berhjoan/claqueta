// Proyectos con nombre: guardar, abrir, duplicar, borrar, exportar e importar. Solo en este navegador, salvo lo que exportes.
import { estado, abrirProyecto, exportarProyecto, importarProyecto } from "./estado.js";
import { h } from "./vistas.js";

const CLAVE = "claqueta.proyectos.v1";
const MAX = 200;

function leerLista() {
  try {
    const l = JSON.parse(localStorage.getItem(CLAVE) ?? "[]");
    return Array.isArray(l) ? l.filter((p) => p && typeof p.nombre === "string" && p.datos) : [];
  } catch { return []; }
}
function guardarLista(lista) {
  try { localStorage.setItem(CLAVE, JSON.stringify(lista.slice(0, MAX))); return true; } catch { return false; }
}

export function vistaProyectos({ alAbrir, avisar }) {
  const raiz = h("div", { class: "proyectos" });
  const nombre = h("input", { class: "campo", type: "text", placeholder: "Nombre del proyecto", "aria-label": "Nombre del proyecto", value: estado.valores.guion.titulo ?? "" });
  const lista = h("div", { class: "proy-lista" });
  const archivo = h("input", { type: "file", accept: "application/json,.json", hidden: true, "aria-label": "Importar proyecto", onchange: async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 2_000_000) { avisar("Ese archivo es demasiado grande para ser un proyecto."); return; }
    try {
      importarProyecto(JSON.parse(await f.text()));
      alAbrir();
      avisar(`Importado: ${f.name}. Revisa el guion y las notas: tu IA los va a leer.`);
    } catch { avisar("Ese archivo no es un proyecto válido."); }
  } });

  const guardar = () => {
    const n = nombre.value.trim() || "Sin nombre";
    const previo = leerLista().filter((p) => p.nombre !== n);
    if (guardarLista([{ nombre: n, fecha: new Date().toISOString(), datos: exportarProyecto() }, ...previo])) avisar(`Guardado: ${n}`);
    else avisar("No se pudo guardar. Exporta el proyecto a un archivo.");
    pintar();
  };
  const exportar = () => {
    const n = (nombre.value.trim() || "proyecto").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "proyecto";
    const a = h("a", { href: URL.createObjectURL(new Blob([JSON.stringify(exportarProyecto(), null, 1)], { type: "application/json" })), download: `claqueta-${n}.json` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    avisar("Proyecto exportado. También sirve con tools/prompt.mjs.");
  };

  function pintar() {
    const guardados = leerLista();
    lista.replaceChildren(...guardados.map((p) => h("div", { class: "proy" },
      h("div", { class: "proy-txt" }, h("b", {}, p.nombre), h("small", {}, new Date(p.fecha).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" }))),
      h("button", { type: "button", class: "bt-mini", onclick: () => { abrirProyecto(p.datos); nombre.value = p.nombre; alAbrir(); avisar(`Abierto: ${p.nombre}`); } }, "Abrir"),
      h("button", { type: "button", class: "bt-mini", onclick: () => { guardarLista([{ ...p, nombre: `${p.nombre} (copia)`, fecha: new Date().toISOString() }, ...guardados]); pintar(); } }, "Duplicar"),
      h("button", { type: "button", class: "bt-mini peligro", "aria-label": `Borrar ${p.nombre}`, onclick: () => { guardarLista(guardados.filter((x) => x !== p)); pintar(); } }, "Borrar"))));
    if (!guardados.length) lista.append(h("p", { class: "ct-nota" }, "Aún no hay proyectos guardados. Escribe un nombre y guarda el actual."));
  }
  pintar();
  raiz.append(
    h("div", { class: "filtros" }, nombre,
      h("button", { type: "button", class: "bt bt-oro", onclick: guardar }, "Guardar"),
      h("button", { type: "button", class: "bt", onclick: exportar }, "Exportar JSON"),
      h("button", { type: "button", class: "bt", onclick: () => archivo.click() }, "Importar JSON"), archivo),
    h("p", { class: "ct-nota" }, "Se guardan solo en este navegador. Para llevarlos a otro lado, exporta el archivo o usa «Compartir enlace»."),
    lista);
  return raiz;
}
