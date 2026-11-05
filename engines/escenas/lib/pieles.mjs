// Una piel es un material con sus reglas: de qué está hecho el mundo, cómo entra lo que aparece, cómo se pasa de un plano a otro y cómo suena.
// La paleta sola no define un estilo: estas pieles se reconocen con cualquier color.
import { azar, f } from "./base.mjs";

const j = JSON.stringify;

// ── Cómo entra un elemento, en cada material. `t` es el segundo local de la escena.
export const ENTRADAS = {
  mascara: (s, t, o = {}) => `tl.fromTo(${j(s)},{yPercent:170},{yPercent:0,duration:${o.dur ?? 0.46},ease:"power4.out"},${f(t)});`,
  golpe: (s, t, o = {}) => `tl.fromTo(${j(s)},{scale:${o.desde ?? 1.34},autoAlpha:0},{scale:1,autoAlpha:1,duration:${o.dur ?? 0.2},ease:"expo.out"},${f(t)});`,
  pegar: (s, t, o = {}) => `tl.fromTo(${j(s)},{x:${o.x ?? 0},y:${o.y ?? 70},rotation:${f((o.r ?? 0) * 3.5 + (o.r >= 0 ? 4 : -4))},scale:1.14,autoAlpha:0},{x:0,y:0,rotation:${f(o.r ?? 0)},scale:1,autoAlpha:1,duration:${o.dur ?? 0.25},ease:"steps(3)"},${f(t)});`,
  teclear: (s, t, o = {}) => `tl.fromTo(${j(s)},{clipPath:"inset(-10% 100% -10% 0)"},{clipPath:"inset(-10% 0% -10% 0)",duration:${f(Math.max(0.16, (o.letras ?? 12) * 0.028))},ease:"steps(${Math.max(4, o.letras ?? 12)})"},${f(t)});`,
  bloque: (s, t, o = {}) => `tl.fromTo(${j(s)},{clipPath:"inset(-10% 100% -10% 0)"},{clipPath:"inset(-10% 0% -10% 0)",duration:${o.dur ?? 0.24},ease:"power3.out"},${f(t)});`,
  revelar: (s, t, o = {}) => `tl.fromTo(${j(s)},{autoAlpha:0,y:${o.y ?? 16}},{autoAlpha:1,y:0,duration:${o.dur ?? 0.7},ease:"power2.out"},${f(t)});`,
  cortar: (s, t) => `tl.set(${j(s)},{autoAlpha:0},0);tl.set(${j(s)},{autoAlpha:1},${f(Math.max(t, 0.001))});`,
};

const rejillaCss = `linear-gradient(color-mix(in srgb,var(--tinta) var(--r1),transparent) 2px,transparent 2px),linear-gradient(90deg,color-mix(in srgb,var(--tinta) var(--r1),transparent) 2px,transparent 2px),linear-gradient(color-mix(in srgb,var(--tinta) var(--r2),transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in srgb,var(--tinta) var(--r2),transparent) 1px,transparent 1px)`;

// Papel rasgado: un borde irregular con su alma blanca, como en una hoja de verdad.
export function rasgado(x, y, w, h, semilla, amp = 10) {
  const r = azar(semilla);
  const borde = (x0, y0, x1, y1, n) => {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, px = x0 + (x1 - x0) * u, py = y0 + (y1 - y0) * u;
      const nx = -(y1 - y0), ny = x1 - x0, l = Math.hypot(nx, ny) || 1, d = (r() - 0.5) * amp + (r() < 0.15 ? (r() - 0.5) * amp * 2 : 0);
      pts.push(`${f(px + (nx / l) * d, 1)},${f(py + (ny / l) * d, 1)}`);
    }
    return pts;
  };
  const paso = (l) => Math.max(4, Math.round(l / 26));
  return `M${[...borde(x, y, x + w, y, paso(w)), ...borde(x + w, y, x + w, y + h, paso(h)), ...borde(x + w, y + h, x, y + h, paso(w)), ...borde(x, y + h, x, y, paso(h))].join("L")}Z`;
}

// Una regla de progreso: ocupa la franja que tapa la app y dice cuánto falta. El mundo llega hasta el borde sin poner nada clave ahí.
function regla(c) {
  const { W, H, sub } = c.z;
  const y0 = sub.y2 + (c.z.es916 ? 70 : 14), alto = Math.min(H - y0 - 8, c.z.es916 ? 150 : 44);
  if (alto < 18) return "";
  const n = Math.round(W / 18);
  let d = "";
  for (let i = 0; i <= n; i++) {
    const largo = i % 10 === 0 ? alto : i % 5 === 0 ? alto * 0.62 : alto * 0.34;
    d += `M${f(i * 18, 1)} ${f(y0 + alto)}V${f(y0 + alto - largo, 1)}`;
  }
  const u0 = c.T0 / c.durTotal, u1 = c.T1 / c.durTotal;
  c.tl.push(`tl.fromTo(${j(`#${c.id}-aguja`)},{x:${f(u0 * W, 1)}},{x:${f(u1 * W, 1)},duration:${f(c.dur)},ease:"none"},0);`);
  return `<svg class="capa" data-layout-ignore viewBox="0 0 ${W} ${H}" style="z-index:1"><path d="${d}" stroke="var(--tinta)" stroke-opacity=".26" stroke-width="2.5" fill="none"/></svg><div id="${c.id}-aguja" class="aguja" data-layout-ignore style="top:${f(y0 - 14)}px;height:${f(alto + 14)}px"></div>`;
}

// Líneas de construcción: círculos y diagonales que cruzan el cuadro detrás del sujeto y se dibujan al abrir el plano.
function construccion(c) {
  const { W, H } = c.z, r = c.r;
  const cx = W * (0.2 + r() * 0.6), cy = H * (0.15 + r() * 0.4), R = Math.max(W, H) * (0.34 + r() * 0.22);
  const ang = r() * Math.PI, dx = Math.cos(ang) * Math.max(W, H) * 1.2, dy = Math.sin(ang) * Math.max(W, H) * 1.2;
  const id = `${c.id}-cons`;
  c.tl.push(`tl.fromTo(${j(`#${id} path`)},{strokeDashoffset:1},{strokeDashoffset:0,duration:1.1,ease:"power2.inOut",stagger:.14},0);`);
  return `<svg id="${id}" class="capa" data-layout-ignore viewBox="0 0 ${W} ${H}" fill="none" stroke="var(--acento)" stroke-opacity=".3" stroke-width="2.5"><path pathLength="1" stroke-dasharray="1" d="M${f(cx + R)} ${f(cy)}A${f(R)} ${f(R)} 0 1 1 ${f(cx - R)} ${f(cy)}A${f(R)} ${f(R)} 0 1 1 ${f(cx + R)} ${f(cy)}"/><path pathLength="1" stroke-dasharray="1" d="M${f(cx - dx)} ${f(cy - dy)}L${f(cx + dx)} ${f(cy + dy)}" stroke-opacity=".2"/><path pathLength="1" stroke-dasharray="1" d="M${f(cx + dy * 0.8)} ${f(cy - dx * 0.8)}L${f(cx - dy * 0.8)} ${f(cy + dx * 0.8)}" stroke-opacity=".14"/></svg>`;
}

export const PIELES = {
  // Plano técnico: mesa de dibujo con retícula. Lo que aparece se traza, se acota y se rellena.
  infografia: {
    nombre: "Plano técnico", tipografia: "marca", pesoDisplay: 800, track: -0.03, lh: 1.04, mayus: false, justifica: false,
    entrada: "mascara", transiciones: ["barrido", "persiana", "barrido", "corte", "inundar"], camaras: ["push", "deriva", "pull", "push"], acentoEnBloque: true,
    sonidos: { entra: "clic", cifra: "destello", trazo: "paso", golpe: "golpe", trans: "barrido", cierre: "campana" },
    suelo: (c) => c.pal.fondo, tintaEn: (c) => c.pal.tinta, acentoEn: (c) => c.pal.acento,
    mundo: (c) => `<div class="capa reticula" id="${c.id}-ret"></div><div class="capa luz"></div>${construccion(c)}${regla(c)}<div class="capa grano"></div>`,
    css: `.reticula{inset:-120px;--r1:9%;--r2:4.5%;background-image:${rejillaCss};background-size:200px 200px,200px 200px,40px 40px,40px 40px}
.luz{background:radial-gradient(120% 70% at 30% 28%,color-mix(in srgb,var(--superficie) 92%,var(--acento) 8%) 0%,transparent 72%)}
.aguja{position:absolute;left:0;width:8px;background:var(--acento);z-index:2}
.grano{background:url("grano.png");background-size:256px;opacity:.5;mix-blend-mode:overlay;pointer-events:none}`,
  },

  // Cartel: planos duros de color y letras enormes que chocan contra el borde. Sin cámara flotante: golpes.
  cartel: {
    nombre: "Cartel", tipografia: "cartel", pesoDisplay: 400, track: 0, lh: 0.92, mayus: true, justifica: true,
    entrada: "golpe", transiciones: ["persiana", "barrido", "corte", "barrido"], camaras: ["golpe", "fija", "golpe"], acentoEnBloque: true,
    sonidos: { entra: "golpe", cifra: "impacto", trazo: "chasquido", golpe: "impacto", trans: "barrido", cierre: "caida" },
    // El color del campo gira plano a plano; la tinta siempre contrasta con él.
    pares: (p) => [[p.fondo, p.tinta, p.acento], [p.acento, p.fondo, p.fondo], [p.tinta, p.fondo, p.segundo], [p.segundo, p.tinta, p.fondo]],
    suelo: (c) => PIELES.cartel.pares(c.pal)[c.i % 4][0], tintaEn: (c) => PIELES.cartel.pares(c.pal)[c.i % 4][1], acentoEn: (c) => PIELES.cartel.pares(c.pal)[c.i % 4][2],
    mundo: (c) => {
      const color = PIELES.cartel.tintaEn(c), { W, H } = c.z, r = c.r;
      const bandas = 5 + Math.floor(r() * 4), ang = (r() < 0.5 ? -1 : 1) * (9 + r() * 7);
      return `<div class="capa grano"></div><div class="capa rayas" style="--c:${color};--n:${f(H / bandas, 0)}px;transform:rotate(${f(ang)}deg) scale(1.5)"></div>`;
    },
    css: `.rayas{opacity:.07;background:repeating-linear-gradient(0deg,var(--c) 0 calc(var(--n) * .42),transparent calc(var(--n) * .42) var(--n))}
.grano{background:url("grano.png");background-size:256px;opacity:.35;mix-blend-mode:overlay}`,
  },

  // Collage: papel, cinta y recortes pegados a mano. Se mueve a saltos, como animación cuadro a cuadro.
  collage: {
    nombre: "Collage de papel", tipografia: "impacto", pesoDisplay: 400, track: -0.01, lh: 1.08, mayus: false, justifica: false,
    entrada: "pegar", transiciones: ["papel", "papel", "corte", "papel"], camaras: ["saltos", "saltos", "fija"], acentoEnBloque: true, chips: true,
    sonidos: { entra: "chasquido", cifra: "chasquido", trazo: "crujido", golpe: "chasquido", trans: "crujido", cierre: "campana" },
    suelo: (c) => c.pal.superficie, tintaEn: (c) => c.pal.tinta, acentoEn: (c) => c.pal.acento,
    mundo: (c) => {
      const { W, H } = c.z, r = c.r;
      const hojas = [];
      const colores = [c.pal.fondo, c.pal.segundo, c.pal.acento];
      const n = 4;
      for (let k = 0; k < n; k++) {
        const w = W * (0.62 + r() * 0.62), h = H * (0.24 + r() * 0.2), x = (k % 2 ? W * 0.42 : -W * 0.22) + r() * W * 0.2, y = H * ((k / n) * 0.98 - 0.06) + r() * H * 0.05, rot = (r() - 0.5) * 16, sem = Math.floor(r() * 1e6);
        const d = rasgado(0, 0, w, h, sem, 14), col = colores[(c.i + k) % 3];
        hojas.push(`<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)} ${f(w / 2)} ${f(h / 2)})"><path d="${d}" fill="#fff" fill-opacity=".85" transform="translate(-4 -5)"/><path d="${d}" fill="${col}"/></g>`);
      }
      const puntos = r() < 0.75 ? `<div class="capa semitono" style="--x:${f(r() * 100)}%;--y:${f(r() * 70)}%"></div>` : "";
      return `<svg class="capa" data-layout-ignore viewBox="0 0 ${W} ${H}" style="filter:drop-shadow(5px 9px 0 rgba(0,0,0,.28))">${hojas.join("")}</svg>${puntos}<div class="capa fibra"></div>`;
    },
    css: `.fibra{background:url("papel.png");background-size:512px;mix-blend-mode:multiply;opacity:.9;pointer-events:none}
.semitono{background-image:radial-gradient(var(--tinta) 3.4px,transparent 3.8px);background-size:16px 16px;opacity:.5;-webkit-mask-image:radial-gradient(44% 34% at var(--x) var(--y),#000 0%,transparent 100%);mask-image:radial-gradient(44% 34% at var(--x) var(--y),#000 0%,transparent 100%)}
.chip{display:inline-block;padding:.06em .2em .1em;margin:0 .02em;box-shadow:.05em .08em 0 rgba(0,0,0,.34)}
.cinta{position:absolute;width:150px;height:44px;background:color-mix(in srgb,var(--segundo) 55%,transparent);box-shadow:0 2px 4px rgba(0,0,0,.2)}`,
  },

  // Terminal: fósforo en una rejilla de caracteres. Todo se escribe; nada se desvanece.
  terminal: {
    nombre: "Terminal", tipografia: "terminal", pesoDisplay: 400, track: 0, lh: 1.08, mayus: false, justifica: false,
    entrada: "teclear", transiciones: ["falla", "corte", "falla", "corte"], camaras: ["fija", "push", "fija"], acentoEnBloque: true,
    sonidos: { entra: "tecla", cifra: "falla", trazo: "tecla", golpe: "falla", trans: "falla", cierre: "tecla" },
    suelo: (c) => c.pal.fondo, tintaEn: (c) => c.pal.tinta, acentoEn: (c) => c.pal.acento,
    mundo: (c) => {
      const r = c.r, filas = 26, col = 60, { W, H } = c.z;
      let lluvia = "";
      for (let y = 0; y < filas; y++) { let t = ""; for (let x = 0; x < col; x++) t += r() < 0.1 ? "01+:.".charAt(Math.floor(r() * 5)) : " "; lluvia += `${t}\n`; }
      return `<pre class="capa ruido" data-layout-ignore style="font-size:${f(H / filas / 1.04, 1)}px">${lluvia}</pre><div class="capa luz"></div>`;
    },
    css: `.ruido{color:var(--segundo);opacity:.2;font-family:var(--datos);line-height:1.04;overflow:hidden;margin:0}
.luz{background:radial-gradient(90% 60% at 50% 40%,color-mix(in srgb,var(--superficie) 90%,var(--tinta) 10%) 0%,transparent 75%)}
.crt{position:absolute;inset:0;z-index:50;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(0,0,0,.26) 0 2px,transparent 2px 5px);box-shadow:inset 0 0 180px rgba(0,0,0,.62)}`,
    capaFinal: `<div class="crt"></div>`,
  },

  // Noticiero: se entiende sin sonido. Bloques duros, cortes secos y la palabra clave sobre su bloque.
  noticia: {
    nombre: "Noticiero", tipografia: "impacto", pesoDisplay: 400, track: -0.01, lh: 1.02, mayus: false, justifica: false,
    entrada: "bloque", transiciones: ["corte", "barrido", "corte", "corte"], camaras: ["golpe", "fija", "push"], acentoEnBloque: true,
    sonidos: { entra: "clic", cifra: "golpe", trazo: "clic", golpe: "golpe", trans: "barrido", cierre: "caida" },
    suelo: (c) => c.pal.fondo, tintaEn: (c) => c.pal.tinta, acentoEn: (c) => c.pal.acento,
    mundo: (c) => {
      const { W, H } = c.z;
      c.tl.push(`tl.fromTo(${j(`#${c.id}-faja`)},{scaleX:0},{scaleX:1,duration:.3,ease:"power3.out"},0);`);
      const yBanda = c.z.sub.y2 + (c.z.es916 ? 44 : 10);
      c.tl.push(`tl.fromTo(${j(`#${c.id}-rayas`)},{backgroundPositionX:"0px"},{backgroundPositionX:"${f(c.dur * 60)}px",duration:${f(c.dur)},ease:"none"},0);`);
      return `<div class="capa campos"></div><div id="${c.id}-faja" class="faja" style="top:${f(H * (c.z.es916 ? 0.09 : 0.03))}px;width:${f(W * (0.26 + c.r() * 0.2))}px"></div><div class="banda" style="top:${f(yBanda)}px;height:${f(H - yBanda)}px"><div id="${c.id}-rayas" class="rayas-n"></div></div><div class="capa grano"></div>`;
    },
    css: `.campos{background:linear-gradient(180deg,var(--superficie) 0%,var(--fondo) 62%)}
.faja{position:absolute;left:0;height:22px;background:var(--acento);transform-origin:0 50%}
.banda{position:absolute;left:0;right:0;background:var(--superficie);border-top:8px solid var(--acento);overflow:hidden}
.rayas-n{position:absolute;left:0;right:0;top:0;height:30px;background:repeating-linear-gradient(-45deg,var(--acento) 0 18px,transparent 18px 36px);opacity:.34}
.grano{background:url("grano.png");background-size:256px;opacity:.4;mix-blend-mode:overlay}`,
  },

  // Archivo: mesa de luz con copias de papel. Cámara lenta, grano y fundidos largos.
  archivo: {
    nombre: "Archivo", tipografia: "editorial", pesoDisplay: 600, track: -0.015, lh: 1.08, mayus: false, justifica: false,
    entrada: "revelar", transiciones: ["papel", "corte", "papel"], camaras: ["push", "deriva", "pull"], acentoEnBloque: false,
    sonidos: { entra: "paso", cifra: "paso", trazo: "paso", golpe: "chasquido", trans: "crujido", cierre: "campana" },
    suelo: (c) => c.pal.superficie, tintaEn: (c) => c.pal.tinta, acentoEn: (c) => c.pal.acento,
    mundo: (c) => `<div class="capa mesa"></div><div class="capa fibra"></div><div class="capa vineta"></div><div class="capa grano"></div>`,
    css: `.mesa{background:radial-gradient(95% 70% at 42% 34%,color-mix(in srgb,var(--superficie) 72%,#fff 28%) 0%,var(--superficie) 58%,color-mix(in srgb,var(--superficie) 72%,#000 28%) 100%)}
.fibra{background:url("papel.png");background-size:512px;mix-blend-mode:multiply;opacity:.75}
.vineta{box-shadow:inset 0 0 240px rgba(0,0,0,.34)}
.grano{background:url("grano.png");background-size:256px;opacity:.55;mix-blend-mode:overlay}`,
  },
};

// Lo que comparten todas las pieles.
export const CSS_BASE = (z, pal, fam, pieles) => `*{margin:0;padding:0;box-sizing:border-box}
:root{--fondo:${pal.fondo};--tinta:${pal.tinta};--acento:${pal.acento};--segundo:${pal.segundo};--superficie:${pal.superficie};--display:"${fam.display}";--cuerpo:"${fam.cuerpo}";--datos:"${fam.datos}"}
html,body{width:${z.W}px;height:${z.H}px;overflow:hidden;background:var(--fondo)}
.escena{position:absolute;inset:0;width:${z.W}px;height:${z.H}px;overflow:hidden;font-family:var(--cuerpo);color:var(--tinta)}
.capa{position:absolute;inset:0}
.cam,.mundo,.info{position:absolute;inset:0}
.mundo{background:var(--suelo)}
.lin{position:absolute;white-space:nowrap;overflow:hidden;padding:.24em .1em .26em .03em;margin:-.24em -.1em -.26em -.03em;line-height:1}
.lin>span{display:inline-block}
.libre{position:absolute;white-space:nowrap;line-height:1}
.pal{display:inline-block}
.ac{position:relative;display:inline-block}
.ac>i{position:absolute;left:-.06em;right:-.06em;top:.03em;bottom:-.03em;background:var(--ac-f,var(--acento));transform-origin:0 50%}
.chip-num{display:inline-block}
.ac>b{position:relative;font-weight:inherit}
.regla{position:absolute;height:3px;background:currentColor;transform-origin:0 50%;opacity:.42}
.nodo{position:absolute;border-radius:50%;display:flex;align-items:center;justify-content:center;background:var(--nodo,var(--superficie));border:4px solid currentColor}
.nodo svg{width:58%;height:58%}
.riel{position:absolute;background:currentColor;opacity:.5;transform-origin:50% 0}
.ficha{position:absolute;display:flex;align-items:center;justify-content:center;white-space:nowrap;background:var(--nodo,var(--superficie));border:4px solid currentColor;border-radius:14px;line-height:1}
.barra{position:absolute;left:0;transform-origin:0 50%}
.foto{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.sub-g{position:absolute;left:0;right:0;display:flex;flex-direction:column;align-items:center;text-align:center}
.sub-l{display:inline-block;white-space:nowrap;font-family:var(--cuerpo);font-weight:600;line-height:1.14;color:var(--tinta)}
.sub-l{color:var(--sub-tinta,var(--tinta))}
.sub-caja .sub-l{background:color-mix(in srgb,var(--sub-fondo,var(--fondo)) 84%,transparent);padding:.1em .42em}
.sub-sombra .sub-l{text-shadow:0 2px 0 var(--sub-fondo,var(--fondo)),0 0 18px var(--sub-fondo,var(--fondo)),0 0 6px var(--sub-fondo,var(--fondo))}
.tr{position:absolute;left:0;top:0;width:100%;height:100%;will-change:transform}
${pieles.map(([k, p]) => (p.css ? `.piel-${k}{${p.css}}` : "")).join("\n")}`;
