#!/usr/bin/env python3
"""Sintetiza efectos de sonido sin derechos de terceros. Cada semilla da otra toma del mismo sonido.

Uso:
  python tools/audio/efecto.py --listar
  python tools/audio/efecto.py barrido --dur 0.4 --salida assets/audio/barrido.wav
  python tools/audio/efecto.py golpe --tomas 3 --salida assets/audio/golpe.wav   (crea golpe-1.wav, golpe-2.wav, golpe-3.wav)

Para efectos grabados, CC0 y gratis: git clone --depth 1 https://github.com/wyzowl/sfx-kit.git
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

sys.path.insert(0, str(Path(__file__).resolve().parent))
import sfx as S  # noqa: E402

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def subida(d=1.2, v=1.0):
    """Ruido que sube de brillo y volumen hasta el golpe."""
    t = S.t_(d)
    n = S.noise(d)
    x = np.zeros_like(n)
    for i in range(0, len(n), 480):
        f = 400 + 6000 * (i / len(n)) ** 2
        seg = S.bp(n[max(0, i - 2000) : i + 480], f * 0.75, min(f * 1.3, 20000))[-(min(len(n), i + 480) - i) :]
        x[i : i + 480] = seg
    return S.norm(x * (t / d) ** 2.4) * v


def caida(d=0.7, v=1.0):
    """Grave que baja: cierra una idea o aterriza una cifra."""
    t = S.t_(d)
    f = 110 * np.exp(-t / 0.3) + 38
    return S.norm(np.sin(2 * np.pi * np.cumsum(f) / S.SR) * np.exp(-t / 0.28)) * v


def tecla(v=1.0):
    """Una tecla: chasquido corto, sin cola."""
    d = 0.045
    t = S.t_(d)
    return S.norm(S.hp(S.noise(d), 2200) * np.exp(-t / 0.004) + np.sin(2 * np.pi * 1700 * t) * np.exp(-t / 0.006) * 0.3) * v


def destello(v=1.0):
    """Campanilla breve para un dato que aparece."""
    d = 0.6
    t = S.t_(d)
    x = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t / tau) for f, a, tau in [(1760, 0.6, 0.16), (2637, 0.42, 0.11), (3520, 0.28, 0.07), (5274, 0.14, 0.04)])
    return S.norm(x) * v


def falla(v=1.0):
    """Interferencia digital: bloques de ruido cortados."""
    d = 0.3
    n = S.noise(d)
    corte = np.repeat(S._rng.random(int(d * 90) + 2) > 0.45, S.SR // 90 + 1)[: len(n)]
    return S.norm(S.bp(n, 900, 7000) * corte * np.exp(-S.t_(d) / 0.16)) * v


def impacto(v=1.0):
    """Golpe grande: grave, cuerpo y aire."""
    d = 0.9
    a = np.zeros(int(d * S.SR))
    g = S.thump(1.0, f=52)
    a[: len(g)] += g
    c = S.crash(0.25)[: len(a)]
    a[: len(c)] += c
    return S.norm(a) * v


CATALOGO = {
    "barrido": (lambda d, v: S.whoosh(d or 0.35, v), "Paso de una escena a otra"),
    "subida": (lambda d, v: subida(d or 1.2, v), "Tensión justo antes de un golpe"),
    "golpe": (lambda d, v: S.thump(v), "Golpe grave y seco"),
    "impacto": (lambda d, v: impacto(v), "Golpe grande para el dato clave"),
    "caida": (lambda d, v: caida(d or 0.7, v), "Grave que baja y cierra"),
    "clic": (lambda d, v: S.click(1.0, v), "Pieza que encaja"),
    "chasquido": (lambda d, v: S.clack(1.0, v), "Objeto sobre la mesa"),
    "pop": (lambda d, v: S.pop(v), "Elemento que aparece"),
    "tecla": (lambda d, v: tecla(v), "Una tecla de terminal"),
    "campana": (lambda d, v: S.ding(v), "Aviso o acierto"),
    "destello": (lambda d, v: destello(v), "Dato que brilla"),
    "falla": (lambda d, v: falla(v), "Falla digital"),
    "latido": (lambda d, v: S.heartbeat(v), "Latido para bajar el pulso"),
    "rumor": (lambda d, v: S.rumble(d or 1.5, v), "Fondo grave"),
    "paso": (lambda d, v: S.step(v), "Paso o toque suave"),
    "crujido": (lambda d, v: S.creak(v), "Madera o puerta"),
}


def generar(nombre, dur=None, vol=0.9, semilla=7):
    S._rng = np.random.default_rng(semilla)
    return np.asarray(CATALOGO[nombre][0](dur, vol), np.float32)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("nombre", nargs="?", choices=list(CATALOGO))
    p.add_argument("--dur", type=float)
    p.add_argument("--salida")
    p.add_argument("--tomas", type=int, default=1)
    p.add_argument("--semilla", type=int, default=7)
    p.add_argument("--vol", type=float, default=0.9)
    p.add_argument("--listar", action="store_true")
    a = p.parse_args()
    if a.listar or not a.nombre:
        for k, (_, d) in CATALOGO.items():
            print(f"{k}: {d}")
        return
    base = Path(a.salida or f"{a.nombre}.wav")
    base.parent.mkdir(parents=True, exist_ok=True)
    rutas = []
    for k in range(a.tomas):
        ruta = base if a.tomas == 1 else base.with_name(f"{base.stem}-{k + 1}{base.suffix}")
        sf.write(ruta, generar(a.nombre, a.dur, a.vol, a.semilla + k), S.SR, subtype="PCM_16")
        rutas.append(str(ruta))
    print(json.dumps({"ok": True, "archivos": rutas}, ensure_ascii=False))


if __name__ == "__main__":
    main()
