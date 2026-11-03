#!/usr/bin/env python3
"""Busca saltos y cuadros negros en un video: un corte o límite entre procesos de render no debe notarse donde no hay corte.

Uso: python tools/qa/saltos.py video.mp4 [--umbral 6]
Mide la diferencia entre cuadros consecutivos. Un salto es un cuadro que difiere mucho más que sus vecinos.
Los cortes de montaje también aparecen: compáralos con tu lista de planos.
"""
import argparse
import json
import subprocess
import sys

import numpy as np

ANCHO, ALTO = 180, 320


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("video")
    p.add_argument("--umbral", type=float, default=6.0, help="Veces sobre la mediana de sus vecinos para contar como salto")
    a = p.parse_args()
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate", "-of", "csv=p=0", a.video], capture_output=True, text=True)
    if r.returncode:
        sys.exit(f"Error: no se pudo leer {a.video}")
    n, d = (r.stdout.strip().split("/") + ["1"])[:2]
    fps = float(n) / float(d)
    crudo = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", a.video, "-vf", f"scale={ANCHO}:{ALTO}:flags=area,format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout
    f = np.frombuffer(crudo, np.uint8).reshape(-1, ALTO, ANCHO).astype(np.float32)
    if len(f) < 3:
        sys.exit("Error: el video tiene muy pocos cuadros")
    dif = np.abs(np.diff(f, axis=0)).mean((1, 2))
    saltos = []
    for i in range(len(dif)):
        vecinos = np.concatenate([dif[max(0, i - 6):i], dif[i + 1:i + 7]])
        base = max(float(np.median(vecinos)), 0.15)
        if dif[i] > a.umbral * base and dif[i] > 1.0:
            saltos.append({"cuadro": i + 1, "segundo": round((i + 1) / fps, 3), "diferencia": round(float(dif[i]), 2)})
    brillo = f.mean((1, 2))
    print(json.dumps({"cuadros": len(f), "fps": round(fps, 3), "saltos_o_cortes": saltos, "cuadros_negros": int((brillo < 3).sum()), "mediana_diferencia": round(float(np.median(dif)), 3)}, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
