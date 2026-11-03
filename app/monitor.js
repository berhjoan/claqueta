// Monitor: previsualización en vivo. Dibuja cada plano con DOM, SVG y CSS 3D según lo elegido.
// Es una guía de dirección: muestra cámara, profundidad, ritmo y paso entre planos, no el acabado final del estilo.
import { opcion } from "./catalogo.js";
import { medidas } from "./catalogo.js";
import { paletaActual } from "./prompt.js";
import { textoASvg, cargarFuente, fuenteLista } from "./tiza.js";

const sat = (x) => Math.max(0, Math.min(1, x));
const mezcla = (a, b, u) => a + (b - a) * u;
const CURVAS = {
  inOut: (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
  out: (u) => 1 - Math.pow(1 - u, 3),
  in: (u) => u * u * u,
  expoOut: (u) => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * u)),
  linear: (u) => u,
  linearSoft: (u) => u * 0.9 + 0.1 * (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2),
  exp: (u) => (Math.pow(5, u) - 1) / 4,
};
const ruido = (t, s) => { const f = Math.sin(t * 2.1 + s) + 0.5 * Math.sin(t * 4.7 + s * 2.3) + 0.25 * Math.sin(t * 9.1 + s * 1.7); return f / 1.75; };
const azar = (s) => { let a = (s * 2654435761) >>> 0 || 1; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

export function camaraEn(mov, t, dur, intensidad = 1) {
  const c = mov?.cam ?? { from: {}, to: {} };
  const claves = ["x", "y", "z", "rx", "ry", "rz"];
  const r = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1, blur: 0, vertigo: false, rack: 0 };
  const curva = CURVAS[c.ease] ?? CURVAS.inOut;
  if (c.keys) {
    const u = sat(t / dur);
    let i = 0;
    while (i < c.keys.length - 2 && u >= c.keys[i + 1].t) i++;
    const a = c.keys[i], b = c.keys[i + 1], e = curva(sat((u - a.t) / Math.max(1e-3, b.t - a.t)));
    for (const k of claves) r[k] = mezcla(a[k] ?? 0, b[k] ?? 0, e) * intensidad;
  } else {
    const d = c.dur ? Math.min(c.dur, dur) : dur;
    const e = curva(sat(t / d));
    const de = c.from ?? {}, a = c.to ?? {};
    for (const k of claves) r[k] = mezcla(de[k] ?? 0, a[k] ?? 0, e) * intensidad;
    const s0 = de.s ?? 1, s1 = a.s ?? 1;
    r.s = 1 + (mezcla(s0, s1, e) - 1) * intensidad;
    if (c.blur) r.blur = c.blur * Math.sin(Math.PI * sat(e)) * intensidad;
    if (c.vertigo) r.vertigo = true;
    if (c.rack) r.rack = CURVAS.inOut(sat((t / dur - 0.35) / 0.3));
    if (c.shake) { const a2 = c.shake * intensidad; r.x += ruido(t * 1.6, 1) * a2; r.y += ruido(t * 1.3, 4) * a2; r.rz += ruido(t, 7) * a2 * 0.5; }
  }
  return r;
}

// ---- Dibujos por lenguaje de formas. Cada uno devuelve capas: fondo, medio y frente.
function formas(id, W, H, sem) {
  const R = azar(sem + 3), cx = W / 2, cy = H * 0.55, u = Math.min(W, H);
  const f = (x) => Math.round(x);
  const trazo = (d, ancho, color, retraso) => `<path class="tz" data-d="${retraso}" pathLength="1" d="${d}" fill="none" stroke="var(${color})" stroke-width="${ancho}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const el = (s, d) => s.replace(/^<(\w+)/, `<$1 class="en" data-d="${d}"`);
  const rejilla = (paso, op) => { let s = ""; for (let x = paso / 2; x < W; x += paso) s += `<path d="M${f(x)} 0V${H}"/>`; for (let y = paso / 2; y < H; y += paso) s += `<path d="M0 ${f(y)}H${W}"/>`; return `<g stroke="var(--m-segundo)" stroke-opacity="${op}" stroke-width="1.5" fill="none">${s}</g>`; };
  switch (id) {
    case "trazos": return {
      fondo: "",
      medio: trazo(`M${f(cx - u * 0.33)} ${f(cy + u * 0.1)} C${f(cx - u * 0.1)} ${f(cy - u * 0.25)} ${f(cx + u * 0.1)} ${f(cy + u * 0.32)} ${f(cx + u * 0.34)} ${f(cy - u * 0.04)}`, u * 0.016, "--m-tinta", 0.1)
        + trazo(`M${f(cx + u * 0.34)} ${f(cy - u * 0.04)} l-${f(u * 0.07)} ${f(u * 0.005)} M${f(cx + u * 0.34)} ${f(cy - u * 0.04)} l-${f(u * 0.02)} ${f(u * 0.075)}`, u * 0.016, "--m-tinta", 0.5)
        + trazo(`M${f(cx - u * 0.3)} ${f(cy + u * 0.3)} q${f(u * 0.3)} -${f(u * 0.05)} ${f(u * 0.6)} 0`, u * 0.02, "--m-acento", 0.7),
      frente: "" };
    case "geometria": return {
      fondo: rejilla(u * 0.12, 0.28),
      medio: el(`<circle cx="${f(cx - u * 0.17)}" cy="${f(cy - u * 0.1)}" r="${f(u * 0.2)}" fill="var(--m-acento)"/>`, 0.1)
        + el(`<path d="M${f(cx + u * 0.06)} ${f(cy + u * 0.3)} l${f(u * 0.2)} -${f(u * 0.36)} l${f(u * 0.2)} ${f(u * 0.36)} z" fill="var(--m-segundo)"/>`, 0.35)
        + el(`<rect x="${f(cx - u * 0.38)}" y="${f(cy + u * 0.16)}" width="${f(u * 0.3)}" height="${f(u * 0.3)}" fill="none" stroke="var(--m-tinta)" stroke-width="${f(u * 0.012)}"/>`, 0.55),
      frente: "" };
    case "objetos": return {
      fondo: `<rect x="0" y="${f(H * 0.72)}" width="${W}" height="${f(H * 0.28)}" fill="var(--m-superficie)"/>`,
      medio: el(`<g><rect x="${f(cx - u * 0.3)}" y="${f(cy - u * 0.3)}" width="${f(u * 0.6)}" height="${f(u * 0.46)}" rx="${f(u * 0.02)}" fill="var(--m-superficie)" stroke="var(--m-segundo)" stroke-width="${f(u * 0.01)}"/><rect x="${f(cx - u * 0.26)}" y="${f(cy - u * 0.26)}" width="${f(u * 0.52)}" height="${f(u * 0.3)}" fill="var(--m-fondo)"/><path d="M${f(cx - u * 0.2)} ${f(cy - u * 0.16)}h${f(u * 0.3)}M${f(cx - u * 0.2)} ${f(cy - u * 0.09)}h${f(u * 0.2)}" stroke="var(--m-acento)" stroke-width="${f(u * 0.016)}"/><rect x="${f(cx - u * 0.05)}" y="${f(cy + u * 0.16)}" width="${f(u * 0.1)}" height="${f(u * 0.1)}" fill="var(--m-segundo)"/><rect x="${f(cx - u * 0.18)}" y="${f(cy + u * 0.26)}" width="${f(u * 0.36)}" height="${f(u * 0.03)}" fill="var(--m-segundo)"/></g>`, 0.1),
      frente: el(`<circle cx="${f(cx + u * 0.36)}" cy="${f(cy + u * 0.3)}" r="${f(u * 0.08)}" fill="var(--m-acento)"/>`, 0.6) };
    case "tarjetas": return {
      fondo: "",
      medio: el(`<g><rect x="${f(W * 0.07)}" y="${f(cy - u * 0.34)}" width="${f(W * 0.86)}" height="${f(u * 0.42)}" rx="${f(u * 0.012)}" fill="var(--m-superficie)" stroke="var(--m-segundo)" stroke-width="3"/><path d="M${f(W * 0.13)} ${f(cy - u * 0.24)}h${f(W * 0.5)}M${f(W * 0.13)} ${f(cy - u * 0.15)}h${f(W * 0.66)}M${f(W * 0.13)} ${f(cy - u * 0.06)}h${f(W * 0.34)}" stroke="var(--m-tinta)" stroke-opacity=".75" stroke-width="${f(u * 0.018)}"/></g>`, 0.1)
        + el(`<rect x="${f(W * 0.07)}" y="${f(cy + u * 0.12)}" width="${f(W * 0.86)}" height="${f(u * 0.2)}" rx="${f(u * 0.012)}" fill="var(--m-acento)"/>`, 0.45),
      frente: "" };
    case "tipo": return { fondo: `<text x="${f(cx)}" y="${f(cy + u * 0.32)}" text-anchor="middle" font-family="var(--m-fuente)" font-weight="800" font-size="${f(u * 1.05)}" fill="var(--m-superficie)">Aa</text>`, medio: "", frente: "" };
    case "tecnicas": { let pl = ""; for (let i = 0; i < 4; i++) pl += `<path class="tz" data-d="${0.1 + i * 0.15}" pathLength="1" d="M${f(cx - u * 0.34)} ${f(cy - u * 0.16 + i * u * 0.13)} l${f(u * 0.34)} -${f(u * 0.13)} l${f(u * 0.34)} ${f(u * 0.13)} l-${f(u * 0.34)} ${f(u * 0.13)} z" fill="none" stroke="var(--m-tinta)" stroke-width="3"/>`; return { fondo: rejilla(u * 0.08, 0.34), medio: pl + trazo(`M${f(cx + u * 0.42)} ${f(cy - u * 0.3)} v${f(u * 0.68)}`, 3, "--m-acento", 0.75), frente: "" }; }
    case "recortes": return {
      fondo: "",
      medio: el(`<path d="M${f(W * 0.08)} ${f(cy - u * 0.2)} l${f(W * 0.2)} -${f(u * 0.03)} l${f(W * 0.2)} ${f(u * 0.022)} l${f(W * 0.2)} -${f(u * 0.03)} l${f(W * 0.24)} ${f(u * 0.03)} l-${f(W * 0.02)} ${f(u * 0.3)} l-${f(W * 0.22)} ${f(u * 0.02)} l-${f(W * 0.2)} -${f(u * 0.025)} l-${f(W * 0.22)} ${f(u * 0.02)} z" fill="var(--m-tinta)"/>`, 0.1)
        + el(`<path d="M${f(W * 0.2)} ${f(cy + u * 0.2)} l${f(W * 0.32)} -${f(u * 0.03)} l${f(W * 0.32)} ${f(u * 0.03)} l-${f(W * 0.03)} ${f(u * 0.22)} l-${f(W * 0.3)} ${f(u * 0.02)} l-${f(W * 0.29)} -${f(u * 0.02)} z" fill="var(--m-acento)"/>`, 0.4)
        + el(`<rect x="${f(W * 0.12)}" y="${f(cy - u * 0.28)}" width="${f(W * 0.2)}" height="${f(u * 0.05)}" fill="var(--m-segundo)" fill-opacity=".8" transform="rotate(-8 ${f(W * 0.2)} ${f(cy - u * 0.26)})"/>`, 0.6),
      frente: "" };
    case "campos": { let p = ""; for (let i = 0; i < 170; i++) { const a = R() * 6.283, r = u * (0.12 + 0.2 * Math.sqrt(R())); p += `<circle cx="${f(cx + Math.cos(a) * r)}" cy="${f(cy + Math.sin(a) * r)}" r="${f(u * (0.003 + R() * 0.006))}" fill="var(${i % 9 ? "--m-tinta" : "--m-acento"})" fill-opacity="${(0.4 + R() * 0.6).toFixed(2)}"/>`; } return { fondo: "", medio: el(`<g>${p}</g>`, 0.1), frente: "" }; }
    case "bloques": { const cubo = (x, y, a, col, d) => el(`<g><path d="M${f(x)} ${f(y)} l${f(a)} -${f(a * 0.5)} l${f(a)} ${f(a * 0.5)} l-${f(a)} ${f(a * 0.5)} z" fill="var(${col})"/><path d="M${f(x)} ${f(y)} v${f(a)} l${f(a)} ${f(a * 0.5)} v-${f(a)} z" fill="var(--m-segundo)"/><path d="M${f(x + a)} ${f(y + a * 0.5)} v${f(a)} l${f(a)} -${f(a * 0.5)} v-${f(a)} z" fill="var(--m-superficie)"/></g>`, d); const a = u * 0.17; return { fondo: "", medio: cubo(cx - a, cy + a * 0.4, a, "--m-tinta", 0.1) + cubo(cx - 2 * a, cy + a * 0.9, a, "--m-tinta", 0.3) + cubo(cx, cy + a * 0.9, a, "--m-tinta", 0.45) + cubo(cx - a, cy - a * 0.6, a, "--m-acento", 0.7), frente: "" }; }
    default: { // diagrama
      const nodos = [[cx - u * 0.26, cy - u * 0.2], [cx + u * 0.26, cy - u * 0.2], [cx, cy + u * 0.06], [cx - u * 0.26, cy + u * 0.32], [cx + u * 0.26, cy + u * 0.32]];
      const con = [[0, 2], [1, 2], [2, 3], [2, 4]].map(([a, b], i) => trazo(`M${f(nodos[a][0])} ${f(nodos[a][1])} L${f(nodos[b][0])} ${f(nodos[b][1])}`, u * 0.008, "--m-segundo", 0.15 + i * 0.12)).join("");
      const puntos = nodos.map(([x, y], i) => el(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(u * 0.075)}" fill="var(${i === 2 ? "--m-acento" : "--m-superficie"})" stroke="var(--m-tinta)" stroke-width="${f(u * 0.007)}"/>`, 0.05 + i * 0.12)).join("");
      return { fondo: "", medio: con + puntos, frente: "" };
    }
  }
}

function capaSvg(contenido, W, H) {
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${contenido}</svg>`;
}

const CARACTERES = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ0123456789";
// El texto viene de la persona o de un enlace compartido: nunca entra sin escapar.
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export class Monitor {
  constructor(raiz, alMover) {
    this.raiz = raiz;
    this.alMover = alMover;
    this.t = 0;
    this.corriendo = false;
    this.bucle = false;
    this.indice = -1;
    this.prueba = null;
    this.a = this.crearRanura();
    this.b = this.crearRanura();
    this.raf = this.raf.bind(this);
    this.muestra = document.createElement("img");
    this.muestra.className = "m-muestra";
    this.muestra.alt = "";
    this.muestra.hidden = true;
    this.raiz.append(this.a.el, this.b.el, this.muestra);
  }

  crearRanura() {
    const el = document.createElement("div");
    el.className = "m-ranura";
    el.innerHTML = '<div class="m-mundo"></div><div class="m-sub"></div>';
    return { el, mundo: el.firstChild, sub: el.lastChild, plano: -1 };
  }

  configurar(estado) {
    this.estado = estado;
    const v = estado.valores, m = medidas(v);
    this.medidas = m;
    const pal = paletaActual(v);
    const st = this.raiz.style;
    st.setProperty("--m-fondo", pal.fondo); st.setProperty("--m-tinta", pal.tinta); st.setProperty("--m-acento", pal.acento);
    st.setProperty("--m-segundo", pal.segundo); st.setProperty("--m-superficie", pal.superficie);
    const tipo = opcion("arte", "tipografia", v.arte.tipografia);
    st.setProperty("--m-fuente", tipo?.cond ? "'Bebas Neue', Sora" : `'${tipo?.display ?? "Sora"}', ${tipo?.css ?? "Sora"}`);
    st.setProperty("--m-peso", tipo?.peso ?? 700);
    st.setProperty("--m-tam", `${v.arte.tamano}cqh`);
    st.setProperty("--m-caja", { mayusculas: "uppercase", minusculas: "lowercase" }[v.arte.caja] ?? "none");
    st.aspectRatio = `${m.w} / ${m.h}`;
    const vistaTiza = tipo?.tiza || (v.movimiento.texto ?? []).includes("mano");
    if (vistaTiza && !fuenteLista()) cargarFuente().then(() => { this.a.plano = -1; this.b.plano = -1; this.dibujar(); });
    this.a.plano = -1; this.b.plano = -1;
    this.limites = [];
    let acum = 0;
    for (const p of estado.planos) { this.limites.push([acum, acum + p.dur]); acum += p.dur; }
    this.total = acum;
    if (this.t > this.total) this.t = 0;
    this.dibujar();
  }

  armar(ranura, i) {
    const v = this.estado.valores, p = this.estado.planos[i], { w: W, h: H } = this.medidas;
    const modo = opcion("profundidad", "modo", v.profundidad.modo)?.esc ?? { capas: 1, sep: 0 };
    const listaFormas = v.arte.formas?.length ? v.arte.formas : ["diagrama"];
    const dib = formas(listaFormas[i % listaFormas.length], W, H, i + 1);
    const titulo = (p.texto ?? "").trim() || (i === 0 && (v.guion.titulo ?? "").trim()) || p.titulo;
    const sep = v.profundidad.modo === "plano" ? 0 : (modo.sep ?? 80) * (v.profundidad.capas / 4);
    const blur = opcion("profundidad", "foco", v.profundidad.foco)?.blur ?? 0;
    const lente = opcion("camara", "lente", v.camara.lente)?.persp ?? 900;
    ranura.persp = lente;
    const textos = v.movimiento.texto?.length ? v.movimiento.texto : ["mascara"];
    const tipoTexto = textos[i % textos.length];
    const esTiza = (tipoTexto === "mano" || opcion("arte", "tipografia", v.arte.tipografia)?.tiza) && fuenteLista();
    ranura.tipoTexto = esTiza ? "mano" : tipoTexto;
    ranura.foco = blur; ranura.sep = sep;
    ranura.mundo.className = `m-mundo${modo.iso ? " iso" : ""}`;
    const zF = -sep * 2, zM = -sep * 0.3, zT = 0, zA = sep * 1.2;
    const compensa = (z) => (lente - z * 0.3) / lente;
    ranura.mundo.innerHTML = `
      <div class="m-capa" data-z="${zF}" style="transform:translateZ(${zF}px) scale(${(1.15 * (lente - zF) / lente).toFixed(3)});${blur ? `filter:blur(${blur}px)` : ""}">${capaSvg(dib.fondo, W, H)}</div>
      <div class="m-capa" data-z="${zM}" style="transform:translateZ(${zM}px) scale(${compensa(zM).toFixed(3)})">${capaSvg(dib.medio, W, H)}</div>
      <div class="m-capa m-texto" data-z="${zT}" style="transform:translateZ(${zT}px)"><div class="m-letrero"></div></div>
      <div class="m-capa" data-z="${zA}" style="transform:translateZ(${zA}px) scale(${compensa(zA).toFixed(3)});${blur ? `filter:blur(${Math.round(blur * 0.7)}px)` : ""}">${capaSvg(dib.frente, W, H)}</div>`;
    ranura.letrero = ranura.mundo.querySelector(".m-letrero");
    ranura.capas = [...ranura.mundo.querySelectorAll(".m-capa")];
    ranura.anim = [...ranura.mundo.querySelectorAll("[data-d]")];
    this.prepararTexto(ranura, titulo);
    this.prepararSub(ranura, titulo);
    ranura.plano = i;
  }

  prepararTexto(r, texto) {
    r.texto = texto;
    const pal = texto.split(/\s+/);
    if (r.tipoTexto === "mano" && fuenteLista()) {
      const { svg } = textoASvg(texto, { anchoLinea: 15 });
      r.letrero.innerHTML = `<div class="m-tiza">${svg}</div>`;
      r.trazos = [...r.letrero.querySelectorAll("path")];
      r.trazos.forEach((t) => { t.setAttribute("pathLength", "1"); t.style.strokeDasharray = "1"; t.style.strokeDashoffset = "1"; });
      return;
    }
    if (["letra", "maquina", "laminas", "descifrar"].includes(r.tipoTexto)) {
      r.letrero.innerHTML = `<span class="m-frase">${[...texto].map((c) => `<span class="m-l">${c === " " ? "&nbsp;" : esc(c)}</span>`).join("")}</span>`;
    } else {
      r.letrero.innerHTML = `<span class="m-frase">${pal.map((w) => `<span class="m-p">${esc(w)}</span>`).join(" ")}</span>`;
    }
    r.unidades = [...r.letrero.querySelectorAll(".m-p, .m-l")];
    r.frase = r.letrero.querySelector(".m-frase");
  }

  prepararSub(r, texto) {
    const v = this.estado.valores;
    r.sub.className = "m-sub";
    r.sub.innerHTML = "";
    r.subPal = [];
    if (!v.subtitulos.activos || v.subtitulos.estilo === "mundo") return;
    const est = opcion("subtitulos", "estilo", v.subtitulos.estilo)?.sub ?? "activa";
    const pos = v.subtitulos.posicion;
    r.sub.classList.add(`e-${est}`, `p-${pos}`);
    const pal = texto.split(/\s+/).slice(0, 6);
    r.sub.innerHTML = `<span>${pal.map((w) => `<i>${esc(w)}</i>`).join(" ")}</span>`;
    r.subPal = [...r.sub.querySelectorAll("i")];
  }

  animarTexto(r, t) {
    const velocidad = (this.estado.valores.movimiento.velocidad ?? 450) / 450;
    const f = (x) => x / velocidad;
    if (r.tipoTexto === "mano" && r.trazos) {
      const n = r.trazos.length, porTrazo = f(0.1);
      r.trazos.forEach((p, i) => { p.style.strokeDashoffset = String(1 - sat((t - i * porTrazo * 0.8) / porTrazo)); });
      return;
    }
    const u = r.unidades ?? [];
    const frase = r.frase;
    if (!frase) return;
    frase.style.cssText = "";
    switch (r.tipoTexto) {
      case "desenfoque": u.forEach((e, i) => { const p = sat((t - i * 0.067) / 0.13); e.style.opacity = p; e.style.filter = `blur(${(1 - p) * 6}px)`; }); break;
      case "palabra": u.forEach((e, i) => { const p = CURVAS.expoOut(sat((t - i * 0.12) / f(0.35))); e.style.opacity = p; e.style.transform = `translateY(${(1 - p) * 26}%)`; }); break;
      case "letra": u.forEach((e, i) => { const p = sat((t - i * 0.033) / 0.1); e.style.opacity = 0.2 + 0.8 * p; }); break;
      case "maquina": { const n = Math.floor(t / 0.04); u.forEach((e, i) => { e.style.opacity = i < n ? 1 : 0; e.classList.toggle("cursor", i === Math.min(n, u.length - 1)); }); break; }
      case "laminas": u.forEach((e, i) => { const fin = 0.05 * i + 0.34; const o = e.dataset.o ?? (e.dataset.o = e.textContent); e.textContent = t >= fin || o.trim() === "" ? o : CARACTERES[Math.floor((t * 22 + i * 7)) % CARACTERES.length]; }); break;
      case "descifrar": u.forEach((e, i) => { const fin = 0.03 * i + 0.25; const o = e.dataset.o ?? (e.dataset.o = e.textContent); e.textContent = t >= fin || o.trim() === "" ? o : CARACTERES[Math.floor((t * 30 + i * 11)) % CARACTERES.length]; e.style.opacity = t < 0.02 ? 0 : 1; }); break;
      case "impacto": { const p = CURVAS.expoOut(sat(t / f(0.3))); frase.style.transform = `scale(${1.4 - 0.4 * p})`; frase.style.opacity = sat(t / 0.08); break; }
      case "variable": { const p = CURVAS.inOut(sat(t / f(0.7))); frase.style.fontWeight = Math.round(200 + 600 * p); frase.style.opacity = sat(t / 0.1); break; }
      case "cambio": u.forEach((e, i) => { e.style.opacity = t >= i * 0.16 ? 1 : 0; }); break;
      default: { const p = CURVAS.expoOut(sat(t / f(0.3))); frase.style.clipPath = `inset(0 0 ${(1 - p) * 100}% 0)`; frase.style.transform = `translateY(${(1 - p) * 42}%)`; } // máscara
    }
  }

  animarElementos(r, t) {
    const v = (this.estado.valores.movimiento.velocidad ?? 450) / 1000;
    for (const e of r.anim) {
      const p = CURVAS.expoOut(sat((t - Number(e.dataset.d) * 1.1) / Math.max(0.15, v * 1.1)));
      if (e.classList.contains("tz")) { e.style.strokeDasharray = "1"; e.style.strokeDashoffset = String(1 - p); }
      else { e.style.opacity = p; e.style.transformBox = "fill-box"; e.style.transformOrigin = "center"; e.style.transform = `scale(${0.86 + 0.14 * p})`; }
    }
  }

  aplicarCamara(r, cam, dur, t) {
    const k = this.raiz.clientWidth / 360 || 1;
    const q = camaraEn(cam, t, dur, (this.estado.valores.camara.intensidad ?? 100) / 100);
    const perspBase = (r.persp ?? 900) * k;
    r.el.style.perspective = `${q.vertigo ? perspBase * (1 + (q.z * -1) / 300) : perspBase}px`;
    const base = r.mundo.classList.contains("iso") ? " rotateX(52deg) rotateZ(-28deg) scale(.82)" : "";
    r.mundo.style.transform = `translate3d(${q.x}%,${q.y}%,${q.z * k}px) rotateX(${q.rx}deg) rotateY(${q.ry}deg) rotateZ(${q.rz}deg) scale(${q.s})${base}`;
    r.mundo.style.filter = q.blur > 0.3 ? `blur(${q.blur.toFixed(1)}px)` : "";
    if (cam?.cam?.rack && r.capas) {
      const b = 10 * k * 0.5;
      r.capas[0].style.filter = `blur(${(b * q.rack).toFixed(1)}px)`;
      r.capas[3].style.filter = `blur(${(b * (1 - q.rack)).toFixed(1)}px)`;
    }
  }

  dibujarPlano(r, i, tLocal) {
    if (r.plano !== i) this.armar(r, i);
    const p = this.estado.planos[i];
    const camId = this.prueba?.tipo === "camara" ? this.prueba.id : p.cam;
    this.aplicarCamara(r, opcion("camara", "movs", camId), p.dur, tLocal);
    this.animarElementos(r, tLocal);
    this.animarTexto(r, tLocal);
    const n = r.subPal?.length ?? 0;
    if (n) {
      const activa = Math.min(n - 1, Math.floor((tLocal / Math.max(0.5, p.dur)) * n));
      r.subPal.forEach((w, j) => { w.classList.toggle("on", j === activa); w.classList.toggle("ya", j < activa); });
    }
  }

  // Paso entre planos: `u` va de 0 a 1 y `a`, `b` son las ranuras de salida y entrada.
  paso(tipo, u, a, b) {
    const A = a.el.style, B = b.el.style;
    A.cssText = B.cssText = "";
    a.el.hidden = false; b.el.hidden = false;
    const fuera = CURVAS.in(u), dentro = CURVAS.out(u), ambos = CURVAS.inOut(u);
    switch (tipo) {
      case "corte": b.el.hidden = u < 0.5; a.el.hidden = u >= 0.5; break;
      case "disolver": B.opacity = ambos; break;
      case "blur": A.filter = `blur(${fuera * 8}px)`; A.opacity = 1 - sat(u * 2); B.opacity = sat(u * 2 - 0.6); B.filter = `blur(${(1 - dentro) * 8}px)`; break;
      case "empuje": A.transform = `translateX(${-100 * fuera}%)`; B.transform = `translateX(${100 * (1 - dentro)}%)`; break;
      case "latigo": A.transform = `translateX(${-120 * fuera}%)`; A.filter = `blur(${fuera * 16}px)`; B.transform = `translateX(${120 * (1 - dentro)}%)`; B.filter = `blur(${(1 - dentro) * 12}px)`; break;
      case "zoom": A.transform = `scale(${1 + 1.6 * fuera})`; A.filter = `blur(${fuera * 14}px)`; A.opacity = 1 - sat((u - 0.45) * 2.6); B.transform = `scale(${0.7 + 0.3 * dentro})`; B.opacity = sat((u - 0.35) * 2.5); break;
      case "zoominv": A.transform = `scale(${1 - 0.5 * fuera})`; A.opacity = 1 - sat((u - 0.4) * 2.2); B.transform = `scale(${1.7 - 0.7 * dentro})`; B.filter = `blur(${(1 - dentro) * 10}px)`; B.opacity = sat(u * 2.4); break;
      case "objeto": { const r = 4 + ambos * 96; B.clipPath = `inset(${50 - r / 2}% ${50 - r / 2}% ${50 - r / 2}% ${50 - r / 2}% round ${(1 - ambos) * 30}px)`; A.filter = `blur(${fuera * 12}px)`; break; }
      case "iris": B.clipPath = `circle(${dentro * 120}% at 50% 55%)`; break;
      case "cortinilla": B.clipPath = `inset(0 ${(1 - ambos) * 100}% 0 0)`; break;
      case "inundar": { const col = u < 0.5 ? 1 : 0; a.el.hidden = u >= 0.5; b.el.hidden = u < 0.5; this.raiz.style.setProperty("--m-velo", String(1 - Math.abs(u - 0.5) * 2)); break; }
      case "morph": A.transform = `scaleX(${1 + 0.5 * fuera})`; A.opacity = 1 - u; B.transform = `scaleX(${1.5 - 0.5 * dentro})`; B.filter = `blur(${(1 - dentro) * 6}px)`; B.opacity = u; break;
      case "cascada": { const bandas = 6, cuts = []; for (let i = 0; i < bandas; i++) { const y0 = (i / bandas) * 100, y1 = ((i + 1) / bandas) * 100, x = 100 * sat(u * 1.8 - i * 0.14); cuts.push(`0% ${y0}%, ${x}% ${y0}%, ${x}% ${y1}%, 0% ${y1}%`); } B.clipPath = `polygon(evenodd, ${cuts.join(", ")})`; break; }
      case "oscuro": A.filter = `brightness(${1 - sat(u * 3) * 0.6})`; b.el.hidden = u < 0.6; a.el.hidden = u >= 0.6; break;
      case "shader": { const s = Math.sin(Math.PI * u); A.filter = `blur(${s * 4}px) contrast(${1 + s})`; A.transform = `scale(${1 + s * 0.2}) skewX(${s * 6}deg)`; A.opacity = 1 - sat(u * 2 - 0.5); B.opacity = sat(u * 2 - 0.5); B.transform = `scale(${1.2 - 0.2 * u})`; break; }
      case "glitch": { const n = Math.floor(u * 9); const on = n % 2; A.transform = `translateX(${on ? 5 : -4}%)`; A.filter = `hue-rotate(${on ? 40 : -30}deg)`; b.el.hidden = u < 0.5; a.el.hidden = u >= 0.5; B.transform = `translateX(${on ? -3 : 3}%)`; break; }
      default: B.opacity = ambos;
    }
  }

  dibujar() {
    if (!this.estado || !this.limites.length) return;
    const pl = this.estado.planos, t = sat(this.t / this.total) * this.total;
    let i = this.limites.findIndex(([a, b]) => t >= a && t < b);
    if (i < 0) i = pl.length - 1;
    const [ini, fin] = this.limites[i];
    // El reloj de cada plano arranca cuando empieza su transición de entrada, para que nada salte al cambiar de plano.
    const entrada = (k) => (k > 0 ? Math.min(this.estado.valores.montaje.tr_dur ?? 0.5, pl[k - 1].dur * 0.45) : 0);
    const dur = pl[i].dur, local = t - ini + entrada(i);
    const trDur = entrada(i + 1 < pl.length ? i + 1 : 0) || Math.min(this.estado.valores.montaje.tr_dur ?? 0.5, dur * 0.45);
    const trId = this.prueba?.tipo === "transicion" ? this.prueba.id : pl[i].tr;
    const en = i < pl.length - 1 && t > fin - trDur;
    this.raiz.style.setProperty("--m-velo", "0");
    this.indice = i;
    this.dibujarPlano(this.a, i, local);
    if (en) {
      const sig = i + 1;
      this.dibujarPlano(this.b, sig, t - (fin - trDur));
      const tr = opcion("montaje", "transiciones", trId);
      this.paso(tr?.tr ?? "corte", sat((t - (fin - trDur)) / trDur), this.a, this.b);
    } else {
      this.a.el.style.cssText = ""; this.b.el.style.cssText = "";
      this.a.el.hidden = false; this.b.el.hidden = true;
    }
    this.alMover?.(t, i);
  }

  raf(ahora) {
    if (!this.corriendo) return;
    const dt = Math.min(0.1, (ahora - (this.previo ?? ahora)) / 1000);
    this.previo = ahora;
    this.t += dt;
    if (this.t >= this.total) {
      if (this.bucle) this.t = 0;
      else { this.t = this.total - 0.001; this.corriendo = false; this.dibujar(); this.alParar?.(); return; }
    }
    this.dibujar();
    requestAnimationFrame(this.raf);
  }

  reproducir() { if (this.corriendo) return; if (this.t >= this.total - 0.02) this.t = 0; this.corriendo = true; this.previo = undefined; requestAnimationFrame(this.raf); }
  pausar() { this.corriendo = false; this.dibujar(); }
  ir(t) { this.t = t; this.dibujar(); }

  // Prueba un movimiento o transición al pasar el cursor por una opción, sin tocar lo elegido.
  probar(tipo, id) {
    this.salirPrueba();
    this.prueba = { tipo, id, t: this.t, corria: this.corriendo };
    this.corriendo = false;
    const pl = this.estado.planos;
    const i = Math.max(0, this.indice);
    const [ini, fin] = this.limites[i];
    const desde = tipo === "transicion" && i < pl.length - 1 ? Math.max(ini, fin - (this.estado.valores.montaje.tr_dur ?? 0.5) - 0.5) : ini;
    const hasta = tipo === "transicion" && i < pl.length - 1 ? Math.min(this.total, fin + 0.5) : fin;
    let reloj = desde, previo;
    const paso = (ahora) => {
      if (!this.prueba) return;
      const dt = Math.min(0.1, (ahora - (previo ?? ahora)) / 1000);
      previo = ahora; reloj += dt;
      if (reloj >= hasta) reloj = desde;
      this.t = reloj; this.dibujar();
      this.idPrueba = requestAnimationFrame(paso);
    };
    this.idPrueba = requestAnimationFrame(paso);
  }
  salirPrueba() {
    if (!this.prueba) return;
    cancelAnimationFrame(this.idPrueba);
    const { t, corria } = this.prueba;
    this.prueba = null; this.t = t; this.dibujar();
    if (corria) this.reproducir();
  }

  verMuestra(src) { if (src) { this.muestra.src = src; this.muestra.hidden = false; } else this.muestra.hidden = true; }
}
