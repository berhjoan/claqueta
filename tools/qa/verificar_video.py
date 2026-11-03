"""Revisión del MP4 final: formato, duración, audio y volumen para redes.

Uso:
  python tools/qa/verificar_video.py verificar RUTA [--duracion S] [--ancho 1080 --alto 1920]
  python tools/qa/verificar_video.py normalizar ENTRADA SALIDA
"""

import argparse
import json
import re
import subprocess
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
from pathlib import Path


def probe(ruta) -> dict:
    salida = subprocess.run(
        ["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(ruta)],
        capture_output=True, text=True, check=True,
    ).stdout
    return json.loads(salida)


def _medir(ruta, filtro: str) -> dict:
    r = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-i", str(ruta), "-af", filtro, "-f", "null", "-"],
        capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    return json.loads(re.findall(r"\{[^{}]*\}", r.stderr, re.S)[-1])


def loudness(ruta) -> dict:
    d = _medir(ruta, "loudnorm=print_format=json")
    return {"lufs": float(d["input_i"]), "true_peak": float(d["input_tp"])}


def verificar(ruta, ancho=1080, alto=1920, fps=30, duracion=None, lufs=-14.0, tolerancia_lufs=1.5) -> list[str]:
    ruta = Path(ruta)
    if not ruta.exists() or ruta.stat().st_size == 0:
        return [f"no existe o está vacío: {ruta}"]
    info = probe(ruta)
    fallos = []
    video = [s for s in info["streams"] if s["codec_type"] == "video"]
    audio = [s for s in info["streams"] if s["codec_type"] == "audio"]
    if not video:
        fallos.append("sin pista de video")
    else:
        v = video[0]
        if (v["width"], v["height"]) != (ancho, alto):
            fallos.append(f"resolución {v['width']}x{v['height']}, se esperaba {ancho}x{alto}")
        num, den = map(int, v["r_frame_rate"].split("/"))
        if abs(num / den - fps) > 0.01:
            fallos.append(f"fps {num / den:.2f}, se esperaba {fps}")
    if not audio:
        fallos.append("sin pista de audio")
    else:
        medida = loudness(ruta)
        if abs(medida["lufs"] - lufs) > tolerancia_lufs:
            fallos.append(f"loudness {medida['lufs']:.1f} LUFS, se esperaba {lufs}±{tolerancia_lufs}")
        if medida["true_peak"] > -1.0:
            fallos.append(f"true peak {medida['true_peak']:.1f} dBTP, máximo -1.0")
    if duracion is not None:
        real = float(info["format"]["duration"])
        if abs(real - duracion) > 0.5:
            fallos.append(f"duración {real:.2f}s, se esperaba {duracion}s±0.5")
    return fallos


def normalizar(entrada, salida, lufs=-14.0) -> None:
    base = f"loudnorm=I={lufs}:TP=-1.5:LRA=11"
    d = _medir(entrada, f"{base}:print_format=json")
    filtro = (
        f"{base}:measured_I={d['input_i']}:measured_TP={d['input_tp']}:measured_LRA={d['input_lra']}"
        f":measured_thresh={d['input_thresh']}:offset={d['target_offset']}:linear=true"
    )
    subprocess.run(
        ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(entrada),
         "-c:v", "copy", "-af", filtro, "-ar", "48000", "-c:a", "aac", "-b:a", "192k", str(salida)],
        check=True,
    )


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="comando", required=True)
    v = sub.add_parser("verificar")
    v.add_argument("ruta")
    v.add_argument("--duracion", type=float)
    v.add_argument("--ancho", type=int, default=1080)
    v.add_argument("--alto", type=int, default=1920)
    n = sub.add_parser("normalizar")
    n.add_argument("entrada")
    n.add_argument("salida")
    args = p.parse_args()
    if args.comando == "normalizar":
        normalizar(args.entrada, args.salida)
        return
    fallos = verificar(args.ruta, ancho=args.ancho, alto=args.alto, duracion=args.duracion)
    print(json.dumps({"ok": not fallos, "fallos": fallos}, ensure_ascii=False))
    sys.exit(1 if fallos else 0)


if __name__ == "__main__":
    main()
