// Las herramientas de material grabado se corren de verdad con video generado por ffmpeg, sin red y sin modelos:
// la transcripción entra por --transcripcion. Sin Python, numpy o ffmpeg, se saltan y lo dicen.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const hay = (cmd, args) => spawnSync(cmd, args, { encoding: "utf8" }).status === 0;
const python = hay("python", ["--version"]) ? "python" : hay("python3", ["--version"]) ? "python3" : null;
const listo = python && hay("ffmpeg", ["-version"]) && hay("ffprobe", ["-version"]) && spawnSync(python, ["-c", "import numpy"], { encoding: "utf8" }).status === 0;
const sin = !listo && "faltan Python, numpy o ffmpeg";
const tienePillow = listo && spawnSync(python, ["-c", "import PIL"], { encoding: "utf8" }).status === 0;
const env = { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1", PYTHONDONTWRITEBYTECODE: "1" };
const correr = (args) => spawnSync(python, args, { cwd: raiz, encoding: "utf8", env });
const herramienta = (nombre, args) => correr([path.join("tools", "material", nombre), ...args]);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "claqueta-material ñ-"));
test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

const sondear = (archivo) => {
  const r = spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type,width,height,duration", "-show_entries", "format=duration", "-of", "json", archivo], { encoding: "utf8" });
  const j = JSON.parse(r.stdout);
  const v = j.streams.find((s) => s.codec_type === "video"), a = j.streams.find((s) => s.codec_type === "audio");
  return { dur: Number(j.format.duration), ancho: v && v.width, alto: v && v.height, durVideo: v && Number(v.duration), durAudio: a && Number(a.duration) };
};
const ffmpeg = (args) => {
  const r = spawnSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
};
// Audio de prueba: un tono por palabra, con ruido de sala debajo. ventanas = [[inicio, fin], ...]
const audio = (ventanas, dur, salida) => {
  const voz = ventanas.map(([a, b]) => `between(t,${a},${b})`).join("+");
  ffmpeg(["-f", "lavfi", "-i", `aevalsrc='0.3*sin(2*PI*220*t)*(${voz})+0.002*sin(2*PI*50*t)':s=48000:d=${dur}`, "-c:a", "pcm_s16le", salida]);
};
const unir = (fuente, wav, salida) => ffmpeg(["-f", "lavfi", "-i", fuente, "-i", wav, "-shortest", "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", "-c:a", "aac", salida]);
const palabras = (lista) => lista.map(([palabra, inicio, fin]) => ({ palabra, inicio, fin }));
const escribir = (archivo, datos) => fs.writeFileSync(archivo, typeof datos === "string" ? datos : JSON.stringify(datos));
const leer = (archivo) => JSON.parse(fs.readFileSync(archivo, "utf8"));
const pixel = (video, t, x, y) => {
  const r = spawnSync("ffmpeg", ["-v", "error", "-ss", String(t), "-i", video, "-frames:v", "1", "-vf", `format=rgb24,crop=1:1:${x}:${y}`, "-f", "rawvideo", "-"], { encoding: "buffer" });
  return [...r.stdout.subarray(0, 3)];
};

// ---------- toma.py ----------

const GUION = "Hola amigos, hoy hablamos de cortes. Primero grabas varias veces. Después eliges la mejor toma.";
const HABLA = [
  // frase 1: un intento a medias y uno completo
  ["hola", 0.5, 0.8], ["amigos", 0.85, 1.15], ["hoy", 1.2, 1.5],
  ["hola", 3.0, 3.3], ["amigos,", 3.35, 3.65], ["hoy", 3.7, 4.0], ["hablamos", 4.05, 4.5], ["de", 4.55, 4.7], ["cortes.", 4.75, 5.2],
  // frase 2: un intento limpio y otro, el último, con muletilla y una pausa larga
  ["primero", 6.5, 6.9], ["grabas", 6.95, 7.35], ["varias", 7.4, 7.8], ["veces.", 7.85, 8.25],
  ["primero", 9.6, 10.0], ["eh", 10.1, 10.35], ["grabas", 10.45, 10.85], ["varias", 12.05, 12.45], ["veces.", 12.5, 12.9],
  // frase 3: un intento completo y, después, uno que se corta
  ["después", 14.0, 14.4], ["eliges", 14.45, 14.85], ["la", 14.9, 15.0], ["mejor", 15.05, 15.4], ["toma.", 15.45, 15.8],
  ["después", 17.2, 17.6], ["eliges", 17.65, 17.85], ["la", 17.9, 18.0],
];
const DUR_TOMA = 19.5;

let toma = null;
const prepararToma = () => {
  if (toma) return toma;
  const wav = path.join(dir, "toma.wav"), mp4 = path.join(dir, "toma grabación ñ.mp4"), trans = path.join(dir, "toma.json"), guion = path.join(dir, "guion.txt");
  audio(HABLA.map(([, a, b]) => [a, b]), DUR_TOMA, wav);
  unir(`testsrc2=s=180x320:r=30:d=${DUR_TOMA}`, wav, mp4);
  escribir(trans, palabras(HABLA));
  escribir(guion, GUION + "\n");
  const salida = path.join(dir, "toma-salida");
  const r = herramienta("toma.py", ["analizar", mp4, "--guion", guion, "--salida", salida, "--transcripcion", trans]);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  toma = { wav, mp4, trans, guion, salida, resumen: JSON.parse(r.stdout.trim().split("\n").pop()), cortes: leer(path.join(salida, "cortes.json")) };
  return toma;
};

test("toma analizar elige el último intento completo y descarta el que se corta", { skip: sin }, () => {
  const { cortes } = prepararToma();
  const [f1, f2, f3] = cortes.frases;
  assert.equal(f1.intentos.length, 2);
  assert.equal(f1.elegido, 2, "la frase 1 se queda con el intento completo, no con el de tres palabras");
  assert.match(f1.intentos[0].motivo, /incompleto: cobertura \d+ %/);
  assert.equal(f2.elegido, 2, "entre dos intentos completos de la frase 2, gana el último");
  assert.ok(f2.intentos[1].se_quita.some((q) => q.tipo === "muletilla" && q.texto === "eh"));
  assert.equal(f3.intentos.length, 2);
  assert.equal(f3.elegido, 1, "el último intento de la frase 3 no está completo: gana el anterior");
  assert.equal(f3.intentos[1].completo, false);
  for (const f of cortes.frases) assert.ok(f.razon.length > 10, "cada frase dice por qué");
});

test("toma analizar corta en silencios, quita la muletilla y recorta la pausa larga", { skip: sin }, () => {
  const { cortes } = prepararToma();
  const t = cortes.tramos;
  assert.equal(t.length, 5, t.map((x) => `${x.id} ${x.inicio}-${x.fin}`).join(" | "));
  assert.ok(t.every((x) => x.activo === true && x.razon.length > 5 && x.dura > 0.3));
  // frase 1: de la entrada (0,1 s antes de «hola») a la cola (0,18 s tras «cortes»)
  assert.ok(Math.abs(t[0].inicio - 2.9) < 0.07 && Math.abs(t[0].fin - 5.38) < 0.07, `${t[0].inicio}-${t[0].fin}`);
  assert.match(t[0].texto, /Hola amigos/i);
  // frase 2: tres trozos, sin la muletilla ni la pausa
  assert.deepEqual(t.slice(1, 4).map((x) => x.frase), [2, 2, 2]);
  assert.match(t[2].razon, /muletilla/);
  assert.match(t[3].razon, /pausa/);
  const dentro = (x) => HABLA.some(([, a, b]) => x > a + 0.02 && x < b - 0.02);
  for (const x of t) assert.ok(!dentro(x.inicio) && !dentro(x.fin), `el tramo ${x.id} corta dentro de una palabra`);
  assert.ok(!t.some((x) => x.inicio < 10.35 && x.fin > 10.1 && x.id !== t[1].id && x.inicio >= 10.1), "la muletilla no queda dentro de ningún tramo");
  assert.ok(cortes.quitados.some((q) => q.tipo === "muletilla") && cortes.quitados.some((q) => q.tipo === "pausa" && q.dura > 0.7));
  const total = t.reduce((s, x) => s + x.dura, 0);
  // 2,48 de la frase 1 + 0,65 + 0,6 + 1,1 de la frase 2 + 2,08 de la frase 3
  assert.ok(total > 6.3 && total < 7.2, `dura ${total}`);
  assert.equal(cortes.resumen.frases, 3);
  assert.ok(cortes.resumen.quitado_s > 12);
});

test("toma renderizar deja el video con la duración de los tramos y el audio pegado", { skip: sin }, () => {
  const { salida, cortes } = prepararToma();
  const r = herramienta("toma.py", ["renderizar", path.join(salida, "cortes.json")]);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const j = JSON.parse(r.stdout.trim().split("\n").pop());
  const esperado = cortes.tramos.reduce((s, x) => s + x.dura, 0);
  const m = sondear(path.join(salida, "toma-limpia.mp4"));
  assert.ok(Math.abs(m.durVideo - esperado) < 2 / 30, `video ${m.durVideo}, esperado ${esperado}`);
  assert.ok(Math.abs(m.durAudio - esperado) < 0.05, `audio ${m.durAudio}, esperado ${esperado}`);
  assert.equal(m.ancho, 180);
  assert.ok(j.desfase_audio_video < 0.05, `desfase ${j.desfase_audio_video}`);
  assert.ok(fs.existsSync(path.join(salida, "hoja-aprobacion.jpg")));
  const jpg = fs.readFileSync(path.join(salida, "hoja-aprobacion.jpg"));
  assert.deepEqual([...jpg.subarray(0, 2)], [0xff, 0xd8], "la hoja es un JPG");
  if (tienePillow) assert.ok(jpg.length > 8000, "la hoja trae los cuadros");
});

test("toma renderizar pone cada cuadro donde dijo cortes.json", { skip: sin }, () => {
  const { salida, mp4, cortes } = prepararToma();
  const limpia = path.join(salida, "toma-limpia.mp4");
  const psnr = (a, ta, b, tb) => {
    const f1 = path.join(dir, "p1.png"), f2 = path.join(dir, "p2.png");
    ffmpeg(["-ss", String(ta), "-i", a, "-frames:v", "1", f1]);
    ffmpeg(["-ss", String(tb), "-i", b, "-frames:v", "1", f2]);
    const r = spawnSync("ffmpeg", ["-hide_banner", "-i", f1, "-i", f2, "-lavfi", "psnr", "-f", "null", "-"], { encoding: "utf8" });
    const m = /average:([\d.]+|inf)/.exec(r.stderr);
    return m[1] === "inf" ? 99 : Number(m[1]);
  };
  let e = 0;
  for (const t of cortes.tramos.slice(0, 3)) {
    const correcto = psnr(mp4, t.inicio + 0.005, limpia, e + 0.005);
    const corrido = psnr(mp4, t.inicio + 0.005 + 4 / 30, limpia, e + 0.005);
    assert.ok(correcto > 30 && correcto > corrido + 6, `${t.id}: ${correcto} dB contra ${corrido} dB si se corre 4 cuadros`);
    e += t.dura;
  }
});

test("toma deja assets/tiempos.json con el formato de pista.py voz", { skip: sin }, () => {
  const { salida, cortes } = prepararToma();
  const t = leer(path.join(salida, "assets", "tiempos.json"));
  for (const k of ["voz", "motor", "nombre_voz", "fin_voz", "dur", "formato", "palabras", "pausas", "grupos"]) assert.ok(k in t, `falta ${k}`);
  assert.equal(t.voz, "assets/voz/voz.wav");
  assert.equal(t.motor, "grabada");
  assert.equal(t.formato, "9:16");
  const esperado = cortes.tramos.reduce((s, x) => s + x.dura, 0);
  assert.ok(Math.abs(t.dur - esperado) < 0.1, `dur ${t.dur}`);
  assert.ok(t.fin_voz <= t.dur && t.fin_voz > esperado - 1);
  assert.ok(t.palabras.every((p, i) => p.fin > p.inicio && (i === 0 || p.inicio >= t.palabras[i - 1].inicio)), "palabras en orden");
  assert.equal(t.palabras.length, 15, "las 15 palabras que se quedan: 6 + 4 + 5, sin «eh» ni los intentos descartados");
  assert.ok(!t.palabras.some((p) => /^eh$/i.test(p.palabra)));
  assert.ok(t.palabras[0].inicio > 0.03 && t.palabras[0].inicio < 0.2, `la primera palabra empieza en ${t.palabras[0].inicio}`);
  assert.ok(t.grupos.length >= 2 && t.grupos.every((g) => g.lineas.length >= 1 && g.palabras.length >= 1));
  assert.ok(Array.isArray(t.pausas) && t.pausas.every((p) => p.fin > p.inicio));
  assert.ok(fs.existsSync(path.join(salida, "assets", "voz", "voz.wav")) && fs.existsSync(path.join(salida, "assets", "voz", "palabras.json")));
  assert.match(fs.readFileSync(path.join(salida, "renders", "final.srt"), "utf8"), /-->/);
});

test("toma: se edita cortes.json entre los dos pasos y renderizar lo respeta", { skip: sin }, () => {
  const { salida } = prepararToma();
  const copia = path.join(dir, "toma-editada");
  fs.cpSync(salida, copia, { recursive: true });
  const ruta = path.join(copia, "cortes.json");
  const c = leer(ruta);
  const quitado = c.tramos[4];
  quitado.activo = false;
  escribir(ruta, c);
  const r = herramienta("toma.py", ["renderizar", ruta, "--sin-hoja"]);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const esperado = c.tramos.filter((x) => x.activo).reduce((s, x) => s + x.dura, 0);
  const m = sondear(path.join(copia, "toma-limpia.mp4"));
  assert.ok(Math.abs(m.dur - esperado) < 0.07, `dura ${m.dur}, esperado ${esperado}`);
  const t = leer(path.join(copia, "assets", "tiempos.json"));
  assert.ok(!t.palabras.some((p) => p.palabra === "toma."), "la última frase ya no está en los tiempos");
  // un tramo fuera de la toma es un error claro, no un video roto
  c.tramos[0].fin = 999;
  escribir(ruta, c);
  const mal = herramienta("toma.py", ["renderizar", ruta]);
  assert.notEqual(mal.status, 0);
  assert.match(mal.stderr, /Error: el tramo t01 .* se sale de la toma/);
});

test("toma acepta la transcripción con la forma de Whisper y avisa si el guion no está", { skip: sin }, () => {
  const { mp4, guion } = prepararToma();
  const whisper = path.join(dir, "whisper.json");
  escribir(whisper, { segments: [{ words: HABLA.map(([word, start, end]) => ({ word: " " + word, start, end, probability: 0.9 })) }] });
  const salida = path.join(dir, "toma-whisper");
  const r = herramienta("toma.py", ["analizar", mp4, "--guion", guion, "--salida", salida, "--transcripcion", whisper, "--sin-hoja"]);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const j = JSON.parse(r.stdout.trim().split("\n").pop());
  assert.equal(j.tramos, 5);
  assert.equal(j.hoja, null);
  const falta = path.join(dir, "guion-con-otra-frase.txt");
  escribir(falta, GUION + " Y al final, una frase que nadie dijo en la grabación.\n");
  const r2 = herramienta("toma.py", ["analizar", mp4, "--guion", falta, "--salida", path.join(dir, "toma-falta"), "--transcripcion", whisper, "--sin-hoja"]);
  assert.equal(r2.status, 0, r2.stderr);
  const j2 = JSON.parse(r2.stdout.trim().split("\n").pop());
  assert.ok(j2.avisos.some((a) => /Frase 4 .* no aparece en la grabación/.test(a)), JSON.stringify(j2.avisos));
  assert.equal(j2.con_tramo, 3);
  const sinGuion = herramienta("toma.py", ["analizar", mp4, "--guion", path.join(dir, "no-existe.txt"), "--transcripcion", whisper]);
  assert.notEqual(sinGuion.status, 0);
  assert.match(sinGuion.stderr, /^Error: no existe/m);
});

// ---------- cortos.py y reencuadre.py ----------

const CORTOS = [
  ["hoy", 1.0, 1.3], ["vamos", 1.36, 1.66], ["a", 1.72, 1.8], ["cortar", 1.86, 2.3], ["mejor.", 2.36, 2.8],
  ["cada", 3.8, 4.1], ["corte", 4.16, 4.6], ["cae", 4.66, 4.9], ["en", 4.96, 5.1], ["silencio.", 5.16, 5.8],
  ["nunca", 6.7, 7.0], ["a", 7.06, 7.14], ["mitad", 7.2, 7.6], ["de", 7.66, 7.8], ["palabra.", 7.86, 8.5],
];
// Izquierda roja, centro verde, derecha azul: se sabe qué parte recortó cada reencuadre.
const FUENTE = "color=c=red:s=640x360:r=30:d=10,drawbox=x=320:y=0:w=320:h=360:color=blue:t=fill,drawbox=x=300:y=0:w=40:h=360:color=green:t=fill";
const cerca = (rgb, [r, g, b], tol = 70) => Math.abs(rgb[0] - r) < tol && Math.abs(rgb[1] - g) < tol && Math.abs(rgb[2] - b) < tol;

let largo = null;
const prepararLargo = () => {
  if (largo) return largo;
  const wav = path.join(dir, "largo.wav"), mp4 = path.join(dir, "entrevista larga ñ.mp4"), trans = path.join(dir, "largo.json");
  audio(CORTOS.map(([, a, b]) => [a, b]), 10, wav);
  unir(FUENTE, wav, mp4);
  escribir(trans, palabras(CORTOS));
  largo = { wav, mp4, trans };
  return largo;
};

test("cortos transcribe por frases con la rúbrica y ajusta cada corte a final de frase y a silencio", { skip: sin }, () => {
  const { mp4, trans } = prepararLargo();
  const salida = path.join(dir, "cortos ñ");
  const uno = herramienta("cortos.py", [mp4, "--salida", salida, "--transcripcion", trans]);
  assert.equal(uno.status, 0, uno.stderr + uno.stdout);
  const frases = leer(path.join(salida, "frases.json"));
  assert.equal(frases.length, 3, "tres frases: cada una cierra con punto");
  assert.deepEqual(frases.map((f) => f.id), ["F001", "F002", "F003"]);
  const txt = fs.readFileSync(path.join(salida, "frases.txt"), "utf8");
  assert.match(txt, /F002 3\.8-5\.8 s \| cada corte cae en silencio\./);
  assert.match(txt, /segmentos\.json/);
  const segmentos = path.join(dir, "segmentos.json");
  // el inicio pedido cae en medio de «cada» y el final en medio de «silencio»
  escribir(segmentos, [{ id: "Cada corte", inicio: 3.9, fin: 5.4, titulo: "Silencio", puntos: { gancho: 8, coherencia: 9, emocion: 6, valor: 8, cierre: 7 } }]);
  const dos = herramienta("cortos.py", [mp4, "--salida", salida, "--transcripcion", trans, "--segmentos", segmentos, "--formato", "9:16", "--tam", "180x320", "--reencuadre", "centro"]);
  assert.equal(dos.status, 0, dos.stderr + dos.stdout);
  const carpeta = path.join(salida, "corto-01-cada-corte");
  const s = leer(path.join(carpeta, "segmento.json"));
  const a = s.ajustado;
  assert.ok(Math.abs(a.inicio - 3.65) < 0.05, `inicio ${a.inicio}`);
  assert.ok(Math.abs(a.fin - 6.15) < 0.05, `fin ${a.fin}: debía extenderse hasta cerrar «silencio.»`);
  assert.match(s.como.join(" "), /final se extendió/);
  const enPalabra = (x) => CORTOS.some(([, p, q]) => x > p + 0.01 && x < q - 0.01);
  assert.ok(!enPalabra(a.inicio) && !enPalabra(a.fin), "ningún borde cae dentro de una palabra");
  assert.equal(s.puntaje, 77.5);
  assert.match(s.texto, /^cada corte cae en silencio\.$/);
  const m = sondear(path.join(carpeta, "corto.mp4"));
  assert.equal(m.ancho, 180);
  assert.equal(m.alto, 320);
  assert.ok(Math.abs(m.durVideo - a.dur) < 0.05, `video ${m.durVideo} contra ${a.dur}`);
  const t = leer(path.join(carpeta, "assets", "tiempos.json"));
  assert.equal(t.palabras.length, 5);
  assert.ok(t.palabras[0].inicio > 0.05 && t.palabras[0].inicio < 0.25, `la primera palabra empieza en ${t.palabras[0].inicio}`);
  assert.ok(t.fin_voz < m.dur && t.material === "corto");
  // recorte al centro: izquierda roja, centro verde, derecha azul
  assert.ok(cerca(pixel(path.join(carpeta, "corto.mp4"), 1, 90, 160), [0, 127, 0], 80), "el centro del corto es el centro de la fuente");
  assert.ok(cerca(pixel(path.join(carpeta, "corto.mp4"), 1, 2, 160), [255, 0, 0]), "el borde izquierdo es rojo");
  assert.ok(cerca(pixel(path.join(carpeta, "corto.mp4"), 1, 177, 160), [0, 0, 255]), "el borde derecho es azul");
  assert.ok(fs.existsSync(path.join(carpeta, "trayectoria.json")) && fs.existsSync(path.join(salida, "resumen.json")));
});

test("cortos rechaza un segmentos.json que no sirve", { skip: sin }, () => {
  const { mp4, trans } = prepararLargo();
  const malo = path.join(dir, "segmentos-malo.json");
  escribir(malo, [{ id: "al revés", inicio: 5, fin: 3 }]);
  const r = herramienta("cortos.py", [mp4, "--salida", path.join(dir, "cortos-malo"), "--transcripcion", trans, "--segmentos", malo]);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Error: .*termina antes de empezar/);
});

test("reencuadre sin cara recorta al centro y lo avisa; sin saltos", { skip: sin }, () => {
  const { mp4 } = prepararLargo();
  const salida = path.join(dir, "reencuadre ñ.mp4"), tray = path.join(dir, "tray ñ.json");
  const r = herramienta("reencuadre.py", [mp4, "--formato", "9:16", "--salida", salida, "--tam", "180x320", "--guardar-trayectoria", tray]);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const j = JSON.parse(r.stdout.trim().split("\n").pop());
  assert.equal(j.modo, "centro");
  assert.ok(j.avisos.length >= 1 && /centro/.test(j.avisos.join(" ")), JSON.stringify(j.avisos));
  assert.match(r.stderr, /Aviso: /);
  assert.equal(j.salto_max_px_por_cuadro, 0);
  const m = sondear(salida);
  assert.equal(m.ancho, 180);
  assert.equal(m.alto, 320);
  const t = leer(tray);
  assert.equal(t.origen.ancho, 640);
  assert.ok(Math.abs(t.ventana.ancho - 202.5) < 0.1 && t.ventana.alto === 360);
  assert.ok(cerca(pixel(salida, 1, 2, 160), [255, 0, 0]));
});

test("reencuadre sigue una trayectoria editada: de la izquierda a la derecha, sin saltos", { skip: sin }, () => {
  const { mp4 } = prepararLargo();
  const base = path.join(dir, "tray-base.json"), editada = path.join(dir, "tray-editada.json"), salida = path.join(dir, "paneo.mp4");
  assert.equal(herramienta("reencuadre.py", [mp4, "--formato", "9:16", "--tam", "180x320", "--modo", "centro", "--solo-trayectoria", "--guardar-trayectoria", base]).status, 0);
  const t = leer(base);
  const tope = t.origen.ancho - t.ventana.ancho;
  t.claves = [{ t: 0, x: 0, y: 0 }, { t: 9.9, x: tope, y: 0 }];
  escribir(editada, t);
  const r = herramienta("reencuadre.py", [mp4, "--formato", "9:16", "--tam", "180x320", "--trayectoria", editada, "--salida", salida]);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const j = JSON.parse(r.stdout.trim().split("\n").pop());
  assert.ok(j.salto_max_px_por_cuadro > 0 && j.salto_max_px_por_cuadro < 3, `salto ${j.salto_max_px_por_cuadro}`);
  assert.ok(cerca(pixel(salida, 0.1, 90, 160), [255, 0, 0]), "al empezar, la ventana está a la izquierda: rojo");
  assert.ok(cerca(pixel(salida, 9.7, 90, 160), [0, 0, 255]), "al terminar, a la derecha: azul");
  const mala = path.join(dir, "tray-mala.json");
  escribir(mala, { ...t, origen: { ancho: 1280, alto: 720, fps: 30 } });
  const r2 = herramienta("reencuadre.py", [mp4, "--formato", "9:16", "--trayectoria", mala, "--salida", path.join(dir, "no.mp4")]);
  assert.notEqual(r2.status, 0);
  assert.match(r2.stderr, /Error: la trayectoria es de un video de 1280x720/);
});

test("la ayuda de cada herramienta de material corre y trae ejemplos", { skip: !python && "falta Python" }, () => {
  for (const h of ["toma.py", "cortos.py", "reencuadre.py"]) {
    const r = herramienta(h, ["--help"]);
    assert.equal(r.status, 0, `${h}: ${r.stderr}`);
    assert.match(r.stdout, /Uso:/);
    assert.match(r.stdout, /python tools\/material\//);
  }
});
