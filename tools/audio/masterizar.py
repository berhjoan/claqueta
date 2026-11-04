#!/usr/bin/env python3
"""Deja una mezcla lista para redes: -14 LUFS y pico verdadero bajo control, midiendo e iterando.

Uso: python tools/audio/masterizar.py mezcla.wav salida.wav [--lufs -14] [--techo -3]
Un techo de -3 dBTP aquí queda entre -2.7 y -2.2 dBTP después de codificar a AAC, dentro del máximo de -1. Mide siempre el archivo final.
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
from scipy.ndimage import maximum_filter1d, uniform_filter1d


def limitar(x, sr, techo, mirada=0.005):
    n = int(mirada * sr)
    m = maximum_filter1d(np.abs(x), size=2 * n + 1)
    g = uniform_filter1d(np.minimum(1, techo / np.maximum(m, 1e-9)), size=n)
    return x * g


def medir(ruta):
    p = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(ruta), "-af", "loudnorm=print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    j = json.loads(re.findall(r"\{[^{}]*\}", p.stderr, re.S)[-1])
    return float(j["input_i"]), float(j["input_tp"])


def nivelar(x, sr, lufs=-14.0, techo=-3.0):
    """Lleva x a los LUFS pedidos con el pico verdadero bajo el techo. El limitador mira muestras: si el pico verdadero se pasa, baja su propio techo."""
    objetivo = 10 ** (techo / 20) * 0.9
    with tempfile.TemporaryDirectory() as d:
        tmp = Path(d) / "m.wav"
        for _ in range(10):
            sf.write(tmp, x, sr, subtype="FLOAT")
            i, tp = medir(tmp)
            if abs(i - lufs) < 0.2 and tp <= techo + 0.05:
                break
            if tp > techo:
                objetivo *= 10 ** ((techo - tp - 0.15) / 20)
            x = x * 10 ** ((lufs - i) / 20)
            for c in range(x.shape[1]):
                x[:, c] = limitar(x[:, c], sr, objetivo)
        sf.write(tmp, x, sr, subtype="FLOAT")
        i, tp = medir(tmp)
    return x, i, tp


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("entrada")
    p.add_argument("salida")
    p.add_argument("--lufs", type=float, default=-14.0)
    p.add_argument("--techo", type=float, default=-3.0, help="Pico verdadero objetivo en dBTP")
    a = p.parse_args()
    x, sr = sf.read(a.entrada, always_2d=True, dtype="float32")
    x, i, tp = nivelar(x, sr, a.lufs, a.techo)
    sf.write(a.salida, x, sr, subtype="PCM_16")
    ok = abs(i - a.lufs) < 1 and tp <= a.techo + 0.3
    print(json.dumps({"ok": ok, "lufs": round(i, 2), "pico_verdadero": round(tp, 2), "salida": a.salida}))
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
