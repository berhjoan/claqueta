#!/usr/bin/env python3
"""Busca saltos y cuadros negros en un video: un corte o límite entre procesos de render no debe notarse donde no hay corte.

Uso: python tools/qa/saltos.py video.mp4 [--umbral 6] [--ignorar 1300-1540]
Mide la diferencia entre cuadros consecutivos. Un salto es un cuadro que difiere mucho más que sus vecinos.
Los cortes de montaje también aparecen: compáralos con tu lista de planos.
--ignorar deja fuera una franja de alturas, en píxeles del video: el cambio de un subtítulo no es un salto.
"""
import argparse
import json
import subprocess
import sys

import numpy as np

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ANCHO, ALTO = 180, 320


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("video")
    p.add_argument("--umbral", type=float, default=6.0, help="Veces sobre la mediana de sus vecinos para contar como salto")
    p.add_argument("--ignorar", help="Franja de alturas que no cuenta, como 1300-1540")
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
    brillo = f.mean((1, 2))
    if a.ignorar:
        m = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=height", "-of", "csv=p=0", a.video], capture_output=True, text=True)
        alto = float(m.stdout.strip().split(",")[0])
        y0, y1 = (float(x) for x in a.ignorar.split("-"))
        f = f.copy()
        f[:, int(y0 / alto * ALTO) : int(np.ceil(y1 / alto * ALTO)), :] = 0
    dif = np.abs(np.diff(f, axis=0)).mean((1, 2))
    saltos = []
    for i in range(len(dif)):
        vecinos = np.concatenate([dif[max(0, i - 6):i], dif[i + 1:i + 7]])
        base = max(float(np.median(vecinos)), 0.15)
        if dif[i] > a.umbral * base and dif[i] > 1.0:
            saltos.append({"cuadro": i + 1, "segundo": round((i + 1) / fps, 3), "diferencia": round(float(dif[i]), 2)})
    print(json.dumps({"cuadros": len(f), "fps": round(fps, 3), "saltos_o_cortes": saltos, "cuadros_negros": int((brillo < 3).sum()), "mediana_diferencia": round(float(np.median(dif)), 3)}, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
