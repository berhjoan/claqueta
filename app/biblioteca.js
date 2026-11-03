// Biblioteca y radar: lo que cualquier IA recibe junto con el prompt. El texto se muestra siempre como texto, nunca como HTML.
import { h } from "./vistas.js";
import { REPO } from "./prompt.js";

let manifiesto = null, radar = null;

async function json(ruta) {
  const r = await fetch(ruta);
  if (!r.ok) throw new Error(`${ruta}: ${r.status}`);
  return r.json();
}

export function vistaBiblioteca() {
  const raiz = h("div", { class: "biblio" });
  const lista = h("div", { class: "biblio-lista" });
  const visor = h("div", { class: "visor", hidden: true });
  const filtros = { q: "", cat: "" };
  const contador = h("span", { class: "contador" });
  const cats = h("select", { class: "campo", "aria-label": "Filtrar por tipo", onchange: (e) => { filtros.cat = e.target.value; pintar(); } }, h("option", { value: "" }, "Todo"));
  raiz.append(h("div", { class: "filtros" }, h("input", { class: "campo", type: "search", placeholder: "Buscar: cámara, subtítulos, 3D, voz…", "aria-label": "Buscar en la biblioteca", oninput: (e) => { filtros.q = e.target.value.toLowerCase(); pintar(); } }), cats, contador), visor, lista);

  function abrir(item) {
    visor.hidden = false;
    const cuerpo = h("pre", { class: "visor-texto" }, "Cargando…");
    visor.replaceChildren(h("div", { class: "visor-barra" }, h("b", {}, item.titulo),
      h("button", { type: "button", class: "bt-mini", onclick: () => navigator.clipboard?.writeText(`.claqueta/${item.ruta}`) }, "Copiar ruta"),
      h("a", { class: "bt-mini", href: `${REPO}/blob/main/${encodeURI(item.ruta)}`, target: "_blank", rel: "noopener" }, "Abrir en GitHub"),
      h("button", { type: "button", class: "bt-mini", onclick: () => { visor.hidden = true; } }, "Cerrar")), cuerpo);
    fetch(item.ruta).then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status))))).then((t) => { cuerpo.textContent = t; }).catch(() => { cuerpo.textContent = "No se pudo abrir este archivo. Ábrelo en GitHub."; });
    visor.scrollIntoView({ block: "nearest" });
  }

  function pintar() {
    if (!manifiesto) return;
    const items = manifiesto.items.filter((x) => (!filtros.cat || x.cat === filtros.cat) && (!filtros.q || `${x.titulo} ${x.desc} ${x.ruta}`.toLowerCase().includes(filtros.q)));
    contador.textContent = `${items.length} de ${manifiesto.items.length}`;
    lista.replaceChildren(...items.slice(0, 200).map((x) => h("button", { type: "button", class: "biblio-item", onclick: () => abrir(x) }, h("b", {}, x.titulo), h("small", {}, x.desc || x.ruta), h("em", {}, `${x.catNombre}. ${x.licencia}`))));
    if (items.length > 200) lista.append(h("p", { class: "ct-nota" }, `Mostrando 200 de ${items.length}. Busca para acotar.`));
    if (!items.length) lista.append(h("p", { class: "ct-nota" }, "Nada coincide. Prueba con otra palabra."));
  }

  json("library/manifest.json").then((m) => {
    manifiesto = m;
    const usadas = [...new Map(m.items.map((x) => [x.cat, x.catNombre])).entries()];
    cats.append(...usadas.map(([c, n]) => h("option", { value: c }, n)));
    pintar();
  }).catch(() => lista.append(h("p", { class: "ct-nota" }, "No se pudo cargar la biblioteca. Recarga la página o ábrela en GitHub.")));
  return raiz;
}

const VEREDICTO = { adoptar: "Adoptar", probar: "Probar", vigilar: "Vigilar", descartar: "Descartar" };
const CATS = { agentes: "Agentes y skills", motor: "Motores", voz: "Voz", musica: "Música", sfx: "Efectos", subtitulos: "Subtítulos", edicion: "Edición", editor: "Editores", animacion: "Animación y 3D", referencia: "Referencia" };

export function vistaRadar() {
  const raiz = h("div", { class: "radar" });
  json("data/radar.json").then((r) => {
    radar = r;
    const grupos = [...new Set(r.map((x) => x.cat))];
    for (const g of grupos) {
      raiz.append(h("h3", {}, CATS[g] ?? g));
      const filas = r.filter((x) => x.cat === g).sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0));
      raiz.append(h("div", { class: "radar-lista" }, filas.map((x) => h("a", { class: "radar-item", href: x.url, target: "_blank", rel: "noopener" },
        h("b", {}, x.repo), h("span", {}, x.es), h("small", {}, `${VEREDICTO[x.verdict] ?? x.verdict}. ${x.license ?? "Sin licencia declarada"}. ${(x.stars ?? 0).toLocaleString("es")} estrellas${x.needsGpu ? ". Pide GPU" : ""}`)))));
    }
  }).catch(() => raiz.append(h("p", { class: "ct-nota" }, "No se pudo cargar el radar. Recarga la página.")));
  return raiz;
}

export function vistaAyuda() {
  return h("div", { class: "ayuda" },
    h("ol", { class: "pasos" },
      h("li", {}, h("b", {}, "Elige. "), "Parte de una receta o ve por los departamentos de la izquierda. El monitor muestra el resultado aproximado mientras eliges."),
      h("li", {}, h("b", {}, "Copia. "), "«Copiar prompt» lo da en español. «Traducir y copiar» lo da en inglés y deja claro que todo el video va en español."),
      h("li", {}, h("b", {}, "Pega en tu IA. "), "Sirve cualquier IA con terminal: Claude Code, Codex, Gemini CLI. Clona esta biblioteca, sigue el encargo y te entrega el video.")),
    h("h3", {}, "Qué conviene saber"),
    h("ul", {},
      h("li", {}, "Todo es gratis y no hace falta ninguna llave de API. Motores y herramientas corren en tu computador; solo las voces Edge piden internet."),
      h("li", {}, "El monitor es una guía de cámara, profundidad y ritmo. El acabado de cada estilo lo construye la IA con su ficha."),
      h("li", {}, "Tu proyecto se guarda solo en este navegador. «Compartir enlace» lo lleva a otro dispositivo."),
      h("li", {}, "El guion nunca se traduce. Las notas sí: primero con el traductor local de Chrome y, si no existe, con MyMemory, un servicio externo gratuito.")),
    h("h3", {}, "Atajos"),
    h("ul", {}, h("li", {}, "Barra espaciadora: reproducir o pausar el monitor, fuera de los campos de texto.")),
  );
}
