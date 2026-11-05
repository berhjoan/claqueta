// Las herramientas se corren de verdad, con archivos reales pequeños. Sin Python ni ffmpeg, se saltan y lo dicen.
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
const conAudio = python && hay("ffmpeg", ["-version"]) && spawnSync(python, ["-c", "import numpy, scipy, soundfile, numba"], { encoding: "utf8" }).status === 0;
const correr = (cmd, args) => spawnSync(cmd, args, { cwd: raiz, encoding: "utf8", env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" } });
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "claqueta-"));
test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

test("la ayuda de cada herramienta corre", { skip: !python && "falta Python" }, () => {
  for (const h of ["tools/tts/hablar.py", "tools/subtitulos/alinear.py", "tools/qa/verificar_video.py", "tools/qa/hoja_cuadros.py", "tools/pista.py", "tools/qa/revisar.py", "tools/qa/referencia.py", "tools/entrega.py", "tools/medios/medios.py", "tools/medios/fuentes.py", "tools/medios/icono.py", "tools/material/toma.py", "tools/material/cortos.py", "tools/material/reencuadre.py"]) {
    const r = correr(python, [h, "--help"]);
    assert.equal(r.status, 0, `${h}: ${r.stderr}`);
  }
});

test("el generador de prompt corre fuera del navegador", () => {
  const r = correr(process.execPath, ["tools/prompt.mjs", "--receta", "pizarra", "--lang", "en"]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Pay for nothing/);
  const mala = correr(process.execPath, ["tools/prompt.mjs", "--receta", "no-existe"]);
  assert.equal(mala.status, 2);
});

test("la música sale con la duración pedida y con rejilla exacta", { skip: !conAudio && "faltan dependencias de audio" }, () => {
  const wav = path.join(dir, "m.wav"), rej = path.join(dir, "m.json");
  const r = correr(python, ["tools/audio/musica.py", "--caracter", "minimal", "--bpm", "120", "--dur", "6", "--salida", wav, "--rejilla", rej]);
  assert.equal(r.status, 0, r.stderr);
  const g = JSON.parse(fs.readFileSync(rej, "utf8"));
  assert.equal(g.bpm, 120);
  assert.equal(g.pulsos[1] - g.pulsos[0], 0.5);
  assert.ok(g.pulsos.every((t) => t < 6));
  const d = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", wav], { encoding: "utf8" });
  assert.ok(Math.abs(Number(d.stdout) - 6) < 0.01, d.stdout);
});

test("efectos y mezcla dejan el nivel objetivo", { skip: !conAudio && "faltan dependencias de audio" }, () => {
  const lista = correr(python, ["tools/audio/efecto.py", "--listar"]);
  assert.ok(lista.stdout.split("\n").length > 10);
  const fx = path.join(dir, "efectos.json");
  fs.writeFileSync(fx, JSON.stringify([{ t: 0.2, sonido: "barrido", dur: 0.4 }, { t: 1.5, sonido: "impacto", ganancia: -4 }]));
  const musica = path.join(dir, "m.wav");
  if (!fs.existsSync(musica)) correr(python, ["tools/audio/musica.py", "--caracter", "minimal", "--dur", "6", "--salida", musica]);
  const mezcla = path.join(dir, "mez.wav");
  const r = correr(python, ["tools/audio/mezcla.py", "--voz", "assets/voices/edge-es-CO-GonzaloNeural.mp3", "--musica", musica, "--efectos", fx, "--dur", "6", "--salida", mezcla, "--silencios", "3-3.4"]);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const j = JSON.parse(r.stdout.trim().split("\n").pop());
  assert.ok(Math.abs(j.lufs + 14) < 1, `lufs ${j.lufs}`);
  assert.ok(j.pico_verdadero <= -2.5, `pico ${j.pico_verdadero}`);
});

test("el motor de pizarra entrega eventos de sonido", () => {
  const salida = path.join(dir, "eventos.json");
  const r = correr(process.execPath, ["engines/pizarra/eventos.mjs", "engines/pizarra/film.js", salida]);
  assert.equal(r.status, 0, r.stderr);
  const e = JSON.parse(fs.readFileSync(salida, "utf8"));
  assert.ok(e.trazos.length > 50);
  assert.ok(e.borradores.length >= 1, "cada pasada del borrador tiene su evento");
  assert.ok(e.trazos.some((t) => t.acento), "el acento se distingue para sonar distinto");
  assert.ok(e.dur > 0);
  assert.ok(e.trazos.every((t) => Number.isFinite(t.t0) && t.d > 0));
});

test("la escritura en tiza falla si falta una letra, en vez de saltarla", async () => {
  const { writeLatin } = await import("../engines/pizarra/latin.js");
  assert.throws(() => writeLatin("hola ☃", 0, 100, 76, 0, {}));
  const s = writeLatin("¿Dónde está el niño?", 0, 100, 76, 0, {});
  assert.ok(s.length > 10);
});

test("un efecto se puede colocar por su pico", { skip: !conAudio && "faltan dependencias de audio" }, () => {
  const fx = path.join(dir, "pico.json"), salida = path.join(dir, "pico.wav");
  fs.writeFileSync(fx, JSON.stringify([{ pico: 1.5, sonido: "impacto", ganancia: -3 }]));
  const r = correr(python, ["tools/audio/mezcla.py", "--efectos", fx, "--dur", "3", "--salida", salida, "--lufs", "-20"]);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const medir = correr(python, ["-c", `import soundfile as sf, numpy as np; x,s=sf.read(r"${salida}"); print(np.abs(x).max(1).argmax()/s)`]);
  assert.ok(Math.abs(Number(medir.stdout) - 1.5) < 0.05, `pico en ${medir.stdout}`);
  const mal = path.join(dir, "mal.json");
  fs.writeFileSync(mal, JSON.stringify([{ sonido: "impacto" }]));
  assert.notEqual(correr(python, ["tools/audio/mezcla.py", "--efectos", mal, "--dur", "3", "--salida", salida]).status, 0);
});

test("las notas sueltas salen en su tiempo", { skip: !conAudio && "faltan dependencias de audio" }, () => {
  const par = path.join(dir, "partitura.json"), salida = path.join(dir, "notas.wav");
  fs.writeFileSync(par, JSON.stringify([{ t: 1, nota: "A3", dur: 2, vel: 0.7, instrumento: "nylon_guitar" }]));
  const r = correr(python, ["tools/audio/notas.py", par, "--dur", "4", "--salida", salida]);
  assert.equal(r.status, 0, r.stderr);
  const medir = correr(python, ["-c", `import soundfile as sf, numpy as np; x,s=sf.read(r"${salida}"); m=np.abs(x).max(1); print(len(x)/s, np.argmax(m>0.02)/s)`]);
  const [dur, inicio] = medir.stdout.trim().split(" ").map(Number);
  assert.ok(Math.abs(dur - 4) < 0.01, `dura ${dur}`);
  assert.ok(Math.abs(inicio - 1) < 0.08, `empieza en ${inicio}`);
  fs.writeFileSync(par, JSON.stringify([{ t: 0, nota: "A3", instrumento: "tuba" }]));
  assert.notEqual(correr(python, ["tools/audio/notas.py", par, "--dur", "2", "--salida", salida]).status, 0);
});

test("los tiempos de palabra se apoyan en lo que suena", { skip: !conAudio && "faltan dependencias de audio" }, () => {
  // Silencio, sonido de 1,0 a 1,5 s, silencio, sonido de 2,5 a 3,0 s. Las marcas llegan corridas, como las de Whisper.
  const prueba = path.join(dir, "tiempos.py");
  fs.writeFileSync(prueba, `
import json, subprocess, sys
import numpy as np, soundfile as sf
sys.path.insert(0, r"${path.join(raiz, "tools", "subtitulos")}")
from tiempos import refinar
sr = 16000
x = np.zeros(4 * sr)
t = np.arange(int(0.5 * sr)) / sr
ruido = np.sin(2 * np.pi * 220 * t) * 0.3
x[sr:sr + len(t)] = ruido
x[int(2.5 * sr):int(2.5 * sr) + len(t)] = ruido
sf.write(r"${path.join(dir, "t.wav")}", x, sr)
r = refinar([{"palabra": "uno", "inicio": 0.7, "fin": 1.4}, {"palabra": "dos", "inicio": 2.2, "fin": 3.3}], r"${path.join(dir, "t.wav")}")
print(json.dumps(r))
`);
  const r = correr(python, [prueba]);
  assert.equal(r.status, 0, r.stderr);
  const [uno, dos] = JSON.parse(r.stdout);
  assert.ok(Math.abs(uno.inicio - 1.0) < 0.03, `uno empieza en ${uno.inicio}`);
  assert.ok(Math.abs(dos.inicio - 2.5) < 0.03, `dos empieza en ${dos.inicio}`);
  assert.ok(Math.abs(dos.fin - 3.0) < 0.04, `dos termina en ${dos.fin}`);
});

test("el grano sale igual con la misma semilla y con transparencia", { skip: !python && "falta Python" }, () => {
  const a = path.join(dir, "g1.png"), b = path.join(dir, "g2.png");
  for (const salida of [a, b]) assert.equal(correr(python, ["tools/imagen/grano.py", "--salida", salida, "--tam", "64", "--alfa", "2.5"]).status, 0);
  assert.ok(fs.readFileSync(a).equals(fs.readFileSync(b)));
  const r = spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=pix_fmt,width", "-of", "csv=p=0", a], { encoding: "utf8" });
  assert.match(r.stdout, /ya8/);
  assert.match(r.stdout, /64/);
});

test("verificar_video dice lo que midió", { skip: !conAudio && "faltan dependencias de audio" }, () => {
  const v = path.join(dir, "v.mp4");
  spawnSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=black:s=1080x1920:r=30:d=2", "-f", "lavfi", "-i", "sine=f=440:d=2", "-shortest", "-pix_fmt", "yuv420p", v]);
  const r = correr(python, ["tools/qa/verificar_video.py", "verificar", v, "--duracion", "2"]);
  const j = JSON.parse(r.stdout);
  assert.equal(j.medido.ancho, 1080);
  assert.equal(j.medido.fps, 30);
  assert.ok(Number.isFinite(j.medido.lufs));
  assert.ok(Math.abs(j.medido.duracion_s - 2) < 0.1);
});

test("la película del motor se configura sin tocar el compositor", async () => {
  const { PALETA, DUR, build } = await import("../engines/pizarra/film.js");
  const F = build();
  assert.deepEqual(Object.keys(F.paleta), Object.keys(PALETA));
  for (const c of Object.values(PALETA)) assert.match(c, /^#[0-9A-Fa-f]{6}$/);
  assert.ok(Array.isArray(F.wipes) && F.wipes.length >= 1);
  assert.ok(F.S.every((st) => Number.isInteger(st.borrador) && st.borrador < F.wipes.length));
  assert.ok(F.S.some((st) => st.borrador === 0));
  assert.equal(F.DUR, DUR);
  const board = fs.readFileSync(path.join(raiz, "engines/pizarra/board.js"), "utf8");
  assert.ok(!board.includes("F.wipe;") && !board.includes("st.wiped"), "el compositor ya no asume una sola pasada");
  const indice = fs.readFileSync(path.join(raiz, "engines/pizarra/ejemplo/index.html"), "utf8");
  for (const m of indice.matchAll(/data-composition-src="([^"]+)"/g)) assert.ok(fs.existsSync(path.join(raiz, "engines/pizarra/ejemplo", path.basename(m[1]))), m[1]);
});

test("la mezcla deja el pico bajo el techo aun con una capa de transitorios fuertes", { skip: !conAudio && "faltan dependencias de audio" }, () => {
  const e = path.join(dir, "ev.json"), tiza = path.join(dir, "tz.wav"), fx = path.join(dir, "fx.json"), salida = path.join(dir, "fuerte.wav");
  correr(process.execPath, ["engines/pizarra/eventos.mjs", "engines/pizarra/film.js", e]);
  assert.equal(correr(python, ["tools/audio/tiza.py", e, "--salida", tiza]).status, 0);
  fs.writeFileSync(fx, JSON.stringify([{ t: 0, archivo: tiza, ganancia: 0, bajo_voz: -24 }, { pico: 3, sonido: "impacto", ganancia: 0 }, { pico: 7, sonido: "impacto", ganancia: 0 }]));
  const r = correr(python, ["tools/audio/mezcla.py", "--voz", "assets/voices/edge-es-CO-GonzaloNeural.mp3", "--efectos", fx, "--dur", "12", "--salida", salida]);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const j = JSON.parse(r.stdout.trim().split("\n").pop());
  assert.ok(j.pico_verdadero <= -2.7, `pico ${j.pico_verdadero}`);
  assert.ok(Math.abs(j.lufs + 14) < 1, `lufs ${j.lufs}`);
  assert.equal(j.efectos.length, 3);
});

test("el SRT usa el texto exacto del guion y frases con sentido", { skip: !python && "falta Python" }, () => {
  const pal = path.join(dir, "pal.json"), gui = path.join(dir, "gui.txt"), srt = path.join(dir, "s.srt");
  const tiempos = ["Qué", "hace", "un", "agente", "No", "solo", "contesta"].map((palabra, i) => ({ palabra, inicio: i * 0.4 + 0.1, fin: i * 0.4 + 0.45 }));
  fs.writeFileSync(pal, JSON.stringify(tiempos));
  fs.writeFileSync(gui, "¿Qué hace un agente? No solo contesta.");
  const r = correr(python, ["tools/subtitulos/srt.py", "--palabras", pal, "--guion", gui, "--salida", srt, "--inicio", "1"]);
  assert.equal(r.status, 0, r.stderr);
  const t = fs.readFileSync(srt, "utf8");
  assert.match(t, /¿Qué hace un agente\?/);
  assert.match(t, /No solo contesta\./);
  assert.match(t, /00:00:01,100 --> /);
  assert.equal([...t.matchAll(/-->/g)].length, 2);
});

test("generar por oraciones une tomas con un silencio real y corre las marcas", { skip: !conAudio && "faltan dependencias de audio" }, () => {
  const prueba = path.join(dir, "oraciones.py"), salida = path.join(dir, "oraciones.wav"), marcas = path.join(dir, "oraciones.json");
  fs.writeFileSync(prueba, `
import json, subprocess, sys
from pathlib import Path
import numpy as np, soundfile as sf
sys.path.insert(0, r"${path.join(raiz, "tools", "tts")}")
import hablar
assert hablar.partir_oraciones("Hola. ¿Cómo va? Bien!") == ["Hola.", "¿Cómo va?", "Bien!"]
def falso(texto, ruta, palabras):
    sr = 48000
    t = np.arange(sr) / sr
    x = np.concatenate([np.zeros(int(.2 * sr)), np.sin(2 * np.pi * 220 * t) * .3, np.zeros(int(.5 * sr))]).astype(np.float32)
    sf.write(str(ruta), x, sr)
    if palabras:
        Path(palabras).write_text(json.dumps([{"palabra": texto, "inicio": .2, "fin": 1.2}]), encoding="utf-8")
hablar.por_oraciones(falso, "Uno. Dos.", r"${salida}", 0.4, r"${marcas}")
x, sr = sf.read(r"${salida}")
e = np.abs(x) > .01
print(json.dumps({"dur": len(x) / sr, "hueco": float(np.sum(~e[int(1.03 * sr):int(1.5 * sr)]) / sr), "marcas": json.load(open(r"${marcas}", encoding="utf-8"))}))
`);
  const r = correr(python, [prueba]);
  assert.equal(r.status, 0, r.stderr);
  const j = JSON.parse(r.stdout);
  assert.ok(Math.abs(j.dur - 2.52) < 0.1, `dura ${j.dur}`);
  assert.ok(j.hueco > 0.3, `hueco ${j.hueco}`);
  assert.ok(Math.abs(j.marcas[0].inicio - 0.03) < 0.03, JSON.stringify(j.marcas));
  assert.ok(Math.abs(j.marcas[1].inicio - 1.49) < 0.06, JSON.stringify(j.marcas));
});

test("el SRT reparte una frase que no alcanza a leerse y corta en el signo", { skip: !python && "falta Python" }, () => {
  const pal = path.join(dir, "pal2.json"), gui = path.join(dir, "gui2.txt"), srt = path.join(dir, "s2.srt");
  const guion = "Un buen prompt es uno claro: dice qué quieres, para quién y cómo.";
  const inicios = [4.3, 4.45, 4.6, 4.85, 4.98, 5.1, 5.69, 5.9, 6.05, 6.6, 6.9, 7.2, 7.3];
  fs.writeFileSync(pal, JSON.stringify(guion.split(" ").map((palabra, i) => ({ palabra, inicio: inicios[i], fin: inicios[i] + 0.14 }))));
  fs.writeFileSync(gui, guion);
  const r = correr(python, ["tools/subtitulos/srt.py", "--palabras", pal, "--guion", gui, "--salida", srt]);
  assert.equal(r.status, 0, r.stderr);
  const t = fs.readFileSync(srt, "utf8");
  assert.match(t, /Un buen prompt es uno claro:\r?\ndice qué quieres,/);
  assert.match(t, /para quién y cómo\./);
  assert.equal([...t.matchAll(/-->/g)].length, 2);
  assert.deepEqual(JSON.parse(r.stdout).muy_rapidos, []);
});

test("fijar-duracion cambia la duración en todos los archivos y mueve la frase de cierre", () => {
  const p = fs.mkdtempSync(path.join(dir, "fijar-"));
  fs.mkdirSync(path.join(p, "assets/pizarra"), { recursive: true });
  fs.mkdirSync(path.join(p, "compositions"));
  fs.copyFileSync(path.join(raiz, "engines/pizarra/film.js"), path.join(p, "assets/pizarra/film.js"));
  fs.copyFileSync(path.join(raiz, "engines/pizarra/ejemplo/index.html"), path.join(p, "index.html"));
  for (const a of ["pizarra.html", "capa.html"]) fs.copyFileSync(path.join(raiz, "engines/pizarra/ejemplo", a), path.join(p, "compositions", a));
  const r = spawnSync(process.execPath, [path.join(raiz, "engines/pizarra/fijar-duracion.mjs"), "9.9", "--lema", "7.85"], { cwd: p, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(fs.readFileSync(path.join(p, "assets/pizarra/film.js"), "utf8"), /DUR = 9\.9\b/);
  const pizarra = fs.readFileSync(path.join(p, "compositions/pizarra.html"), "utf8");
  assert.ok(pizarra.includes('data-duration="9.9"') && pizarra.includes("D = 9.9") && !pizarra.includes('data-duration="15"'));
  const indice = fs.readFileSync(path.join(p, "index.html"), "utf8");
  assert.ok(!indice.includes('data-duration="15"'));
  const capa = fs.readFileSync(path.join(p, "compositions/capa.html"), "utf8");
  assert.match(capa, /id="ca-frase"[^>]*data-start="7\.85" data-duration="2\.05"/);
  assert.match(capa, /tl\.fromTo\("#ca-frase-txt"[^;]*, 7\.85\);/);
  assert.ok(!capa.includes('data-duration="15"'));
});

test("zonas mide la tinta con la cámara y avisa si se sale", () => {
  const p = fs.mkdtempSync(path.join(dir, "zonas-"));
  for (const a of fs.readdirSync(path.join(raiz, "engines/pizarra"))) if (a.endsWith(".js")) fs.copyFileSync(path.join(raiz, "engines/pizarra", a), path.join(p, a));
  const correrZonas = () => spawnSync(process.execPath, [path.join(raiz, "engines/pizarra/zonas.mjs"), path.join(p, "film.js")], { encoding: "utf8" });
  const bien = correrZonas();
  assert.equal(bien.status, 0, bien.stdout + bien.stderr);
  assert.equal(JSON.parse(bien.stdout).ok, true);
  const film = fs.readFileSync(path.join(p, "film.js"), "utf8");
  fs.writeFileSync(path.join(p, "film.js"), film.replace("'y revisa.', 1210, 72, 10.2, .85", "'y revisa.', 1500, 72, 10.2, .1"));
  const mal = correrZonas();
  assert.equal(mal.status, 1);
  const avisos = JSON.parse(mal.stdout).avisos.join(" ");
  assert.match(avisos, /«y revisa\.»: la tinta baja hasta y \d+/);
  assert.match(avisos, /la mano se ve apurada/);
});

test("pausas mide los huecos reales de la voz, no la cola final", { skip: !conAudio && "faltan dependencias de audio" }, () => {
  const wav = path.join(dir, "pausas.wav");
  const r = correr("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "sine=f=300:r=48000:d=1", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono:d=0.5", "-f", "lavfi", "-i", "sine=f=300:r=48000:d=1", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono:d=0.8", "-filter_complex", "[0][1][2][3]concat=n=4:v=0:a=1", wav]);
  assert.equal(r.status, 0, r.stderr);
  const p = correr(python, ["tools/audio/pausas.py", wav]);
  assert.equal(p.status, 0, p.stderr);
  const d = JSON.parse(p.stdout);
  assert.equal(d.pausas.length, 1, p.stdout);
  assert.ok(Math.abs(d.pausas[0].inicio - 1) < 0.05 && Math.abs(d.pausas[0].fin - 1.5) < 0.05, p.stdout);
  assert.ok(Math.abs(d.fin_voz - 2.5) < 0.05, p.stdout);
  assert.match(d.silencios, /^[\d.]+-[\d.]+$/);
});

test("saltos deja fuera la banda de subtítulos", { skip: !conAudio && "faltan dependencias de audio" }, () => {
  const mp4 = path.join(dir, "saltos.mp4");
  const r = correr("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=gray:s=360x640:r=30:d=2", "-vf", "drawbox=x=0:y=500:w=360:h=80:color=white:t=fill:enable='gte(t,1)'", "-pix_fmt", "yuv420p", mp4]);
  assert.equal(r.status, 0, r.stderr);
  const con = JSON.parse(correr(python, ["tools/qa/saltos.py", mp4]).stdout);
  assert.equal(con.saltos_o_cortes.length, 1, "el cambio debe verse sin la opción");
  const sin = JSON.parse(correr(python, ["tools/qa/saltos.py", mp4, "--ignorar", "490-590"]).stdout);
  assert.equal(sin.saltos_o_cortes.length, 0, "dentro de la franja no es un salto");
});

test("Kokoro recibe una ruta que espeak-ng puede abrir", { skip: (!python || process.platform !== "win32") && "solo en Windows" }, () => {
  const carpeta = fs.mkdtempSync(path.join(dir, "ñandú í-"));
  const s = `import sys
sys.path.insert(0, r"${path.join(raiz, "tools", "tts")}")
import hablar
r = hablar.ruta_ascii(r"${carpeta}")
assert r.isascii(), r
assert hablar.ruta_ascii("C:/sin/acentos") == "C:/sin/acentos"
`;
  const r = correr(python, ["-c", s]);
  assert.equal(r.status, 0, r.stderr + r.stdout);
});

test("las fuentes del panel vienen incluidas y traen las letras del español", { skip: !python && "falta Python" }, () => {
  const catalogo = JSON.parse(fs.readFileSync(path.join(raiz, "assets/fonts/fuentes.json"), "utf8"));
  const metricas = JSON.parse(fs.readFileSync(path.join(raiz, "assets/fonts/metricas.json"), "utf8"));
  for (const [familia, d] of Object.entries(catalogo.familias)) {
    for (const a of d.archivos) assert.ok(fs.existsSync(path.join(raiz, "assets/fonts", a.archivo)), a.archivo);
    assert.ok(fs.existsSync(path.join(raiz, "assets/fonts", d.licencia)), d.licencia);
    const medidas = Object.entries(metricas.fuentes).filter(([k]) => k.startsWith(`${familia}|`));
    assert.ok(medidas.length, `${familia}: sin medir`);
    for (const [k, m] of medidas) assert.deepEqual(m.faltan, [], `${k}: le faltan letras`);
  }
  for (const par of Object.values(catalogo.pares)) for (const f of Object.values(par)) assert.ok(catalogo.familias[f], f);
  const salida = path.join(dir, "fuentes");
  const r = correr(python, ["tools/medios/fuentes.py", "cartel", "--carpeta", salida]);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(fs.readFileSync(path.join(salida, "fuentes.css"), "utf8").includes("Bebas Neue"));
});

test("los iconos se buscan y se escriben", { skip: !python && "falta Python" }, () => {
  const b = correr(python, ["tools/medios/icono.py", "buscar", "mail"]);
  assert.ok(JSON.parse(b.stdout).iconos.includes("mail"));
  const s = correr(python, ["tools/medios/icono.py", "svg", "mail", "--color", "#E9A93B"]);
  assert.match(s.stdout, /stroke="#E9A93B"/);
  assert.notEqual(correr(python, ["tools/medios/icono.py", "svg", "no-existe"]).status, 0);
});

test("la pista escribe el mismo formato que leen el kit y la revisión", { skip: !python && "falta Python" }, () => {
  const p = path.join(dir, "pista");
  fs.mkdirSync(path.join(p, "assets", "voz"), { recursive: true });
  fs.writeFileSync(path.join(p, "guion.txt"), "Hola mundo. Otra frase corta aquí.");
  const tiempos = "Hola mundo. Otra frase corta aquí.".split(" ").map((w, i) => ({ palabra: w, inicio: i * 0.5, fin: i * 0.5 + 0.4 }));
  fs.writeFileSync(path.join(p, "assets", "tiempos.json"), JSON.stringify({ palabras: tiempos, dur: 4, grupos: [], pausas: [] }));
  const r = spawnSync(python, [path.join(raiz, "tools/pista.py"), "subtitulos", "--formato", "16:9"], { cwd: p, encoding: "utf8", env: { ...process.env, PYTHONIOENCODING: "utf-8" } });
  assert.equal(r.status, 0, r.stderr);
  const t = JSON.parse(fs.readFileSync(path.join(p, "assets", "tiempos.json"), "utf8"));
  assert.equal(t.formato, "16:9");
  assert.ok(t.grupos.length >= 1 && t.grupos[0].lineas && t.grupos[0].palabras[0].inicio !== undefined);
  assert.ok(fs.existsSync(path.join(p, "renders", "final.srt")));
});

test("una cifra que oye el transcriptor no cuenta como error de la voz", { skip: !python && "falta Python" }, () => {
  const codigo = `import sys; sys.path.insert(0, "tools/qa"); import importlib.util as u
s = u.spec_from_file_location("c", "tools/qa/comparar_voz.py"); m = u.module_from_spec(s); s.loader.exec_module(m)
print(" ".join(m.sin_cifras(["106", "estilos,", "21", "voces", "y", "1384.", "cien"])))
print(" ".join(m.en_palabras(29)), "|", " ".join(m.en_palabras(100)), "|", " ".join(m.en_palabras(2024)))`;
  const r = correr(python, ["-c", codigo]);
  if (r.status !== 0 && /faster_whisper|whisper/.test(r.stderr)) return;
  assert.equal(r.status, 0, r.stderr);
  const [a, b] = r.stdout.trim().split(/\r?\n/);
  assert.equal(a, "ciento seis estilos, veintiuno voces y mil trescientos ochenta y cuatro cien");
  assert.equal(b, "veintinueve | cien | dos mil veinticuatro");
});

test("un subtítulo sin corte que quepa queda parejo, aunque haya una coma al principio", { skip: !python && "falta Python" }, () => {
  const codigo = `import sys, importlib.util as u
s = u.spec_from_file_location("s", "tools/subtitulos/srt.py"); m = u.module_from_spec(s); s.loader.exec_module(m)
sys.stdout.reconfigure(encoding="utf-8")
print(m.en_dos_lineas("Llega el mensaje, lo lee con calma y prepara toda la respuesta completa", 28))`;
  const r = correr(python, ["-c", codigo]);
  assert.equal(r.status, 0, r.stderr);
  const [a, b] = r.stdout.trim().split(/\r?\n/);
  assert.ok(Math.abs(a.length - b.length) <= 12, `${a.length} y ${b.length}: ${r.stdout}`);
});

test("los silencios se eligen por la palabra que sigue", { skip: !python && "falta Python" }, () => {
  const codigo = `import sys, json, importlib.util as u
s = u.spec_from_file_location("p", "tools/pista.py"); m = u.module_from_spec(s); s.loader.exec_module(m)
t = {"palabras": [{"palabra": "Hola,", "inicio": 0.1, "fin": 0.5}, {"palabra": "tú", "inicio": 2.0, "fin": 2.2}, {"palabra": "ven", "inicio": 2.3, "fin": 2.5}, {"palabra": "Tú.", "inicio": 4.0, "fin": 4.3}],
     "pausas": [{"inicio": 0.5, "fin": 2.0}, {"inicio": 2.5, "fin": 4.0}]}
print(m.tramos_de_silencio("@Tu", t))
print(m.tramos_de_silencio("@tú#2,9-9.5", t))
print(m.tramos_de_silencio("1", t))
try:
    m.tramos_de_silencio("@ven", t)
except SystemExit as e:
    print("sale", "pausa" in str(e))
try:
    m.tramos_de_silencio("@nada", t)
except SystemExit as e:
    print("sale", "no dice" in str(e))`;
  const r = correr(python, ["-c", codigo]);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(r.stdout.trim().split(/\r?\n/), ["0.5-2.0", "2.5-4.0,9-9.5", "0.5-2.0", "sale True", "sale True"]);
});

test("la voz entra en los créditos con su licencia, y pide atribución si la exige", { skip: !python && "falta Python" }, () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "creditos-"));
  fs.mkdirSync(path.join(d, "assets"), { recursive: true });
  const creditos = (motor, voz) => {
    fs.writeFileSync(path.join(d, "assets", "tiempos.json"), JSON.stringify({ motor, nombre_voz: voz, dur: 8 }));
    const codigo = `import sys, json, importlib.util as u
from pathlib import Path
s = u.spec_from_file_location("e", "tools/entrega.py"); m = u.module_from_spec(s); sys.modules["e"] = m; s.loader.exec_module(m)
sys.stdout.reconfigure(encoding="utf-8")
print(json.dumps(m.escribir_creditos(Path(sys.argv[1]), "T", Path(sys.argv[1]) / "C.md")))`;
    const r = correr(python, ["-c", codigo, d]);
    assert.equal(r.status, 0, r.stderr);
    return { info: JSON.parse(r.stdout.trim().split(/\r?\n/).at(-1)), texto: fs.readFileSync(path.join(d, "C.md"), "utf8") };
  };
  const conCredito = creditos("piper", "es_AR-daniela-high");
  assert.equal(conCredito.info.exigen_atribucion, 1);
  assert.match(conCredito.texto.split("## Contenido generado")[0], /es_AR-daniela-high.*CC BY-SA 4\.0/);
  const libre = creditos("kokoro", "em_alex");
  assert.equal(libre.info.exigen_atribucion, 0);
  assert.match(libre.texto, /licencia: Apache-2\.0/);
});

test("la licencia de cada voz es la misma en los créditos y en el panel", async () => {
  const { voces } = await import("../data/voces.js");
  const texto = fs.readFileSync("tools/entrega.py", "utf8");
  for (const v of voces.filter((x) => x.motor === "piper")) {
    const fila = `"piper:${v.voz}": ("${v.licencia.split(",")[0]}", ${/crédito/.test(v.licencia) ? "True" : "False"})`;
    assert.ok(texto.includes(fila), `falta en LICENCIAS_VOZ: ${fila}`);
  }
});

test("el contexto de la comparación de voz es para una palabra, no para el guion", { skip: !python && "falta Python" }, () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "contexto-"));
  fs.writeFileSync(path.join(d, "g.txt"), "Hola");
  const largo = "una dos tres cuatro cinco seis siete ocho nueve diez once doce trece";
  const r = correr(python, ["tools/qa/comparar_voz.py", "--audio", path.join(d, "no-hace-falta.wav"), "--guion", path.join(d, "g.txt"), "--contexto", largo]);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /--contexto es para una palabra rara/);
});
