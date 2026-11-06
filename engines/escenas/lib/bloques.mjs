// Los bloques: cada uno convierte un plano de pieza.json en HTML fijo y una línea de tiempo de GSAP, función del tiempo.
// Todo se compone con medidas reales de las letras, así que el texto cabe sin abrir un navegador.
import { ajustarCaja, ajustarLinea, ancho, contraste, envolver, esClaro, f, html, icono, mezclar, norm, RAIZ, rutaLocal } from "./base.mjs";
import fs from "node:fs";
import path from "node:path";
import { ENTRADAS } from "./pieles.mjs";

const j = JSON.stringify;

// Texto con el caso de la piel. Las mayúsculas conservan las tildes.
const caso = (c, s) => (c.piel.mayus && c.p.mayus !== false ? String(s).toLocaleUpperCase("es") : String(s));

function acentosDe(p) {
  const a = p.acento;
  return new Set((Array.isArray(a) ? a : a ? String(a).split(/\s+/) : []).map(norm).filter(Boolean));
}

// Una línea de texto: palabras en acento van sobre su bloque, o en color si la piel no usa bloque.
function marcarPalabras(c, linea, acentos, prefijo) {
  let k = 0;
  return linea.split(/\s+/).map((w) => {
    if (!acentos.has(norm(w))) return html(w);
    const id = `${prefijo}-ac${k++}`;
    return c.piel.acentoEnBloque ? `<span class="ac" id="${id}"><i></i><b>${html(w)}</b></span>` : `<span style="color:${c.acento}">${html(w)}</span>`;
  }).join(" ");
}

// Pone líneas de texto en el cuadro y programa su entrada. Devuelve el HTML. `tiempos[k]` es el segundo local de cada línea.
// Lo que cada recorte de collage ocupa de más, en em. Sale de .chip en pieles.mjs: relleno de .2 y margen de .02, a cada lado.
const relleno = (c) => (c.piel.chips ? 0.44 : 0);

function ponerLineas(c, o) {
  const { lineas, x, y, px, lh = c.piel.lh, fam = c.fam.display, peso = c.piel.pesoDisplay, color = c.tinta, track = c.piel.track, tiempos = [], prefijo, acentos = new Set() } = o;
  const pxDe = (k) => (Array.isArray(px) ? px[k] : px);
  let yy = y, salida = "";
  const horas = o.porPalabra ? c.horas(lineas.join(" ")) : null;
  let nPal = 0;
  lineas.forEach((l, k) => {
    const id = `${prefijo}-l${k}`, tam = pxDe(k), t = tiempos[k] ?? k * 0.2;
    const estilo = `left:${f(x)}px;top:${f(yy)}px;font-family:'${fam}';font-weight:${peso};font-size:${f(tam, 1)}px;letter-spacing:${track}em;color:${color}`;
    if (c.piel.chips) {
      const r = c.r;
      // Un signo suelto («·», «—», «/») va pegado a la palabra anterior: en un recorte propio caía oscuro, uno de cada tres,
      // y se leía como una muesca negra («28 oct · fingerprint.com», 2026-11-06). Cada grupo gasta las horas de sus palabras.
      const grupos = [];
      for (const w of l.split(/\s+/)) {
        if (grupos.length && !/[\p{L}\p{N}]/u.test(w)) { grupos.at(-1).texto += ` ${w}`; grupos.at(-1).n++; } else grupos.push({ texto: w, primera: w, n: 1 });
      }
      const palabras = grupos.map(({ texto: w, primera, n }, q) => {
        const es = acentos.has(norm(primera));
        const hora = horas ? horas[nPal] : null;
        nPal += n;
        if (hora !== null && q === 0) c.sonar("entra", hora + 0.02, { g: -18 });
        const fondo = es ? c.pal.acento : q % 3 === 2 ? c.pal.superficie : c.pal.tinta, tintaBase = es ? c.pal.fondo : q % 3 === 2 ? c.pal.tinta : c.pal.fondo;
        const tinta = contraste(tintaBase, fondo) >= 4.5 ? tintaBase : [c.pal.fondo, c.pal.tinta, "#111111", "#FFFFFF"].sort((a, b) => contraste(b, fondo) - contraste(a, fondo))[0];
        const giro = f((r() - 0.5) * 3.6), idw = `${id}-w${q}`;
        c.tl.push(c.entrada(`#${idw}`, o.porPalabra && hora !== null ? Math.max(0, hora - 0.06) : t + q * 0.06, { tipo: "pegar", r: giro, x: f((r() - 0.5) * 70), y: f(40 + r() * 50) }));
        return `<span class="chip" id="${idw}" style="background:${fondo};color:${tinta};transform:rotate(${giro}deg)">${html(w)}</span>`;
      }).join(" ");
      salida += `<div class="libre" style="${estilo}">${palabras}</div>`;
    } else {
      salida += `<div class="lin" data-layout-allow-overflow style="${estilo}"><span id="${id}">${marcarPalabras(c, l, acentos, id)}</span></div>`;
      c.tl.push(c.entrada(`#${id}`, t, { letras: l.length }));
      if (c.piel.acentoEnBloque && [...acentos].some((a) => l.split(/\s+/).map(norm).includes(a))) {
        const hora = Math.max(t + 0.16, (c.dicho([...acentos].join(" "), t) ?? t) - 0.02);
        l.split(/\s+/).filter((w) => acentos.has(norm(w))).forEach((_, q) => {
          c.tl.push(`tl.fromTo(${j(`#${id}-ac${q} i`)},{scaleX:0},{scaleX:1,duration:.26,ease:"power3.out"},${f(hora)});`);
          c.tl.push(`tl.fromTo(${j(`#${id}-ac${q} b`)},{color:${j(color)}},{color:${j(c.suelo)},duration:.1,ease:"none"},${f(hora + 0.08)});`);
        });
      }
    }
    yy += tam * lh;
  });
  return salida;
}

const altoDe = (px, n, lh) => (Array.isArray(px) ? px.reduce((a, b) => a + b * lh, 0) : n * px * lh);

// ¿La voz dice en este plano casi lo mismo que está escrito? Entonces un subtítulo solo repetiría.
function lasDice(c, texto) {
  const escritas = new Set(String(texto).split(/[\s|]+/).map(norm).filter(Boolean));
  const dichas = c.reloj.palabras.filter((x) => x.inicio >= c.T0 - 0.05 && x.inicio < c.T1).map((x) => norm(x.palabra));
  if (!dichas.length) return false;
  return dichas.filter((w) => escritas.has(w)).length / dichas.length >= 0.6;
}

// Lo que se escribe tiene que caber en el tiempo en que se dice. Si no, el texto queda a medias o el cuadro vacío, y no se nota sin mirar.
function revisarTiempos(c, lineas, { vacio = false } = {}) {
  const texto = lineas.join(" "), escritas = texto.split(/\s+/).filter(Boolean), horas = c.horas(texto);
  const despues = new Set(c.reloj.palabras.filter((x) => x.inicio >= c.T1 && x.inicio < c.T1 + 8).map((x) => norm(x.palabra)));
  const tarde = escritas.filter((w, k) => horas[k] === null && despues.has(norm(w)));
  if (tarde.length >= 2) c.aviso(`«${tarde.slice(0, 5).join(" ")}» se dice después de que este plano termina, y no alcanza a verse. Mueve el ancla del plano siguiente, o acorta este texto`);
  const primera = horas.find((h) => h !== null);
  if (vacio && primera !== undefined && primera > 1.2) c.aviso(`«${escritas[0]}» se dice ${primera.toFixed(1)} s después de que empieza el plano, y hasta entonces no hay texto. Ancla el plano en esa palabra`);
}

// Cuándo se dice cada línea, con todas alineadas juntas: una línea de una palabra corta no se confunde con otra vez que la voz la dijo.
function horaDeCadaLinea(c, lineas) {
  const horas = c.horas(lineas.join(" "));
  let q = 0;
  return lineas.map((l) => {
    const n = l.split(/\s+/).length, propias = horas.slice(q, q + n);
    q += n;
    return propias.find((x) => x !== null) ?? null;
  });
}

// Si lo escrito se dice entero en este plano, el subtítulo solo lo repetiría mientras suena.
function tramoDicho(c, texto) {
  const n = String(texto).split(/[\s|]+/).filter(Boolean).length, h = c.horas(texto).filter((x) => x !== null);
  return h.length >= Math.max(2, n * 0.8) ? [Math.min(...h) - 0.1, Math.max(...h) + 0.5] : null;
}

// Texto ya visible en tono tenue, que se enciende palabra a palabra con la voz.
function encender(c, o) {
  const { z, fam, piel } = c;
  const { lineas, x, y, px, lh = piel.lh, acentos = new Set(), tenue = 0.4, primera = false } = o;
  const peso = piel.pesoDisplay, apagado = mezclar(c.tinta, c.suelo, tenue);
  const pxDe = (k) => (Array.isArray(px) ? px[k] : px);
  const horas = c.horas(lineas.join(" "));
  const total = lineas.join(" ").split(/\s+/).length;
  let q = 0, yy = y, info = "";
  lineas.forEach((l, k) => {
    const pal = l.split(/\s+/).map((w) => {
      if (primera && k === 0 && !acentos.has(norm(w))) { q++; return `<span class="pal">${html(w)}</span>`; }
      const dicha = horas[q] ?? c.resp((q / total) * c.dur * 0.72);
      const t = Math.max(0, dicha - 0.04), id = `${c.id}-w${q++}`, es = acentos.has(norm(w));
      if (es && piel.acentoEnBloque) {
        c.tl.push(`tl.fromTo(${j(`#${id} i`)},{scaleX:0},{scaleX:1,duration:.24,ease:"power3.out"},${f(t)});`);
        c.tl.push(`tl.fromTo(${j(`#${id} b`)},{color:${j(apagado)}},{color:${j(c.suelo)},duration:.08,ease:"none"},${f(t + 0.06)});`);
        c.sonar("entra", t + 0.1, { g: -15 });
        return `<span class="ac" id="${id}"><i></i><b>${html(w)}</b></span>`;
      }
      c.tl.push(`tl.fromTo(${j(`#${id}`)},{color:${j(apagado)}},{color:${j(es ? c.acento : c.tinta)},duration:.1,ease:"none"},${f(t)});`);
      return `<span class="pal" id="${id}">${html(w)}</span>`;
    }).join(" ");
    info += `<div class="libre" style="left:${f(x)}px;top:${f(yy)}px;font-family:'${fam.display}';font-weight:${peso};font-size:${f(pxDe(k), 1)}px;letter-spacing:${piel.track}em;color:${c.tinta}">${pal}</div>`;
    yy += pxDe(k) * lh;
  });
  return info;
}

// ── Título: la idea en letras grandes. Es el gancho y el cartel de la pieza.
export function titulo(c, p) {
  const { z, piel, fam } = c;
  const peso = piel.pesoDisplay, texto = caso(c, p.texto);
  const w = z.ancho, h = z.alto * (p.alto ?? (z.horizontal ? 0.9 : 0.74));
  const acentos = acentosDe(p);
  const base = ajustarCaja(texto, fam.display, peso, { w, h }, { porPalabra: relleno(c), lh: piel.lh, max: z.horizontal ? 170 : 210, min: z.minTexto + 6, tracking: piel.track, frases: true });
  if (base.desborda) c.aviso("El título no cabe. Acórtalo: nunca se encoge la letra por debajo del mínimo");
  let px = base.px;
  if (piel.justifica) {
    px = base.lineas.map((l) => Math.min(ajustarLinea(l, fam.display, peso, w, { tracking: piel.track }), base.px * 1.7));
    const total = altoDe(px, base.lineas.length, piel.lh);
    if (total > z.alto) px = px.map((x) => Math.floor((x * z.alto) / total));
  }
  const total = altoDe(px, base.lineas.length, piel.lh);
  const alinea = p.alinea ?? (c.i % 2 ? "abajo" : "centro");
  const y = alinea === "arriba" ? z.y0 : alinea === "abajo" ? z.y1 - total : z.y0 + (z.alto - total) * 0.38;
  const repite = lasDice(c, texto), sinSubEn = repite ? null : tramoDicho(c, texto);
  revisarTiempos(c, base.lineas);
  // El primer cuadro es la portada: el título completo ya está, y se enciende con la voz.
  if (c.i === 0 && !piel.chips) {
    return { info: encender(c, { lineas: base.lineas, x: z.x0, y, px, acentos, tenue: 0.42, primera: true }), heroe: [z.x0 + w / 2, y + total / 2], sinSubtitulos: repite, sinSubEn };
  }
  const horasLinea = horaDeCadaLinea(c, base.lineas);
  const tiempos = base.lineas.map((l, k) => Math.max(0, (horasLinea[k] ?? c.resp(k * 0.26)) - 0.1));
  tiempos.forEach((t) => c.sonar("entra", t + 0.04, { g: -18 }));
  return { info: ponerLineas(c, { lineas: base.lineas, x: z.x0, y, px, tiempos, prefijo: c.id, acentos }), heroe: [z.x0 + w / 2, y + total / 2], sinSubtitulos: repite, sinSubEn };
}

// El número protagonista: en collage es un recorte pegado, para que se lea sobre cualquier hoja.
function estiloNumero(c, activo = true) {
  if (!c.piel.chips) return `color:${activo ? c.acento : c.tinta}`;
  const giro = f((c.r() - 0.5) * 3);
  return `background:${activo ? c.pal.acento : c.pal.tinta};color:${c.pal.fondo};padding:.04em .14em .06em;transform:rotate(${giro}deg);box-shadow:.03em .05em 0 rgba(0,0,0,.34)`;
}

const milesEs = (v, dec = 0) => {
  const t = Number(v).toFixed(dec).split(".");
  t[0] = t[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return t.join(",");
};
const textoCifra = (o) => `${o.prefijo ?? ""}${milesEs(o.valor, o.decimales ?? 0)}${o.sufijo ?? ""}`;

// Un contador que sube mientras se nombra. Siempre función del tiempo, y acaba exacto en el valor.
function contador(c, sel, o, t, d = 0.9) {
  c.contadores.push({ sel, de: Number(o.contar_desde ?? 0), a: Number(o.valor), t: f(t), d, dec: o.decimales ?? 0, pre: o.prefijo ?? "", suf: o.sufijo ?? "" });
}

// ── Cifra: un número que llena el cuadro.
export function cifra(c, p) {
  const { z, piel, fam } = c;
  const final = textoCifra(p), peso = piel.pesoDisplay;
  const t = Math.max(0, (p.en ? c.t(p.en, 0) : c.dicho(String(p.rotulo ?? ""), null) ?? c.resp(0.05)) - 0.1);
  const altoMax = z.alto * (p.barra !== undefined ? 0.44 : 0.52);
  const px = Math.min(ajustarLinea(final, fam.display, peso, z.ancho, { tracking: piel.track }), altoMax / 0.86);
  const pxRotulo = Math.max(z.minTexto + 12, Math.min(92, px * 0.3));
  const lineasRotulo = p.rotulo ? envolver(caso(c, p.rotulo), fam.cuerpo, 600, pxRotulo, z.ancho) : [];
  const altoGrupo = px * 1.02 + lineasRotulo.length * pxRotulo * 1.14 + (p.barra !== undefined ? 34 + Math.max(36, z.alto * 0.07) : 0);
  const y = z.y0 + Math.max(10, (z.alto - altoGrupo) * (p.barra !== undefined ? 0.3 : 0.36));
  const anchoNum = ancho(final, fam.display, peso, px, piel.track);
  let info = `<div class="libre" id="${c.id}-num" style="left:${z.x0}px;top:${f(y)}px;font-family:'${fam.display}';font-weight:${peso};font-size:${f(px, 1)}px;letter-spacing:${piel.track}em;${estiloNumero(c)}">${html(final)}</div>`;
  contador(c, `${c.id}-num`, p, t);
  c.tl.push(c.entrada(`#${c.id}-num`, t, { tipo: piel.entrada === "mascara" ? "revelar" : undefined, dur: 0.3, letras: 6 }));
  c.sonar("cifra", t + 0.9, { g: -13 });
  let yy = y + px * 1.02;
  if (piel.nombre === "Plano técnico") {
    // Cota: la medida del número, dibujada como en un plano.
    const yc = y - 14;
    c.tl.push(`tl.fromTo(${j(`#${c.id}-cota`)},{scaleX:0},{scaleX:1,duration:.5,ease:"power3.out"},${f(t)});`);
    info += `<div id="${c.id}-cota" style="position:absolute;left:${z.x0}px;top:${f(yc)}px;width:${f(anchoNum)}px;height:14px;border:solid ${c.tinta};border-width:0 3px 3px 3px;opacity:.5;transform-origin:0 50%"></div>`;
  }
  if (p.rotulo) {
    info += ponerLineas(c, { lineas: lineasRotulo, x: z.x0, y: yy + 12, px: pxRotulo, lh: 1.14, fam: fam.cuerpo, peso: 600, track: 0, tiempos: lineasRotulo.map((_, k) => t + 0.28 + k * 0.1), prefijo: `${c.id}-r` });
    yy += 12 + lineasRotulo.length * pxRotulo * 1.14;
  }
  if (p.barra !== undefined) {
    const v = Math.max(0, Math.min(1, Number(p.barra))), h = Math.max(36, z.alto * 0.07);
    yy += 34;
    info += `<div class="barra" style="left:${z.x0}px;top:${f(yy)}px;width:${z.ancho}px;height:${f(h)}px;background:color-mix(in srgb,${c.tinta} 16%,transparent)"></div><div class="barra" id="${c.id}-b" style="left:${z.x0}px;top:${f(yy)}px;width:${f(z.ancho * v)}px;height:${f(h)}px;background:${c.acento}"></div>`;
    c.tl.push(`tl.fromTo(${j(`#${c.id}-b`)},{scaleX:0},{scaleX:1,duration:.9,ease:"power3.out"},${f(t)});`);
    yy += h;
  }
  if (p.fuente) info += fuente(c, p.fuente, yy + 26, t + 0.6);
  return { info, heroe: [z.x0 + anchoNum / 2, y + px / 2] };
}

function fuente(c, texto, y, t) {
  const { z, fam } = c, px = Math.max(34, z.minTexto * 0.8);
  const id = `${c.id}-fte`;
  c.tl.push(ENTRADAS.revelar(`#${id}`, t, { y: 0, dur: 0.3 }));
  return `<div class="libre" id="${id}" style="left:${z.x0}px;top:${f(y)}px;font-family:'${fam.datos}';font-size:${f(px)}px;color:${c.tinta};opacity:.72">${html(`Fuente: ${texto}`)}</div>`;
}

// ── Varias cifras: cada una cae en su palabra y la última queda en acento.
export function cifras(c, p) {
  const { z, piel, fam } = c, items = p.items ?? [];
  if (!items.length) throw new Error(`el plano ${c.i + 1} (cifras) necesita items`);
  const n = items.length, peso = piel.pesoDisplay, enColumnas = z.horizontal;
  const anchoCelda = enColumnas ? z.ancho / n - 48 : z.ancho, altoCelda = enColumnas ? z.alto * 0.8 : z.alto / n;
  const mayor = items.map(textoCifra).sort((a, b) => b.length - a.length)[0];
  const px = Math.min(ajustarLinea(mayor, fam.display, peso, anchoCelda * (enColumnas ? 1 : 0.62), { tracking: piel.track }), altoCelda * (enColumnas ? 0.5 : 0.8));
  const anchoNum = ancho(mayor, fam.display, peso, px, piel.track);
  const anchoLado = z.ancho - anchoNum - 34;
  const palabraLarga = items.flatMap((o) => caso(c, o.rotulo ?? "").split(/\s+/)).reduce((a, b) => (a.length > b.length ? a : b), "");
  const cabeLado = ajustarLinea(palabraLarga, fam.cuerpo, 600, anchoLado);
  const debajo = enColumnas || cabeLado < z.minTexto;
  const pxR = debajo ? Math.max(z.minTexto + 4, Math.min(64, px * 0.3)) : Math.max(z.minTexto, Math.min(76, px * 0.34, cabeLado));
  let info = "";
  const tiempos = items.map((o, k) => Math.max(0, (o.en ? c.t(o.en, null) : c.dicho(String(o.rotulo), null)) ?? c.resp(k * (c.dur / n))) - 0.1);
  items.forEach((o, k) => {
    const t = tiempos[k], sig = tiempos[k + 1];
    const x = enColumnas ? z.x0 + k * (z.ancho / n) : z.x0, y = enColumnas ? z.y0 + z.alto * 0.12 : z.y0 + k * altoCelda + (altoCelda - px) / 2;
    const idn = `${c.id}-n${k}`;
    info += `<div class="libre" id="${idn}" style="left:${f(x)}px;top:${f(y)}px;font-family:'${fam.display}';font-weight:${peso};font-size:${f(px, 1)}px;letter-spacing:${piel.track}em;${estiloNumero(c)}">${html(textoCifra(o))}</div>`;
    contador(c, idn, o, t, 0.65);
    c.tl.push(c.entrada(`#${idn}`, t, { tipo: piel.entrada === "mascara" ? "revelar" : undefined, dur: 0.22, letras: 5 }));
    if (sig !== undefined) c.tl.push(piel.chips ? `tl.to(${j(`#${idn}`)},{backgroundColor:${j(c.pal.tinta)},duration:.1,ease:"none"},${f(sig)});` : `tl.to(${j(`#${idn}`)},{color:${j(c.tinta)},duration:.2,ease:"none"},${f(sig)});`);
    c.sonar("entra", t + 0.08, { g: -15 });
    // En vertical el rótulo va a la derecha del número, centrado con él; en columnas, debajo.
    const anchoR = debajo ? anchoCelda : anchoLado;
    const largaFila = caso(c, o.rotulo ?? "").split(/\s+/).reduce((a, b) => (a.length > b.length ? a : b), "");
    const pxFila = debajo ? pxR : Math.max(z.minTexto, Math.min(76, px * 0.34, ajustarLinea(largaFila, fam.cuerpo, 600, anchoLado)));
    const lineas = envolver(caso(c, o.rotulo ?? ""), fam.cuerpo, 600, pxFila, anchoR);
    const xR = debajo ? x : x + anchoNum + 34, yR = debajo ? y + px : y + (px - lineas.length * pxFila * 1.12) / 2;
    info += ponerLineas(c, { lineas, x: xR, y: yR, px: pxFila, lh: 1.12, fam: fam.cuerpo, peso: 600, track: 0, tiempos: lineas.map((_, q) => t + 0.1 + q * 0.06), prefijo: `${c.id}-r${k}` });
    if (k < n - 1 && !enColumnas) {
      const idr = `${c.id}-reg${k}`;
      info += `<div class="regla" id="${idr}" style="left:${z.x0}px;top:${f(z.y0 + (k + 1) * altoCelda - 3)}px;width:${z.ancho}px;color:${c.tinta}"></div>`;
      c.tl.push(`tl.fromTo(${j(`#${idr}`)},{scaleX:0},{scaleX:1,duration:.6,ease:"power3.inOut"},${f(t + 0.1)});`);
    }
  });
  return { info, heroe: [z.W / 2, (z.y0 + z.y1) / 2] };
}

// ── Barras: salen del borde del cuadro. La escala es la misma para todas.
export function barras(c, p) {
  const { z, piel, fam } = c, items = p.items ?? [];
  if (!items.length) throw new Error(`el plano ${c.i + 1} (barras) necesita items`);
  const maximo = Number(p.max ?? Math.max(...items.map((o) => Number(o.valor))));
  const yIni = z.y0 + (p.titulo ? z.alto * 0.16 : 0), altoLibre = z.y1 - yIni, fila = Math.min(altoLibre / items.length, z.es916 ? 330 : 210);
  const pxR = Math.max(z.minTexto, Math.min(fila * 0.2, z.es916 ? 62 : 48)), altoB = fila * 0.52, pxV = Math.min(altoB * 0.9, z.es916 ? 150 : 110);
  let info = "";
  if (p.titulo) {
    const a = ajustarCaja(caso(c, p.titulo), fam.display, piel.pesoDisplay, { w: z.ancho, h: z.alto * 0.14 }, { porPalabra: relleno(c), lh: piel.lh, max: 92, min: z.minTexto + 6 });
    info += ponerLineas(c, { lineas: a.lineas, x: z.x0, y: z.y0, px: a.px, tiempos: a.lineas.map(() => c.resp(0)), prefijo: `${c.id}-t` });
  }
  const textoMax = Math.max(...items.map((o) => ancho(textoCifra(o), fam.display, piel.pesoDisplay, pxV)));
  items.forEach((o, k) => {
    const t = Math.max(0, (o.en ? c.t(o.en, null) : c.dicho(String(o.rotulo), null)) ?? c.resp(0.25 + k * Math.min(0.5, (c.dur * 0.6) / items.length))) - 0.08;
    const y = yIni + k * fila + (fila - pxR * 1.2 - altoB) / 2;
    const w = z.x0 + Math.max(0, z.ancho - textoMax - 26) * (Number(o.valor) / maximo);
    const color = o.acento ? c.acento : `color-mix(in srgb,${c.tinta} 34%,${c.suelo})`;
    const idb = `${c.id}-bar${k}`, idv = `${c.id}-val${k}`;
    info += ponerLineas(c, { lineas: [caso(c, o.rotulo ?? "")], x: z.x0, y, px: pxR, lh: 1.2, fam: fam.cuerpo, peso: 600, track: 0, tiempos: [t], prefijo: `${c.id}-e${k}` });
    info += `<div class="barra" id="${idb}" style="top:${f(y + pxR * 1.2)}px;width:${f(w)}px;height:${f(altoB)}px;background:${color}"></div>`;
    info += `<div class="libre" id="${idv}" style="left:${f(w + 18)}px;top:${f(y + pxR * 1.2 + (altoB - pxV) / 2)}px;font-family:'${fam.display}';font-weight:${piel.pesoDisplay};font-size:${f(pxV)}px;color:${o.acento ? c.acento : c.tinta}">${html(textoCifra(o))}</div>`;
    c.tl.push(`tl.fromTo(${j(`#${idb}`)},{scaleX:0},{scaleX:1,duration:.7,ease:"power3.out"},${f(t)});`);
    c.tl.push(`tl.fromTo(${j(`#${idv}`)},{x:${f(-w * 0.86)},autoAlpha:0},{x:0,autoAlpha:1,duration:.7,ease:"power3.out"},${f(t)});`);
    contador(c, idv, o, t, 0.7);
    c.sonar(o.acento ? "cifra" : "trazo", t + (o.acento ? 0.68 : 0.1), { g: o.acento ? -13 : -19 });
  });
  if (p.fuente) info += fuente(c, p.fuente, z.y1 - 36, 1);
  return { info, heroe: [z.W / 2, (z.y0 + z.y1) / 2] };
}

// ── Línea: una serie que se dibuja y termina en su dato.
export function linea(c, p) {
  const { z, piel, fam } = c, serie = (p.serie ?? []).map(Number);
  if (serie.length < 2) throw new Error(`el plano ${c.i + 1} (linea) necesita una serie de 2 valores o más`);
  const t0 = c.resp(0.15), durTrazo = Math.min(1.8, c.dur * 0.55);
  let info = "", yTop = z.y0;
  if (p.titulo) {
    const a = ajustarCaja(caso(c, p.titulo), fam.display, piel.pesoDisplay, { w: z.ancho, h: z.alto * 0.22 }, { porPalabra: relleno(c), lh: piel.lh, max: 96, min: z.minTexto + 6 });
    info += ponerLineas(c, { lineas: a.lineas, x: z.x0, y: z.y0, px: a.px, tiempos: a.lineas.map(() => t0), prefijo: `${c.id}-t` });
    yTop += a.lineas.length * a.px * piel.lh + 26;
  }
  const H = z.y1 - yTop - 70, W = z.ancho, mn = Math.min(...serie, Number(p.min ?? Infinity)), mx = Math.max(...serie), rango = mx - mn || 1;
  const pt = serie.map((v, k) => [(k / (serie.length - 1)) * W, H - ((v - mn) / rango) * (H * 0.86) - H * 0.04]);
  const d = pt.map(([x, y], k) => `${k ? "L" : "M"}${f(x, 1)} ${f(y, 1)}`).join("");
  const final = pt[pt.length - 1];
  const idc = `${c.id}-area`;
  c.tl.push(`tl.fromTo(${j(`#${c.id}-tr`)},{strokeDashoffset:1},{strokeDashoffset:0,duration:${f(durTrazo)},ease:"power1.inOut"},${f(t0)});`);
  c.tl.push(`tl.fromTo(${j(`#${idc}`)},{clipPath:"inset(0 100% 0 0)"},{clipPath:"inset(0 0% 0 0)",duration:${f(durTrazo)},ease:"power1.inOut"},${f(t0)});`);
  c.tl.push(`tl.fromTo(${j(`#${c.id}-pt`)},{scale:0,transformOrigin:"50% 50%"},{scale:1,duration:.3,ease:"back.out(3)"},${f(t0 + durTrazo - 0.08)});`);
  c.sonar("trazo", t0 + 0.1, { g: -20 });
  c.sonar("cifra", t0 + durTrazo, { g: -13 });
  info += `<svg style="position:absolute;left:${z.x0}px;top:${f(yTop)}px;overflow:visible" width="${W}" height="${f(H)}" viewBox="0 0 ${W} ${f(H)}">
<line x1="0" x2="${W}" y1="${f(H)}" y2="${f(H)}" stroke="${c.tinta}" stroke-opacity=".5" stroke-width="3"/>
<path id="${idc}" d="${d}L${W} ${f(H)}L0 ${f(H)}Z" fill="${c.acento}" fill-opacity=".16"/>
<path id="${c.id}-tr" pathLength="1" stroke-dasharray="1" d="${d}" fill="none" stroke="${c.acento}" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"/>
<circle id="${c.id}-pt" cx="${f(final[0], 1)}" cy="${f(final[1], 1)}" r="17" fill="${c.acento}"/></svg>`;
  if (p.final) {
    const px = Math.min(110, ajustarLinea(p.final, fam.display, piel.pesoDisplay, z.ancho * 0.56));
    const yf = Math.max(yTop, yTop + final[1] - px * 1.32);
    const id = `${c.id}-fin`;
    info += `<div class="libre" id="${id}" style="right:${z.W - z.x1}px;top:${f(yf)}px;font-family:'${fam.display}';font-weight:${piel.pesoDisplay};font-size:${f(px)}px;color:${c.acento}">${html(p.final)}</div>`;
    c.tl.push(ENTRADAS.revelar(`#${id}`, t0 + durTrazo - 0.1, { dur: 0.3, y: 18 }));
  }
  const et = p.etiquetas ?? [];
  if (et.length) {
    const px = z.minTexto;
    et.forEach((e, k) => {
      const lado = k === 0 ? `left:${z.x0}px` : `right:${z.W - z.x1}px`;
      info += `<div class="libre" style="${lado};top:${f(yTop + H + 12)}px;font-family:'${fam.cuerpo}';font-weight:500;font-size:${px}px;color:${c.tinta}">${html(e)}</div>`;
    });
  }
  if (p.fuente) info += fuente(c, p.fuente, z.y1 - 28, t0 + durTrazo);
  return { info, heroe: [z.x1 - 120, yTop + H * 0.3] };
}

// ── Pasos: un camino que crece, y cada paso cae cuando se nombra.
export function pasos(c, p) {
  const { z, piel, fam } = c, items = p.items ?? [];
  if (!items.length) throw new Error(`el plano ${c.i + 1} (pasos) necesita items`);
  const n = items.length, peso = piel.pesoDisplay;
  const tiempos = items.map((o, k) => Math.max(0, (o.en ? c.t(o.en, null) : c.dicho(String(o.texto), null)) ?? c.resp(k * (c.dur / n))) - 0.1);
  let info = "";
  const nodoHTML = (o, k, x, y, d) => {
    const contenido = o.icono ? icono(o.icono, 2.2) : `<span style="font-family:'${fam.display}';font-weight:${peso};font-size:${f(d * 0.46)}px">${k + 1}</span>`;
    return `<div class="nodo" id="${c.id}-nd${k}" style="left:${f(x)}px;top:${f(y)}px;width:${f(d)}px;height:${f(d)}px;color:${c.tinta}">${contenido}</div>`;
  };
  const activar = (k, t, sig) => {
    c.tl.push(`tl.fromTo(${j(`#${c.id}-nd${k}`)},{scale:0,autoAlpha:0},{scale:1,autoAlpha:1,duration:.34,ease:"back.out(2.4)"},${f(t)});`);
    c.tl.push(`tl.to(${j(`#${c.id}-nd${k}`)},{backgroundColor:${j(c.acento)},color:${j(c.suelo)},borderColor:${j(c.acento)},duration:.14,ease:"none"},${f(t + 0.08)});`);
    if (sig !== undefined) c.tl.push(`tl.to(${j(`#${c.id}-nd${k}`)},{backgroundColor:${j(c.pal.superficie)},color:${j(c.tinta)},borderColor:${j(c.tinta)},duration:.2,ease:"none"},${f(sig)});`);
    c.sonar("entra", t + 0.1, { g: -15 });
  };
  if (z.horizontal) {
    const celda = z.ancho / n, d = Math.min(170, z.alto * 0.27);
    const pxT = Math.min(...items.map((o) => ajustarLinea(caso(c, o.texto), fam.display, peso, celda - 30, { tracking: piel.track })), 120);
    const yN = z.y0 + Math.max(0, (z.alto - d - 34 - pxT * 1.2 - (items.some((o) => o.detalle) ? z.minTexto * 2.4 : 0)) * 0.42);
    items.forEach((o, k) => {
      const x = z.x0 + k * celda, t = tiempos[k];
      if (k < n - 1) {
        info += `<div class="riel" id="${c.id}-ri${k}" style="left:${f(x + d)}px;top:${f(yN + d / 2 - 3)}px;width:${f(celda - d)}px;height:6px;transform-origin:0 50%;color:${c.tinta}"></div>`;
        c.tl.push(`tl.fromTo(${j(`#${c.id}-ri${k}`)},{scaleX:0},{scaleX:1,duration:${f(Math.max(0.2, tiempos[k + 1] - t))},ease:"power1.inOut"},${f(t + 0.1)});`);
      }
      info += nodoHTML(o, k, x, yN, d);
      activar(k, t, tiempos[k + 1]);
      info += ponerLineas(c, { lineas: [caso(c, o.texto)], x, y: yN + d + 34, px: pxT, tiempos: [t + 0.04], prefijo: `${c.id}-p${k}` });
      if (o.detalle) {
        const l = envolver(caso(c, o.detalle), fam.cuerpo, 500, z.minTexto, celda - 30);
        info += ponerLineas(c, { lineas: l, x, y: yN + d + 34 + pxT * 1.16, px: z.minTexto, lh: 1.16, fam: fam.cuerpo, peso: 500, track: 0, tiempos: l.map(() => t + 0.16), prefijo: `${c.id}-d${k}` });
      }
    });
  } else {
    const fila = z.alto / n, d = Math.min(fila * 0.66, z.es916 ? 200 : 130), xT = z.x0 + d + 44;
    const anchoT = z.x1 - xT;
    const pxT = Math.min(...items.map((o) => ajustarLinea(caso(c, o.texto), fam.display, peso, anchoT, { tracking: piel.track })), fila * 0.52, z.es916 ? 150 : 92);
    items.forEach((o, k) => {
      const y = z.y0 + k * fila + (fila - d) / 2, t = tiempos[k];
      if (k < n - 1) {
        info += `<div class="riel" id="${c.id}-ri${k}" style="left:${f(z.x0 + d / 2 - 3)}px;top:${f(y + d)}px;width:6px;height:${f(fila - d)}px;color:${c.tinta}"></div>`;
        c.tl.push(`tl.fromTo(${j(`#${c.id}-ri${k}`)},{scaleY:0},{scaleY:1,duration:${f(Math.max(0.2, tiempos[k + 1] - t))},ease:"power1.inOut"},${f(t + 0.1)});`);
      }
      info += nodoHTML(o, k, z.x0, y, d);
      activar(k, t, tiempos[k + 1]);
      const conDetalle = Boolean(o.detalle), yT = y + (d - pxT * (conDetalle ? 1.7 : 1)) / 2;
      info += ponerLineas(c, { lineas: [caso(c, o.texto)], x: xT, y: yT, px: pxT, tiempos: [t + 0.04], prefijo: `${c.id}-p${k}` });
      if (conDetalle) info += ponerLineas(c, { lineas: envolver(caso(c, o.detalle), fam.cuerpo, 500, z.minTexto, anchoT).slice(0, 1), x: xT, y: yT + pxT * 1.08, px: z.minTexto, lh: 1.16, fam: fam.cuerpo, peso: 500, track: 0, tiempos: [t + 0.18], prefijo: `${c.id}-d${k}` });
    });
  }
  return { info, heroe: [z.W / 2, (z.y0 + z.y1) / 2] };
}

// ── Comparar: dos campos que se responden. El segundo entra sobre el primero.
export function comparar(c, p) {
  const { z, piel, fam } = c, a = p.a ?? {}, b = p.b ?? {};
  const horizontal = z.horizontal;
  const tA = Math.max(0, (a.en ? c.t(a.en, null) : c.dicho(String(a.texto), null)) ?? c.resp(0.05)) - 0.1;
  const tB = Math.max(tA + 0.4, ((b.en ? c.t(b.en, null) : c.dicho(String(b.texto), null)) ?? c.resp(c.dur * 0.5)) - 0.1);
  const corte = horizontal ? z.W / 2 : (z.y0 + z.y1) * 0.5;
  const campo = (lado, o, t, esB) => {
    const col = esB ? c.suelo : c.tinta;
    const caja = horizontal
      ? { x: esB ? z.W / 2 + 40 : z.x0, y: z.y0, w: z.ancho / 2 - 40, h: z.alto }
      : { x: z.x0, y: esB ? corte + 44 : z.y0 + 10, w: z.ancho, h: esB ? z.y1 - corte - 44 : corte - z.y0 - 50 };
    let html2 = "", y = caja.y;
    if (o.titulo) {
      const px = Math.max(z.minTexto, Math.min(56, caja.h * 0.14));
      html2 += ponerLineas(c, { lineas: [caso(c, o.titulo)], x: caja.x, y, px, fam: fam.cuerpo, peso: 600, track: 0, lh: 1.2, color: col, tiempos: [t], prefijo: `${c.id}-${lado}t` });
      y += px * 1.5;
    }
    const a2 = ajustarCaja(caso(c, o.texto ?? ""), fam.display, piel.pesoDisplay, { w: caja.w, h: caja.y + caja.h - y }, { porPalabra: relleno(c), lh: piel.lh, max: z.horizontal ? 130 : 170, min: z.minTexto + 4, tracking: piel.track, frases: true });
    html2 += ponerLineas(c, { lineas: a2.lineas, x: caja.x, y, px: a2.px, color: col, tiempos: a2.lineas.map((_, k) => t + 0.06 + k * 0.08), prefijo: `${c.id}-${lado}x` });
    return html2;
  };
  const clipDesde = horizontal ? "inset(0 0 0 100%)" : "inset(100% 0 0 0)";
  c.tl.push(`tl.fromTo(${j(`#${c.id}-cb`)},{clipPath:${j(clipDesde)}},{clipPath:"inset(0 0 0 0%)",duration:.36,ease:"power4.inOut"},${f(tB - 0.2)});`);
  c.sonar("golpe", tB, { g: -14 });
  const geo = horizontal ? `left:${f(corte)}px;top:0;width:${f(z.W - corte)}px;height:${z.H}px` : `left:0;top:${f(corte)}px;width:${z.W}px;height:${f(z.H - corte)}px`;
  const fondoB = `<div id="${c.id}-cb" style="position:absolute;${geo};background:${c.acento}"></div>`;
  const conB = `<div id="${c.id}-txb" class="capa">${campo("b", b, tB, true)}</div>`;
  return { info: `${campo("a", a, tA, false)}${fondoB}${conB}`, heroe: horizontal ? [corte, z.H / 2] : [z.W / 2, corte] };
}

// ── Frase: la frase llena el cuadro y se enciende palabra a palabra con la voz. Reemplaza a los subtítulos.
export function frase(c, p) {
  const { z, piel, fam } = c;
  const texto = caso(c, p.texto), acentos = acentosDe(p), peso = piel.pesoDisplay;
  const h = (z.es916 ? z.sub.y2 : z.y1 + (z.H - z.y1) * 0.6) - z.y0;
  const lh = piel.lh + (piel.chips ? 0.16 : 0.02);
  const a = ajustarCaja(texto, fam.display, peso, { w: z.ancho, h: h * 0.86 }, { porPalabra: relleno(c), lh, max: z.horizontal ? 150 : 200, min: z.minTexto + 8, tracking: piel.track, frases: true });
  if (a.desborda) c.aviso("La frase no cabe. Acórtala o pártela en dos planos");
  revisarTiempos(c, a.lineas, { vacio: Boolean(piel.chips) });
  const y = z.y0 + (h - a.lineas.length * a.px * lh) * 0.36;
  if (piel.chips) return { info: ponerLineas(c, { lineas: a.lineas, x: z.x0, y, px: a.px, lh, acentos, prefijo: c.id, porPalabra: true, tiempos: a.lineas.map((_, k) => c.resp((k / a.lineas.length) * c.dur * 0.7)) }), sinSubtitulos: p.subtitulos !== true, heroe: [z.W / 2, y + a.px] };
  return { info: encender(c, { lineas: a.lineas, x: z.x0, y, px: a.px, lh, acentos }), sinSubtitulos: p.subtitulos !== true, heroe: [z.W / 2, y + a.px] };
}

// ── Diagrama: nodos que aparecen cuando se nombran, conectados en orden.
export function diagrama(c, p) {
  const { z, piel, fam } = c, nodos = p.nodos ?? [];
  if (nodos.length < 2) throw new Error(`el plano ${c.i + 1} (diagrama) necesita 2 nodos o más`);
  if (p.forma === "flujo") return pasos(c, { ...p, items: nodos });
  const n = nodos.length, cx = (z.x0 + z.x1) / 2, cy = (z.y0 + z.y1) / 2;
  const peso = piel.nombre === "Plano técnico" ? 700 : piel.pesoDisplay;
  const pxT = Math.max(z.minTexto, Math.min(...nodos.map((o) => ajustarLinea(caso(c, o.texto), fam.display, peso, z.ancho * 0.36)), z.es916 ? 96 : 64));
  const anchos = nodos.map((o) => ancho(caso(c, o.texto), fam.display, peso, pxT) + pxT * 1.1), altoF = pxT * 1.9;
  const Rx = Math.min(z.ancho / 2 - Math.max(...anchos) / 2, z.alto * 0.42), Ry = Math.min(z.alto * 0.42, z.ancho * (z.horizontal ? 0.3 : 0.62));
  const giro = n % 2 ? -Math.PI / 2 : -Math.PI / 2 - Math.PI / n;
  const puntos = nodos.map((_, k) => { const a = giro + (k / n) * Math.PI * 2; return [cx + Rx * 1.16 * Math.cos(a), cy + Ry * Math.sin(a)]; });
  const tiempos = nodos.map((o, k) => Math.max(0, (o.en ? c.t(o.en, null) : c.dicho(String(o.texto), null)) ?? c.resp(0.2 + k * (c.dur * 0.7) / n)) - 0.1);
  let lineas = "";
  puntos.forEach(([x, y], k) => {
    const [x2, y2] = puntos[(k + 1) % n];
    const mx = (x + x2) / 2 + (cx - (x + x2) / 2) * -0.34, my = (y + y2) / 2 + (cy - (y + y2) / 2) * -0.34;
    const t = k === n - 1 ? tiempos[k] + 0.3 : tiempos[k + 1] - 0.24;
    const id = `${c.id}-arc${k}`;
    lineas += `<path id="${id}" pathLength="1" stroke-dasharray="1" d="M${f(x, 1)} ${f(y, 1)}Q${f(mx, 1)} ${f(my, 1)} ${f(x2, 1)} ${f(y2, 1)}" fill="none" stroke="${c.tinta}" stroke-opacity=".62" stroke-width="5"/>`;
    c.tl.push(`tl.fromTo(${j(`#${id}`)},{strokeDashoffset:1},{strokeDashoffset:0,duration:.4,ease:"power2.inOut"},${f(t)});`);
  });
  let info = `<svg class="capa" viewBox="0 0 ${z.W} ${z.H}">${lineas}</svg>`;
  nodos.forEach((o, k) => {
    const [x, y] = puntos[k], w = anchos[k], t = tiempos[k], sig = tiempos[k + 1], id = `${c.id}-nd${k}`;
    info += `<div class="ficha" id="${id}" style="left:${f(x - w / 2)}px;top:${f(y - altoF / 2)}px;width:${f(w)}px;height:${f(altoF)}px;font-family:'${fam.display}';font-weight:${peso};font-size:${f(pxT)}px;color:${c.tinta}">${html(caso(c, o.texto))}</div>`;
    c.tl.push(`tl.fromTo(${j(`#${id}`)},{scale:.3,autoAlpha:0},{scale:1,autoAlpha:1,duration:.3,ease:"back.out(2)"},${f(t)});`);
    c.tl.push(`tl.to(${j(`#${id}`)},{backgroundColor:${j(c.acento)},color:${j(c.suelo)},borderColor:${j(c.acento)},duration:.12,ease:"none"},${f(t + 0.06)});`);
    if (sig !== undefined) c.tl.push(`tl.to(${j(`#${id}`)},{backgroundColor:${j(c.pal.superficie)},color:${j(c.tinta)},borderColor:${j(c.tinta)},duration:.2,ease:"none"},${f(sig)});`);
    c.sonar("entra", t + 0.08, { g: -16 });
  });
  if (p.centro) {
    const px = Math.max(z.minTexto, Math.min(ajustarLinea(caso(c, p.centro), fam.display, piel.pesoDisplay, z.ancho * 0.62, { tracking: piel.track }), Ry * 0.5, z.es916 ? 150 : 110));
    const id = `${c.id}-cn`;
    info += `<div class="libre" id="${id}" style="left:${f(cx - ancho(caso(c, p.centro), fam.display, piel.pesoDisplay, px, piel.track) / 2)}px;top:${f(cy - px / 2)}px;font-family:'${fam.display}';font-weight:${piel.pesoDisplay};font-size:${f(px)}px;letter-spacing:${piel.track}em;${estiloNumero(c)}">${html(caso(c, p.centro))}</div>`;
    c.tl.push(c.entrada(`#${id}`, tiempos[0], { tipo: piel.entrada === "mascara" ? "revelar" : undefined, dur: 0.3, letras: 6 }));
  }
  return { info, heroe: [cx, cy] };
}

// ── Imagen: una foto real a toda pantalla, con cámara lenta y, si se pide, tratada con la paleta.
export function imagen(c, p) {
  const { z, piel, fam } = c;
  const src = rutaLocal(p.src), id = `${c.id}-foto`;
  const tra = p.tratamiento ?? "duotono";
  const filtro = tra === "natural" ? "" : "filter:grayscale(1) contrast(1.16) brightness(1.04);";
  const [oscuro, claro] = esClaro(c.pal.fondo) ? [c.pal.tinta, c.pal.fondo] : [c.pal.fondo, c.acento];
  const capas = tra === "natural" ? "" : `<div class="capa" style="background:${claro};mix-blend-mode:multiply"></div><div class="capa" style="background:${oscuro};mix-blend-mode:lighten"></div>`;
  const de = p.movimiento === "alejar" ? 1.14 : 1, a = p.movimiento === "alejar" ? 1 : 1.14;
  c.tl.push(`tl.fromTo(${j(`#${id}`)},{scale:${de},xPercent:${c.i % 2 ? -1.6 : 1.6}},{scale:${a},xPercent:${c.i % 2 ? 1.6 : -1.6},duration:${f(c.dur)},ease:"none"},0);`);
  const mundo = `<img class="foto" id="${id}" src="${html(src)}" alt="" style="${filtro}">${capas}<div class="capa" style="background:linear-gradient(180deg,transparent 40%,color-mix(in srgb,${c.pal.fondo} 86%,transparent) 88%)"></div>`;
  let info = "";
  if (p.texto) {
    const a2 = ajustarCaja(caso(c, p.texto), fam.display, piel.pesoDisplay, { w: z.ancho, h: z.alto * 0.42 }, { porPalabra: relleno(c), lh: piel.lh, max: 120, min: z.minTexto + 6, tracking: piel.track });
    const y = z.y1 - a2.lineas.length * a2.px * piel.lh;
    info = ponerLineas(c, { lineas: a2.lineas, x: z.x0, y, px: a2.px, tiempos: a2.lineas.map((l, k) => Math.max(0, (c.dicho(l, null) ?? c.resp(0.2 + k * 0.22)) - 0.1)), prefijo: c.id, acentos: acentosDe(p), color: c.pal.tinta });
  }
  if (p.credito) info += `<div class="libre" style="left:${z.x0}px;top:${z.y0}px;font-family:'${fam.datos}';font-size:${Math.max(26, z.minTexto * 0.6)}px;color:${c.pal.tinta};opacity:.8">${html(p.credito)}</div>`;
  return { mundo, info, sinMundo: true, heroe: [z.W / 2, z.H / 2] };
}

// ── Captura: una pantalla real dentro de su marco. La cámara va adonde pasa algo y el cursor lo señala.
export function captura(c, p) {
  const { z, fam, piel } = c;
  const src = rutaLocal(p.src), disp = p.dispositivo ?? (z.horizontal ? "navegador" : "telefono");
  const rel = Number(p.proporcion ?? (disp === "telefono" ? 0.5 : 1.6));
  let wIn = z.ancho, hIn = wIn / rel;
  if (hIn > z.alto) { hIn = z.alto; wIn = hIn * rel; }
  const x = z.x0 + (z.ancho - wIn) / 2, y = z.y0 + (z.alto - hIn) / 2;
  const barra = disp === "navegador" ? 46 : 0, borde = disp === "telefono" ? 18 : 4, radio = disp === "telefono" ? 56 : 18;
  const foco = p.foco ?? null;
  const tF = c.t(p.en ?? c.T0 + c.dur * 0.3, c.dur * 0.3);
  const cam = `${c.id}-pant`;
  if (foco) {
    const [fx, fy, fw, fh] = foco;
    const esc = Math.min(1 / Math.max(fw, 0.08), 1 / Math.max(fh, 0.08), Number(p.zoom ?? 2.2));
    const ox = (fx + fw / 2) * wIn, oy = (fy + fh / 2) * hIn;
    c.tl.push(`tl.fromTo(${j(`#${cam}`)},{scale:1,x:0,y:0},{scale:${f(esc)},x:${f(z.W / 2 - (x + ox))},y:${f((z.y0 + z.y1) / 2 - (y + oy))},duration:.9,ease:"power3.inOut",transformOrigin:"${f(x + ox)}px ${f(y + oy)}px"},${f(tF)});`);
    c.sonar("trazo", tF + 0.1, { g: -18 });
  }
  const marcoEst = `left:${f(x)}px;top:${f(y)}px;width:${f(wIn)}px;height:${f(hIn)}px;border-radius:${radio}px;background:${c.pal.superficie};box-shadow:0 30px 80px rgba(0,0,0,.5);overflow:hidden;border:${borde}px solid color-mix(in srgb,${c.tinta} 26%,${c.pal.superficie})`;
  const puntos = disp === "navegador" ? `<div style="position:absolute;left:0;right:0;top:0;height:${barra}px;background:color-mix(in srgb,${c.tinta} 10%,${c.pal.superficie});display:flex;gap:10px;align-items:center;padding:0 16px">${[0, 1, 2].map(() => `<i style="width:14px;height:14px;border-radius:50%;background:color-mix(in srgb,${c.tinta} 36%,transparent)"></i>`).join("")}</div>` : "";
  let cursor = "";
  if (p.cursor?.length) {
    const pts = p.cursor.map(([cx, cy, an], k) => ({ x: x + cx * wIn, y: y + barra + cy * (hIn - barra), t: an !== undefined ? c.t(an, null) : c.resp(0.3 + k * 0.8) }));
    const id = `${c.id}-cur`;
    pts.forEach((pt, k) => {
      if (k === 0) c.tl.push(`tl.set(${j(`#${id}`)},{x:${f(pt.x)},y:${f(pt.y)}},0);`);
      else c.tl.push(`tl.to(${j(`#${id}`)},{x:${f(pt.x)},y:${f(pt.y)},duration:.6,ease:"power2.inOut"},${f(Math.max(0, pt.t - 0.6))});`);
    });
    cursor = `<svg id="${id}" viewBox="0 0 24 24" width="${z.es916 ? 76 : 56}" style="position:absolute;left:0;top:0;z-index:5;filter:drop-shadow(0 3px 5px rgba(0,0,0,.6))"><path d="M4 2 L4 19 L9 15 L12.5 22 L15.5 20.5 L12 14 L19 14 Z" fill="#fff" stroke="#000" stroke-width="1.4" stroke-linejoin="round"/></svg>`;
  }
  let info = `<div id="${cam}" class="capa"><div style="position:absolute;${marcoEst}">${puntos}<img src="${html(src)}" alt="" style="position:absolute;left:0;top:${barra}px;width:100%;height:calc(100% - ${barra}px);object-fit:cover;object-position:top"></div>${cursor}</div>`;
  if (p.texto) {
    const a = ajustarCaja(caso(c, p.texto), fam.display, piel.pesoDisplay, { w: z.ancho, h: z.alto * 0.2 }, { porPalabra: relleno(c), lh: piel.lh, max: 84, min: z.minTexto, tracking: piel.track });
    info += ponerLineas(c, { lineas: a.lineas, x: z.x0, y: z.y0, px: a.px, tiempos: a.lineas.map(() => c.resp(0.1)), prefijo: `${c.id}-t`, acentos: acentosDe(p) });
  }
  return { info, heroe: [z.W / 2, (z.y0 + z.y1) / 2] };
}

// ── Código: líneas que se escriben, una tras otra, en su rejilla.
export function codigo(c, p) {
  const { z, fam } = c, lineas = p.lineas ?? [];
  if (!lineas.length) throw new Error(`el plano ${c.i + 1} (codigo) necesita lineas`);
  const piezas = lineas.map((l) => (typeof l === "string" ? { texto: l } : l));
  // Cada línea lleva su señal; lo que no cabe a lo ancho sigue debajo, alineado.
  const lineasCon = (t) => piezas.flatMap((o, k) => envolver(`${o.salida ? "" : "> "}${o.texto}`, fam.datos, 500, t, z.ancho).map((tx, q) => ({ tx, o, k, q })));
  let px = Math.max(z.minTexto, Math.min(z.es916 ? 150 : 110, ...piezas.flatMap((o) => o.texto.split(/\s+/)).map((w) => ajustarLinea(`> ${w}`, fam.datos, 500, z.ancho))));
  while (px > z.minTexto && lineasCon(px).length * px * 1.5 > z.alto * 0.8) px -= 2;
  const visuales = lineasCon(px);
  const alto = visuales.length * px * 1.5;
  const y0 = z.y0 + Math.max(0, (z.alto - alto) * 0.3);
  const horas = piezas.map((o, k) => Math.max(0, (o.en ? c.t(o.en, null) : c.dicho(o.texto, null)) ?? c.resp(0.1 + (k * (c.dur * 0.72)) / piezas.length)) - 0.05);
  let info = "";
  // El cursor ya parpadea antes de la primera línea: la pantalla nunca espera vacía.
  if (horas[0] > 0.12) {
    const idC = `${c.id}-cursor`;
    info += `<div class="libre" id="${idC}" style="left:${z.x0}px;top:${f(y0)}px;font-family:'${fam.datos}';font-weight:500;font-size:${f(px, 1)}px;color:${c.tinta}">&gt;&nbsp;<span id="${idC}-b" style="display:inline-block;width:.6em;height:1em;vertical-align:-.14em;background:currentColor"></span></div>`;
    for (let t = 0.3, k = 0; t < horas[0]; t += 0.3, k += 1) c.tl.push(`tl.set("#${idC}-b",{autoAlpha:${k % 2}},${f(t)});`);
    c.tl.push(`tl.set("#${idC}",{autoAlpha:0},${f(horas[0])});`);
  }
  visuales.forEach(({ tx, o, k, q }, n) => {
    const t = horas[k] + q * 0.3, id = `${c.id}-c${n}`, sangria = q ? "&nbsp;&nbsp;" : "";
    info += `<div class="libre" id="${id}" style="left:${z.x0}px;top:${f(y0 + n * px * 1.5)}px;font-family:'${fam.datos}';font-weight:500;font-size:${f(px, 1)}px;color:${o.acento ? c.acento : c.tinta}">${sangria}${html(tx)}</div>`;
    c.tl.push(ENTRADAS.teclear(`#${id}`, t, { letras: tx.length + 2 }));
    if (!q) c.sonar("trazo", t + 0.05, { g: -18 });
  });
  return { info, heroe: [z.W / 2, y0 + alto / 2] };
}

// ── Cierre: la frase que responde al inicio, y la marca real si la hay.
export function cierre(c, p) {
  const { z, piel, fam } = c;
  const texto = caso(c, p.frase ?? p.texto ?? "");
  const h = z.alto * (p.emblema || p.marca ? 0.62 : 0.8);
  const a = ajustarCaja(texto, fam.display, piel.pesoDisplay, { w: z.ancho, h }, { porPalabra: relleno(c), lh: piel.lh, max: z.horizontal ? 150 : 190, min: z.minTexto + 8, tracking: piel.track, frases: true });
  revisarTiempos(c, a.lineas);
  let px = a.px;
  if (piel.justifica) px = a.lineas.map((l) => Math.min(ajustarLinea(l, fam.display, piel.pesoDisplay, z.ancho), a.px * 1.5));
  const total = altoDe(px, a.lineas.length, piel.lh);
  const dEmblema = p.emblema ? (z.es916 ? 170 : 120) : 0;
  const altoMarca = p.emblema ? dEmblema + 34 : p.marca ? 110 : 0, altoLlamado = p.llamado ? 120 : 0;
  const y = z.y0 + Math.max(0, (z.alto - total - altoMarca - altoLlamado - 48) * 0.36);
  const horasLinea = horaDeCadaLinea(c, a.lineas);
  const tiempos = a.lineas.map((l, k) => Math.max(0, (horasLinea[k] ?? c.resp(0.1 + k * 0.24)) - 0.1));
  let info = ponerLineas(c, { lineas: a.lineas, x: z.x0, y, px, tiempos, prefijo: c.id, acentos: acentosDe(p) });
  c.sonar("cierre", Math.min(c.dur - 0.4, tiempos[tiempos.length - 1] + 0.3), { g: -15 });
  let yy = y + total + 40;
  const tMarca = Math.max(0.2, Math.min(c.dur - 0.9, tiempos[tiempos.length - 1] + 0.5));
  if (p.emblema) {
    const d = dEmblema, id = `${c.id}-em`;
    info += `<img id="${id}" src="${html(rutaLocal(p.emblema))}" alt="" style="position:absolute;left:${z.x0}px;top:${f(yy)}px;width:${d}px;height:${d}px;border-radius:50%;object-fit:cover">`;
    c.tl.push(c.entrada(`#${id}`, tMarca, { tipo: "revelar", dur: 0.3, y: 12 }));
    if (p.marca) {
      const pxM = Math.max(z.minTexto, Math.min(54, ajustarLinea(p.marca, fam.cuerpo, 600, z.ancho - d - 30)));
      const l = envolver(p.marca, fam.cuerpo, 600, pxM, z.ancho - d - 30);
      info += ponerLineas(c, { lineas: l, x: z.x0 + d + 30, y: yy + (d - l.length * pxM * 1.16) / 2, px: pxM, lh: 1.16, fam: fam.cuerpo, peso: 600, track: 0, tiempos: l.map(() => tMarca), prefijo: `${c.id}-m` });
    }
    yy += d + 30;
  } else if (p.marca) {
    const pxM = Math.max(z.minTexto, z.es916 ? 62 : 50), l = envolver(p.marca, fam.cuerpo, 600, pxM, z.ancho);
    info += ponerLineas(c, { lineas: l, x: z.x0, y: yy, px: pxM, lh: 1.16, fam: fam.cuerpo, peso: 600, track: 0, tiempos: l.map(() => tMarca), prefijo: `${c.id}-m` });
    yy += l.length * pxM * 1.16 + 24;
  }
  if (p.llamado) {
    const pxL = Math.max(z.minTexto, z.es916 ? 60 : 48), idl = `${c.id}-ll`;
    const w = Math.min(z.ancho, ancho(p.llamado, fam.cuerpo, 700, pxL) + pxL * 1.2);
    info += `<div class="ficha" id="${idl}" style="left:${z.x0}px;top:${f(yy)}px;width:${f(w)}px;height:${f(pxL * 1.9)}px;background:${c.acento};color:${c.suelo};border-color:${c.acento};font-family:'${fam.cuerpo}';font-weight:700;font-size:${pxL}px">${html(p.llamado)}</div>`;
    c.tl.push(c.entrada(`#${idl}`, tMarca + 0.16, { tipo: "revelar", dur: 0.3, y: 12 }));
  }
  const dicho = tramoDicho(c, texto);
  return { info, heroe: [z.W / 2, y + total / 2], sinSubEn: dicho ? [dicho[0], c.dur] : null };
}

// ── Video: una toma real a toda pantalla. Va al compás de la pieza: en un corte a un gráfico, la toma sigue corriendo por debajo.
export function video(c, p) {
  const { z, piel, fam } = c;
  const src = rutaLocal(p.src), id = `${c.id}-v`;
  const recorte = p.recorte !== undefined ? Number(p.recorte) : c.T0;
  if (!Number.isFinite(recorte) || recorte < 0) throw new Error("«recorte» son los segundos del video en que empieza este plano");
  const mundo = `<video id="${id}" class="clip foto" src="${html(src)}" muted playsinline data-start="0" data-duration="${f(c.dur)}" data-media-start="${f(recorte)}" data-track-index="0"></video>`;
  let info = "";
  if (p.texto) {
    const a2 = ajustarCaja(caso(c, p.texto), fam.display, piel.pesoDisplay, { w: z.ancho, h: z.alto * 0.3 }, { porPalabra: relleno(c), lh: piel.lh, max: 110, min: z.minTexto + 6, tracking: piel.track, frases: true });
    info = `<div class="capa" style="background:linear-gradient(180deg,color-mix(in srgb,${c.pal.fondo} 72%,transparent) 0%,transparent 34%)"></div>${ponerLineas(c, { lineas: a2.lineas, x: z.x0, y: z.y0, px: a2.px, tiempos: a2.lineas.map((l, k) => Math.max(0, (c.dicho(l, null) ?? c.resp(0.2 + k * 0.2)) - 0.1)), prefijo: c.id, acentos: acentosDe(p), color: c.pal.tinta })}`;
  }
  return { mundo, info, sinMundo: true, sinPantalla: true, heroe: [z.W / 2, z.H * 0.35] };
}

// ── Plantilla: una escena probada de library/plantillas, con sus textos y sus colores, o los de la pieza.
// La ráfaga no lleva textos sino una lista, y su largo sale de la duración del plano. Cada parada entra siempre; la última carta se queda hasta el final.
function rafaga(c, p, ficha) {
  const thumbs = path.join(RAIZ, "assets", "thumbs");
  const archivoDe = (id) => [path.join(thumbs, "propias", `${id}.webp`), path.join(thumbs, `${id}.webp`)].find((x) => fs.existsSync(x));
  const aLista = (x) => (Array.isArray(x) ? x : String(x ?? "").split(/[\s,;]+/)).map(String).filter(Boolean);
  const catalogo = JSON.parse(fs.readFileSync(path.join(RAIZ, "data", "styles.json"), "utf8")).map((e) => e.id).filter(archivoDe);
  const paradas = aLista(p.paradas);
  const pedida = aLista(p.lista);
  const mosaicoPedido = Array.isArray(p.mosaico) ? p.mosaico : typeof p.mosaico === "string" && !["todo", "no"].includes(p.mosaico) ? aLista(p.mosaico) : [];
  const ajenos = [...new Set([...paradas, ...pedida, ...mosaicoPedido])].filter((id) => !catalogo.includes(id));
  if (ajenos.length) throw new Error(`la ráfaga no tiene miniatura de ${ajenos.join(", ")}. Los ids están en data/styles.json`);
  const cadencia = Math.min(12, Math.max(1, Math.round(Number(p.cadencia ?? 2)) || 2));
  // El mosaico inicial dura 1,3 s y necesita plano para lucirse.
  let conMosaico = p.mosaico === true || p.mosaico === "todo" || mosaicoPedido.length > 0;
  if (conMosaico && c.dur < 2.2) { conMosaico = false; c.aviso(`dura ${c.dur} s: el mosaico inicial necesita 2,2 s o más, y se quitó`); }
  const libre = c.dur - (conMosaico ? 1.3 : 0);
  let pausa = Number(p.pausa ?? 0.5) || 0.5;
  if (paradas.length * pausa > libre * 0.8) {
    pausa = Math.round((libre * 0.8 / paradas.length) * 100) / 100;
    if (pausa < 0.35) c.aviso(`${paradas.length} paradas en ${libre.toFixed(1)} s: cada una dura ${pausa} s y su nombre casi no se lee. Deja menos paradas, o alarga el plano`);
  }
  // 0,4 s de reserva: la transición de salida cubre el final del plano, y la última parada debe verse entera.
  const caben = Math.max(0, Math.floor(((libre - 0.4 - paradas.length * pausa) * 30) / cadencia));
  // Sin lista, el catálogo revuelto siempre igual: seguidas se verían las familias enteras, y aquí importa la variedad.
  const huella = (s) => [...s].reduce((a, ch) => (Math.imul(a, 31) + ch.charCodeAt(0)) >>> 0, 7);
  const revuelto = catalogo.filter((id) => !paradas.includes(id)).sort((a, b) => huella(a) - huella(b));
  let lista;
  if (pedida.length) {
    let quedan = caben;
    lista = [...pedida, ...paradas.filter((id) => !pedida.includes(id))].filter((id) => paradas.includes(id) || quedan-- > 0);
  } else {
    const sueltas = revuelto.slice(0, caben);
    const huecos = paradas.length || 1;
    lista = [];
    paradas.forEach((id, k) => { lista.push(...sueltas.slice(Math.round((k * sueltas.length) / huecos), Math.round(((k + 1) * sueltas.length) / huecos)), id); });
    if (!paradas.length) lista = sueltas;
  }
  if (!lista.length) throw new Error("la ráfaga no tiene miniaturas: dale paradas, o alarga el plano");
  const usadas = [...new Set([...lista, ...paradas, ...(conMosaico ? (mosaicoPedido.length ? mosaicoPedido : catalogo) : [])])];
  // Un sonido donde se ve: el golpe del contador, el arranque de la baraja y cada parada.
  const sonidos = [];
  let t = conMosaico ? 1.3 : 0;
  if (conMosaico) sonidos.push({ t: 0.3, sonido: "golpe", ganancia: -12 });
  sonidos.push({ t, sonido: "barrido", ganancia: -16 });
  for (const id of lista) {
    if (paradas.includes(id)) sonidos.push({ t, sonido: "clic", ganancia: -14 });
    t += paradas.includes(id) ? pausa : cadencia / 30;
  }
  if (lista.length * (cadencia / 30) < libre / 3) c.aviso(`la ráfaga solo tiene ${lista.length} miniaturas para ${libre.toFixed(1)} s, y la última se queda quieta. Sube "cadencia", o pasa una "lista" más larga`);
  return {
    valores: {
      lista: lista.join(","), paradas: paradas.join(","), cadencia: String(cadencia), pausa: String(pausa),
      mosaico: conMosaico ? (mosaicoPedido.length ? mosaicoPedido : catalogo).join(",") : "no",
      etiqueta: String(p.etiqueta ?? "estilos"), carpeta: "assets/thumbs",
    },
    sonidos,
    copias: usadas.map((id) => [archivoDe(id), path.join("assets", "thumbs", `${id}.webp`)]),
  };
}

export function plantilla(c, p) {
  const id = String(p.estilo ?? p.plantilla ?? "");
  if (!/^[A-Za-z0-9-]+$/.test(id)) throw new Error(`la plantilla necesita "estilo", como "S16"`);
  const carpeta = path.join(RAIZ, "library", "plantillas", id);
  const fichero = path.join(carpeta, "escena.html");
  if (!fs.existsSync(fichero)) throw new Error(`no hay plantilla para ${id}. Mira library/plantillas/README.md, o usa otro tipo de plano`);
  if (c.z.W !== 1080 || c.z.H !== 1920) throw new Error(`la plantilla ${id} es vertical y esta pieza es ${c.z.W}×${c.z.H}. Usa un bloque del kit, o recompón la escena para este formato y móntala con {"tipo": "propia", "archivo": "escenas/${id}.html"}`);
  const ficha = JSON.parse(fs.readFileSync(path.join(carpeta, "ficha.json"), "utf8"));
  if (id === "rafaga") {
    const r = rafaga(c, p, ficha);
    for (const s of r.sonidos) if (s.t < c.dur) c.eventoLibre(s);
    return { externa: { id, archivo: fichero, ficha, valores: r.valores, copias: r.copias }, sinMundo: true };
  }
  const dadas = p.textos ?? {};
  for (const k of Object.keys(dadas)) {
    const v = (ficha.variables ?? []).find((x) => x.id === k);
    if (!v) throw new Error(`la plantilla ${id} no tiene la variable «${k}». Tiene: ${(ficha.variables ?? []).map((x) => x.id).join(", ")}`);
    if (v.max && String(dadas[k]).length > v.max) c.aviso(`«${dadas[k]}» pasa de ${v.max} caracteres: mira que quepa en un cuadro`);
  }
  const sinTexto = (ficha.variables ?? []).filter((v) => !(v.id in dadas)).map((v) => v.id);
  if (sinTexto.length) c.aviso(`${id} va con su texto de ejemplo en: ${sinTexto.join(", ")}. Escríbelos en "textos", o déjalos en "" para ocultarlos`);
  // Cada texto aterriza cuando la voz lo dice. «en» lo fija a mano; si no, se busca el propio texto en lo que se dice durante el plano.
  const anclas = [], fijadas = new Set();
  for (const [k, v] of Object.entries(p.en ?? {})) {
    if (!(ficha.variables ?? []).some((x) => x.id === k)) throw new Error(`la plantilla ${id} no tiene la variable «${k}» que nombra "en". Tiene: ${(ficha.variables ?? []).map((x) => x.id).join(", ")}`);
    const t = c.t(v, null);
    if (t !== null) { anclas.push([k, f(Math.max(0, t - 0.06))]); fijadas.add(k); }
  }
  if (p.anclar !== false) for (const [k, v] of Object.entries(dadas)) {
    if (fijadas.has(k) || !String(v).trim()) continue;
    const h = c.horas(v), dichas = h.filter((x) => x !== null);
    if (dichas.length >= Math.max(1, h.length * 0.8)) anclas.push([k, f(Math.max(0, dichas[0] - 0.06))]);
  }
  // Los sonidos de la ficha van a tiempos fijos: si los textos siguen a la voz, suena cada texto al llegar.
  const sonidos = ficha.sonidos ?? [];
  if (anclas.length) {
    const toma = sonidos.find((s) => s.t > 0.3) ?? sonidos[0];
    for (const s of sonidos.filter((x) => x.t <= 0.3)) c.eventoLibre(s);
    if (toma) for (const [, t] of anclas) c.eventoLibre({ ...toma, t });
  } else for (const s of sonidos) if (s.t < c.dur) c.eventoLibre(s);
  // Una escena con shader carga su motor desde el proyecto: sin él se queda en su degradado de reserva.
  const copias = [];
  if (ficha.requiere?.includes("assets/lib/shaders.iife.js")) {
    const lib = path.join(RAIZ, "library", "hyperframes-registro", "shaders", "lib");
    copias.push([path.join(lib, "shaders.iife.js"), path.join("assets", "lib", "shaders.iife.js")], [path.join(lib, "shaders.THIRD-PARTY-LICENSES.txt"), path.join("assets", "lib", "shaders.THIRD-PARTY-LICENSES.txt")]);
    c.aviso(`${id} usa WebGPU. Sin GPU, el plano se queda en su degradado de reserva: míralo en un cuadro, y si es tu caso usa otro estilo`);
  }
  return { externa: { id, archivo: fichero, ficha, valores: dadas, copias, anclas, dur: c.dur }, sinMundo: true };
}

// ── Propia: una escena escrita a mano, con el formato de library/plantillas/FORMATO.md. Se monta tal cual y sobrevive a otra corrida de armar.mjs.
export function propia(c, p) {
  const archivo = rutaLocal(p.archivo);
  if (!fs.existsSync(archivo)) throw new Error(`no existe ${archivo}. Escríbela con el formato de library/plantillas/FORMATO.md`);
  const fuente = fs.readFileSync(archivo, "utf8");
  const id = fuente.match(/data-composition-id="([^"]+)"/)?.[1];
  if (!id || !/^[A-Za-z][A-Za-z0-9-]*$/.test(id)) throw new Error(`${archivo} necesita en su raíz un data-composition-id con letras, números y guiones, que no empiece por un dígito`);
  if (/^(p\d+|main|transiciones|subtitulos)$/.test(id)) throw new Error(`${archivo}: el id «${id}» lo usa el kit. Ponle otro, como «mi-${id}»`);
  const w = Number(fuente.match(/data-width="(\d+)"/)?.[1]), h = Number(fuente.match(/data-height="(\d+)"/)?.[1]);
  if (w !== c.z.W || h !== c.z.H) throw new Error(`${archivo} mide ${w}×${h} y esta pieza es ${c.z.W}×${c.z.H}. Recompón la escena`);
  for (const s of p.sonidos ?? []) if (s.t < c.dur) c.eventoLibre(s);
  return { externa: { id, archivo, ficha: { fuentes: p.fuentes ?? [] }, valores: p.textos ?? {} }, sinMundo: true };
}

export const BLOQUES = { titulo, cifra, cifras, barras, linea, pasos, comparar, frase, diagrama, imagen, video, captura, codigo, cierre, plantilla, propia };

export const AYUDA = {
  titulo: { texto: "Hacer video|ya no cuesta", acento: "cuesta", alinea: "arriba | centro | abajo. «|» fuerza un salto de línea" },
  cifra: { valor: 74, prefijo: "", sufijo: " %", decimales: 0, rotulo: "de los equipos", barra: "0 a 1, opcional", fuente: "Quién lo midió, año", en: "@palabra opcional" },
  cifras: { items: [{ valor: 106, rotulo: "estilos", en: "@ciento" }] },
  barras: { titulo: "opcional", items: [{ rotulo: "Marzo", valor: 40, en: "@marzo", acento: true }], max: "opcional", sufijo: "en cada item", fuente: "opcional" },
  linea: { titulo: "opcional", serie: [10, 14, 22, 31], etiquetas: ["2021", "2024"], final: "+210 %", fuente: "opcional" },
  pasos: { items: [{ texto: "Eliges", icono: "nombre de Lucide, opcional", detalle: "opcional", en: "@eliges" }] },
  comparar: { a: { titulo: "Antes", texto: "Tres horas", en: "@antes" }, b: { titulo: "Ahora", texto: "Tres minutos", en: "@ahora" } },
  frase: { texto: "Un encargo claro hace un video claro.", acento: "claro. Se enciende con la voz y reemplaza a los subtítulos" },
  diagrama: { forma: "ciclo | flujo", nodos: [{ texto: "Escribe", en: "@escribe" }], centro: "Tu IA" },
  imagen: { src: "assets/img/foto.jpg", tratamiento: "duotono | natural", movimiento: "acercar | alejar", texto: "opcional", credito: "si la licencia lo pide" },
  video: { src: "toma-limpia.mp4", texto: "opcional, arriba", recorte: "segundo del video en que empieza; por defecto, el mismo de la pieza" },
  captura: { src: "assets/captura.png", dispositivo: "telefono | navegador", proporcion: "ancho/alto del marco", foco: [0.1, 0.2, 0.4, 0.2], en: "@palabra", zoom: 2.2, cursor: [[0.2, 0.3], [0.5, 0.4, "@aqui"]], texto: "opcional" },
  codigo: { lineas: ["npx hyperframes render", { texto: "Listo", salida: true, acento: true, en: "@listo" }] },
  cierre: { frase: "La frase que responde al inicio", acento: "inicio", emblema: "assets/emblema.png", marca: "Tu marca", llamado: "Sígueme" },
  plantilla: { estilo: "S16", textos: { titulo: "Las variables salen de su ficha.json" }, paleta: "propia, o una paleta del panel. Solo en 9:16" },
  propia: { archivo: "escenas/mi-escena.html", textos: { titulo: "Las variables de tu escena" }, fuentes: ["Sora"], sonidos: [{ t: 0.3, sonido: "clic", ganancia: -14 }], nota: "Tu escena, con el formato de library/plantillas/FORMATO.md. armar.mjs no la toca" },
};
