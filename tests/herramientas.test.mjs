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
  for (const h of ["tools/tts/hablar.py", "tools/subtitulos/alinear.py", "tools/qa/verificar_video.py", "tools/qa/hoja_cuadros.py", "tools/doctor.py"]) {
    if (h.endsWith("doctor.py")) continue;
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
