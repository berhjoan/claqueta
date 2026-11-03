// Línea de tiempo: reparte la duración en planos según estructura, ritmo y forma del ritmo. Sin DOM.
import { opcion } from "./catalogo.js";

let contador = 0;
const nuevoId = () => `p${Date.now().toString(36)}${(contador++).toString(36)}`;

const redondear = (x) => Math.round(x * 10) / 10;

export function generarPlanos(v) {
  const est = opcion("guion", "estructura", v.guion.estructura);
  const ritmo = opcion("montaje", "ritmo", v.montaje.ritmo);
  const total = Number(v.entrega.duracion) || 60;
  const compases = est?.planos ?? ["Gancho", "Desarrollo", "Cierre"];
  const movs = v.camara.movs?.length ? v.camara.movs : ["fija"];
  const trans = v.montaje.transiciones?.length ? v.montaje.transiciones : ["corte"];

  if (v.montaje.ritmo === "secuencia") {
    return [{ id: nuevoId(), titulo: "Plano secuencia", texto: "", dur: total, cam: movs.includes("viaje") ? "viaje" : movs[0], tr: "corte", nota: "" }];
  }

  // Cuántos planos caben: ni menos que los compases de la estructura ni tantos que no se puedan leer.
  const seg = ritmo?.seg ?? 3.5;
  const maximo = Math.max(compases.length, Math.floor(total / 0.8));
  const n = Math.min(maximo, Math.max(compases.length, Math.min(60, Math.round(total / seg))));

  // El primero y el último compás llevan un solo plano; los del medio se reparten el resto.
  const medios = compases.length - 2;
  const extra = n - compases.length;
  const porCompas = compases.map((_, i) => (i === 0 || i === compases.length - 1 ? 1 : 1 + Math.floor(extra / Math.max(1, medios)) + (i - 1 < extra % Math.max(1, medios) ? 1 : 0)));

  const nombres = [];
  compases.forEach((c, i) => {
    for (let k = 0; k < porCompas[i]; k++) nombres.push(porCompas[i] > 1 ? `${c} ${k + 1}` : c);
  });

  // La forma del ritmo cambia el peso de cada plano.
  const pesos = nombres.map((_, i) => {
    const u = nombres.length > 1 ? i / (nombres.length - 1) : 0;
    if (v.montaje.patron === "acelera") return 1.5 - u;
    if (v.montaje.patron === "golpes") return i % 3 === 2 ? 1.6 : 0.8;
    if (v.montaje.patron === "silencio") return i === nombres.length - 2 ? 1.5 : 1;
    return 1;
  });
  // El gancho no pasa de 4 s salvo en piezas muy cortas.
  const suma = pesos.reduce((a, b) => a + b, 0);
  const durs = pesos.map((p) => (p / suma) * total);
  if (durs.length > 2 && durs[0] > 4) {
    const sobra = durs[0] - 4;
    durs[0] = 4;
    for (let i = 1; i < durs.length; i++) durs[i] += sobra / (durs.length - 1);
  }

  const planos = nombres.map((titulo, i) => ({
    id: nuevoId(), titulo, texto: "", dur: redondear(durs[i]),
    cam: movs[i % movs.length], tr: i === nombres.length - 1 ? "corte" : trans[i % trans.length], nota: "",
  }));
  // Ajusta el redondeo para que la suma sea exacta.
  const dif = redondear(total - planos.reduce((a, p) => a + p.dur, 0));
  planos[planos.length - 1].dur = redondear(planos[planos.length - 1].dur + dif);
  return planos;
}

export const duracionPlanos = (planos) => redondear(planos.reduce((a, p) => a + p.dur, 0));

export const tiempo = (s) => {
  const t = Math.max(0, s);
  const m = Math.floor(t / 60);
  const seg = t - m * 60;
  return `${m}:${seg < 10 ? "0" : ""}${seg.toFixed(1)}`;
};
