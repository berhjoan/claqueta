#!/usr/bin/env python3
"""Sonido continuo de tiza, un roce por trazo, a partir de los eventos de engines/pizarra/eventos.mjs.

Uso: python tools/audio/tiza.py assets/audio/eventos.json --salida assets/audio/tiza.wav

Sale sin máster, para usarlo como una capa de tools/audio/mezcla.py.
Es sintético y sin grabaciones. Una persona debe escucharlo: ninguna IA puede validar este sonido de oído.
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

sys.path.insert(0, str(Path(__file__).resolve().parent))
from sfx import SR, add, bp, env_exp, hp, lp, noise, t_  # noqa: E402


def rms(x):
    return float(np.sqrt(np.mean(x ** 2)) + 1e-12)


def arenilla(n, tasa, rng):
    """Picos al azar suavizados: la tiza se traba y se suelta al pasar por los granos."""
    paso = max(1, int(SR / tasa))
    g = rng.random(n // paso + 3) ** 2.4
    return np.interp(np.arange(n), np.arange(len(g)) * paso, g)


def roce(d, objetivo, grande, acento, rng):
    n = int((d + 0.035) * SR)
    w = rng.standard_normal(n)
    u = np.clip(np.arange(n) / (d * SR), 0, 1)
    vel = 1 - 0.8 * np.cos(2 * np.pi * u)  # la misma curva de velocidad que usa el trazo en chalk.js
    am = (0.35 + 0.65 * arenilla(n, rng.uniform(120, 240), rng)) * (0.5 + 0.5 * arenilla(n, rng.uniform(900, 1500), rng))
    lo, hi = (800, 4600) if acento else (1100, 6200)  # la tiza de acento suena un poco más apagada
    j = rng.uniform(0.8, 1.25)  # cada trazo roza distinto
    x = (bp(w, lo * j, hi * j) + hp(w, 7000) * 0.16) * am * (0.35 + 0.65 * np.clip(vel / 1.8, 0, 1))
    if rng.random() < 0.16:  # de vez en cuando la tiza chilla un poco
        f = rng.uniform(2800, 4800)
        x = x + bp(w, f * 0.985, f * 1.015) * am * 1.6
    x = x + bp(w * am, 170, 480) * (0.55 if grande else 0.32)  # el cuerpo de la pizarra
    env = np.ones(n)
    a = int(0.004 * SR)
    env[:a] = np.linspace(0, 1, a)
    c = int(0.03 * SR)
    env[-c:] *= np.linspace(1, 0, c) ** 2
    return (x * env / rms(x * env) * objetivo).astype(np.float32)


def golpe(v, f):
    d = 0.05
    t = t_(d)
    return ((hp(noise(d), 1800) * env_exp(d, 0.0025) * 0.6 + np.sin(2 * np.pi * f * t) * env_exp(d, 0.01)) * v).astype(np.float32)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("eventos")
    p.add_argument("--salida", default="tiza.wav")
    p.add_argument("--semilla", type=int, default=23)
    p.add_argument("--ancho", type=int, default=1080, help="Ancho del cuadro, para ubicar cada trazo en estéreo")
    a = p.parse_args()
    E = json.loads(Path(a.eventos).read_text(encoding="utf-8"))
    rng = np.random.default_rng(a.semilla)
    buf = np.zeros((int(E["dur"] * SR), 2), np.float32)

    for s in E["trazos"]:
        if s["t0"] + s["d"] < 0:
            continue
        acento, grande = s.get("acento", False), s.get("cap", 90) > 110
        objetivo = (0.05 + 0.09 * min(1, s["len"] / 600)) * (s.get("cap", 90) / 90) ** 0.5 * (1.2 if acento else 1) * (1.2 if s.get("baja") else 0.85)
        pan = (s.get("x", a.ancho / 2) - a.ancho / 2) / (a.ancho / 2) * 0.45
        add(buf, roce(s["d"], objetivo, grande, acento, rng), s["t0"], 1.0, pan)
        if s["d"] > 0.07 and rng.random() < 0.7:
            add(buf, golpe(objetivo * 1.1, rng.uniform(380, 700)), s["t0"] - 0.003, 1.0, pan)

    b = E.get("borrador")
    if b:
        d = b["t1"] - b["t0"] + 0.1
        n = int(d * SR)
        w = rng.standard_normal(n)
        x = lp(w, 1500) + bp(w, 1500, 3800) * 0.35
        x = x * (0.7 + 0.3 * arenilla(n, 35, rng)) * np.sin(np.pi * np.clip(np.arange(n) / n, 0, 1)) ** 1.3
        x = x / rms(x) * 0.085
        pan = np.linspace(0.35, -0.35, n)
        ini = int(b["t0"] * SR)
        fin = min(len(buf), ini + n)
        buf[ini:fin, 0] += (x * np.cos((pan + 1) * np.pi / 4) * 1.414)[: fin - ini].astype(np.float32)
        buf[ini:fin, 1] += (x * np.sin((pan + 1) * np.pi / 4) * 1.414)[: fin - ini].astype(np.float32)

    # Tono de sala muy bajo: un silencio real no es cero digital.
    r = lp(hp(rng.standard_normal(len(buf)), 50), 600)
    r = r / rms(r) * 0.0028
    buf[:, 0] += r.astype(np.float32)
    buf[:, 1] += np.roll(r, 977).astype(np.float32)

    Path(a.salida).parent.mkdir(parents=True, exist_ok=True)
    sf.write(a.salida, np.clip(buf, -1, 1), SR, subtype="PCM_16")
    print(json.dumps({"ok": True, "salida": a.salida, "trazos": len(E["trazos"]), "dur": E["dur"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
