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
  // Con plantilla pero sin piel, el kit no sabe hacer más planos de ese estilo: una plantilla se monta una sola vez.
  if (base?.piel) return "escenas";
  return "hyperframes";
}

// El plano de la lista se vuelve un plano de pieza.json. El tipo es una propuesta: lo decide quien escribe el guion.
function planoDePieza(p, i, total, estilos, conRecorrido, propios, vertical, enMezcla, anterior) {
  const e = estilos.find((x) => x.id === (enMezcla ?? p.estilo));
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
  if ((conRecorrido || enMezcla) && e) {
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
  // En la lista, «Pasa con» es cómo sale cada plano. En pieza.json, «transicion» es cómo entra.
  if (i > 0 && TRANSICIONES[anterior?.tr]) salida.transicion = TRANSICIONES[anterior.tr];
  return salida;
}

// En una mezcla, el principal abre y cierra; el secundario y el acento toman planos del medio, repartidos.
export function planosDeMezcla(v, total) {
  const reparto = new Map();
  const { secundario, acento } = v.arte.estilos ?? {};
  const medio = Array.from({ length: Math.max(0, total - 2) }, (_, k) => k + 1);
  if (v.arte.modo === "recorrido" || !medio.length) return reparto;
  const cuantos = secundario ? Math.max(1, Math.round(total * (acento ? 0.2 : 0.25))) : 0;
  const libres = [...medio];
  for (let k = 0; k < cuantos && libres.length; k += 1) {
    const i = libres[Math.floor(((k + 0.5) / cuantos) * libres.length)];
    reparto.set(i, secundario);
    libres.splice(libres.indexOf(i), 1);
  }
  if (acento && libres.length) reparto.set(libres[Math.floor(libres.length * 0.66)], acento);
  return reparto;
}

export function piezaInicial(v, planos, { estilos = [], base, tipografia = null } = {}) {
  const conRecorrido = v.arte.modo === "recorrido";
  const propios = v.arte.paleta === "propios";
  const pieza = { formato: v.entrega.formato, piel: base?.piel ?? "infografia" };
  if (propios) { if (!conRecorrido && base) pieza.estilo = base.id; pieza.paleta = "propia"; }
  else pieza.paleta = v.arte.paleta;
  if (tipografia) pieza.tipografia = tipografia;
  pieza.subtitulos = v.subtitulos.activos ? { estilo: v.subtitulos.estilo, posicion: v.subtitulos.posicion } : false;
  const mezcla = planosDeMezcla(v, planos.length);
  pieza.planos = planos.map((p, i) => planoDePieza(p, i, planos.length, estilos, conRecorrido, propios, v.entrega.formato === "9:16", mezcla.get(i), planos[i - 1]));
  return pieza;
}
