// revisar.py, referencia.py y entrega.py se corren de verdad sobre videos generados con ffmpeg (lavfi), sin red.
// Cada fallo se demuestra con un video malo y un caso bueno debe pasar. Sin Python, ffmpeg o numpy/scipy, se saltan y lo dicen.
import test, { before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const hay = (cmd, args) => spawnSync(cmd, args, { encoding: "utf8" }).status === 0;
const python = hay("python", ["--version"]) ? "python" : hay("python3", ["--version"]) ? "python3" : null;
const listo = python && hay("ffmpeg", ["-version"]) && spawnSync(python, ["-c", "import numpy, scipy.signal"], { encoding: "utf8" }).status === 0;
const entorno = { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" };
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "claqueta-rev-"));
test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

const correr = (cmd, args, cwd = raiz) =>
  new Promise((res) => {
    const p = spawn(cmd, args, { cwd, env: entorno });
    let stdout = "", stderr = "";
    p.stdout.on("data", (d) => (stdout += d));
    p.stderr.on("data", (d) => (stderr += d));
    p.on("close", (status) => res({ status, stdout, stderr }));
  });
const enParalelo = async (tareas, limite = 6) => {
  const sig = tareas.map(() => null);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limite, tareas.length) }, async () => {
    while (i < tareas.length) { const k = i++; sig[k] = await tareas[k](); }
  }));
  return sig;
};

const S = "540x960";
const VID = ["-c:v", "libx264", "-preset", "ultrafast", "-crf", "30", "-pix_fmt", "yuv420p", "-r", "30"];
const AUD = ["-c:a", "aac", "-b:a", "128k", "-ar", "48000"];
const BASE = ["-hide_banner", "-loglevel", "error", "-y"];
const lavfi = (f) => ["-f", "lavfi", "-i", f];
const tono = (d, vol = 2.4, f = 440) => lavfi(`sine=f=${f}:r=48000:d=${d},volume=${vol}`);
const t2 = (d, post = "") => lavfi(`testsrc2=s=${S}:r=30:d=${d}${post ? "," + post : ""}`);
const concat = (n) => ["-filter_complex", `${Array.from({ length: n }, (_, k) => `[${k}:v]`).join("")}concat=n=${n}:v=1:a=0[v]`, "-map", "[v]"];
const dur = (d) => ["-t", String(d)];

// Cada video: nombre -> argumentos de ffmpeg. El audio es un tono a unos -14 LUFS salvo que se diga otra cosa.
const VIDEOS = {
  bueno: [...t2(2), ...lavfi(`testsrc2=s=${S}:r=30:d=3.4,negate,hflip,hue=h=60`), ...lavfi(`testsrc=s=${S}:r=30:d=2.4,vflip,hue=h=200`), ...tono(7.8), ...concat(3), "-map", "3:a"],
  negro: [...lavfi(`color=c=black:s=${S}:r=30:d=0.8`), ...t2(2), ...lavfi(`color=c=black:s=${S}:r=30:d=0.8`), ...t2(2), ...tono(5.6), ...concat(4), "-map", "4:a"],
  congelado: [...t2(2), ...lavfi(`testsrc2=s=${S}:r=30:d=0.04`), ...t2(1), ...tono(8),
    "-filter_complex", "[1:v]trim=end_frame=1,loop=loop=149:size=1,setpts=N/30/TB[q];[0:v][q][2:v]concat=n=3:v=1:a=0[v]", "-map", "[v]", "-map", "3:a"],
  sin_audio: [...t2(4), "-an"],
  graves: [...t2(4), ...tono(4, 5, 60), "-map", "0:v", "-map", "1:a"],
  iguales: [...t2(1.5), ...t2(1.5, "negate,hflip,hue=h=60"), ...lavfi(`testsrc=s=${S}:r=30:d=1.5,vflip,hue=h=200`), ...t2(1.5, "hue=h=120,vflip"), ...lavfi(`testsrc=s=${S}:r=30:d=1.5,negate`), ...t2(1.5, "hflip,hue=h=250"), ...tono(9), ...concat(6), "-map", "6:a"],
  franja: [...lavfi("testsrc2=s=540x720:r=30:d=4"), ...lavfi("color=c=black:s=540x240:r=30:d=4"), ...tono(4), "-filter_complex", "[0:v][1:v]vstack[v]", "-map", "[v]", "-map", "2:a"],
  vacio: [...t2(2), ...lavfi(`color=c=0x303a44:s=${S}:r=30:d=1.5`), ...t2(2), ...tono(5.5), ...concat(3), "-map", "3:a"],
  // Fondo casi negro legítimo (#0B0806) con un elemento en movimiento: no es un cuadro negro
  oscuro: [...lavfi(`color=c=0x0B0806:s=${S}:r=30:d=4`), ...lavfi("testsrc2=s=240x240:r=30:d=4"), ...tono(4),
    "-filter_complex", "[0:v][1:v]overlay=x='40+t*80':y='300+sin(t*2)*100'[v]", "-map", "[v]", "-map", "2:a"],
  silencios: [...t2(9), ...tono(9), "-af", "volume=0:enable='between(t,3,3.5)+between(t,6,6.6)'", "-map", "0:v", "-map", "1:a"],
  continuo: [...t2(9), ...tono(9), "-map", "0:v", "-map", "1:a"],
  // Cortes cada segundo y clics a 120 BPM: los cortes caen en el pulso
  pulso: [...t2(1), ...t2(1, "negate,hflip,hue=h=60"), ...lavfi(`testsrc=s=${S}:r=30:d=1,vflip,hue=h=200`), ...t2(1, "hue=h=120,vflip"), ...lavfi(`testsrc=s=${S}:r=30:d=1,negate`), ...t2(1, "hflip,hue=h=250"), ...t2(1, "negate,vflip"), ...lavfi(`testsrc=s=${S}:r=30:d=1,hue=h=90`),
    ...lavfi("aevalsrc='if(lt(mod(t,0.5),0.04),0.7*sin(2*PI*1500*t),0)':s=48000:d=8"), ...concat(8), "-map", "8:a"],
};
const SIN_AUDIO = new Set(["sin_audio"]);

// Voz de ejemplo del sistema sobre ruido rosa: el ruido a -22 dB deja oír la voz, a +12 dB la tapa.
const voz = path.join(raiz, "assets/voices/edge-es-CO-GonzaloNeural.mp3");
const conRuido = (nivel) => ["-i", voz, ...lavfi(`color=c=0x203040:s=${S}:r=30:d=7.3`), ...lavfi("anoisesrc=c=pink:r=48000:d=7.3:a=0.2"),
  "-filter_complex", `[0:a]aresample=48000,apad=whole_dur=7.3[v];[2:a]volume=${nivel}dB[m];[v][m]amix=inputs=2:normalize=0,alimiter=limit=0.8[a]`, "-map", "1:v", "-map", "[a]"];

const R = {}; // resultados de revisar por nombre
const cargar = (r) => { try { return JSON.parse(r.stdout); } catch { return null; } };
const revisar = (video, extra = []) => correr(python, ["tools/qa/revisar.py", video, "--ancho", "540", "--alto", "960", "--tiras", "2", "--sin-voz", "--salida", path.join(dir, "rev-" + path.basename(video, ".mp4")), ...extra]);

describe("revisión de video", { skip: !listo && "faltan Python, ffmpeg, numpy o scipy" }, () => {
  before(async () => {
    const v = (n) => path.join(dir, n + ".mp4");
    await enParalelo(Object.entries(VIDEOS).map(([n, a]) => () => correr("ffmpeg", [...BASE, ...a, ...(SIN_AUDIO.has(n) ? [] : AUD), ...VID, v(n)])), 8);
    await enParalelo(["voz_clara:-22", "voz_tapada:12"].map((s) => () => correr("ffmpeg", [...BASE, ...conRuido(s.split(":")[1]), ...VID, ...AUD, v(s.split(":")[0])])), 2);
    for (const n of ["voz", "efectos"]) fs.mkdirSync(path.join(dir, "proy-" + n, "assets"), { recursive: true });
    fs.writeFileSync(path.join(dir, "proy-voz/assets/tiempos.json"), JSON.stringify({ motor: "edge", nombre_voz: "es-CO-GonzaloNeural", dur: 7.3, palabras: [
      { palabra: "uno", inicio: 0.76, fin: 1.5 }, { palabra: "dos", inicio: 1.5, fin: 2.13 }, { palabra: "tres", inicio: 3.14, fin: 4.0 }, { palabra: "cuatro", inicio: 4.0, fin: 4.57 }, { palabra: "cinco", inicio: 4.9, fin: 6.09 }] }));
    fs.writeFileSync(path.join(dir, "proy-efectos/assets/tiempos.json"), JSON.stringify({ motor: "edge", palabras: [{ palabra: "Hola", inicio: 0.5, fin: 1.4 }, { palabra: "mundo", inicio: 2.0, fin: 3.0 }] }));
    fs.writeFileSync(path.join(dir, "proy-efectos/efectos.json"), JSON.stringify([{ pico: 2.1, sonido: "golpe" }, { pico: 2.4, sonido: "barrido" }, { pico: 2.8, sonido: "impacto" }, { t: 0, archivo: "assets/audio/tiza.wav", bajo_voz: -24 }]));
    const trabajos = [
      ["bueno", ["--duracion", "7.8"]], ["negro", []], ["congelado", []], ["sin_audio", []], ["graves", []], ["iguales", []], ["franja", []], ["vacio", []], ["oscuro", ["--fondo-oscuro"]],
      ["silencios", ["--silencios-min", "2"]], ["continuo", ["--silencios-min", "2"]],
      ["voz_clara", ["--proyecto", path.join(dir, "proy-voz")]], ["voz_tapada", ["--proyecto", path.join(dir, "proy-voz")]], ["efectos", ["--proyecto", path.join(dir, "proy-efectos")]],
    ];
    const salidas = await enParalelo(trabajos.map(([n, extra]) => () => revisar(v(n === "efectos" ? "bueno" : n), n === "efectos" ? ["--salida", path.join(dir, "rev-efectos"), ...extra] : extra)), 6);
    trabajos.forEach(([n], i) => { R[n] = { ...salidas[i], json: cargar(salidas[i]) }; });
  }, { timeout: 280000 });

  const j = (n) => { assert.ok(R[n]?.json, `revisar no dio JSON para ${n}: ${R[n]?.stderr}`); return R[n].json; };
  const dice = (lista, re) => lista.some((x) => re.test(x));

  it("un video bueno pasa: sin fallos ni avisos, con los planos que tiene", () => {
    const r = j("bueno");
    assert.equal(R.bueno.status, 0, JSON.stringify(r.fallos));
    assert.equal(r.ok, true);
    assert.deepEqual(r.fallos, []);
    assert.deepEqual(r.avisos, []);
    const planos = r.medido.imagen.planos.planos.map((p) => p.dur);
    assert.equal(planos.length, 3, planos.join(","));
    [2.0, 3.4, 2.4].forEach((d, k) => assert.ok(Math.abs(planos[k] - d) < 0.15, `plano ${k}: ${planos[k]}`));
    assert.ok(r.preguntas.length >= 5, "las preguntas para el ojo van siempre");
    assert.match(r.aviso_preguntas, /máquina no puede juzgar/);
    assert.ok(r.no_comprobado.some((x) => /nadie oyó/.test(x)) && r.no_comprobado.some((x) => /teléfono/.test(x)));
    for (const f of ["hoja", "revision"]) assert.ok(fs.existsSync(r.archivos[f]) || fs.existsSync(path.join(raiz, r.archivos[f])), f);
    assert.ok(Math.abs(r.medido.tecnica.lufs + 14) < 1, `lufs ${r.medido.tecnica.lufs}`);
    assert.equal(r.medido.imagen.saltos.fuente, "tools/qa/saltos.py", "reutiliza saltos.py");
    assert.equal(r.medido.imagen.saltos.fuertes_sin_corte.length, 0, "los cortes de plano no son saltos sospechosos");
  });

  it("un primer cuadro negro y un negro a mitad se detectan", () => {
    const r = j("negro");
    assert.equal(r.ok, false);
    assert.equal(R.negro.status, 1);
    assert.ok(dice(r.fallos, /primer cuadro está negro/), r.fallos.join("|"));
    assert.ok(dice(r.fallos, /cuadro\(s\) negros/), r.fallos.join("|"));
    assert.ok(r.mirar.some((m) => m.segundo === 0 && m.imagen && /tira-/.test(m.imagen)), "cada momento trae su tira");
  });

  it("un fondo casi negro legítimo no se confunde con un cuadro negro", () => {
    const r = j("oscuro");
    assert.equal(r.medido.imagen.cuadros_negros, 0);
    assert.deepEqual(r.fallos, [], r.fallos.join("|"));
    assert.equal(r.medido.imagen.fondo_oscuro.declarado, true);
  });

  it("una imagen congelada más de lo permitido avisa", () => {
    const r = j("congelado");
    assert.ok(dice(r.avisos, /no cambia en nada \(ni un borde\) durante más de 3.5 s/), r.avisos.join("|"));
    assert.ok(r.medido.imagen.tramos_congelados[0].hasta - r.medido.imagen.tramos_congelados[0].desde > 4.5);
  });

  it("sin pista de audio es un fallo", () => {
    const r = j("sin_audio");
    assert.ok(dice(r.fallos, /sin pista de audio/), r.fallos.join("|"));
  });

  it("casi toda la energía bajo 120 Hz es un fallo: en un teléfono no suena", () => {
    const r = j("graves");
    assert.ok(r.medido.sonido.energia_bajo_120hz_pct >= 90, String(r.medido.sonido.energia_bajo_120hz_pct));
    assert.ok(dice(r.fallos, /bajo 120 Hz/), r.fallos.join("|"));
  });

  it("todos los planos iguales avisa", () => {
    const r = j("iguales");
    assert.equal(r.medido.imagen.planos.cantidad, 6, JSON.stringify(r.medido.imagen.planos.planos.map((p) => p.dur)));
    assert.ok(dice(r.avisos, /todos duran casi lo mismo/), r.avisos.join("|"));
  });

  it("una franja vacía sostenida bajo el contenido avisa y trae un cuadro para verla", () => {
    const r = j("franja");
    assert.ok(dice(r.avisos, /franja de y 720 a 960/), r.avisos.join("|"));
    assert.ok(r.mirar.some((m) => /franja vacía/.test(m.razon) && /cuadro-franja/.test(m.imagen)));
  });

  it("un cuadro liso en medio del video avisa", () => {
    const r = j("vacio");
    assert.ok(dice(r.avisos, /casi vacío/), r.avisos.join("|"));
    assert.ok(r.medido.imagen.tramos_vacios.some((t) => t.hasta - t.desde > 1.2));
  });

  it("cuenta los silencios reales y avisa si faltan", () => {
    const con = j("silencios"), sin = j("continuo");
    assert.equal(con.medido.sonido.silencios_reales.length, 2, JSON.stringify(con.medido.sonido.silencios_reales));
    assert.ok(!dice(con.avisos, /silencio\(s\) real/), con.avisos.join("|"));
    assert.equal(sin.medido.sonido.silencios_reales.length, 0);
    assert.ok(dice(sin.avisos, /0 silencio\(s\) real\(es\)/), sin.avisos.join("|"));
  });

  it("detecta la voz que la música tapa, con las palabras de tiempos.json", () => {
    const clara = j("voz_clara"), tapada = j("voz_tapada");
    assert.equal(clara.medido.sonido.voz_contra_musica.fuente_de_la_voz, "assets/tiempos.json");
    assert.ok(clara.medido.sonido.voz_contra_musica.contraste_mediano_db > 25, JSON.stringify(clara.medido.sonido.voz_contra_musica));
    assert.ok(!dice(clara.avisos, /sobresale poco/), clara.avisos.join("|"));
    assert.ok(tapada.medido.sonido.voz_contra_musica.contraste_mediano_db < 10, JSON.stringify(tapada.medido.sonido.voz_contra_musica));
    assert.ok(dice(tapada.avisos, /sobresale poco/), tapada.avisos.join("|"));
  });

  it("mide la densidad de efectos y los que caen sobre una palabra", () => {
    const r = j("efectos");
    assert.equal(r.medido.sonido.efectos.golpes, 3, "la capa continua con bajo_voz no cuenta como golpe");
    assert.equal(r.medido.sonido.efectos.maximo_en_1_s, 3);
    assert.ok(dice(r.avisos, /3 efectos dentro de 1 s/), r.avisos.join("|"));
    assert.ok(dice(r.avisos, /caen sobre una palabra.*«mundo»/), r.avisos.join("|"));
  });

  it("una entrada que no es un video termina con error claro", async () => {
    const r = await correr(python, ["tools/qa/revisar.py", path.join(dir, "no-existe.mp4")]);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /no existe/);
  });
});

describe("referencia: gramática de un video, no su contenido", { skip: !listo && "faltan Python, ffmpeg, numpy o scipy" }, () => {
  let ref, comp;
  const salida = () => path.join(dir, "ref");
  before(async () => {
    const v = (n) => path.join(dir, n + ".mp4");
    assert.ok(fs.existsSync(v("pulso")) || (await correr("ffmpeg", [...BASE, ...VIDEOS.pulso, ...AUD, ...VID, v("pulso")])).status === 0);
    ref = await correr(python, ["tools/qa/referencia.py", v("pulso"), "--salida", salida(), "--comparar", v("bueno")]);
    comp = ref.status === 0 ? JSON.parse(ref.stdout) : null;
  }, { timeout: 200000 });

  it("deja REFERENCIA.md, referencia.json, proyecto-referencia.json y una hoja de planos", () => {
    assert.equal(ref.status, 0, ref.stderr);
    for (const a of ["REFERENCIA.md", "referencia.json", "proyecto-referencia.json", "hoja-planos.jpg", "comparacion.md"]) assert.ok(fs.existsSync(path.join(salida(), a)), a);
    const md = fs.readFileSync(path.join(salida(), "REFERENCIA.md"), "utf8");
    assert.match(md, /Se conserva \(gramática\)/);
    assert.match(md, /\*\*NO se copia\*\* \| imágenes, música, voz, textos y guion, marca/);
    assert.match(md, /Estimado:/);
  });

  it("mide planos de 1 s y el pulso de 120 BPM, y ve que los cortes caen en él", () => {
    const r = JSON.parse(fs.readFileSync(path.join(salida(), "referencia.json"), "utf8"));
    assert.equal(r.ritmo.planos, 8, JSON.stringify(r.planos.map((p) => p.dur)));
    assert.ok(Math.abs(r.ritmo.mediana_s - 1) < 0.1, String(r.ritmo.mediana_s));
    const s = r.sonido.sincronia_cortes_pulso;
    assert.equal(s.pulso_claro, true, JSON.stringify(r.sonido.pulso));
    assert.ok(Math.abs(s.bpm - 120) < 4, `bpm ${s.bpm}`);
    assert.ok(s.cortes_en_pulso_pct >= 80, JSON.stringify(s));
    assert.equal(s.veredicto, "los cortes caen en el pulso");
    assert.equal(r.formato.relacion, "9:16");
  });

  it("no guarda nada del contenido: ni texto, ni música, ni imágenes en los ajustes", () => {
    const proyecto = JSON.parse(fs.readFileSync(path.join(salida(), "proyecto-referencia.json"), "utf8"));
    assert.ok(proyecto.planos.length >= 6 && proyecto.planos.every((p) => p.texto === "" && p.dur >= 0.2));
    assert.deepEqual(Object.keys(proyecto).sort(), ["entrega", "guion", "montaje", "planos", "sonido"].sort());
    assert.match(proyecto.guion.notas, /No copies imágenes, música, textos, marca ni personas/);
    assert.equal(proyecto.montaje.ritmo, "frenetico", "planos de 1 s son ritmo frenético");
    const crudo = fs.readFileSync(path.join(salida(), "referencia.json"), "utf8");
    assert.ok(!/http|\.mp3|\.wav/.test(crudo.replace(/pulso\.mp4|bueno\.mp4/g, "")), "sin rutas ni enlaces");
  });

  it("proyecto-referencia.json corre con tools/prompt.mjs y respeta las duraciones", async () => {
    const r = await correr(process.execPath, ["tools/prompt.mjs", path.join(salida(), "proyecto-referencia.json"), "--lang", "es"]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Plano 1/);
    assert.match(r.stdout, /No copies imágenes, música, textos, marca ni personas/);
    assert.match(r.stdout, /Ritmo (vivo|frenético)/);
  });

  it("--comparar escribe una tabla de diferencias de ritmo", () => {
    assert.ok(comp.comparacion.filas.length >= 15);
    const fila = (m) => comp.comparacion.filas.find((f) => f.medida === m);
    assert.match(fila("Mediana del plano").lectura, /planos más largos/, "bueno tiene planos más largos que el de referencia");
    assert.match(fila("Cortes por minuto").lectura, /menos cortes/);
    const md = fs.readFileSync(path.join(salida(), "comparacion.md"), "utf8");
    assert.match(md, /\| Medida \| Referencia \| Mío \| Lectura \|/);
  });

  it("solo lee archivos locales", async () => {
    const r = await correr(python, ["tools/qa/referencia.py", "https://ejemplo.com/reel.mp4"]);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /no existe|local/);
  });
});

describe("entrega: la carpeta final", { skip: !listo && "faltan Python, ffmpeg, numpy o scipy" }, () => {
  const proy = () => path.join(dir, "proy-entrega");
  let sinRevision, conRevision;
  before(async () => {
    const p = proy();
    for (const d of ["renders", "assets/fonts", "assets/audio"]) fs.mkdirSync(path.join(p, d), { recursive: true });
    fs.copyFileSync(path.join(dir, "bueno.mp4"), path.join(p, "renders/final.mp4"));
    fs.writeFileSync(path.join(p, "renders/final.srt"), "1\n00:00:00,000 --> 00:00:02,000\nHola\n");
    fs.writeFileSync(path.join(p, "creditos.json"), JSON.stringify([
      { archivo: "assets/img/faro.jpg", credito: "«Faro», de Ana. Licencia BY 2.0. https://ejemplo.org/faro", credito_necesario: true, licencia: "by", fuente: "openverse" },
      { archivo: "assets/img/mesa.jpg", credito: "«Mesa», de Luis. Licencia CC0.", credito_necesario: false, licencia: "cc0", fuente: "wikimedia" }]));
    fs.writeFileSync(path.join(p, "assets/tiempos.json"), JSON.stringify({ motor: "edge", nombre_voz: "es-CO-GonzaloNeural", dur: 8, palabras: [] }));
    fs.writeFileSync(path.join(p, "assets/audio/rejilla.json"), "{}");
    fs.copyFileSync(path.join(raiz, "assets/fonts/OFL-Sora.txt"), path.join(p, "assets/fonts/OFL-Sora.txt"));
    fs.writeFileSync(path.join(p, "assets/fonts/Sora-Variable.ttf"), "");
    fs.writeFileSync(path.join(p, "assets/fonts/Anton-400.woff2"), "");
    const lanzar = (extra) => correr(python, [path.join(raiz, "tools/entrega.py"), "renders/final.mp4", "--titulo", "Prueba de entrega", "--max-mb", "0.8", ...extra], p);
    sinRevision = await lanzar(["--salida", "entrega-sin"]);
    const rev = await correr(python, [path.join(raiz, "tools/qa/revisar.py"), "renders/final.mp4", "--ancho", "540", "--alto", "960", "--duracion", "7.8", "--sin-voz", "--tiras", "1"], p);
    assert.equal(rev.status, 0, rev.stdout.slice(0, 600) + rev.stderr);
    conRevision = await lanzar(["--portada", "1.0"]);
  }, { timeout: 120000 });

  it("sin revisión crea la carpeta pero no da el visto bueno", () => {
    assert.equal(sinRevision.status, 1, sinRevision.stderr);
    const j = JSON.parse(sinRevision.stdout);
    assert.equal(j.ok, false);
    assert.match(j.aviso, /no hay revisión/);
    assert.match(fs.readFileSync(path.join(proy(), "entrega-sin/INFORME.md"), "utf8"), /SIN REVISIÓN/);
  });

  it("con revisión deja máster, copia liviana, portada, subtítulos, créditos e informe, y no sube nada", () => {
    assert.equal(conRevision.status, 0, conRevision.stdout + conRevision.stderr);
    const j = JSON.parse(conRevision.stdout);
    assert.equal(j.ok, true);
    assert.equal(j.nada_se_subio, true);
    for (const a of ["master.mp4", "liviano.mp4", "portada.jpg", "final.srt", "CREDITOS.md", "INFORME.md"]) assert.ok(fs.existsSync(path.join(proy(), "entrega", a)), a);
    assert.ok(fs.statSync(path.join(proy(), "entrega/liviano.mp4")).size <= 0.8 * 1048576, "la copia liviana cabe en el límite");
    const sonda = spawnSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name,pix_fmt", "-of", "csv=p=0", path.join(proy(), "entrega/liviano.mp4")], { encoding: "utf8" });
    assert.match(sonda.stdout, /h264,yuv420p/);
    assert.equal(j.portada.segundo, 1);
  });

  it("la portada automática no es un cuadro negro ni liso", async () => {
    const r = await correr(python, [path.join(raiz, "tools/entrega.py"), "renders/final.mp4", "--titulo", "Auto", "--salida", "entrega-auto", "--max-mb", "50"], proy());
    const j = JSON.parse(r.stdout);
    assert.equal(j.portada.elegida_por, "nitidez y contraste");
    assert.ok(j.portada.segundo >= 0.5 && j.portada.segundo <= 7.5, String(j.portada.segundo));
    assert.equal(fs.existsSync(path.join(proy(), "entrega-auto/liviano.mp4")), false, "sin copia liviana si el máster pasa de largo el límite");
    const media = spawnSync("ffmpeg", ["-hide_banner", "-i", path.join(proy(), "entrega-auto/portada.jpg"), "-vf", "signalstats,metadata=print", "-f", "null", "-"], { encoding: "utf8" });
    const m = /YAVG=([\d.]+)/.exec(media.stderr);
    assert.ok(m && Number(m[1]) > 20, "la portada tiene luz");
  });

  it("CREDITOS.md señala lo que exige atribución, declara la voz y la música generadas y revisa las fuentes", () => {
    const md = fs.readFileSync(path.join(proy(), "entrega/CREDITOS.md"), "utf8");
    assert.match(md, /Atribución obligatoria[\s\S]*«Faro», de Ana\. Licencia BY 2\.0/);
    assert.match(md, /Voz generada\*\* con el motor `edge`, voz `es-CO-GonzaloNeural`/);
    assert.match(md, /Música compuesta con código/);
    assert.match(md, /\| Sora \| SIL Open Font License 1\.1 \| sí \|/);
    assert.match(md, /\| Anton \|.*\*\*no\*\*/, "falta la licencia de Anton y lo dice");
    assert.match(md, /assets\/img\/faro\.jpg.*no se encontró/);
  });

  it("INFORME.md trae lo medido y la sección fija de lo que no se pudo comprobar", () => {
    const md = fs.readFileSync(path.join(proy(), "entrega/INFORME.md"), "utf8");
    assert.match(md, /Veredicto de la revisión: sin fallos/);
    assert.match(md, /-14,\d LUFS/);
    assert.match(md, /## Lo que no se pudo comprobar[\s\S]*Nadie oyó la mezcla[\s\S]*No se vio en un teléfono/);
    assert.match(md, /Declaración de contenido generado/);
    assert.match(md, /- \[ \] En /, "las preguntas para el ojo quedan como casillas");
  });
});
