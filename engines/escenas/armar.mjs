#!/usr/bin/env node
// Convierte pieza.json en un proyecto completo de HyperFrames: escenas editables, subtítulos, transiciones y efectos de sonido.
// Uso, dentro de tu proyecto:
//   node ../.claqueta/engines/escenas/armar.mjs pieza.json
//   node ../.claqueta/engines/escenas/armar.mjs --ayuda
// Lee assets/tiempos.json (pista.py voz) y assets/audio/rejilla.json (pista.py musica). Escribe index.html, compositions/, assets/ y efectos.json.
// Los planos se anclan a palabras de la voz: si cambia la voz, corre otra vez este comando y la imagen la sigue.
import fs from "node:fs";
import path from "node:path";
import { paletas, tipografias } from "../../data/arte.js";
import { azar, contraste, f, FORMATOS, hex, html, norm, RAIZ, Reloj, rutaLocal, zonas, ancho, ajustarLinea } from "./lib/base.mjs";
import { AYUDA, BLOQUES } from "./lib/bloques.mjs";
import { CSS_BASE, ENTRADAS, PIELES, rasgado } from "./lib/pieles.mjs";

const j = JSON.stringify;

function salir(mensaje) {
  console.error(`Error: ${mensaje}`);
  process.exit(2);
}

const args = process.argv.slice(2);
if (args.includes("--ayuda") || args.includes("-h")) {
  console.log(JSON.stringify({ pieles: Object.fromEntries(Object.entries(PIELES).map(([k, v]) => [k, v.nombre])), formatos: Object.keys(FORMATOS), paletas: paletas.map((p) => p.id), tipografias: tipografias.map((t) => t.id), bloques: AYUDA, todos_los_planos: { desde: "@palabra, @palabra#2, segundos, pulso:8 o compas:3. El primero empieza en 0", camara: "push | pull | deriva | golpe | fija | saltos", transicion: "corte | barrido | persiana | papel | inundar | falla", subtitulos: "false los oculta en este plano" } }, null, 1));
  process.exit(0);
}
const archivo = args.find((a) => !a.startsWith("--"));
if (!archivo || !fs.existsSync(archivo)) salir(`no existe ${archivo ?? "pieza.json"}. Uso: node armar.mjs pieza.json`);

let pieza;
try { pieza = JSON.parse(fs.readFileSync(archivo, "utf8")); } catch (e) { salir(`${archivo} no es JSON válido: ${e.message}`); }
const leerJson = (r) => (fs.existsSync(r) ? JSON.parse(fs.readFileSync(r, "utf8")) : null);
const tiempos = leerJson("assets/tiempos.json") ?? {};
const rejilla = leerJson("assets/audio/rejilla.json");
const reloj = new Reloj(tiempos, rejilla);

const formato = pieza.formato ?? tiempos.formato ?? "9:16";
const z = zonas(formato);
const nombrePiel = pieza.piel ?? "infografia";
if (!PIELES[nombrePiel]) salir(`no existe la piel ${nombrePiel}. Hay: ${Object.keys(PIELES).join(", ")}`);

// Paleta y tipografía del encargo. Cada plano puede traer las suyas: «propia» usa los colores de su estilo.
const porDefecto = paletas[0].c;
const paletasDeEstilo = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(RAIZ, "data", "styles.json"), "utf8")).map((e) => [e.id, e.palette]));
function resolverPaleta(valor, estilo, donde) {
  let base = valor;
  if (valor === "propia" || valor === undefined) base = estilo ? paletasDeEstilo[estilo] : undefined;
  else if (typeof valor === "string") {
    base = paletas.find((x) => x.id === valor)?.c;
    if (!base) salir(`${donde}: no existe la paleta ${valor}. Hay: propia, ${paletas.map((x) => x.id).join(", ")}`);
  }
  if (!base) return null;
  return Object.fromEntries(Object.keys(porDefecto).map((k) => [k, hex(base[k], porDefecto[k])]));
}
const pal = resolverPaleta(pieza.paleta, pieza.estilo, "pieza.json") ?? { ...porDefecto };
const catFuentes = JSON.parse(fs.readFileSync(path.join(RAIZ, "assets", "fonts", "fuentes.json"), "utf8"));
const parDe = (nombre, donde) => {
  const par = catFuentes.pares[nombre];
  if (!par) salir(`${donde}: no existe la tipografía ${nombre}. Hay: ${Object.keys(catFuentes.pares).join(", ")}`);
  return par;
};
const fam = parDe(pieza.tipografia ?? PIELES[nombrePiel].tipografia, "pieza.json");
const familiasUsadas = new Set(Object.values(fam));
const pielesUsadas = new Set([nombrePiel]);
// Los subtítulos son iguales en toda la pieza, aunque cambie el estilo: así se leen siempre igual.
const hayVariosEstilos = (pieza.planos ?? []).some((p) => p.piel || p.paleta || p.estilo);
const palSub = hayVariosEstilos && !pieza.paleta ? { fondo: "#0C0C0C", tinta: "#FFFFFF", acento: "#FFD24D" } : pal;

const planos = pieza.planos ?? [];
if (!planos.length) salir("pieza.json no tiene planos");
const durTotal = Number(pieza.dur ?? reloj.dur ?? 0);
if (!durTotal) salir("falta la duración: corre pista.py voz, o escribe \"dur\" en pieza.json");

// ── Cuándo empieza cada plano.
const avisos = [];
// Una palabra repetida se busca después del plano anterior: así «@Un» no vuelve al principio.
const inicios = [];
planos.forEach((p, i) => {
  if (i === 0) { inicios.push(0); return; }
  if (p.desde === undefined) salir(`el plano ${i + 1} (${p.tipo}) no dice cuándo empieza. Escribe "desde": "@palabra"`);
  // Una palabra: el corte va justo antes y cae en un pulso si hay uno cerca. Un pulso o un segundo se respetan tal cual.
  try {
    const t = reloj.resolver(p.desde, inicios[i - 1] + 0.4);
    inicios.push(String(p.desde).startsWith("@") ? reloj.alPulso(Math.max(0, t - 0.06)) : t);
  } catch (e) { salir(`plano ${i + 1} (${p.tipo}): ${e.message}`); }
});
inicios.forEach((t, i) => {
  if (i && t <= inicios[i - 1] + 0.3) salir(`el plano ${i + 1} empieza en ${f(t)} s, casi sobre el anterior (${f(inicios[i - 1])} s). Revisa sus "desde"`);
  if (t >= durTotal) salir(`el plano ${i + 1} empieza en ${f(t)} s, después del final (${durTotal} s)`);
});

fs.mkdirSync("compositions", { recursive: true });
fs.mkdirSync("assets/escenas", { recursive: true });
fs.mkdirSync("assets/lib", { recursive: true });
fs.mkdirSync("assets/audio", { recursive: true });
fs.mkdirSync("assets/fonts", { recursive: true });
// Las escenas de una corrida anterior no deben quedar colgando.
for (const n of fs.readdirSync("compositions")) if (/^(p\d+|transiciones|subtitulos)\.html$/.test(n)) fs.rmSync(path.join("compositions", n));

// ── Una escena por plano.
const eventos = [];
const escenas = [];
const externas = [];
const sinSub = [];
planos.forEach((p, i) => {
  const bloque = BLOQUES[p.tipo];
  if (!bloque) salir(`el plano ${i + 1} tiene un tipo que no existe: ${p.tipo}. Hay: ${Object.keys(BLOQUES).join(", ")}`);
  const T0 = inicios[i], T1 = inicios[i + 1] ?? durTotal, dur = f(T1 - T0);
  const id = `p${String(i + 1).padStart(2, "0")}`;
  const nombreP = p.piel ?? nombrePiel, piel = PIELES[nombreP];
  if (!piel) salir(`plano ${i + 1}: no existe la piel ${nombreP}. Hay: ${Object.keys(PIELES).join(", ")}`);
  pielesUsadas.add(nombreP);
  const palP = resolverPaleta(p.paleta, p.estilo, `plano ${i + 1}`) ?? pal;
  const famP = p.tipografia ? parDe(p.tipografia, `plano ${i + 1}`) : pieza.tipografia ? fam : parDe(piel.tipografia, `plano ${i + 1}`);
  Object.values(famP).forEach((x) => familiasUsadas.add(x));
  const c = {
    z, pal: palP, fam: famP, piel, p, i, id, T0, T1, dur, durTotal, reloj, r: azar(7919 * (i + 1) + (pieza.semilla ?? 1)), tl: [], contadores: [],
    aviso: (m) => avisos.push(`Plano ${i + 1} (${p.tipo}): ${m}`),
    resp: (t) => Math.min(t, Math.max(0, dur - 0.5)),
    t(ancla, resp) { if (ancla === undefined || ancla === null) return resp; try { const v = reloj.resolver(ancla, T0) - T0; return v >= 0 && v < dur ? v : (c.aviso(`«${ancla}» cae fuera de este plano`), resp); } catch (e) { c.aviso(e.message); return resp; } },
    dicho(texto, resp) { const v = reloj.enTramo(texto, T0, T1); return v === null ? resp : v - T0; },
    horas(texto) { return reloj.alinear(String(texto).split(/[\s|]+/).filter(Boolean), T0, T1).map((h) => (h === null ? null : h - T0)); },
    entrada(sel, t, o = {}) {
      if (i === 0 && t <= 0.2) return ""; // El primer cuadro es la portada: lo que abre la pieza ya está ahí.
      const tipo = o.tipo ?? piel.entrada;
      return ENTRADAS[tipo](sel, Math.max(0, t), o);
    },
    sonar(tipo, t, o = {}) {
      const s = piel.sonidos[tipo];
      if (s) eventos.push({ pico: f(T0 + Math.max(0, t) + 1 / 30), sonido: s, ganancia: o.g ?? -15, clase: tipo });
    },
    eventoLibre(e) { eventos.push({ pico: f(T0 + Number(e.t) + 1 / 30), sonido: e.sonido, ganancia: e.ganancia ?? -15, clase: "entra" }); },
  };
  c.suelo = piel.suelo(c);
  c.tinta = piel.tintaEn(c);
  c.acento = piel.acentoEn(c);
  // Un acento que casi no se distingue del suelo no acentúa nada: toma el segundo color, o la tinta.
  if (contraste(c.acento, c.suelo) < 2.5) c.acento = [palP.segundo, c.tinta].find((x) => contraste(x, c.suelo) >= 2.5) ?? c.tinta;
  let b;
  try { b = bloque(c, p); } catch (e) { salir(`plano ${i + 1} (${p.tipo}): ${e.message}`); }
  // Una plantilla ya trae su mundo y su tiempo: solo se monta con sus textos y colores.
  if (b.externa) {
    const ext = b.externa;
    if (externas.some((x) => x.plantilla === ext.id)) salir(`plano ${i + 1}: la escena ${ext.id} ya se usa en otro plano. Cada una va una sola vez`);
    // El primer cuadro es la portada en el feed: una plantilla que abre la pieza arranca adelantada, con lo suyo ya en pantalla.
    let fuenteExt = fs.readFileSync(ext.archivo, "utf8");
    // HyperFrames da 10 s para abrir WebGPU si una escena lo exige, y con muchas escenas se pasa aunque haya GPU. Sin exigirlo, el shader se ve igual; sin GPU, queda su degradado de reserva.
    if (ext.ficha.requiere?.includes("webgpu")) fuenteExt = fuenteExt.replace(/\s+data-requires-webgpu(="[^"]*")?/g, "");
    const adelanto = Number(p.adelanto ?? (i === 0 && p.tipo === "plantilla" && ext.id !== "rafaga" ? 0.7 : 0));
    if (adelanto > 0) {
      const registro = new RegExp(`window\\.__timelines\\[(["'])${ext.id}\\1\\]\\s*=\\s*(\\w+);`);
      if (registro.test(fuenteExt)) {
        fuenteExt = fuenteExt.replace(registro, (_, __, tl) => `${tl}.pause(${adelanto}); var adelanto = { t: ${adelanto} }; window.__timelines["${ext.id}"] = gsap.timeline({ paused: true }).to(adelanto, { t: ${tl}.duration(), duration: ${tl}.duration() - ${adelanto}, ease: "none", onUpdate: function () { ${tl}.time(adelanto.t); } }, 0);`);
      } else c.aviso(`${ext.id}: no se pudo adelantar su inicio, y el primer cuadro puede salir vacío`);
    }
    fs.writeFileSync(path.join("compositions", `${ext.id}.html`), fuenteExt);
    for (const [de, a] of ext.copias ?? []) { fs.mkdirSync(path.dirname(a), { recursive: true }); fs.copyFileSync(de, a); }
    (ext.ficha.fuentes ?? []).forEach((x) => familiasUsadas.add(x));
    const usaLaSuya = p.paleta === "propia" || (!p.paleta && (pieza.paleta === "propia" || (p.estilo && !pieza.paleta)));
    const colores = usaLaSuya ? (ext.ficha.paleta ?? palP) : palP;
    // «initial» corta la herencia de la pieza: así cada var(--x, respaldo) de la escena cae en su propio color y su propia fuente.
    const estiloVars = "--fondo:initial;--tinta:initial;--acento:initial;--segundo:initial;--superficie:initial;--display:initial;--cuerpo:initial;--datos:initial;"
      + (usaLaSuya ? "" : `--fondo:${colores.fondo};--tinta:${colores.tinta};--acento:${colores.acento};--segundo:${colores.segundo};--superficie:${colores.superficie};`)
      + (p.tipografia || pieza.tipografia ? `--display:'${famP.display}';--cuerpo:'${famP.cuerpo}';--datos:'${famP.datos}';` : "");
    externas.push({ plantilla: ext.id, valores: ext.valores, estilo: estiloVars });
    escenas.push({ id: ext.id, tipo: `${p.tipo} ${ext.id}`, inicio: f(T0), fin: f(T1), suelo: colores.fondo, acento: colores.acento, pal: colores, externa: true, valores: ext.valores, vars: estiloVars, heroe: [z.W / 2, z.H / 2], camara: p.camara ?? "push" });
    if (p.subtitulos === false) sinSub.push([T0, T1]);
    if (dur < 1) c.aviso(`dura solo ${dur} s. Un plano tan corto casi no se lee`);
    return;
  }
  const mundo = (b.sinMundo ? "" : piel.mundo(c)) + (b.mundo ?? "");
  // La cámara. El mundo se mueve más que la información: da profundidad y el texto sigue quieto para leerse.
  const cam = p.camara ?? piel.camaras[i % piel.camaras.length];
  const [ox, oy] = b.heroe ?? [z.W / 2, (z.y0 + z.y1) / 2];
  const origen = `transformOrigin:"${f(ox)}px ${f(oy)}px"`;
  const M = `#${id}-mundo`, I = `#${id}-info`, D = f(dur);
  const camara = {
    push: [`tl.fromTo(${j(M)},{scale:1.01},{scale:1.075,${origen},duration:${D},ease:"none"},0);`, `tl.fromTo(${j(I)},{scale:1},{scale:1.016,${origen},duration:${D},ease:"none"},0);`],
    pull: [`tl.fromTo(${j(M)},{scale:1.09},{scale:1.01,${origen},duration:${D},ease:"none"},0);`, `tl.fromTo(${j(I)},{scale:1.018},{scale:1,${origen},duration:${D},ease:"none"},0);`],
    deriva: [`tl.fromTo(${j(M)},{scale:1.08,x:${i % 2 ? 34 : -34}},{scale:1.08,x:${i % 2 ? -34 : 34},duration:${D},ease:"none"},0);`, `tl.fromTo(${j(I)},{x:${i % 2 ? 6 : -6}},{x:${i % 2 ? -6 : 6},duration:${D},ease:"none"},0);`],
    golpe: [`tl.fromTo(${j(`#${id}-cam`)},{scale:1.1},{scale:1,${origen},duration:.42,ease:"expo.out"},0);`],
    saltos: [`tl.fromTo(${j(M)},{x:-12,y:7,scale:1.03},{x:12,y:-7,scale:1.06,duration:${D},ease:"steps(${Math.max(3, Math.round(dur * 6))})"},0);`],
    fija: [],
  }[cam];
  if (!camara) salir(`plano ${i + 1}: no existe la cámara ${cam}`);
  const lineasTl = [...camara, ...c.tl.filter(Boolean)];
  if (c.contadores.length) {
    lineasTl.push(`var C=${j(c.contadores)};var fmt=function(v,d){var s=Number(v).toFixed(d).split(".");s[0]=s[0].replace(/\\B(?=(\\d{3})+(?!\\d))/g,".");return s.join(",")};function pinta(t){C.forEach(function(k){var u=Math.max(0,Math.min(1,(t-k.t)/k.d));u=1-Math.pow(1-u,3);var e=document.getElementById(k.sel);if(e)e.textContent=k.pre+fmt(k.de+(k.a-k.de)*u,k.dec)+k.suf})}var K={t:0};tl.fromTo(K,{t:0},{t:${D},duration:${D},ease:"none",onUpdate:function(){pinta(K.t)}},0);pinta(0);`);
  }
  const doc = `<template>
  <div id="${id}-raiz" class="escena piel-${nombreP}" data-composition-id="${id}" data-start="0" data-duration="${D}" data-width="${z.W}" data-height="${z.H}" style="--suelo:${c.suelo};--nodo:${palP.superficie};--ac-f:${c.acento};--fondo:${palP.fondo};--tinta:${palP.tinta};--acento:${palP.acento};--segundo:${palP.segundo};--superficie:${palP.superficie};--display:'${famP.display}';--cuerpo:'${famP.cuerpo}';--datos:'${famP.datos}'">
    <div id="${id}-cam" class="cam">
      <div id="${id}-mundo" class="mundo">${mundo}</div>
      <div id="${id}-info" class="info">${b.info ?? ""}</div>
    </div>
    ${piel.capaFinal ?? ""}
  </div>
  <script>
    (function () {
      var tl = gsap.timeline({ paused: true });
      ${lineasTl.join("\n      ")}
      tl.set({}, {}, ${D});
      window.__timelines = window.__timelines || {};
      window.__timelines[${j(id)}] = tl;
    })();
  </script>
</template>
`;
  fs.writeFileSync(path.join("compositions", `${id}.html`), doc);
  escenas.push({ id, tipo: p.tipo, inicio: f(T0), fin: f(T1), suelo: c.suelo, acento: c.acento, pal: palP, sonidoTr: piel.sonidos.trans, transiciones: piel.transiciones, heroe: [f(ox, 0), f(oy, 0)] });
  if (b.sinSubtitulos || p.subtitulos === false) sinSub.push([T0, T1]);
  else if (b.sinSubEn && p.subtitulos !== true) sinSub.push([T0 + b.sinSubEn[0], T0 + b.sinSubEn[1]]);
  if (dur < 1) c.aviso(`dura solo ${dur} s. Un plano tan corto casi no se lee`);
});

// ── Transiciones: nacen del material, varían de dirección y cubren el corte.
const trans = [];
let trHtml = "", trTl = [];
const rT = azar(4001 + (pieza.semilla ?? 1));
escenas.slice(1).forEach((e, k) => {
  const rotacion = e.transiciones ?? PIELES[nombrePiel].transiciones;
  const T = e.inicio, tipo = planos[k + 1].transicion ?? rotacion[k % rotacion.length], id = `tr${k + 1}`;
  const durTr = Math.min(0.5, Number(pieza.transicion_dur ?? 0.46));
  if (tipo === "corte") { trans.push({ en: T, tipo }); return; }
  const dir = ["x", "y", "x-", "y-"][(k + (rT() > 0.5 ? 1 : 0)) % 4];
  const eje = dir[0], signo = dir.endsWith("-") ? -1 : 1, media = durTr / 2;
  const cruce = (sel, colorIda, t0) => `tl.set(${j(sel)},{autoAlpha:1,${eje}Percent:${-101 * signo}},0);tl.fromTo(${j(sel)},{${eje}Percent:${-101 * signo}},{${eje}Percent:0,duration:${f(media)},ease:"power3.in"},${f(t0 - media)});tl.to(${j(sel)},{${eje}Percent:${101 * signo},duration:${f(media)},ease:"power3.out"},${f(t0)});`;
  if (tipo === "barrido") {
    trHtml += `<div class="tr" id="${id}a" style="background:${e.acento};visibility:hidden"></div><div class="tr" id="${id}b" style="background:${e.suelo};visibility:hidden"></div>`;
    trTl.push(cruce(`#${id}a`, e.acento, T - 0.05), cruce(`#${id}b`, e.suelo, T));
  } else if (tipo === "persiana") {
    const n = 7, h = 100 / n;
    for (let q = 0; q < n; q++) {
      const d = q * 0.018, s = q % 2 ? 1 : -1;
      trHtml += `<div class="tr" id="${id}p${q}" style="top:${f(q * h)}%;height:${f(h + 0.2)}%;background:${q % 3 === 1 ? e.acento : e.suelo};visibility:hidden"></div>`;
      trTl.push(`tl.set("#${id}p${q}",{autoAlpha:1,xPercent:${-101 * s}},0);tl.fromTo("#${id}p${q}",{xPercent:${-101 * s}},{xPercent:0,duration:${f(media)},ease:"power3.in"},${f(T - media - 0.1 + d)});tl.to("#${id}p${q}",{xPercent:${101 * s},duration:${f(media)},ease:"power3.out"},${f(T + d)});`);
    }
  } else if (tipo === "inundar") {
    const [hx, hy] = escenas[k].heroe ?? [z.W / 2, z.H / 2];
    const circ = (r) => `circle(${r}px at ${hx}px ${hy}px)`, R = Math.hypot(z.W, z.H);
    trHtml += `<div class="tr" id="${id}a" style="background:${e.acento};visibility:hidden"></div><div class="tr" id="${id}b" style="background:${e.suelo};visibility:hidden"></div>`;
    for (const [s, ini] of [[`#${id}a`, T - durTr], [`#${id}b`, T - durTr * 0.56]]) {
      trTl.push(`tl.set("${s}",{autoAlpha:1,clipPath:${j(circ(0))}},${f(ini)});tl.to("${s}",{clipPath:${j(circ(R))},duration:${f(T - ini)},ease:"power2.in"},${f(ini)});tl.set("${s}",{autoAlpha:0},${f(T + 1 / 30)});`);
    }
  } else if (tipo === "papel") {
    const d = rasgado(0, 0, z.W * 1.5, z.H * 1.5, 900 + k, 34), color = [e.acento, e.pal?.tinta ?? pal.tinta, e.pal?.segundo ?? pal.segundo][k % 3];
    const pasos = 5;
    trHtml += `<svg class="tr" id="${id}a" viewBox="0 0 ${f(z.W * 1.5)} ${f(z.H * 1.5)}" preserveAspectRatio="none" style="width:150%;height:150%;left:-25%;top:-25%;visibility:hidden;filter:drop-shadow(0 8px 0 rgba(0,0,0,.3))"><path d="${d}" fill="#fff" transform="translate(-6 -8)"/><path d="${d}" fill="${color}"/></svg><div class="tr" id="${id}b" style="background:${e.suelo};visibility:hidden"></div>`;
    const giro = (k % 2 ? 1 : -1) * 4;
    trTl.push(`tl.set("#${id}a",{autoAlpha:1,${eje}Percent:${-105 * signo},rotation:${giro}},${f(T - durTr * 0.6)});tl.to("#${id}a",{${eje}Percent:0,rotation:0,duration:${f(durTr * 0.6)},ease:"steps(${pasos})"},${f(T - durTr * 0.6)});tl.set("#${id}b",{autoAlpha:1},${f(T - 1 / 30)});tl.set("#${id}a",{autoAlpha:1},${f(T)});tl.to("#${id}a",{${eje}Percent:${105 * signo},rotation:${-giro},duration:${f(durTr * 0.6)},ease:"steps(${pasos})"},${f(T)});tl.set("#${id}b",{autoAlpha:0},${f(T + 1 / 30)});tl.set("#${id}a",{autoAlpha:0},${f(T + durTr * 0.62)});`);
  } else if (tipo === "falla") {
    const n = 11;
    for (let q = 0; q < n; q++) {
      const y = rT() * 100, h = 2 + rT() * 11, x = (rT() - 0.5) * 40, t = T - 0.1 + rT() * 0.16;
      trHtml += `<div class="tr" id="${id}f${q}" style="top:${f(y)}%;height:${f(h)}%;background:${q % 3 === 0 ? e.acento : q % 3 === 1 ? (e.pal?.tinta ?? pal.tinta) : (e.pal?.segundo ?? pal.segundo)};visibility:hidden"></div>`;
      trTl.push(`tl.set("#${id}f${q}",{autoAlpha:1,xPercent:${f(x)}},${f(t)});tl.set("#${id}f${q}",{autoAlpha:0},${f(t + 0.07)});`);
    }
  } else salir(`plano ${k + 2}: no existe la transición ${tipo}. Hay: corte, barrido, persiana, papel, inundar, falla`);
  const sTr = e.sonidoTr ?? PIELES[nombrePiel].sonidos.trans;
  if (sTr) eventos.push({ pico: f(T + 1 / 30), sonido: sTr, ganancia: -16, clase: "trans", dur: 0.42 });
  trans.push({ en: T, tipo });
});
fs.writeFileSync("compositions/transiciones.html", `<template>
  <div id="tr-raiz" class="escena" data-composition-id="transiciones" data-start="0" data-duration="${durTotal}" data-width="${z.W}" data-height="${z.H}">
    ${trHtml}
  </div>
  <script>
    (function () {
      var tl = gsap.timeline({ paused: true });
      ${trTl.join("\n      ")}
      tl.set({}, {}, ${durTotal});
      window.__timelines = window.__timelines || {};
      window.__timelines["transiciones"] = tl;
    })();
  </script>
</template>
`);

// ── Subtítulos: frases del guion, con la palabra activa en acento.
const sub = pieza.subtitulos ?? { estilo: "activa", posicion: "seguro" };
let subHtml = "", subTl = [];
const hayGrupos = sub !== false && sub.activos !== false && sub.estilo !== "mundo" && (reloj.grupos ?? []).length > 0;
if (hayGrupos) {
  const banda = sub.posicion === "centro" ? { y1: z.H * 0.42, y2: z.H * 0.58 } : sub.posicion === "arriba" ? { y1: z.y0, y2: z.y0 + (z.sub.y2 - z.sub.y1) } : z.sub;
  const anchoB = z.sub.x1 - z.sub.x0;
  const mayor = reloj.grupos.flatMap((g) => g.lineas).reduce((a, b) => (ancho(a, fam.cuerpo, 600, 100) > ancho(b, fam.cuerpo, 600, 100) ? a : b), "");
  const techo = sub.estilo === "grande" ? (z.horizontal ? 76 : 92) : z.horizontal ? 46 : 54;
  const px = Math.max(z.minTexto, Math.min(techo, ajustarLinea(mayor, fam.cuerpo, 600, anchoB * 0.94)));
  if (ancho(mayor, fam.cuerpo, 600, px) > anchoB) avisos.push(`Subtítulo demasiado ancho: «${mayor}». Corre pista.py voz con --ancho más pequeño`);
  const clase = sub.estilo === "editorial" ? "sub-sombra" : "sub-caja";
  const centroY = (banda.y1 + banda.y2) / 2;
  reloj.grupos.forEach((g, k) => {
    const medio = (g.inicio + g.fin) / 2;
    if (sinSub.some(([a, b]) => medio >= a && medio < b)) return;
    const id = `sb${k}`;
    let q = 0;
    const lineas = g.lineas.map((l) => {
      const pals = l.split(/\s+/).map(() => {
        const w = g.palabras[q], idw = `${id}-${q++}`;
        if (sub.estilo === "karaoke") subTl.push(`tl.set("#${idw}",{color:${j(palSub.acento)}},${f(w.inicio)});`);
        else { subTl.push(`tl.set("#${idw}",{color:${j(palSub.acento)}},${f(w.inicio)});`); subTl.push(`tl.set("#${idw}",{color:${j(palSub.tinta)}},${f(Math.min(w.fin + 0.04, g.fin))});`); }
        return `<span id="${idw}">${html(w?.palabra ?? "")}</span>`;
      }).join(" ");
      return `<span class="sub-l" style="font-size:${f(px)}px">${pals}</span>`;
    }).join("");
    const altoG = g.lineas.length * px * 1.14 + px * 0.2;
    subTl.push(`tl.fromTo("#${id}",{autoAlpha:0,y:10},{autoAlpha:1,y:0,duration:.07,ease:"power2.out"},${f(g.inicio)});tl.to("#${id}",{autoAlpha:0,duration:.01,ease:"none"},${f(g.fin)});`);
    subHtml += `<div id="${id}" class="sub-g ${clase}" style="visibility:hidden;top:${f(centroY - altoG / 2)}px;left:${z.sub.x0}px;right:${z.W - z.sub.x1}px">${lineas}</div>`;
  });
}
fs.writeFileSync("compositions/subtitulos.html", `<template>
  <div id="sb-raiz" class="escena" data-composition-id="subtitulos" data-start="0" data-duration="${durTotal}" data-width="${z.W}" data-height="${z.H}" style="--sub-fondo:${palSub.fondo};--sub-tinta:${palSub.tinta}">
    ${subHtml}
  </div>
  <script>
    (function () {
      var tl = gsap.timeline({ paused: true });
      ${subTl.join("\n      ")}
      tl.set({}, {}, ${durTotal});
      window.__timelines = window.__timelines || {};
      window.__timelines["subtitulos"] = tl;
    })();
  </script>
</template>
`);

// ── Lo que el proyecto necesita a su lado: fuentes, GSAP y texturas, sin bajar nada.
const familias = [...familiasUsadas];
const css = [];
const TIPO = { ".woff2": "woff2", ".ttf": "truetype" };
for (const nombre of familias) {
  const d = catFuentes.familias[nombre];
  if (!d) salir(`la fuente ${nombre} no viene en el sistema. Hay: ${Object.keys(catFuentes.familias).join(", ")}`);
  for (const a of d.archivos) {
    fs.copyFileSync(path.join(RAIZ, "assets", "fonts", a.archivo), path.join("assets/fonts", a.archivo));
    css.push(`@font-face{font-family:"${nombre}";src:url("../fonts/${a.archivo}") format("${TIPO[path.extname(a.archivo)]}");font-weight:${a.pesos};font-style:normal;font-display:block}`);
  }
  fs.copyFileSync(path.join(RAIZ, "assets", "fonts", d.licencia), path.join("assets/fonts", d.licencia));
}
fs.copyFileSync(path.join(RAIZ, "tools", "lib", "gsap.min.js"), "assets/lib/gsap.min.js");
for (const t of ["grano.png", "papel.png"]) fs.copyFileSync(path.join(RAIZ, "engines", "escenas", "texturas", t), path.join("assets/escenas", t));
fs.writeFileSync("assets/escenas/piel.css", `${css.join("\n")}\n${CSS_BASE(z, pal, fam, [...pielesUsadas].map((k) => [k, PIELES[k]]))}\n`);

// Si aún no hay mezcla, una pista muda deja revisar la imagen. pista.py mezcla la reemplaza, y revisar.py avisa si se quedó así.
const mezcla = "assets/audio/mezcla.wav";
let provisional = false;
if (!fs.existsSync(mezcla)) {
  provisional = true;
  const sr = 8000, n = Math.ceil(durTotal * sr), b = Buffer.alloc(44 + n, 128);
  b.write("RIFF", 0); b.writeUInt32LE(36 + n, 4); b.write("WAVEfmt ", 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr, 28); b.writeUInt16LE(1, 32); b.writeUInt16LE(8, 34); b.write("data", 36); b.writeUInt32LE(n, 40);
  fs.writeFileSync(mezcla, b);
}

const hosts = escenas.map((e) => {
  const valores = e.externa && Object.keys(e.valores ?? {}).length ? ` data-variable-values='${html(JSON.stringify(e.valores))}'` : "";
  const vars = e.vars ? ` style="${e.vars}"` : "";
  return `<div id="el-${e.id}" class="escena" data-composition-id="${e.id}" data-composition-src="compositions/${e.id}.html" data-start="${e.inicio}" data-duration="${f(e.fin - e.inicio)}" data-track-index="${escenas.indexOf(e) + 1}" data-track-kind="graphics"${valores}${vars}></div>`;
});
// Una escena montada no tiene cámara propia en el kit: la lleva su anfitrión, muy suave, para que un plano largo no se quede quieto.
const camarasExternas = escenas.filter((e) => e.externa && ["push", "pull"].includes(e.camara)).map((e) => {
  const D = f(e.fin - e.inicio), g = f(1 + Math.min(0.05, 0.008 * D), 4), [de, a] = e.camara === "push" ? [1, g] : [g, 1];
  return `
      window.__timelines["main"].fromTo(${j(`#el-${e.id}`)},{scale:${de},transformOrigin:"50% 42%"},{scale:${a},transformOrigin:"50% 42%",duration:${D},ease:"none"},${e.inicio});`;
}).join("");
fs.writeFileSync("index.html", `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=${z.W}, height=${z.H}">
    <link rel="stylesheet" href="assets/escenas/piel.css">
    <script src="assets/lib/gsap.min.js"></script>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${durTotal}" data-width="${z.W}" data-height="${z.H}" style="position:relative;width:${z.W}px;height:${z.H}px;overflow:hidden;background:${pal.fondo}">
      ${hosts.join("\n      ")}
      <div id="el-transiciones" class="escena" style="z-index:20" data-composition-id="transiciones" data-composition-src="compositions/transiciones.html" data-start="0" data-duration="${durTotal}" data-track-index="${escenas.length + 1}" data-track-kind="graphics" data-layout-ignore></div>
      <div id="el-subtitulos" class="escena" style="z-index:30" data-composition-id="subtitulos" data-composition-src="compositions/subtitulos.html" data-start="0" data-duration="${durTotal}" data-track-index="${escenas.length + 2}" data-track-kind="captions"></div>
      <audio id="mezcla" src="${mezcla}" data-start="0" data-duration="${durTotal}" data-track-index="${escenas.length + 3}" data-volume="1"></audio>
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      window.__timelines["main"] = gsap.timeline({ paused: true });${camarasExternas}
    </script>
  </body>
</html>
`);

// ── Efectos: cada acción suena, nunca dos encima, y varía de toma.
// Nunca encima de una palabra: si cae dentro de una, se mueve al hueco más cercano, sin alejarse de su imagen. Si no hay hueco, se baja.
function fueraDePalabra(ev) {
  const w = reloj.palabras.find((x) => ev.pico > x.inicio + 0.01 && ev.pico < x.fin - 0.01);
  if (!w) return ev;
  const libre = (t) => t > 0 && !reloj.palabras.some((x) => t > x.inicio && t < x.fin);
  const opciones = [w.inicio - 0.02, w.fin + 0.02].filter((t) => libre(t) && Math.abs(t - ev.pico) <= 0.3).sort((a, b) => Math.abs(a - ev.pico) - Math.abs(b - ev.pico));
  return opciones.length ? { ...ev, pico: f(opciones[0]) } : { ...ev, ganancia: ev.ganancia - 3 };
}
// Y uno por segundo como máximo, contado ya en su lugar final: si hay más acciones, suena la más importante.
const orden = { trans: 3, cifra: 3, cierre: 3, golpe: 2, entra: 1, trazo: 0 };
const SEPARACION = 1.02;
const elegidos = [];
for (const ev of eventos.map(fueraDePalabra).sort((a, b) => (orden[b.clase] ?? 0) - (orden[a.clase] ?? 0) || a.pico - b.pico)) {
  if (elegidos.every((x) => Math.abs(x.pico - ev.pico) >= SEPARACION)) elegidos.push(ev);
}
elegidos.sort((a, b) => a.pico - b.pico);
const rS = azar(1313 + (pieza.semilla ?? 1));
const efectos = elegidos.filter((e) => e.pico < durTotal - 0.02).map((e, k) => {
  const salida = { pico: e.pico, sonido: e.sonido, ganancia: e.ganancia, semilla: 11 + k * 3, pan: f((rS() - 0.5) * 0.5, 2) };
  if (e.dur) salida.dur = e.dur;
  return salida;
});
fs.writeFileSync("efectos.json", JSON.stringify(efectos, null, 1));

console.log(JSON.stringify({
  ok: true, piel: nombrePiel, formato, dur: durTotal, escenas: escenas.map(({ id, tipo, inicio, fin }) => ({ id, tipo, inicio, fin })), transiciones: trans.map((t) => t.tipo), efectos: efectos.length, avisos,
  siguiente: provisional ? "Corre pista.py mezcla: la pista actual es muda. Después: hyperframes check, render y revisar.py" : "Corre hyperframes check, render y revisar.py",
}));
