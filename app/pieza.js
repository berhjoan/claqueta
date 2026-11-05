// Del panel al kit de escenas: elige el motor probado para un estilo y arma el pieza.json inicial. Sin DOM: también corre en Node.
const CAMARAS = { fija: "fija", push: "push", dolly_in: "push", zoom: "push", pull: "pull", dolly_out: "pull", ken_burns: "deriva", travelling: "deriva", viaje: "deriva", estaciones: "deriva", paneo: "deriva", golpe: "golpe", latigo: "golpe" };
const TRANSICIONES = { corte: "corte", coincidencia: "corte", oscuro: "corte", latigo: "barrido", cortinilla: "barrido", curva: "barrido", desenfoque: "barrido", cascada: "persiana", inundar: "inundar", objeto: "inundar", iris: "inundar", glitch: "falla", material: "papel" };

// «auto» usa lo que ya está probado para ese estilo.
export function motorDe(v, base) {
  if (v.motor.motor !== "auto") return v.motor.motor;
  if ((v.movimiento.texto ?? []).includes("mano") || base?.motorListo === "pizarra") return "canvas";
  if (v.profundidad.modo === "isometrico" || base?.motorListo === "isometrico") return "isometrico";
  // El kit es 2D: una profundidad real o un espacio 3D se construyen a mano.
  if (["real", "css3d", "nubes", "zespacio"].includes(v.profundidad.modo)) return "hyperframes";
  if (v.arte.modo === "recorrido" && (v.arte.recorrido ?? []).length) return "escenas";
  if (base?.piel || base?.plantilla) return "escenas";
  return "hyperframes";
}

// El plano de la lista se vuelve un plano de pieza.json. El tipo es una propuesta: lo decide quien escribe el guion.
function planoDePieza(p, i, total, estilos, conRecorrido, propios, vertical) {
  const e = estilos.find((x) => x.id === p.estilo);
  const salida = { tipo: i === 0 ? "titulo" : i === total - 1 ? "cierre" : "frase", _idea: p.titulo };
  if (i > 0) salida.desde = "@primera-palabra-de-esta-parte";
  if (p.tipo === "rafaga") {
    salida.tipo = "plantilla";
    salida.estilo = "rafaga";
    salida.cadencia = p.rafaga?.cadencia ?? 2;
    salida.paradas = p.rafaga?.paradas ?? [];
    salida.mosaico = p.rafaga?.mosaico === true;
    return salida;
  }
  if (i === 0) salida.texto = p.texto || "El gancho, tal como se dice";
  else if (i === total - 1) salida.frase = p.texto || "La frase que responde al inicio";
  else salida.texto = p.texto || "La frase o palabra clave de esta parte";
  if (conRecorrido && e) {
    salida.estilo = e.id;
    if (e.plantilla && vertical) {
      salida.tipo = "plantilla";
      salida.textos = {};
      delete salida.texto;
      delete salida.frase;
    } else if (e.piel) salida.piel = e.piel;
    else {
      salida.tipo = "propia";
      salida.archivo = `escenas/${e.id}.html`;
      salida.textos = {};
      delete salida.texto;
      delete salida.frase;
    }
    if (propios) salida.paleta = "propia";
  }
  if (CAMARAS[p.cam]) salida.camara = CAMARAS[p.cam];
  if (i > 0 && TRANSICIONES[p.tr]) salida.transicion = TRANSICIONES[p.tr];
  return salida;
}

export function piezaInicial(v, planos, { estilos = [], base, tipografia = null } = {}) {
  const conRecorrido = v.arte.modo === "recorrido";
  const propios = v.arte.paleta === "propios";
  const pieza = { formato: v.entrega.formato, piel: base?.piel ?? "infografia" };
  if (propios) { if (!conRecorrido && base) pieza.estilo = base.id; pieza.paleta = "propia"; }
  else pieza.paleta = v.arte.paleta;
  if (tipografia) pieza.tipografia = tipografia;
  pieza.subtitulos = v.subtitulos.activos ? { estilo: v.subtitulos.estilo, posicion: v.subtitulos.posicion } : false;
  pieza.planos = planos.map((p, i) => planoDePieza(p, i, planos.length, estilos, conRecorrido, propios, v.entrega.formato === "9:16"));
  return pieza;
}
