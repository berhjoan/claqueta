// Trazos de EMS Delight listos para escribir en español: barras más cortas y tildes minúsculas más cerca de la letra.
import EMS from "./ems-delight.js";

export const altoFuente = 820;

// Estas letras traen la barra más larga que sus trazos: en grande parece un tachón.
export const BARRA = { "A": [150, 462], "Á": [150, 462], "H": [145, 542], "E": [151, 441], "É": [151, 441], "F": [148, 422] };
// En la fuente las tildes minúsculas quedan muy altas sobre la letra.
export const ACENTO = { "á": 110, "é": 110, "í": 110, "ó": 110, "ú": 110, "ñ": 40 };

export function trazosDe(ch) {
  const g = EMS.G[ch];
  if (!g) return [];
  return g.paths.map((poly, i) => {
    if (i === 1 && BARRA[ch]) return [[BARRA[ch][0], poly[0][1]], [BARRA[ch][1], poly[1][1]]];
    if (i === 1 && ACENTO[ch]) return poly.map(([x, y]) => [x, y - ACENTO[ch]]);
    return poly;
  });
}
