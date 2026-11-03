// Reúne los departamentos del set y da acceso a sus opciones. Sin DOM: también corre en Node.
import { guion } from "../data/guion.js";
import { arte } from "../data/arte.js";
import { camara } from "../data/camara.js";
import { profundidad } from "../data/profundidad.js";
import { movimiento } from "../data/movimiento.js";
import { montaje } from "../data/montaje.js";
import { sonido } from "../data/sonido.js";
import { subtitulos } from "../data/subtitulos.js";
import { motor, entrega } from "../data/motor.js";

export const DEPTOS = [guion, arte, camara, profundidad, movimiento, montaje, sonido, subtitulos, motor, entrega];

const porId = Object.fromEntries(DEPTOS.map((d) => [d.id, d]));
export const depto = (id) => porId[id];

export function control(deptoId, k) {
  for (const g of porId[deptoId]?.grupos ?? []) {
    const c = g.controles.find((x) => x.k === k);
    if (c) return c;
  }
  return null;
}

export const opcion = (deptoId, k, id) => control(deptoId, k)?.opciones?.find((o) => o.id === id) ?? null;

export function valoresPorDefecto() {
  const v = {};
  for (const d of DEPTOS) {
    v[d.id] = {};
    for (const g of d.grupos) for (const c of g.controles) v[d.id][c.k] = structuredClone(c.def);
  }
  return v;
}

// Medidas de salida según formato. Devuelve ancho, alto y cuadros totales.
export function medidas(valores) {
  const f = opcion("entrega", "formato", valores.entrega.formato) ?? { w: 1080, h: 1920 };
  const fps = Number(valores.entrega.fps) || 30;
  const seg = Number(valores.entrega.duracion) || 60;
  return { w: f.w, h: f.h, fps, seg, cuadros: Math.round(fps * seg) };
}
