#!/usr/bin/env python3
"""Grano fino con semilla fija: un PNG que se repite sin costura, para poner sobre el fondo y debajo del texto.

Uso: python tools/imagen/grano.py --salida assets/grano.png --alfa 2.5 --semilla 7

En la composición es una capa quieta, con la misma imagen en todos los cuadros:
  #grano { position: absolute; inset: 0; background: url("assets/grano.png"); pointer-events: none; }
Necesita numpy y ffmpeg.
"""
import argparse
import json
import subprocess
from pathlib import Path

import numpy as np


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--salida", default="assets/grano.png")
    p.add_argument("--alfa", type=float, default=2.5, help="Opacidad media en porcentaje")
    p.add_argument("--semilla", type=int, default=7)
    p.add_argument("--tam", type=int, default=256, help="Lado del mosaico en píxeles")
    a = p.parse_args()
    rng = np.random.default_rng(a.semilla)
    luz = rng.integers(0, 2, (a.tam, a.tam), dtype=np.uint8) * 255  # Puntos claros y oscuros para no aclarar ni oscurecer el fondo.
    alfa = np.clip(rng.random((a.tam, a.tam)) * 2 * a.alfa / 100 * 255, 0, 255).astype(np.uint8)
    crudo = np.stack([luz, alfa], axis=2).tobytes()
    Path(a.salida).parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "ya8", "-s", f"{a.tam}x{a.tam}", "-i", "-", "-frames:v", "1", str(a.salida)], input=crudo, check=True)
    print(json.dumps({"ok": True, "salida": a.salida, "alfa_media": round(float(alfa.mean()) / 255 * 100, 2), "semilla": a.semilla}))


if __name__ == "__main__":
    main()
