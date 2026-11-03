// Letra de tiza para la claqueta y el monitor: EMS Delight dibujada como trazos SVG.
import { trazosDe, altoFuente } from "../engines/pizarra/glifos.js";
import EMS from "../engines/pizarra/ems-delight.js";

export const fuenteLista = () => true;
export const cargarFuente = () => Promise.resolve();

// Convierte texto en un SVG de trazos. `anchoLinea` se expresa en unidades de 100 de altura de mayúscula.
export function textoASvg(texto, { anchoLinea = 12, maxPorLinea = 14 } = {}) {
  const palabras = String(texto).trim().split(/\s+/);
  const lineas = [];
  let actual = "";
  for (const p of palabras) {
    if ((actual + " " + p).trim().length > maxPorLinea && actual) { lineas.push(actual); actual = p; }
    else actual = (actual + " " + p).trim();
  }
  if (actual) lineas.push(actual);
  let trazos = "", anchoMax = 0;
  const interlinea = 1120;
  lineas.forEach((linea, li) => {
    let x = 0;
    for (const ch of [...linea]) {
      const g = EMS.G[ch] ?? EMS.G["?"];
      for (const poly of trazosDe(ch)) {
        const d = poly.map(([px, py], i) => `${i ? "L" : "M"}${Math.round(x + px + py * 0.1)} ${Math.round(li * interlinea + altoFuente - py)}`).join("");
        trazos += `<path d="${d}"/>`;
      }
      x += g?.adv ?? 300;
    }
    anchoMax = Math.max(anchoMax, x);
  });
  const alto = lineas.length * interlinea + 260;
  const svg = `<svg class="tiza-svg" viewBox="-20 0 ${anchoMax + 80} ${alto}" fill="none" stroke="currentColor" stroke-width="${anchoLinea * 5}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${trazos}</svg>`;
  return { svg, ancho: anchoMax, alto, lineas: lineas.length };
}
