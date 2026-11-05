// El motor sin dibujo: lee film.js y responde qué hay en cada instante t. Sin DOM ni azar: también corre en Node.
// De aquí salen el video (pintor.js), las zonas (zonas.mjs) y el sonido (eventos.mjs). Todos leen el mismo dato.
import { BIBLIOTECA, TIPOS } from './objetos.js';
import { M, azar2, caja, cajaIso, iso, medirCaja, rng, transformar } from './solidos.js';
import { CARACTERES, FUENTES } from './metricas.js';

// Zonas: [x0, y0, x1, y1] de la información. El mundo llena todo el cuadro; esto solo vale para sujeto y textos.
export const FORMATOS = {
  '9:16': { W: 1080, H: 1920, zona: [72, 240, 1008, 1280], banda: [1300, 1540], titulo: 112, subtitulo: 54, rotulo: 46, ancho: 28 },
  '16:9': { W: 1920, H: 1080, zona: [96, 54, 1824, 821], banda: [842, 994], titulo: 108, subtitulo: 50, rotulo: 42, ancho: 42 },
  '1:1': { W: 1080, H: 1080, zona: [72, 54, 1008, 821], banda: [842, 994], titulo: 88, subtitulo: 46, rotulo: 40, ancho: 32 },
  '4:5': { W: 1080, H: 1350, zona: [72, 68, 1008, 1026], banda: [1053, 1242], titulo: 100, subtitulo: 48, rotulo: 42, ancho: 32 },
};

const sat = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const liso = (x) => { x = sat(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, u) => a + (b - a) * u;
export function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (t) => ((ax * t + bx) * t + cx) * t, Y = (t) => ((ay * t + by) * t + cy) * t;
  return (x) => { if (x <= 0) return 0; if (x >= 1) return 1; let lo = 0, hi = 1, t = x; for (let i = 0; i < 32; i++) { if (X(t) < x) lo = t; else hi = t; t = (lo + hi) / 2; } return Y(t); };
}
export const CURVAS = { camara: bezier(0.65, 0, 0.35, 1), entra: bezier(0.215, 0.61, 0.355, 1), enfasis: bezier(0.34, 1.36, 0.64, 1), sale: (x) => x * x, viaje: bezier(0.45, 0, 0.3, 1), sube: bezier(0.3, 0.1, 0.5, 1) };

// ── Colores ──────────────────────────────────────────────────────────────────
export const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const hex = (c) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
export const brillo = (h) => { const [r, g, b] = rgb(h); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
export const mez = (a, b, u) => { const p = rgb(a), q = rgb(b); return hex([lerp(p[0], q[0], u), lerp(p[1], q[1], u), lerp(p[2], q[2], u)]); };
export function coloresDe(P) {
  if (!P) throw new Error('Falta PALETA en film.js: { fondo, tinta, acento, secundario, superficie }, en hexadecimal.');
  for (const k of ['fondo', 'tinta', 'acento', 'secundario', 'superficie']) if (!/^#[0-9a-fA-F]{6}$/.test(P[k] ?? '')) throw new Error(`PALETA: falta ${k} en hexadecimal, como #E9A93B. Llegó: ${P[k]}`);
  const oscuro = brillo(P.fondo) < 0.5;
  const papel = oscuro ? P.tinta : mez(P.fondo, '#FFFFFF', 0.72);
  const negro = oscuro ? P.fondo : P.tinta;
  return {
    ...P, oscuro, papel, mez, negro,
    cuerpo: oscuro ? mez(P.superficie, P.tinta, 0.11) : mez(P.tinta, P.fondo, 0.2),
    linea: negro,
    claroPapel: mez(papel, '#FFFFFF', 0.38),
    sombraPapel: mez(P.secundario, negro, 0.42),
    oscuroSobre: (c) => (brillo(c) > 0.42 ? negro : papel),
  };
}

// ── Medir texto sin navegador ────────────────────────────────────────────────
const INDICE = new Map([...CARACTERES].map((c, i) => [c, i]));
function fuenteDe(familia, peso) {
  const candidatos = Object.keys(FUENTES).filter((k) => k.startsWith(`${familia}|`));
  if (!candidatos.length) return null;
  const cerca = candidatos.sort((a, b) => Math.abs(+a.split('|')[1] - peso) - Math.abs(+b.split('|')[1] - peso))[0];
  return FUENTES[cerca];
}
// El peso más cercano que la familia sí tiene: así el navegador no inventa una negrita.
export function pesoReal(peso, familia = 'Sora') {
  const hay = Object.keys(FUENTES).filter((k) => k.startsWith(`${familia}|`)).map((k) => +k.split('|')[1]);
  return hay.length ? hay.sort((a, b) => Math.abs(a - peso) - Math.abs(b - peso))[0] : peso;
}
export function medirTexto(texto, tam, peso = 600, familia = 'Sora') {
  const f = fuenteDe(familia, peso);
  if (!f) return texto.length * tam * 0.62;
  let total = 0;
  for (const ch of texto) { const i = INDICE.get(ch); total += i === undefined ? 620 : f.ancho[i]; }
  return (total / 1000) * tam;
}

// ── Subtítulos: máximo dos líneas de ≤ ancho. Si un grupo no cabe, se parte en sus comas o donde quepa, con los tiempos de sus palabras. ──
const CORTAS = new Set(['y', 'e', 'o', 'u', 'de', 'la', 'el', 'en', 'un', 'a', 'al', 'lo', 'se', 'con', 'las', 'los', 'por', 'que', 'una', 'del']);
function enDosLineas(ps, ancho) {
  const txt = ps.map((p) => p.palabra).join(' ');
  if (txt.length <= ancho) return [ps];
  let mejor = null;
  for (let i = 1; i < ps.length; i++) {
    const a = ps.slice(0, i).map((p) => p.palabra).join(' '), b = ps.slice(i).map((p) => p.palabra).join(' ');
    if (a.length > ancho || b.length > ancho) continue;
    const costo = Math.abs(a.length - b.length) + (CORTAS.has(ps[i - 1].palabra.toLowerCase().replace(/[.,;:]$/, '')) ? 14 : 0) - (/[.,;:?!]$/.test(ps[i - 1].palabra) ? 10 : 0);
    if (!mejor || costo < mejor.costo) mejor = { costo, i };
  }
  return mejor ? [ps.slice(0, mejor.i), ps.slice(mejor.i)] : null;
}
export function repartirSubtitulos(grupos, ancho) {
  const salida = [];
  for (const g of grupos) {
    const ps = g.palabras ?? [];
    if (!ps.length) continue;
    const partes = [];
    let actual = [];
    const clausulas = [];
    for (const p of ps) { actual.push(p); if (/[,;:]$/.test(p.palabra)) { clausulas.push(actual); actual = []; } }
    if (actual.length) clausulas.push(actual);
    let bloque = [];
    for (const cl of clausulas) {
      const prueba = bloque.concat(cl);
      if (enDosLineas(prueba, ancho)) { bloque = prueba; continue; }
      if (bloque.length) partes.push(bloque);
      bloque = cl;
    }
    if (bloque.length) partes.push(bloque);
    const finales = [];
    for (const parte of partes) {
      let resto = parte;
      while (!enDosLineas(resto, ancho)) {
        let i = resto.length - 1;
        while (i > 1 && !enDosLineas(resto.slice(0, i), ancho)) i--;
        // Sin palabras huérfanas: si lo que sobra es muy corto, se lleva algo más al siguiente grupo.
        if (resto.length - i === 1 && i > 2) i -= 2;
        finales.push(resto.slice(0, i));
        resto = resto.slice(i);
      }
      finales.push(resto);
    }
    finales.forEach((f, i) => salida.push({ inicio: f[0].inicio, fin: i < finales.length - 1 ? finales[i + 1][0].inicio : g.fin, lineas: enDosLineas(f, ancho) }));
  }
  return salida;
}

// ── La película ──────────────────────────────────────────────────────────────
export function crearPelicula(film, opciones = {}) {
  const formato = opciones.formato ?? film.FORMATO ?? '9:16', F = FORMATOS[formato];
  if (!F) throw new Error(`FORMATO: «${formato}» no existe. Usa ${Object.keys(FORMATOS).join(', ')}.`);
  const DUR = film.DUR;
  if (!(DUR > 0)) throw new Error('DUR debe ser mayor que 0.');
  const c = coloresDe(film.PALETA);
  const FAM = { titulos: film.FUENTES?.titulos ?? 'Sora', datos: film.FUENTES?.datos ?? 'JetBrains Mono' };
  c.medir = (t, tam, peso) => medirTexto(t, tam, peso, FAM.titulos);
  const { W, H } = F;
  const espejoPedido = opciones.espejo ?? film.ESPEJO;

  // Revisa nombres antes de empezar: un error claro cuesta menos que un cuadro raro.
  const crudos = film.OBJETOS ?? [];
  const nombres = new Set(crudos.map((o) => o.id));
  if (nombres.size !== crudos.length) throw new Error('OBJETOS: hay dos objetos con el mismo id.');
  const quiere = (id, donde) => { if (id !== 'todo' && !nombres.has(id)) throw new Error(`${donde}: no existe el objeto «${id}». Hay: ${[...nombres].join(', ')}`); };
  if (!crudos.length) throw new Error('OBJETOS: hace falta al menos un objeto.');
  for (const x of film.TEXTOS ?? []) {
    if (!Array.isArray(x.t)) throw new Error(`TEXTOS: «${x.texto ?? x.partes?.[0]?.texto}» necesita t: [desde, hasta].`);
    if (!x.texto && !x.partes) throw new Error(`TEXTOS: una entrada no tiene texto ni partes: ${JSON.stringify(x)}`);
    if (x.como === 'rotulo' && !x.sobre) throw new Error(`TEXTOS: el rótulo «${x.texto}» necesita sobre: 'id'.`);
    if (x.como && x.como !== 'titulo' && x.como !== 'rotulo') throw new Error(`TEXTOS: como: «${x.como}» no existe. Usa titulo o rotulo.`);
  }
  for (const o of crudos) {
    if (!o.id) throw new Error(`OBJETOS: falta id en ${JSON.stringify(o)}`);
    if (!BIBLIOTECA[o.tipo]) throw new Error(`OBJETOS: el tipo «${o.tipo}» de «${o.id}» no existe. Hay: ${TIPOS.join(', ')}`);
    if (o.sobre) quiere(o.sobre, `«${o.id}».sobre`);
    for (const m of o.mueve ?? []) if (m.a) quiere(m.a, `«${o.id}».mueve`);
  }

  function armar(espejo) {
    const E = espejo ? -1 : 1;
    // El espejo solo cambia dónde quedan las mesas: lo que está encima de cada una conserva su arreglo.
    const objs = crudos.map((o, i) => ({
      ...o, i, x: o.x ?? 0, y: (o.y ?? 0) * (o.sobre ? 1 : E), lib: BIBLIOTECA[o.tipo], peso: o.peso ?? 1,
      escala: typeof o.tam === 'number' ? o.tam : 1,
      mueve: (o.mueve ?? []).map((m) => ({ ...m, y: (m.y ?? 0) * (m.a ? 1 : E), x: m.x ?? 0, t0: m.t[0], t1: m.t[1] })),
    }));
    const porId = new Map(objs.map((o) => [o.id, o]));
    for (const o of objs) o.padre = o.sobre ? porId.get(o.sobre) : null;
    return { objs, porId, E };
  }

  const altoDe = (o, esc = o.escala) => (typeof o.lib.alto === 'function' ? o.lib.alto(o) : o.lib.alto ?? 1) * esc;
  // El tamaño puede cambiar en un viaje: un paquete diminuto llega grande a la mesa siguiente.
  function escalaEn(o, t) {
    let s = o.escala;
    for (const m of o.mueve) {
      if (t <= m.t0 || m.tam === undefined) continue;
      if (t >= m.t1) { s = m.tam; continue; }
      const u = (CURVAS[m.curva] ?? CURVAS.viaje)((t - m.t0) / (m.t1 - m.t0));
      s = s * Math.pow(m.tam / s, u);
      break;
    }
    return s;
  }

  // Posición de la base de un objeto en t, sin contar su entrada. La memoria se limpia en cada instante.
  function crearPoses({ objs, porId, E }) {
    const memo = new Map();
    let tMemo = NaN;
    const poner = (t) => { if (t !== tMemo) { memo.clear(); tMemo = t; } };

    function origen(o, t) {
      if (o.padre) { const q = tope(o.padre, t); return [q[0] + o.x, q[1] + o.y, q[2] + (o.z ?? 0)]; }
      return [o.x, o.y, o.z ?? 0];
    }
    function destino(m, t) {
      if (m.a) { const q = tope(porId.get(m.a), t); return [q[0] + m.x, q[1] + m.y, q[2] + (m.z ?? 0)]; }
      if (m.camino) { const cm = caminos.get(m.camino); if (!cm) throw new Error(`mueve: no existe el camino «${m.camino}».`); const q = cm.puntos[cm.puntos.length - 1]; return [q[0], q[1], m.z ?? cm.z ?? 0.06]; }
      return [m.x, m.y, m.z ?? 0];
    }
    function base(o, t) {
      let p = origen(o, t);
      for (const m of o.mueve) {
        if (t <= m.t0) break;
        if (t >= m.t1) { p = destino(m, t); continue; }
        const u = (CURVAS[m.curva] ?? CURVAS.viaje)((t - m.t0) / (m.t1 - m.t0));
        if (m.camino) {
          const cm = caminos.get(m.camino), q = puntoEn(cm, u);
          p = [q[0], q[1], lerp(p[2], m.z ?? 0.06, sat(u * 6)) + 0.1 * Math.sin(sat((u - 0.02) / 0.96) * Math.PI)];
        } else {
          const q = destino(m, t), arco = m.arco ?? 1.2;
          p = [lerp(p[0], q[0], u), lerp(p[1], q[1], u), lerp(p[2], q[2], u) + arco * 4 * u * (1 - u)];
        }
        break;
      }
      return p;
    }
    // Lo que agrega la entrada, los saltos y los golpes de lo que cae encima.
    function animacion(o, t) {
      const r = { vis: true, dz: 0, sx: 1, sy: 1, sz: 1, piezaDz: null };
      // Mientras siga apoyado en su padre, no aparece antes que él.
      if (o.padre && !(o.mueve[0] && t >= o.mueve[0].t0)) {
        const pa = pos(o.padre, t).a;
        if (!pa.vis || (o.padre.como === 'arma' && t < o.padre.entra)) { r.vis = false; return r; }
      }
      if (o.entra !== undefined) {
        const tau = t - o.entra, como = o.como ?? 'cae', dura = o.dura ?? (como === 'cae' ? 0.36 : como === 'arma' ? 0.28 : 0.34);
        if (como === 'cae') {
          if (tau < -dura) { r.vis = false; return r; }
          const alt = o.altura ?? 5.5;
          if (tau < 0) { const u = -tau / dura; r.dz = alt * u * u; r.sz = 1 + 0.08 * (1 - u); r.sx = r.sy = 1 - 0.03 * (1 - u); }
          else {
            const dureza = o.blando ?? 0.16, T = 0.17, A = Math.min(0.24, alt * 0.04) * Math.max(0.5, o.escala);
            if (tau < T) r.dz = A * 4 * (tau / T) * (1 - tau / T);
            else if (tau < T * 1.65) { const s = (tau - T) / (T * 0.65); r.dz = A * 0.26 * 4 * s * (1 - s); }
            const q = dureza * Math.exp(-tau / 0.07) * Math.cos(tau * 24);
            r.sz = 1 - q; r.sx = r.sy = 1 + q * 0.45;
          }
        } else if (como === 'arma') {
          const paso = o.paso ?? 0.09;
          r.piezaDz = (i, n) => {
            const tp = o.entra - (n - 1 - i) * paso, ta = t - tp;
            if (ta < -dura) return null;
            if (ta < 0) { const u = -ta / dura; return (o.altura ?? 2.6) * u * u; }
            return ta < 0.13 ? 0.05 * 4 * (ta / 0.13) * (1 - ta / 0.13) : 0;
          };
        } else if (como === 'sube') {
          if (tau < 0) { r.vis = false; return r; }
          r.sz = Math.max(0.001, CURVAS.enfasis(tau / dura));
        } else if (como === 'crece') {
          if (tau < 0) { r.vis = false; return r; }
          const k = Math.max(0.001, CURVAS.enfasis(tau / dura));
          r.sx = r.sy = r.sz = k;
        } else if (como !== 'ya') throw new Error(`«${o.id}»: entrada «${como}» no existe. Usa cae, arma, sube, crece o ya.`);
        else if (tau < 0) { r.vis = false; return r; }
      }
      if (o.sale !== undefined) {
        const tau = t - o.sale, como = o.como_sale ?? 'encoge', d = o.dura_sale ?? 0.26;
        if (tau >= 0) { r.vis = false; return r; }
        if (tau > -d) {
          const u = CURVAS.sale(1 + tau / d);
          if (como === 'encoge') { r.sx *= 1 - u; r.sy *= 1 - u; r.sz *= 1 - u; }
          else if (como === 'baja') r.sz *= 1 - u;
          else if (como === 'vuela') r.dz += 7 * u;
        }
      }
      for (const ts of [].concat(o.salta ?? [])) { const u = (t - ts) / 0.34; if (u > 0 && u < 1) r.dz += (o.brinco ?? 0.55) * 4 * u * (1 - u); }
      for (const g of o.golpes ?? []) { const tau = t - g.t; if (tau >= 0 && tau < 0.5) r.dz -= g.fuerza * Math.exp(-tau / 0.07) * Math.cos(tau * 26); }
      return r;
    }
    function pos(o, t) {
      poner(t);
      const v = memo.get(o);
      if (v) return v;
      const p = base(o, t), a = animacion(o, t), salida = { x: p[0], y: p[1], z: p[2] + a.dz, a, esc: escalaEn(o, t) };
      memo.set(o, salida);
      return salida;
    }
    function tope(o, t) {
      const p = pos(o, t);
      return [p.x, p.y, p.z + altoDe(o, p.esc) * p.a.sz];
    }
    return { pos, tope };
  }

  function estado(o, t) {
    const e = { t };
    for (const nombre of o.lib.acciones ?? []) {
      const v = o[nombre];
      if (v === undefined) continue;
      if (nombre === 'gira') { const [a, b] = Array.isArray(v) ? v : [0, DUR]; e.gira = Math.max(0, Math.min(t, b) - a); continue; }
      if (v === true) { e[nombre] = 1; continue; }
      if (typeof v === 'number') { e[nombre] = liso((t - v) / 0.32); continue; }
      // Una lista de rangos repite la acción: vale el último que ya empezó.
      const r = Array.isArray(v[0]) ? v.filter((q) => t >= q[0]).pop() ?? v[0] : v;
      e[nombre] = liso((t - r[0]) / Math.max(0.01, r[1] - r[0]));
    }
    return e;
  }
  function piezasDe(o, t, p, reposo, tAccion = t) {
    const piezas = o.lib.crear(o, estado(o, tAccion), c), a = reposo ? { sx: 1, sy: 1, sz: 1, piezaDz: null } : p.a, s = p.esc ?? o.escala;
    const giro = o.gira_fijo ? M.rotZ((o.gira_fijo * Math.PI) / 180) : null;
    let mt = M.por(M.mover(p.x, p.y, p.z), M.escala(s * a.sx, s * a.sy, s * a.sz));
    if (giro) mt = M.por(mt, giro);
    const salida = [];
    piezas.forEach((pr, i) => {
      let m = mt;
      if (a.piezaDz) { const dz = a.piezaDz(i, piezas.length); if (dz === null) return; m = M.por(M.mover(0, 0, dz), mt); }
      transformar(pr, m);
      pr.grupo = o.i;
      pr.orden = i;
      medirCaja(pr);
      salida.push(pr);
    });
    return salida;
  }

  // ── Caminos ────────────────────────────────────────────────────────────────
  let caminos = new Map();
  function longitudes(cm) {
    cm.tramos = [];
    let total = 0;
    for (let i = 0; i < cm.puntos.length - 1; i++) { const a = cm.puntos[i], b = cm.puntos[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1], (b[2] ?? 0) - (a[2] ?? 0)); cm.tramos.push(l); total += l; }
    cm.largo = total;
  }
  function puntoEn(cm, u) {
    let d = sat(u) * cm.largo;
    for (let i = 0; i < cm.tramos.length; i++) {
      if (d <= cm.tramos[i] || i === cm.tramos.length - 1) {
        const f = sat(d / (cm.tramos[i] || 1)), a = cm.puntos[i], b = cm.puntos[i + 1];
        return [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2] ?? 0, b[2] ?? 0, f)];
      }
      d -= cm.tramos[i];
    }
    return cm.puntos[cm.puntos.length - 1];
  }
  function armarCaminos(mundo, poses) {
    const salida = new Map(), lista = film.CAMINOS ?? [];
    for (const k of lista) {
      if (k.de) quiere(k.de, `Camino «${k.id}».de`);
      if (k.a) quiere(k.a, `Camino «${k.id}».a`);
      const t0 = k.crece ? k.crece[0] : 0, t1 = k.crece ? k.crece[1] : DUR;
      const pa = k.desde ? [k.desde[0], k.desde[1] * mundo.E, 0] : poses.tope(mundo.porId.get(k.de), t0 + 1e-3);
      const pb = k.hasta ? [k.hasta[0], k.hasta[1] * mundo.E, 0] : poses.tope(mundo.porId.get(k.a), t1 + 1e-3);
      let puntos;
      if (k.aereo) {
        puntos = [];
        const alt = k.altura ?? 3;
        for (let i = 0; i <= 48; i++) { const u = i / 48; puntos.push([lerp(pa[0], pb[0], u), lerp(pa[1], pb[1], u), lerp(pa[2], pb[2], u) + alt * 4 * u * (1 - u)]); }
      } else {
        const ruta = k.ruta ?? 'xy', por = (k.por ?? []).map(([x, y]) => [x, y * mundo.E, 0]);
        puntos = [[pa[0], pa[1], 0]];
        if (por.length) puntos.push(...por);
        else if (ruta === 'xy' && pa[0] !== pb[0] && pa[1] !== pb[1]) puntos.push([pb[0], pa[1], 0]);
        else if (ruta === 'yx' && pa[0] !== pb[0] && pa[1] !== pb[1]) puntos.push([pa[0], pb[1], 0]);
        puntos.push([pb[0], pb[1], 0]);
      }
      const cm = { ...k, puntos, t0, t1, aereo: Boolean(k.aereo), z: pb[2] };
      longitudes(cm);
      salida.set(k.id, cm);
    }
    return salida;
  }

  // ── Reposo: cuánto ocupa un objeto en pantalla sin contar su entrada ───────
  function cajaObjeto(mundo, poses, o, t, tAccion = t) {
    const b = poses.pos(o, t);
    const prs = piezasDe(o, t, { x: b.x, y: b.y, z: b.z - b.a.dz, a: b.a, esc: b.esc }, true, tAccion);
    return cajaIso(prs);
  }
  function cajaDeLista(mundo, poses, ids, t, tAccion = t) {
    const lista = ids === 'todo' ? mundo.objs.filter((o) => o.encuadre !== false && !(o.sale !== undefined && o.sale <= t)) : [].concat(ids).map((id) => mundo.porId.get(id));
    let u0 = Infinity, v0 = Infinity, u1 = -Infinity, v1 = -Infinity;
    for (const o of lista) { const q = cajaObjeto(mundo, poses, o, t, tAccion); u0 = Math.min(u0, q.u0); v0 = Math.min(v0, q.v0); u1 = Math.max(u1, q.u1); v1 = Math.max(v1, q.v1); }
    return { u0, v0, u1, v1 };
  }

  // ── Títulos: en la franja de arriba o en una columna a la izquierda, sin pisar el sujeto ──
  function disponerTitulo(o, lugar) {
    const z = F.zona, anchoZ = z[2] - z[0], columna = lugar === 'izquierda';
    const anchoMax = columna ? Math.round(anchoZ * 0.36) : anchoZ;
    const partes = o.partes ?? [{ texto: o.texto, t: o.t[0] }];
    const palabras = [];
    partes.forEach((p, ip) => p.texto.split(/\s+/).filter(Boolean).forEach((w) => palabras.push({ texto: w, t: p.t, parte: ip, color: p.color })));
    const peso = pesoReal(o.peso ?? 700, FAM.titulos), base = o.tam ?? F.titulo, sep = o.partes ? 0.5 : 0.28;
    const acomoda = (tam) => {
      const lineas = [[]];
      let x = 0;
      for (const w of palabras) {
        const a = medirTexto(w.texto, tam, peso, FAM.titulos), g = lineas[lineas.length - 1].length ? tam * sep : 0;
        if (x + g + a > anchoMax && lineas[lineas.length - 1].length) { lineas.push([]); x = 0; lineas[lineas.length - 1].push({ ...w, ancho: a, dx: 0 }); x = a; continue; }
        lineas[lineas.length - 1].push({ ...w, ancho: a, dx: x + g });
        x += g + a;
      }
      return lineas;
    };
    let tam = base, lin = acomoda(tam);
    if (lin.length > 1 && !columna) { const unaLinea = palabras.reduce((s, w) => s + medirTexto(w.texto, 1, peso, FAM.titulos), 0) + (palabras.length - 1) * sep; const t1 = anchoMax / unaLinea; if (t1 >= base * 0.7) { tam = Math.floor(t1 * 0.995); lin = acomoda(tam); } }
    const anchoPalabra = Math.max(...palabras.map((w) => medirTexto(w.texto, 1, peso, FAM.titulos)));
    if (anchoPalabra * tam > anchoMax) { tam = Math.floor(anchoMax / anchoPalabra); lin = acomoda(tam); }
    while (lin.length > (columna ? 4 : 2) && tam > 40) { tam -= 4; lin = acomoda(tam); }
    const alto = tam * 1.14, totalAlto = lin.length * alto;
    const y0 = columna ? Math.round((z[1] + z[3]) / 2 - totalAlto / 2) : z[1];
    const lineas = lin.map((ws, i) => ({ y: y0 + i * alto, alto, palabras: ws.map((w) => ({ ...w, x: z[0] + w.dx })) }));
    const x1 = Math.max(...lineas.map((l) => { const u = l.palabras[l.palabras.length - 1]; return u.x + u.ancho; }));
    return { tam, peso, lineas, caja: [z[0], y0, x1, y0 + totalAlto], lugar, partes: partes.length };
  }
  const zonaLibre = (dT) => {
    const z = F.zona;
    if (!dT) return [z[0], z[1], z[2], z[3]];
    const gap = Math.round(H * 0.012);
    return dT.lugar === 'izquierda' ? [dT.caja[2] + gap * 2, z[1], z[2], z[3]] : [z[0], dT.caja[3] + gap, z[2], z[3]];
  };
  const encuadre = (b, zl, llena) => {
    const bw = Math.max(0.01, b.u1 - b.u0), bh = Math.max(0.01, b.v1 - b.v0), k = Math.min((zl[2] - zl[0]) / bw, (zl[3] - zl[1]) / bh) * llena;
    return { k, cu: (b.u0 + b.u1) / 2 - ((zl[0] + zl[2]) / 2 - W / 2) / k, cv: (b.v0 + b.v1) / 2 - ((zl[1] + zl[3]) / 2 - H / 2) / k };
  };

  // ── Armado: se prueba con y sin espejo, y se queda con el que deja más grande la toma general ──
  function ensayo(espejo) {
    const mundo = armar(espejo), poses = crearPoses(mundo);
    caminos = armarCaminos(mundo, poses);
    return { mundo, poses, caminos };
  }
  let elegido;
  if (espejoPedido === undefined) {
    const prueba = (espejo) => { const en = ensayo(espejo), b = cajaDeLista(en.mundo, en.poses, 'todo', DUR); return encuadre(b, F.zona, 1).k; };
    elegido = ensayo(prueba(true) > prueba(false) * 1.04);
  } else elegido = ensayo(Boolean(espejoPedido));
  const { mundo, poses } = elegido;
  caminos = elegido.caminos;
  const espejo = mundo.E < 0;

  // Golpes sobre lo que recibe cada caída, y ondas en el suelo.
  const ondas = [];
  for (const o of mundo.objs) {
    if (o.entra === undefined) continue;
    const como = o.como ?? 'cae';
    if (como !== 'cae' && como !== 'arma') continue;
    const fuerza = 0.05 * o.peso;
    if (o.padre) { (o.padre.golpes ??= []).push({ t: o.entra, fuerza }); }
    let raiz = o;
    while (raiz.padre) raiz = raiz.padre;
    ondas.push({ t: o.entra, x: raiz.x, y: raiz.y, fuerza: o.peso });
  }
  for (const o of mundo.objs) for (const m of o.mueve) if (m.a && m.golpe !== false) { const d = mundo.porId.get(m.a); (d.golpes ??= []).push({ t: m.t1, fuerza: 0.04 * o.peso }); }

  // ── Títulos con su lugar, y cámara ─────────────────────────────────────────
  const planos = (film.CAMARA ?? []).map((p) => ({ ...p })).sort((a, b) => a.desde - b.desde);
  if (!planos.length) throw new Error('CAMARA: hace falta al menos un plano.');
  const planoEn = (t) => { let s = planos[0]; for (const p of planos) if (p.desde <= t + 1e-6) s = p; return s; };
  for (const p of planos) { p.llega = p.corte ? 0 : p.llega ?? 0.7; p.ta = p.desde + p.llega; if (p.mira) for (const id of [].concat(p.mira)) quiere(id, 'CAMARA.mira'); if (p.sigue) quiere(p.sigue, 'CAMARA.sigue'); }
  const titulos = (film.TEXTOS ?? []).filter((x) => (x.como ?? 'titulo') === 'titulo').map((x) => ({ ...x }));
  for (const o of titulos) {
    const lugares = ['arriba'];
    if (W > H) lugares.push('izquierda');
    const pl = planoEn(o.t[0] + 0.4), b = cajaDeLista(mundo, poses, pl.mira ?? pl.sigue ?? 'todo', Math.min(DUR, pl.ta + 0.01));
    let mejor = null;
    for (const lugar of lugares) { const d = disponerTitulo(o, lugar), k = encuadre(b, zonaLibre(d), 1).k; if (!mejor || k > mejor.k * 1.02) mejor = { k, d }; }
    o.disp = mejor.d;
  }
  const tituloEn = (t) => titulos.find((o) => t >= o.t[0] - 0.02 && t < o.t[1]);
  planos.forEach((p, i) => { p.fin = i + 1 < planos.length ? planos[i + 1].desde : DUR; });
  for (const p of planos) {
    const ta = Math.min(DUR, p.ta + 0.01), dT = tituloEn(ta)?.disp;
    p.zl = zonaLibre(dT);
    p.llena = p.llena ?? 0.92;
    if (p.mira) p.fijo = encuadre(cajaDeLista(mundo, poses, p.mira, ta, Math.max(ta, p.fin - 0.01)), p.zl, p.llena);
    else if (p.sigue) p.cajaSigue = cajaObjeto(mundo, poses, mundo.porId.get(p.sigue), ta);
    // Se acerca muy lento, salvo que haya rótulos: el texto no se mueve mientras se lee.
    p.deriva = p.deriva ?? ((film.TEXTOS ?? []).some((x) => x.como === 'rotulo' && x.t[0] < p.fin && x.t[1] > p.ta) ? 0 : 0.011);
  }
  const mezclaCam = (a, b, u) => {
    const r = Math.log(b.k / a.k), k = a.k * Math.exp(r * u);
    const g = Math.abs(r) < 1e-3 ? u : (1 / k - 1 / a.k) / (1 / b.k - 1 / a.k);
    return { k, cu: lerp(a.cu, b.cu, g), cv: lerp(a.cv, b.cv, g) };
  };
  function objetivo(p, t) {
    let q = p.fijo;
    if (p.sigue) {
      const o = mundo.porId.get(p.sigue), base = encuadre(p.cajaSigue, p.zl, p.llena), a = poses.pos(o, p.ta), b = poses.pos(o, t), [ua, va] = iso(a.x, a.y, a.z), [ub, vb] = iso(b.x, b.y, b.z);
      q = { k: base.k, cu: base.cu + ub - ua, cv: base.cv + vb - va };
    }
    if (t > p.ta && p.deriva) {
      const k = q.k * (1 + p.deriva * (t - p.ta)), zx = (p.zl[0] + p.zl[2]) / 2 - W / 2, zy = (p.zl[1] + p.zl[3]) / 2 - H / 2;
      return { k, cu: q.cu + zx / q.k - zx / k, cv: q.cv + zy / q.k - zy / k };
    }
    return q;
  }
  function camaraSinTemblor(t) {
    let i = 0;
    for (let j = 0; j < planos.length; j++) if (planos[j].desde <= t + 1e-9) i = j;
    const p = planos[i], tgt = objetivo(p, t);
    if (!p.llega || t >= p.ta || i === 0) return tgt;
    const previa = (p.previa ??= camaraSinTemblor(p.desde - 1e-6));
    return mezclaCam(previa, tgt, CURVAS[p.curva ?? 'camara']((t - p.desde) / p.llega));
  }
  const temblores = [];
  for (const o of mundo.objs) if (o.entra !== undefined && (o.como ?? 'cae') === 'cae' && o.peso >= 2 && o.entra > 0) temblores.push({ t: o.entra, a: o.peso });
  function camara(t) {
    const q = camaraSinTemblor(t);
    let dy = 0, dx = 0;
    for (const s of temblores) {
      const tau = t - s.t;
      if (tau > 0 && tau < 0.5) { const e = Math.exp(-tau / 0.09); dy += s.a * 5 * e * Math.cos(tau * 62); dx += s.a * 1.5 * e * Math.sin(tau * 47); }
    }
    return { ...q, cu: q.cu + dx / q.k, cv: q.cv + dy / q.k };
  }

  // ── Suelo: losas y relieve. Cerca de los objetos queda plano; lejos crece. ──
  const S = { celda: film.SUELO?.celda ?? 1, relieve: film.SUELO?.relieve ?? 1, semilla: film.SUELO?.semilla ?? 3, claro: film.SUELO?.claro ?? 1, tonos: 5 };
  const raices = mundo.objs.filter((o) => !o.padre && o.encuadre !== false);
  const claros = raices.map((o) => {
    const q = piezasDe(o, DUR, { ...poses.pos(o, DUR), z: 0, a: { sx: 1, sy: 1, sz: 1 } }, true);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const pr of q) { x0 = Math.min(x0, pr.aabb[0]); y0 = Math.min(y0, pr.aabb[1]); x1 = Math.max(x1, pr.aabb[3]); y1 = Math.max(y1, pr.aabb[4]); }
    return [x0, y0, x1, y1];
  });
  for (const cm of caminos.values()) if (!cm.aereo) for (const q of cm.puntos) claros.push([q[0] - 0.5, q[1] - 0.5, q[0] + 0.5, q[1] + 0.5]);
  const memoCelda = new Map();
  function celda(i, j) {
    const clave = i * 100003 + j;
    let v = memoCelda.get(clave);
    if (v) return v;
    const x = (i + 0.5) * S.celda, y = (j + 0.5) * S.celda;
    let d = Infinity;
    for (const q of claros) { const dx = Math.max(q[0] - x, 0, x - q[2]), dy = Math.max(q[1] - y, 0, y - q[3]); d = Math.min(d, Math.max(dx, dy)); }
    const a = azar2(i, j, S.semilla), b = azar2(i, j, S.semilla + 1), g = azar2(i >> 2, j >> 2, S.semilla + 2), prox = sat((d - S.claro) / 6);
    const sube = S.relieve > 0 && a < 0.07 + 0.22 * prox + 0.2 * g * prox ? prox * (0.28 + b * b * 2) * S.relieve : 0;
    const h = Math.round(sube * 4) / 4;
    v = { h, tono: Math.floor(azar2(i, j, S.semilla + 3) * S.tonos), panel: azar2(i, j, S.semilla + 4) < 0.12, led: h > 0.2 && azar2(i, j, S.semilla + 5) < 0.09, d };
    memoCelda.set(clave, v);
    return v;
  }
  function alturaCelda(i, j, t) {
    const v = celda(i, j);
    let h = v.h;
    const x = (i + 0.5) * S.celda, y = (j + 0.5) * S.celda;
    for (const o of ondas) {
      const tau = t - o.t;
      if (tau <= 0 || tau > 1.1) continue;
      const dist = Math.hypot(x - o.x, y - o.y), u = (tau - dist * 0.042) / 0.34;
      if (u > 0 && u < 1 && dist > 0.5) h += o.fuerza * 0.26 * Math.sin(Math.PI * u) * Math.exp(-dist * 0.1) * sat(v.d / 1.5 + 0.28);
    }
    return Math.max(0, h);
  }

  // ── Textos ─────────────────────────────────────────────────────────────────
  const anchoSub = F.ancho;
  const grupos = film.SUBTITULOS === false ? [] : repartirSubtitulos(film.TIEMPOS?.grupos ?? [], anchoSub);
  const rotulos = (film.TEXTOS ?? []).filter((x) => x.como === 'rotulo').map((x) => { if (x.sobre) quiere(x.sobre, `Rótulo «${x.texto}»`); return { ...x }; });
  function subtituloEn(t) {
    const g = grupos.find((s) => t >= s.inicio - 0.02 && t < s.fin);
    if (!g) return null;
    const tam = F.subtitulo, peso = pesoReal(600, FAM.titulos), alto = Math.round(tam * 1.28), pad = Math.round(tam * 0.34), hueco = medirTexto(' ', tam, peso, FAM.titulos);
    const anchos = g.lineas.map((ps) => ps.reduce((s, p, i) => s + medirTexto(p.palabra, tam, peso, FAM.titulos) + (i ? hueco : 0), 0));
    const aMax = Math.max(...anchos), caja = [W / 2 - aMax / 2 - pad * 1.2, 0, W / 2 + aMax / 2 + pad * 1.2, 0], hTotal = g.lineas.length * alto + pad * 1.2;
    caja[1] = Math.round((F.banda[0] + F.banda[1]) / 2 - hTotal / 2);
    caja[3] = caja[1] + hTotal;
    const lineas = g.lineas.map((ps, i) => {
      let x = W / 2 - anchos[i] / 2;
      const y = caja[1] + pad * 0.6 + alto * (i + 0.5);
      return { y, palabras: ps.map((p) => { const a = medirTexto(p.palabra, tam, peso, FAM.titulos), r = { texto: p.palabra, x, ancho: a, activa: t >= p.inicio - 0.02 && t < p.fin }; x += a + hueco; return r; }) };
    });
    return { tipo: 'subtitulo', tam, peso, caja, lineas, entra: sat((t - g.inicio) / 0.07), sale: sat((g.fin - t) / 0.07), texto: g.lineas.flat().map((p) => p.palabra).join(' ') };
  }
  const medidasRotulo = (o) => { const tam = o.tam ?? F.rotulo, peso = pesoReal(o.peso ?? 600, FAM.titulos), pad = Math.round(tam * 0.4); return { tam, peso, ancho: medirTexto(o.texto, tam, peso, FAM.titulos) + pad * 2, alto: Math.round(tam * 1.42), leader: o.alzado ?? Math.round(tam * 0.9) }; };
  const anclaRotulo = (o, t, cam) => {
    const tp = poses.tope(mundo.porId.get(o.sobre), t), [u, v] = iso(tp[0] + (o.dx ?? 0), tp[1] + (o.dy ?? 0), tp[2] + (o.dz ?? 0));
    return [W / 2 + (u - cam.cu) * cam.k, H / 2 + (v - cam.cv) * cam.k];
  };
  function colocarRotulo(o, ax, ay, lado, t) {
    const { ancho, alto, leader } = medidasRotulo(o), z = F.zona, tit = tituloEn(t)?.disp, techo = tit && tit.lugar === 'arriba' ? tit.caja[3] + 8 : z[1], izq = tit && tit.lugar === 'izquierda' ? tit.caja[2] + 12 : z[0];
    let cx = ax, cy = ay - leader - alto / 2;
    if (lado === 'abajo') cy = ay + leader + alto / 2;
    if (lado === 'derecha') { cx = ax + leader + ancho / 2; cy = ay; }
    if (lado === 'izquierda') { cx = ax - leader - ancho / 2; cy = ay; }
    cx = Math.max(izq + ancho / 2, Math.min(z[2] - ancho / 2, cx + (o.corre ?? 0)));
    cy = Math.max(techo + alto / 2, Math.min(z[3] - alto / 2, cy));
    return [cx, cy];
  }
  function elegirLados() {
    const puestos = [];
    for (const o of rotulos) {
      if (o.lado) continue;
      const pl = planoEn(o.t[0] + 0.3), t = Math.min(o.t[1] - 0.02, DUR, Math.max(o.t[0] + 0.3, pl.ta + 0.1)), cam = camaraSinTemblor(t), [ax, ay] = anclaRotulo(o, t, cam), { ancho, alto } = medidasRotulo(o);
      let mejor = null;
      const cajas = mundo.objs.filter((q) => q.encuadre !== false && q.tipo !== 'plataforma' && poses.pos(q, t).a.vis).map((q) => { const b = cajaObjeto(mundo, poses, q, t); return { propio: q.id === o.sobre, r: [W / 2 + (b.u0 - cam.cu) * cam.k, H / 2 + (b.v0 - cam.cv) * cam.k, W / 2 + (b.u1 - cam.cu) * cam.k, H / 2 + (b.v1 - cam.cv) * cam.k] }; });
      for (const lado of ['arriba', 'derecha', 'izquierda', 'abajo']) {
        const [cx, cy] = colocarRotulo(o, ax, ay, lado, t), r = [cx - ancho / 2, cy - alto / 2, cx + ancho / 2, cy + alto / 2];
        let costo = lado === 'arriba' ? 0 : lado === 'abajo' ? 30 : 15;
        for (const q of puestos) { const a = Math.min(r[2], q[2]) - Math.max(r[0], q[0]), b = Math.min(r[3], q[3]) - Math.max(r[1], q[1]); if (a > -10 && b > -10) costo += 2000; }
        for (const q of cajas) { const a = Math.min(r[2], q.r[2]) - Math.max(r[0], q.r[0]), b = Math.min(r[3], q.r[3]) - Math.max(r[1], q.r[1]); if (a > 0 && b > 0) costo += (a * b) / (q.propio ? 40 : 120); }
        costo += Math.hypot(cx - ax, cy - ay) * 0.4;
        if (!mejor || costo < mejor.costo) mejor = { costo, lado, r };
      }
      o.lado = mejor.lado;
      puestos.push(mejor.r);
    }
  }
  function rotuloEn(o, t, cam) {
    if (t < o.t[0] || t >= o.t[1]) return null;
    const [ax, ay] = anclaRotulo(o, t, cam), { tam, peso, ancho, alto } = medidasRotulo(o), [cx, cy] = colocarRotulo(o, ax, ay, o.lado ?? 'arriba', t);
    const tau = t - o.t[0], rev = CURVAS.entra(tau / 0.3), fin = sat((o.t[1] - t) / 0.16);
    return { tipo: 'rotulo', texto: o.texto, tam, peso, ax, ay, cx, cy, ancho, alto, rev: rev * fin, crece: sat(tau / 0.14), color: o.color, caja: [cx - ancho / 2, cy - alto / 2, cx + ancho / 2, cy + alto / 2] };
  }
  function tituloDibujo(o, t) {
    const d = o.disp, ultimo = o.partes ? o.partes.reduce((s, p, i) => (t >= p.t ? i : s), 0) : -1, fuera = sat((o.t[1] - t) / 0.2);
    return {
      tipo: 'titulo', lugar: d.lugar, velo: sat((t - o.t[0]) / 0.2) * fuera, tam: d.tam, peso: d.peso, caja: d.caja, texto: (o.partes ?? [{ texto: o.texto }]).map((p) => p.texto).join(' '),
      lineas: d.lineas.map((l) => ({ y: l.y, alto: l.alto, palabras: l.palabras.map((w) => ({ texto: w.texto, x: w.x, ancho: w.ancho, rev: CURVAS.entra((t - w.t) / 0.3), fuera: 1 - fuera, color: w.color ?? (o.partes ? (w.parte === ultimo ? 'acento' : 'tinta') : o.color ?? 'tinta') })) })),
    };
  }

  elegirLados();

  // ── Lo que hay en t ────────────────────────────────────────────────────────
  // Lo que salta cuando cae algo pesado: esquirlas con semilla fija. Tiene causa: sin caída no hay esquirlas.
  const caidasFuertes = mundo.objs.filter((o) => o.entra !== undefined && (o.como ?? 'cae') === 'cae' && o.peso >= 2 && o.esquirlas !== false && o.entra > 0);
  function esquirlas(t, prs) {
    for (const o of caidasFuertes) {
      const tau = t - o.entra;
      if (tau <= 0 || tau > 0.62) continue;
      const p = poses.pos(o, o.entra), tam = o.escala, n = 8 + Math.round(o.peso * 3), s0 = Math.sqrt(o.peso) * tam;
      for (let i = 0; i < n; i++) {
        const R = rng(977 * o.i + i * 131), a = R() * Math.PI * 2, v = (1.5 + R() * 2.1) * s0, vz = (1.6 + R() * 2.6) * Math.sqrt(s0), g = 11 * Math.sqrt(s0), lado = (0.05 + R() * 0.08) * s0;
        const z = vz * tau - 0.5 * g * tau * tau, r = 1.05 * tam + 0.1;
        if (z < 0) continue;
        const pr = caja(lado, lado, lado, { color: i % 3 === 0 ? c.acento : c.mez(c.papel, c.secundario, R() * 0.5), mat: 'papel', sombra: false, ao: 0 });
        transformar(pr, M.por(M.mover(p.x + Math.cos(a) * (r + v * tau), p.y + Math.sin(a) * (r + v * tau), p.z + z), M.por(M.rotZ(a * 3 + tau * 8), M.escala(1 - 0.5 * sat(tau / 0.62)))));
        pr.grupo = -1 - i;
        medirCaja(pr);
        prs.push(pr);
      }
    }
  }
  function primitivas(t) {
    const prs = [];
    for (const o of mundo.objs) {
      const p = poses.pos(o, t);
      if (!p.a.vis) continue;
      for (const pr of piezasDe(o, t, p, false)) prs.push(pr);
    }
    esquirlas(t, prs);
    return prs;
  }
  function escena(t) {
    const cam = camara(t);
    const textos = [];
    for (const o of titulos) if (t >= o.t[0] && t < o.t[1]) textos.push(tituloDibujo(o, t));
    for (const o of rotulos) { const r = rotuloEn(o, t, cam); if (r) textos.push(r); }
    const sb = subtituloEn(t);
    if (sb) textos.push(sb);
    return { t, cam, prims: primitivas(t), caminos: [...caminos.values()], textos };
  }

  // ── Sonido: una lista lista para efectos.json de tools/audio/mezcla.py ─────
  function eventos({ separacion = 1 } = {}) {
    const CUADRO = 1 / 30, lista = [];
    const pan = (x, y, z, t) => { const cam = camara(t), [u] = iso(x, y, z); return +Math.max(-0.6, Math.min(0.6, ((u - cam.cu) * cam.k) / (W / 2) * 0.6)).toFixed(2); };
    const pon = (t, sonido, ganancia, prioridad, o, extra = {}) => {
      if (t < 0 || t > DUR) return;
      const b = o ? poses.pos(o, t) : null;
      lista.push({ pico: +(t + CUADRO).toFixed(3), sonido, ganancia, prioridad, semilla: Math.round(t * 100) + 1, ...(b ? { pan: pan(b.x, b.y, b.z, t) } : {}), ...extra });
    };
    for (const o of mundo.objs) {
      if (o.sonido === false) continue;
      if (o.entra !== undefined) {
        const como = o.como ?? 'cae', propio = typeof o.sonido === 'string' ? o.sonido : null;
        if (como === 'cae') pon(o.entra, propio ?? (o.peso >= 2 ? 'impacto' : 'golpe'), o.peso >= 2 ? -5 : -8, o.peso >= 2 ? 5 : 4, o);
        else if (como === 'arma') { pon(o.entra, propio ?? 'golpe', -8, 4, o); const n = o.lib.crear(o, estado(o, o.entra), c).length, paso = o.paso ?? 0.09; for (let i = 1; i < n; i++) pon(o.entra - i * paso, 'clic', -13, 1, o); }
        else if (como === 'crece') pon(o.entra + 0.1, propio ?? 'pop', -10, 2, o);
        else if (como === 'sube') pon(o.entra + 0.15, propio ?? 'chasquido', -10, 2, o);
      }
      for (const m of o.mueve) {
        if (m.sonido === false) continue;
        pon(m.t0, 'barrido', -12, 2, o, { dur: +Math.max(0.2, Math.min(0.6, m.t1 - m.t0)).toFixed(2), pico: +(m.t0 + (m.t1 - m.t0) * 0.5).toFixed(3) });
        pon(m.t1, m.sonido ?? 'chasquido', -9, 3, o);
      }
    }
    for (const k of caminos.values()) if (k.crece && k.sonido !== false && !k.aereo) lista.push({ pico: +(k.t0 + (k.t1 - k.t0) * 0.7).toFixed(3), sonido: 'barrido', ganancia: -14, prioridad: 1, dur: +Math.max(0.2, Math.min(0.5, k.t1 - k.t0)).toFixed(2), semilla: Math.round(k.t0 * 100) + 1 });
    planos.forEach((p, i) => { if (i && p.llega >= 0.3 && p.fijo && planos[i - 1].fijo && Math.abs(Math.log(p.fijo.k / planos[i - 1].fijo.k)) > 0.6 && p.sonido !== false) lista.push({ pico: +(p.desde + p.llega * 0.55).toFixed(3), sonido: 'barrido', ganancia: -10, prioridad: 3, dur: +Math.min(0.7, p.llega).toFixed(2), semilla: Math.round(p.desde * 100) + 1 }); });
    for (const s of film.SONIDOS ?? []) lista.push({ prioridad: 6, ganancia: -8, semilla: Math.round(s.pico * 100) + 1, ...s, pico: +s.pico.toFixed(3) });
    // Máximo un efecto por `separacion`: se queda lo más importante, y SONIDOS siempre. Sobre una palabra, baja: la voz manda.
    const palabras = film.TIEMPOS?.palabras ?? [];
    const elegidos = [];
    for (const e of lista.slice().sort((a, b) => b.prioridad - a.prioridad || a.pico - b.pico)) {
      if (e.prioridad < 6 && elegidos.some((x) => Math.abs(x.pico - e.pico) < separacion)) continue;
      elegidos.push(e);
    }
    return elegidos.sort((a, b) => a.pico - b.pico).map(({ prioridad, ...e }) => {
      const pisa = palabras.some((w) => e.pico >= w.inicio - 0.03 && e.pico <= w.fin + 0.03);
      return { ...e, ganancia: e.ganancia + (pisa ? -5 : 0) };
    });
  }

  // ── Encuadres: para medir que el sujeto ocupa lo que debe ─────────────────
  function encuadres() {
    return planos.map((p) => {
      const ta = Math.min(DUR, p.ta + 0.02), cam = camara(ta), ids = p.mira ?? p.sigue;
      const b = cajaDeLista(mundo, poses, ids, ta, Math.max(ta, p.fin - 0.01));
      const x0 = W / 2 + (b.u0 - cam.cu) * cam.k, x1 = W / 2 + (b.u1 - cam.cu) * cam.k, y0 = H / 2 + (b.v0 - cam.cv) * cam.k, y1 = H / 2 + (b.v1 - cam.cv) * cam.k;
      return { desde: +p.desde.toFixed(2), ta: +ta.toFixed(2), mira: ids, caja: [x0, y0, x1, y1].map(Math.round), lado: +Math.max((x1 - x0) / W, (y1 - y0) / H).toFixed(3), area: +(((x1 - x0) * (y1 - y0)) / (W * H)).toFixed(3), k: +cam.k.toFixed(1) };
    });
  }
  const textosEn = (t) => escena(t).textos;
  // Cuánto del cuadro ocupa cada objeto que no sea una plataforma. Sirve para detectar cuadros vacíos.
  function sujetosEn(t) {
    const cam = camara(t), salida = [];
    for (const o of mundo.objs) {
      if (o.tipo === 'plataforma') continue;
      const p = poses.pos(o, t);
      if (!p.a.vis) continue;
      const prs = piezasDe(o, t, p, false);
      if (!prs.length) continue;
      const b = cajaIso(prs), x0 = Math.max(0, W / 2 + (b.u0 - cam.cu) * cam.k), x1 = Math.min(W, W / 2 + (b.u1 - cam.cu) * cam.k), y0 = Math.max(0, H / 2 + (b.v0 - cam.cv) * cam.k), y1 = Math.min(H, H / 2 + (b.v1 - cam.cv) * cam.k);
      if (x1 > x0 && y1 > y0) salida.push({ id: o.id, area: ((x1 - x0) * (y1 - y0)) / (W * H) });
    }
    return salida;
  }

  return { formato, W, H, F, DUR, c, FAM, espejo, S, celda, alturaCelda, escena, camara, eventos, encuadres, textosEn, sujetosEn, primitivas, poses, mundo, caminos, puntoEn, planos, titulos, rotulos, grupos, medirTexto };
}
