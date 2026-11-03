#!/usr/bin/env python3
"""Revisa si este computador puede hacer un video con Claqueta y dice qué instalar. No instala nada.

Uso: python tools/doctor.py
"""
import importlib.util
import json
import re
import shutil
import subprocess
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def version(cmd):
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=30, shell=False)
        return (r.stdout or r.stderr).strip().splitlines()[0] if r.returncode == 0 else None
    except (OSError, subprocess.TimeoutExpired, IndexError):
        return None


def main():
    faltan = []
    filas = []

    def fila(nombre, ok, detalle, arreglo=None, necesario=True):
        filas.append(f"{'ok  ' if ok else ('FALTA' if necesario else 'opc ')} {nombre}: {detalle}")
        if not ok and necesario and arreglo:
            faltan.append(arreglo)

    nodo = version(["node", "--version"])
    mayor = int(re.search(r"v(\d+)", nodo).group(1)) if nodo else 0
    fila("Node 22 o más", mayor >= 22, nodo or "no encontrado", "Instala Node 22 o más: https://nodejs.org")
    for prog in ("ffmpeg", "ffprobe"):
        v = version([prog, "-version"])
        fila(prog, bool(v), v[:40] if v else "no encontrado", "Instala ffmpeg: https://ffmpeg.org/download.html")
    fila("git", bool(shutil.which("git")), shutil.which("git") or "no encontrado", "Instala git: https://git-scm.com")
    fila("Python 3.10 o más", sys.version_info >= (3, 10), sys.version.split()[0], "Instala Python 3.10 o más")
    paquetes = "pip install numpy scipy soundfile numba faster-whisper"
    for mod, uso in (("numpy", "revisión y audio"), ("scipy", "efectos y mezcla"), ("soundfile", "leer y escribir audio"), ("numba", "música y cuerdas"), ("faster_whisper", "tiempos de palabra y comprobar lo que se dijo")):
        fila(mod, bool(importlib.util.find_spec(mod)), uso, paquetes)
    for mod, inst, uso in (("edge_tts", "pip install edge-tts", "voz Edge"), ("kokoro_onnx", "pip install kokoro-onnx soundfile", "voz Kokoro"), ("piper", "pip install piper-tts", "voz Piper"), ("pocket_tts", "pip install pocket-tts", "voz Pocket TTS")):
        fila(mod, bool(importlib.util.find_spec(mod)), f"{uso}. Si la usas: {inst}", necesario=False)
    npx = shutil.which("npx") or shutil.which("npx.cmd")
    fila("npx", bool(npx), "corre HyperFrames sin instalarlo: npx hyperframes@0.9.9", "Viene con Node")
    print("\n".join(filas))
    print(json.dumps({"listo": not faltan, "faltan": sorted(set(faltan))}, ensure_ascii=False))
    sys.exit(0 if not faltan else 1)


if __name__ == "__main__":
    main()
