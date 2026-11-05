#!/usr/bin/env node
// Revisa la película sin abrir un navegador: que textos y sujeto queden donde deben, en el formato de la pieza o en los cuatro.
// Uso, desde la carpeta del proyecto: node ../.claqueta/engines/isometrico/zonas.mjs assets/isometrico/film.js [--formato 16:9 | --todos] [--sujeto 0.4]
// Mide con la cámara aplicada, cada 1/15 s, y solo cuando la cámara está casi quieta: un rótulo que cruza el borde mientras la cámara corre no es un fallo.
// - Títulos y rótulos: dentro de la zona, sin tocar los subtítulos.
// - Subtítulos: dentro de su banda, máximo dos líneas.
// - Sujeto: lo que cada plano mira debe ocupar al menos --sujeto de la pantalla en su lado mayor, y no salirse del cuadro.
// - Nada vacío: siempre hay en pantalla algo más que plataformas, de al menos 2 % del cuadro.
// Termina con error si algo falla. No sustituye a mirar los cuadros.
import path from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const toma = (k) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const formatoPedido = toma("--formato"), minSujeto = Number(toma("--sujeto") ?? 0.4);
const todos = args.includes("--todos"), minVisible = 0.02;
const ruta = args.find((a) => !a.startsWith("--"));
if (!ruta) {
  console.error("Uso: node zonas.mjs assets/isometrico/film.js [--formato 16:9 | --todos] [--sujeto 0.4]");
  process.exit(2);
}
const absoluta = path.resolve(ruta);
const film = await import(pathToFileURL(absoluta).href);
const { crearPelicula, FORMATOS } = await import(pathToFileURL(path.join(path.dirname(absoluta), "motor.js")).href);

function revisar(formato) {
  const peli = crearPelicula(film, { formato }), { W, H, F, DUR } = peli, avisos = [], z = F.zona, b = F.banda;
  const quieta = (t) => {
    const a = peli.camara(t - 0.05), c = peli.camara(t + 0.05);
    return Math.abs(c.k - a.k) / a.k < 0.01 && Math.hypot(c.cu - a.cu, c.cv - a.cv) * a.k < 10;
  };
  const vistos = new Map();
  const nota = (clave, texto) => { if (!vistos.has(clave)) { vistos.set(clave, texto); avisos.push(texto); } };
  for (let t = 0; t <= DUR + 1e-6; t += 1 / 15) {
    const textos = peli.textosEn(Math.min(t, DUR - 1e-3));
    const hayQuieta = quieta(t);
    for (const T of textos) {
      const [x0, y0, x1, y1] = T.caja.map(Math.round);
      if (T.tipo === "subtitulo") {
        if (y0 < b[0] || y1 > b[1] || x0 < 0 || x1 > W) nota(`sub ${T.texto}`, `Subtítulo «${T.texto}»: ocupa y ${y0}–${y1} y su banda es ${b[0]}–${b[1]}.`);
        if (T.lineas.length > 2) nota(`sub2 ${T.texto}`, `Subtítulo «${T.texto}»: tiene más de dos líneas.`);
        continue;
      }
      if (!hayQuieta && T.tipo === "rotulo") continue;
      if (x0 < z[0] - 1 || x1 > z[2] + 1 || y0 < z[1] - 1 || y1 > z[3] + 1) nota(`${T.tipo} ${T.texto}`, `${T.tipo === "titulo" ? "Título" : "Rótulo"} «${T.texto}»: ocupa x ${x0}–${x1}, y ${y0}–${y1} y la zona es x ${z[0]}–${z[2]}, y ${z[1]}–${z[3]}, en ${t.toFixed(1)} s.`);
    }
    const rotulos = textos.filter((T) => T.tipo === "rotulo"), titulo = textos.find((T) => T.tipo === "titulo");
    if (hayQuieta && titulo) for (const r of rotulos) {
      const a = Math.min(r.caja[2], titulo.caja[2]) - Math.max(r.caja[0], titulo.caja[0]), c = Math.min(r.caja[3], titulo.caja[3]) - Math.max(r.caja[1], titulo.caja[1]);
      if (a > 0 && c > 0) nota(`pisa ${r.texto}`, `Rótulo «${r.texto}» pisa el título «${titulo.texto}» en ${t.toFixed(1)} s.`);
    }
    if (hayQuieta) for (let i = 0; i < rotulos.length; i++) for (let j = i + 1; j < rotulos.length; j++) {
      const p = rotulos[i].caja, q = rotulos[j].caja, a = Math.min(p[2], q[2]) - Math.max(p[0], q[0]), c = Math.min(p[3], q[3]) - Math.max(p[1], q[1]);
      if (a > 0 && c > 0) nota(`cruce ${rotulos[i].texto}${rotulos[j].texto}`, `Los rótulos «${rotulos[i].texto}» y «${rotulos[j].texto}» se pisan en ${t.toFixed(1)} s.`);
    }
  }
  // Nada vacío: en todo momento debe haber algo más que plataformas, y de buen tamaño.
  let vacioDesde = null;
  for (let t = 0; t <= DUR + 1e-6; t += 0.2) {
    const hay = peli.sujetosEn(Math.min(t, DUR - 1e-3)).some((s) => s.area >= minVisible);
    if (!hay && vacioDesde === null) vacioDesde = t;
    if ((hay || t + 0.2 > DUR) && vacioDesde !== null) { nota(`vacio ${vacioDesde}`, `De ${vacioDesde.toFixed(1)} a ${t.toFixed(1)} s no hay en pantalla nada más que plataformas, o es muy chico. Haz que algo entre antes o cambia el plano.`); vacioDesde = null; }
  }
  const encuadres = peli.encuadres();
  for (const e of encuadres) {
    const m = [].concat(e.mira).join(", ");
    if (e.lado < minSujeto) nota(`suj ${e.desde}`, `Plano de ${e.desde} s: «${m}» ocupa ${Math.round(e.lado * 100)} % de su lado mayor y el mínimo es ${Math.round(minSujeto * 100)} %. Sube llena o junta los objetos.`);
    if (e.lado <= 1.02 && (e.caja[0] < -2 || e.caja[1] < -2 || e.caja[2] > W + 2 || e.caja[3] > H + 2)) nota(`corte ${e.desde}`, `Plano de ${e.desde} s: «${m}» se sale del cuadro: x ${e.caja[0]}–${e.caja[2]}, y ${e.caja[1]}–${e.caja[3]}.`);
  }
  const rapidos = peli.grupos.filter((g) => g.fin - g.inicio < 1.8).map((g) => ({ texto: g.lineas.flat().map((p) => p.palabra).join(" "), dura: +(g.fin - g.inicio).toFixed(2) }));
  return { formato, ok: avisos.length === 0, espejo: peli.espejo, encuadres: encuadres.map((e) => ({ desde: e.desde, mira: e.mira, lado: e.lado, area: e.area })), subtitulos_cortos: rapidos, avisos };
}

const lista = todos ? Object.keys(FORMATOS) : [formatoPedido ?? film.FORMATO];
const resultados = lista.map(revisar);
const ok = resultados.every((r) => r.ok);
console.log(JSON.stringify(todos ? { ok, formatos: resultados } : resultados[0], null, 1));
process.exit(ok ? 0 : 1);
