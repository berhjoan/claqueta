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
  for (const h of ["tools/tts/hablar.py", "tools/subtitulos/alinear.py", "tools/qa/verificar_video.py", "tools/qa/hoja_cuadros.py"]) {
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
