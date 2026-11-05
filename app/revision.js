// Revisión del encargo antes de copiar: encuentra lo que se contradice y propone el arreglo. Sin DOM: también corre en Node.
// Cada aviso trae su texto y, si se puede, un arreglo de un clic: cambios en valores o una acción del panel.
import { opcion } from "./catalogo.js";
import { duracionPlanos } from "./planos.js";
import { motorDe } from "./pieza.js";

export const LARGO_RECOMENDADO = 2500;

export function revisar(estado, { estilos = [], palabras = 0, compacto = false } = {}) {
  const v = estado.valores, planos = estado.planos ?? [], avisos = [];
  const aviso = (id, nivel, texto, arreglo) => avisos.push({ id, nivel, texto, arreglo });
  const est = (id) => estilos.find((e) => e.id === id);
  const enRecorrido = v.arte.modo === "recorrido";
  const lista = v.arte.recorrido ?? [];
  const base = enRecorrido ? est(lista[0]) : est(v.arte.estilos?.base);
  const elegidos = enRecorrido ? lista.map(est).filter(Boolean) : [est(v.arte.estilos?.base), est(v.arte.estilos?.secundario), est(v.arte.estilos?.acento)].filter(Boolean);
  const texto = (v.guion.texto ?? "").trim();
  const conVoz = v.sonido.narracion;

  // Lo que hace falta para que el encargo funcione.
  if (!(v.guion.titulo ?? "").trim() && !texto) aviso("tema", "alto", "Falta el tema o el guion: la IA tendría que inventarlo.");
  if (v.guion.modo === "exacto" && !texto) aviso("sin-texto", "alto", "Pediste usar tu texto exacto, pero el guion está vacío.", { etiqueta: "Que lo escriba la IA", cambios: { "guion.modo": "ia" } });
  if (enRecorrido && !lista.length) aviso("recorrido-vacio", "alto", "Modo Recorrido sin estilos: toca las miniaturas en el orden en que deben salir.", { etiqueta: "Volver a Mezcla", cambios: { "arte.modo": "mezcla" } });
  if (!enRecorrido && !base) aviso("sin-estilo", "alto", "No hay estilo principal: la IA caería en su aspecto por defecto.");

  // Lo que se contradice.
  const natural = opcion("guion", "tipo", v.guion.tipo)?.estructura;
  if (natural && natural !== v.guion.estructura && opcion("guion", "estructura", natural)) {
    aviso("tipo-estructura", "medio", `«${opcion("guion", "tipo", v.guion.tipo).n[0]}» suele contarse como «${opcion("guion", "estructura", natural).n[0]}», y elegiste «${opcion("guion", "estructura", v.guion.estructura).n[0]}». Si es a propósito, déjalo.`, { etiqueta: "Usar la natural", cambios: { "guion.estructura": natural } });
  }
  if (!conVoz && v.montaje.sincronia === "voz") aviso("sin-voz-sincronia", "alto", "La voz es el reloj de los cortes, pero el video no lleva voz.", { etiqueta: "Cortar al pulso", cambios: { "montaje.sincronia": "pulso" } });
  if (!conVoz && v.subtitulos.activos) aviso("sin-voz-subtitulos", "alto", "Hay subtítulos, pero no hay voz de la que salgan.", { etiqueta: "Quitar subtítulos", cambios: { "subtitulos.activos": false } });
  if (v.sonido.musica === "sin" && ["pulso", "frase"].includes(v.montaje.sincronia)) aviso("sin-musica-pulso", "alto", "Los cortes siguen a la música, pero no hay música.", { etiqueta: "Cortar con la voz", cambios: { "montaje.sincronia": "voz" } });
  if (v.arte.marca === "propia" && !(v.guion.notas ?? "").trim()) aviso("marca-sin-notas", "alto", "Elegiste otra marca, pero las notas no dicen cuál.");
  if (v.guion.final === "enlace" && !(v.guion.notas ?? "").trim()) aviso("enlace-sin-notas", "alto", "El cierre lleva a un enlace, pero las notas no lo traen.");
  if (["grabada", "llave"].includes(v.sonido.voz_propia) && !(v.guion.notas ?? "").trim()) aviso("voz-sin-notas", "alto", "La voz propia se indica en las notas, y están vacías.");

  // El color.
  if (v.arte.paleta !== "propios" && typeof v.arte.paleta === "string") {
    const necesitan = elegidos.filter((e) => e.blackGold === "bajo");
    if (v.arte.paleta === "bg" && necesitan.length) aviso("estilo-pide-color", "medio", `${necesitan.map((e) => e.name.es).join(", ")} ${necesitan.length > 1 ? "necesitan" : "necesita"} su propio color: en negro y oro pierde lo que lo hace reconocible.`, { etiqueta: "Colores de cada estilo", cambios: { "arte.paleta": "propios" } });
    if (enRecorrido && lista.length > 1) aviso("recorrido-una-paleta", "medio", "Un recorrido con una sola paleta hace que todos los estilos se parezcan.", { etiqueta: "Colores de cada estilo", cambios: { "arte.paleta": "propios" } });
  }
  if (v.arte.marca === "bg" && v.arte.paleta !== "bg") aviso("marca-otra-paleta", "info", "La marca va solo con emblema y lema: sus reglas de color no aplican con esta paleta.", { etiqueta: "Usar negro y oro", cambios: { "arte.paleta": "bg" } });

  const plataforma = opcion("entrega", "plataforma", v.entrega.plataforma);
  if (plataforma?.formato && plataforma.formato !== v.entrega.formato) aviso("plataforma-formato", "info", `${plataforma.n[0]} suele ir en ${plataforma.formato}, y este video está en ${v.entrega.formato}.`, { etiqueta: `Pasar a ${plataforma.formato}`, cambios: { "entrega.formato": plataforma.formato } });

  // El tiempo.
  const total = duracionPlanos(planos);
  const cortos = planos.filter((p) => p.dur < 1.2 && p.tipo !== "rafaga");
  if (cortos.length && v.montaje.ritmo !== "frenetico") aviso("planos-cortos", "medio", `${cortos.length} ${cortos.length > 1 ? "planos duran" : "plano dura"} menos de 1,2 s: casi no se alcanza a ver.`, { etiqueta: "Repartir de nuevo", accion: "rehacer-planos" });
  if (v.montaje.ritmo === "contemplativo" && total < 20) aviso("ritmo-corto", "medio", "Un ritmo contemplativo no cabe en una pieza tan corta.", { etiqueta: "Ritmo pausado", cambios: { "montaje.ritmo": "pausado" } });
  if (conVoz && texto) {
    const dice = Math.max(1, Math.round(texto.split(/\s+/).length / 3.2));
    const pedido = Number(v.entrega.duracion), ideal = Math.max(5, dice + 2);
    if (Math.abs(ideal - pedido) / pedido > 0.25) aviso("guion-duracion", "medio", `El guion se lee en unos ${dice} s y el video está en ${pedido} s.`, { etiqueta: `Ajustar a ${ideal} s`, cambios: { "entrega.duracion": ideal } });
  }

  // El recorrido.
  if (enRecorrido && lista.length) {
    const asignados = new Set(planos.map((p) => p.estilo).filter(Boolean));
    const sobran = lista.filter((id) => !asignados.has(id));
    if (sobran.length) aviso("estilos-sin-plano", "medio", `${sobran.length} ${sobran.length > 1 ? "estilos no tienen plano" : "estilo no tiene plano"}. Puedes ir a una ráfaga, o alargar el video.`, { etiqueta: "Agregar ráfaga", accion: "agregar-rafaga", datos: sobran });
    if (lista.length > 12 && Number(v.entrega.duracion) / lista.length < 2) aviso("recorrido-apretado", "info", "Son muchos estilos para esta duración: cada uno tendría menos de 2 s.");
  }

  // Lo que conviene saber.
  const conGpu = elegidos.filter((e) => e.gpu);
  if (conGpu.length) aviso("necesita-gpu", "info", `${conGpu.map((e) => e.name.es).join(", ")} ${conGpu.length > 1 ? "necesitan" : "necesita"} una GPU para renderizarse. En una máquina sin GPU, tu IA tendrá que cambiar ese estilo.`);
  const sinProbar = elegidos.filter((e) => e.status === "adaptar" && !e.plantilla && !e.piel && !e.motorListo);
  if (sinProbar.length) aviso("estilos-sin-probar", "info", `${sinProbar.map((e) => e.name.es).slice(0, 4).join(", ")}${sinProbar.length > 4 ? "…" : ""} no ${sinProbar.length > 1 ? "tienen" : "tiene"} plantilla probada: la IA los construye desde su ficha.`);
  if (motorDe(v, base) === "remotion") aviso("remotion", "info", "Remotion es de pago desde 4 personas. Para ti entra gratis; revísalo si es para una empresa.");
  if (palabras > LARGO_RECOMENDADO && !compacto) aviso("largo", "info", `El encargo tiene ${palabras.toLocaleString("es")} palabras. Desde unas ${LARGO_RECOMENDADO.toLocaleString("es")}, «Compacto» ahorra lectura sin perder lo importante.`, { etiqueta: "Activar Compacto", accion: "compacto" });

  const orden = { alto: 0, medio: 1, info: 2 };
  return avisos.sort((a, b) => orden[a.nivel] - orden[b.nivel]);
}
