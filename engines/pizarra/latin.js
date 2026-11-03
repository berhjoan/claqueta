// Escritura en tiza de texto en español. Adaptado de lemo-opuscar/styles/chalkboard/demo/js/hand.js (MIT): solo la parte
// latina, con la fuente embebida para no hacer fetch en el render, y polilíneas suavizadas que conservan esquinas.
import { clamp } from "./lib.js";
import { Stroke, smoothKeepCorners } from "./chalk.js";
import EMS from "./ems-delight.js";
import { trazosDe } from "./glifos.js";

export function writeLatin(text, x, by, cap, clock, o = {}) {
  const F = EMS, k = cap / F.cap, out = [];
  const slant = o.slant ?? 0.1, wu = cap * (o.lw ?? 0.068);
  let X = x, t = clock;
  for (const ch of [...text]) {
    const g = F.G[ch];
    if (!g) throw new Error("la fuente no tiene: " + ch);        // el original se lo saltaba sin aviso
    trazosDe(ch).forEach((poly, pi) => {
      const raw = poly.map(([px, py]) => [X + (px + py * slant) * k, by - py * k]);
      const P = o.smooth === false ? raw : smoothKeepCorners(raw, o.corner ?? 62, 6);
      const st = new Stroke(P, { kind: "write", w: wu, color: o.color || "white", taper: 0.12, taperLen: 0.2, land: 0.6,
        wob: cap * 0.006, wav: cap * 1.4, skip: 0.15, press: o.press ?? 1, endSpecks: true, specks: 0.5, seed: (o.seed ?? 5) * 13 + out.length * 3.1, R: o.R });
      const d = clamp(0.025 + st.len / (cap * (o.lspeed ?? 40)), 0.025, 0.25);
      if (out.length) t += pi === 0 ? (o.aireLetra ?? 0.04) : 0.018;     // la mano se levanta entre letras; también se oye
      st.t0 = t; st.t1 = t + d; t += d; st.ch = ch; out.push(st);
    });
    X += g.adv * k * (o.ltrack ?? 1);
  }
  out.end = t; out.x = X;
  return out;
}
export const latinWidth = (text, cap) => { const k = cap / EMS.cap; return [...text].reduce((a, c) => a + (EMS.G[c]?.adv ?? 300) * k, 0); };
