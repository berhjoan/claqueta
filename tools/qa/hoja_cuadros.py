#!/usr/bin/env python3
"""Hoja de cuadros de un video, para mirarlo de un vistazo. Solo necesita ffmpeg.

Uso: python tools/qa/hoja_cuadros.py video.mp4 --salida hoja.jpg [--cuadros 12] [--columnas 6] [--desde 0 --hasta 0]
Imprime a qué segundo corresponde cada cuadro de la hoja.
"""
import argparse
import json
import subprocess
import sys


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("video")
    p.add_argument("--salida", default="hoja.jpg")
    p.add_argument("--cuadros", type=int, default=12)
    p.add_argument("--columnas", type=int, default=6)
    p.add_argument("--ancho", type=int, default=260)
    p.add_argument("--desde", type=float, default=0)
    p.add_argument("--hasta", type=float, default=0, help="0 significa hasta el final")
    a = p.parse_args()
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", a.video], capture_output=True, text=True)
    if r.returncode:
        sys.exit(f"Error: no se pudo leer {a.video}")
    fin = a.hasta or float(r.stdout.strip())
    n = max(1, a.cuadros)
    filas = (n + a.columnas - 1) // a.columnas
    tiempos = [round(a.desde + (fin - a.desde) * (i + 0.5) / n, 2) for i in range(n)]
    filtro = f"fps={n}/{fin - a.desde:.3f},scale={a.ancho}:-2,tile={a.columnas}x{filas}:padding=4:color=0x222222"
    subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", str(a.desde), "-t", str(fin - a.desde), "-i", a.video, "-vf", filtro, "-frames:v", "1", "-q:v", "3", a.salida], check=True)
    print(json.dumps({"salida": a.salida, "segundos": tiempos}))


if __name__ == "__main__":
    main()
