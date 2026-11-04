#!/usr/bin/env python3
"""Mezcla voz, música y efectos con la música cediendo bajo la voz, y deja el resultado listo para redes.

Uso:
  python tools/audio/mezcla.py --voz assets/voz/voz.mp3 --musica assets/audio/musica.wav \
      --efectos efectos.json --dur 30 --salida assets/audio/mezcla.wav --nivel-musica -22 --silencios 12.4-12.8,20.0-20.4

efectos.json es una lista de golpes. "pico" pone el punto más fuerte del sonido en ese segundo, y "t" pone su inicio:
  [{"pico": 1.23, "sonido": "barrido", "ganancia": -8, "dur": 0.4, "pan": 0.2},
   {"t": 0, "archivo": "assets/audio/tiza.wav", "ganancia": -3},
   {"pico": 9.13, "sonido": "impacto", "ganancia": -5, "semilla": 3}]

- nivel-musica: decibeles de la música por debajo de la voz mientras se habla. Sin voz, sube 6 dB.
- silencios: tramos donde callan música y efectos. Sirven para que la siguiente frase pese.
- Usa "pico" con un cuadro más que el segundo de su imagen: primero se ve y luego se oye.

Sale en -14 LUFS con pico verdadero de -3 dBTP. Imprime lo medido.
Necesita numpy, scipy, soundfile y ffmpeg.
"""
import argparse
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.ndimage import uniform_filter1d

sys.path.insert(0, str(Path(__file__).resolve().parent))
from masterizar import limitar, medir  # noqa: E402
from efecto import CATALOGO, generar  # noqa: E402

SR = 48000
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def leer(ruta):
    """Cualquier formato a estéreo de 48 kHz, por ffmpeg."""
    if not Path(ruta).exists():
        sys.exit(f"Error: no existe {ruta}")
    with tempfile.TemporaryDirectory() as d:
        wav = Path(d) / "x.wav"
        subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(ruta), "-ar", str(SR), "-ac", "2", "-c:a", "pcm_f32le", str(wav)], check=True)
        x, _ = sf.read(wav, dtype="float32", always_2d=True)
    return x


def ajustar(x, n):
    if len(x) >= n:
        return x[:n]
    return np.vstack([x, np.zeros((n - len(x), x.shape[1]), np.float32)])


def lufs(x):
    with tempfile.TemporaryDirectory() as d:
        ruta = Path(d) / "m.wav"
        sf.write(ruta, x, SR, subtype="FLOAT")
        return medir(ruta)


def presencia(voz, n):
    """Curva 0-1 de cuándo se habla: sube en 120 ms y baja en 700 ms."""
    mono = np.abs(voz).mean(1)
    ventana = int(0.03 * SR)
    e = np.sqrt(np.maximum(uniform_filter1d(mono ** 2, size=ventana), 0))
    umbral = max(1e-4, float(np.percentile(e[e > 1e-5], 60)) * 0.25) if (e > 1e-5).any() else 1.0
    bruto = (e > umbral).astype(np.float32)
    subir, bajar = 1 - np.exp(-1 / (0.12 * SR)), 1 - np.exp(-1 / (0.7 * SR))
    salida = np.zeros(n, np.float32)
    v = 0.0
    for i in range(n):
        b = bruto[i] if i < len(bruto) else 0.0
        v += (b - v) * (subir if b > v else bajar)
        salida[i] = v
    return salida


def tramos(texto):
    salida = []
    for pieza in filter(None, (texto or "").split(",")):
        m = re.fullmatch(r"\s*([\d.]+)\s*-\s*([\d.]+)\s*", pieza)
        if not m:
            sys.exit(f"Error: silencio mal escrito: {pieza}. Usa 12.4-12.8")
        salida.append((float(m.group(1)), float(m.group(2))))
    return salida


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--voz")
    p.add_argument("--musica")
    p.add_argument("--efectos")
    p.add_argument("--dur", type=float, required=True)
    p.add_argument("--salida", required=True)
    p.add_argument("--nivel-musica", type=float, default=-22.0)
    p.add_argument("--inicio-voz", type=float, default=0.0, help="Segundo en el que entra la voz")
    p.add_argument("--silencios", help="Tramos de silencio, como 12.4-12.8,20-20.4")
    p.add_argument("--lufs", type=float, default=-14.0)
    p.add_argument("--techo", type=float, default=-3.0)
    a = p.parse_args()
    n = int(round(a.dur * SR))
    mezcla = np.zeros((n, 2), np.float32)
    informe = {}

    voz = np.zeros((n, 2), np.float32)
    if a.voz:
        cruda = leer(a.voz)
        s = int(a.inicio_voz * SR)
        voz[s : s + len(cruda)] = cruda[: max(0, n - s)]
        i_voz, _ = lufs(voz)
        voz = voz * 10 ** ((-16.0 - i_voz) / 20)
        informe["voz_recortada_s"] = round(max(0, (s + len(cruda) - n) / SR), 3)
    hay_voz = a.voz is not None
    curva = presencia(voz, n) if hay_voz else np.zeros(n, np.float32)
    silencio = np.ones(n, np.float32)
    for t0, t1 in tramos(a.silencios):
        i0, i1 = int(t0 * SR), min(n, int(t1 * SR))
        silencio[i0:i1] = 0.0
    silencio = uniform_filter1d(silencio, size=int(0.04 * SR))

    if a.musica:
        m = ajustar(leer(a.musica), n)
        i_m, _ = lufs(m)
        referencia = -16.0 if hay_voz else a.lufs
        base = referencia + (a.nivel_musica if hay_voz else 0) - i_m
        ganancia = 10 ** ((base + 6 * (1 - curva)) / 20) if hay_voz else np.full(n, 10 ** (base / 20), np.float32)
        mezcla += m * (ganancia * silencio)[:, None]
    colocados = []
    if a.efectos:
        for ev in json.loads(Path(a.efectos).read_text(encoding="utf-8")):
            if ev.get("archivo"):
                x = leer(ev["archivo"])
            elif ev.get("sonido") in CATALOGO:
                x = generar(ev["sonido"], ev.get("dur"), 0.9, ev.get("semilla", int(float(ev.get("pico", ev.get("t", 0))) * 100)))
                pan = float(ev.get("pan", 0))
                ang = (pan + 1) * np.pi / 4
                x = np.stack([x * np.cos(ang) * 1.414, x * np.sin(ang) * 1.414], 1)
            else:
                sys.exit(f"Error: efecto sin archivo ni sonido conocido: {ev}")
            if "pico" in ev:
                s = int(float(ev["pico"]) * SR) - int(np.argmax(np.abs(x).max(1)))
            elif "t" in ev:
                s = int(float(ev["t"]) * SR)
            else:
                sys.exit(f'Error: el efecto necesita "pico" o "t": {ev}')
            if s < 0:
                x, s = x[-s:], 0
            if s >= n or not len(x):
                continue
            x = x[: n - s] * 10 ** (float(ev.get("ganancia", -8)) / 20)
            mezcla[s : s + len(x)] += x * silencio[s : s + len(x), None]
            colocados.append({"efecto": ev.get("sonido") or Path(ev["archivo"]).name, "pico_s": round((s + int(np.argmax(np.abs(x).max(1)))) / SR, 3)})
    mezcla = mezcla + voz

    pico = 10 ** (a.techo / 20) * 0.9
    for _ in range(6):
        i, tp = lufs(mezcla)
        if abs(i - a.lufs) < 0.15 and tp <= a.techo + 0.1:
            break
        mezcla = mezcla * 10 ** ((a.lufs - i) / 20)
        for c in range(2):
            mezcla[:, c] = limitar(mezcla[:, c], SR, pico)
    i, tp = lufs(mezcla)
    Path(a.salida).parent.mkdir(parents=True, exist_ok=True)
    sf.write(a.salida, mezcla, SR, subtype="PCM_16")
    informe.update({"ok": abs(i - a.lufs) < 1 and tp <= a.techo + 0.5, "lufs": round(i, 2), "pico_verdadero": round(tp, 2), "dur": a.dur, "salida": a.salida, "efectos": colocados})
    print(json.dumps(informe, ensure_ascii=False))
    sys.exit(0 if informe["ok"] else 1)


if __name__ == "__main__":
    main()
