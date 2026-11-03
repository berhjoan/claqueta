#!/usr/bin/env python3
"""Compone música original en este computador y entrega el tiempo exacto de cada pulso.

No usa modelos, llaves ni muestras ajenas: todo sale de síntesis y de modelos físicos de cuerda.
Como las notas se calculan, la rejilla es exacta y no hay que analizar la pista para cortar sobre ella.

Uso:
  python tools/audio/musica.py --caracter calido --bpm 96 --dur 30 --salida assets/audio/musica.wav --rejilla assets/audio/rejilla.json
  python tools/audio/musica.py --listar

La rejilla trae pulsos, compases y secciones (entrada, cuerpo, respiro, cierre).
Necesita numpy, scipy, soundfile y numba. La primera nota tarda unos 15 s mientras numba compila.
Claude no oye: mide con esta herramienta, pero una persona debe escuchar la pista antes de publicar.
"""
import argparse
import json
import math
import sys
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import butter, fftconvolve, sosfilt

sys.path.insert(0, str(Path(__file__).resolve().parent))
from masterizar import medir  # noqa: E402
from sfx import SR, add, limit  # noqa: E402
import pluck as P  # noqa: E402

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Grados sobre la tónica en semitonos; cada acorde es [raíz, tercera, quinta, color].
MENOR = {"i": [0, 3, 7, 10], "iv": [5, 8, 12, 15], "v": [7, 10, 14, 17], "VI": [8, 12, 15, 19], "III": [3, 7, 10, 14], "VII": [10, 14, 17, 21], "ii": [2, 5, 8, 12]}
MAYOR = {"I": [0, 4, 7, 11], "IV": [5, 9, 12, 16], "V": [7, 11, 14, 17], "vi": [9, 12, 16, 19], "ii": [2, 5, 9, 12], "iii": [4, 7, 11, 14]}

CARACTERES = {
    "minimal": {"nombre": "Pulso mínimo y tenso", "modo": MENOR, "prog": ["i", "i", "VI", "VII"], "tonica": 45, "bpm": 110},
    "calido": {"nombre": "Cálido y acústico", "modo": MAYOR, "prog": ["I", "V", "vi", "IV"], "tonica": 48, "bpm": 96},
    "electronico": {"nombre": "Electrónico limpio", "modo": MENOR, "prog": ["i", "VI", "III", "VII"], "tonica": 45, "bpm": 118},
    "cine": {"nombre": "Cinematográfico con crescendo", "modo": MENOR, "prog": ["i", "VI", "III", "VII"], "tonica": 43, "bpm": 84},
    "lofi": {"nombre": "Lofi tranquilo", "modo": MAYOR, "prog": ["ii", "V", "I", "vi"], "tonica": 50, "bpm": 78},
    "energia": {"nombre": "Alta energía con bombo marcado", "modo": MENOR, "prog": ["i", "VII", "VI", "VII"], "tonica": 45, "bpm": 128},
    "misterio": {"nombre": "Misterioso y contenido", "modo": MENOR, "prog": ["i", "ii", "i", "v"], "tonica": 43, "bpm": 72},
    "latino": {"nombre": "Con toque latino sutil", "modo": MENOR, "prog": ["i", "iv", "VII", "III"], "tonica": 45, "bpm": 100},
}


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def filtro(x, tipo, f, orden=2):
    return sosfilt(butter(orden, f, tipo, fs=SR, output="sos"), x)


def tiempo(d):
    return np.arange(int(round(d * SR))) / SR


def pad(notas, d, brillo, rng, ataque=0.6, salida=0.8):
    """Colchón de ondas desafinadas y filtradas, abierto en estéreo. Devuelve (N, 2)."""
    t = tiempo(d)
    sal = np.zeros((len(t), 2), np.float32)
    env = np.minimum(1, t / ataque) * np.minimum(1, (d - t) / salida)
    env = np.clip(env, 0, 1) ** 1.3
    for m in notas:
        for lado, cents in ((0, -7), (1, 6)):
            f = hz(m) * 2 ** (cents / 1200)
            fase = rng.uniform(0, 6.28)
            x = sum(np.sin(2 * np.pi * f * k * t + fase * k) / k ** 1.45 for k in range(1, 8))
            sal[:, lado] += (x * env).astype(np.float32)
    for lado in range(2):
        sal[:, lado] = filtro(sal[:, lado], "low", brillo)
    return sal / max(1, len(notas))


def piano_e(m, d, vel):
    """Piano eléctrico por modulación de frecuencia."""
    t = tiempo(d)
    f = hz(m)
    env = np.exp(-t / (0.55 + 0.25 * (72 - min(m, 72)) / 24))
    mod = np.sin(2 * np.pi * f * t) * (1.2 * vel) * np.exp(-t / 0.35) + np.sin(2 * np.pi * f * 14 * t) * 0.35 * vel * np.exp(-t / 0.04)
    x = np.sin(2 * np.pi * f * t + mod) * env
    a = int(0.004 * SR)
    x[:a] *= np.linspace(0, 1, a)
    c = int(0.03 * SR)
    x[-c:] *= np.linspace(1, 0, c)
    return (x * vel).astype(np.float32)


def bajo_sub(m, d, vel):
    t = tiempo(d)
    f = hz(m)
    x = 0.7 * np.sin(2 * np.pi * f * t) + 0.55 * np.sin(4 * np.pi * f * t) + 0.32 * np.sin(6 * np.pi * f * t) + 0.16 * np.sin(8 * np.pi * f * t)
    env = np.minimum(1, t / 0.006) * np.minimum(1, (d - t) / 0.04)
    return (np.tanh(1.5 * x * env) * vel).astype(np.float32)


def nota_sintetica(m, d, vel):
    """Punteo de sintetizador corto y filtrado."""
    t = tiempo(d)
    f = hz(m)
    x = sum(np.sin(2 * np.pi * f * k * t) / k for k in range(1, 6))
    x = x * np.exp(-t / 0.16) * np.minimum(1, t / 0.003)
    return (filtro(x, "low", 4200) * vel * 0.5).astype(np.float32)


def bombo(vel):
    t = tiempo(0.32)
    f = 48 + 90 * np.exp(-t / 0.035)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.11)
    return (np.tanh(1.8 * x) * vel).astype(np.float32)


def caja(vel, rng):
    t = tiempo(0.2)
    r = filtro(rng.standard_normal(len(t)), "band", [1400, 7000]) * np.exp(-t / 0.055)
    c = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.05)
    return ((r * 0.9 + c * 0.55) * vel).astype(np.float32)


def charles(vel, rng, abierto=False):
    t = tiempo(0.22 if abierto else 0.05)
    x = filtro(rng.standard_normal(len(t)), "high", 7500) * np.exp(-t / (0.08 if abierto else 0.012))
    return (x * vel).astype(np.float32)


def sala(buf, tam, mezcla, rng):
    """Reverberación por convolución con una cola de ruido; determinista por la semilla."""
    n = int(tam * SR)
    t = np.arange(n) / SR
    env = np.exp(-t / (tam / 5))
    salida = np.array(buf, np.float32)
    for lado in range(2):
        ir = filtro(rng.standard_normal(n), "low", 5200) * env
        ir[: int(0.012 * SR)] = 0
        ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
        moj = fftconvolve(buf[:, lado], ir)[: len(buf)]
        salida[:, lado] = buf[:, lado] * (1 - mezcla * 0.5) + moj.astype(np.float32) * mezcla
    return salida


def ecualizar(buf, agudos_db=3.0, graves_db=-5.0):
    """Ordena el balance para parlantes de teléfono: saca lo inaudible y abre el brillo."""
    salida = np.array(buf, np.float32)
    for lado in range(2):
        x = filtro(buf[:, lado], "high", 42)
        x = x + filtro(x, "low", 130) * (10 ** (graves_db / 20) - 1)
        x = x + filtro(x, "high", 3200) * (10 ** (agudos_db / 20) - 1)
        salida[:, lado] = x.astype(np.float32)
    return salida


def puesto(buf, x, t, g=1.0, pan=0.0):
    if x.ndim == 2:
        s = int(t * SR)
        if s >= len(buf):
            return
        e = min(len(buf), s + len(x))
        buf[s:e] += x[: e - s] * g
    else:
        add(buf, x, t, g, pan)


def seccion_de(compas, total):
    """Reparte el arco: entra escasa, respira hacia el 65 %, cierra plena."""
    entrada = 2 if total >= 6 else 1
    cierre = 2 if total >= 8 else 1
    respiro = {math.floor(total * 0.62)} if total >= 10 else set()
    if compas < entrada:
        return "entrada"
    if compas >= total - cierre:
        return "cierre"
    if compas in respiro:
        return "respiro"
    return "cuerpo"


def intensidad(seccion):
    return {"entrada": 0.55, "cuerpo": 0.85, "respiro": 0.35, "cierre": 1.0}[seccion]


def componer(car, bpm, dur, semilla, compas_n=4, tonica=None):
    c = CARACTERES[car]
    rng = np.random.default_rng(semilla)
    pulso = 60.0 / bpm
    compas = pulso * compas_n
    total = max(1, int(np.ceil(dur / compas)))
    buf = np.zeros((int(round(dur * SR)), 2), np.float32)
    ton = c["tonica"] if tonica is None else tonica
    secciones, pulsos, compases = [], [], []

    for b in range(total):
        t0 = b * compas
        sec = seccion_de(b, total)
        if not secciones or secciones[-1]["nombre"] != sec:
            secciones.append({"nombre": sec, "t0": round(t0, 4), "t1": round(min(dur, t0 + compas), 4)})
        else:
            secciones[-1]["t1"] = round(min(dur, t0 + compas), 4)
        compases.append(round(t0, 4))
        pulsos += [round(t0 + k * pulso, 4) for k in range(compas_n) if t0 + k * pulso < dur]
        I = intensidad(sec)
        nombre = c["prog"][b % len(c["prog"])]
        acorde = [ton + s for s in c["modo"][nombre]]
        raiz = acorde[0]
        d = min(compas, dur - t0)
        if d <= 0.01:
            continue

        def jit():
            return float(rng.normal(0, 0.005))

        if car == "calido":
            puesto(buf, pad([n + 12 for n in acorde[:3]], d + 0.4, 1500, rng), t0, 0.09 * I)
            patron = [0, 2, 1, 3, 2, 1, 3, 2]
            for k, idx in enumerate(patron):
                if sec == "respiro" and k % 2:
                    continue
                t = t0 + k * pulso / 2
                if t < dur:
                    puesto(buf, P.pluck("nylon_guitar", acorde[idx] + 12, 2.2, vel=float(rng.uniform(0.5, 0.72))), max(0, t + jit()), 0.7 * I, -0.18 + 0.1 * (k % 3))
            puesto(buf, P.pluck("upright_bass_pizz", raiz - 12, 1.6, vel=0.7), t0, 0.85 * I)
            if sec != "respiro":
                puesto(buf, P.pluck("upright_bass_pizz", raiz - 5, 1.2, vel=0.5), t0 + 2 * pulso, 0.6 * I)
        elif car == "minimal":
            for k in range(compas_n * 2):
                t = t0 + k * pulso / 2
                if t < dur:
                    puesto(buf, bajo_sub(raiz, pulso * 0.42, 0.5 if k % 2 == 0 else 0.28), t, 0.42 * I)
            if sec != "entrada":
                puesto(buf, P.pluck("harp", acorde[1] + 24, 2.5, vel=0.55), t0 + 3.5 * pulso, 0.7 * I, 0.25)
                puesto(buf, P.pluck("harp", acorde[2] + 24, 2.5, vel=0.5), t0 + 1.5 * pulso, 0.55 * I, -0.25)
            puesto(buf, pad([raiz + 12, raiz + 19], d + 0.5, 1500, rng, ataque=1.2), t0, 0.16 * I)
            for k in range(compas_n):
                puesto(buf, charles(0.1, rng), t0 + k * pulso + pulso / 2, I, 0.15)
        elif car == "electronico":
            puesto(buf, pad([n + 12 for n in acorde], d + 0.3, 1400 + 2600 * I, rng), t0, 0.22 * I)
            for k in range(compas_n * 2):
                t = t0 + k * pulso / 2
                if t < dur and (sec != "respiro" or k < 2):
                    puesto(buf, nota_sintetica(acorde[(k * 3) % 4] + 24, 0.34, 0.8), t, 1.1 * I, -0.3 if k % 2 else 0.3)
            if sec != "entrada":
                for k in range(compas_n):
                    puesto(buf, bombo(0.5), t0 + k * pulso, I)
                    puesto(buf, charles(0.2, rng), t0 + k * pulso + pulso / 2, I, 0.1)
            puesto(buf, bajo_sub(raiz, d * 0.9, 0.28), t0, I)
        elif car == "energia":
            puesto(buf, pad([n + 12 for n in acorde], d + 0.2, 3400, rng, ataque=0.15, salida=0.3), t0, 0.2 * I)
            for k in range(compas_n):
                puesto(buf, bombo(0.7), t0 + k * pulso, I)
                if k % 2 == 1:
                    puesto(buf, caja(0.55, rng), t0 + k * pulso, I)
            for k in range(compas_n * 2):
                t = t0 + k * pulso / 2
                puesto(buf, charles(0.3 if k % 2 else 0.16, rng, abierto=k % 4 == 3), t, I, 0.12)
                puesto(buf, bajo_sub(raiz + (12 if k % 4 == 3 else 0), pulso * 0.42, 0.3), t, I)
                if sec != "entrada" and sec != "respiro":
                    puesto(buf, nota_sintetica(acorde[k % 4] + 24, 0.25, 0.8), t, 1.0 * I, 0.25 if k % 2 else -0.25)
        elif car == "cine":
            arco = (b + 1) / total
            puesto(buf, pad([n + 12 for n in acorde[:3]] + [raiz], d + 0.8, 1100 + 3000 * arco, rng, ataque=1.0, salida=1.2), t0, 0.24 * (0.4 + 0.6 * arco))
            for k in range(compas_n * 2):
                t = t0 + k * pulso / 2
                if t < dur:
                    puesto(buf, P.pluck("harp", acorde[(k * 2 + b) % 4] + 12 + (12 if k > 3 else 0), 3.0, vel=0.55 + 0.2 * arco), t, 1.0 * I, -0.25 + 0.5 * k / 8)
            if arco > 0.5:
                puesto(buf, bombo(0.35 + 0.3 * arco), t0, I)
        elif car == "lofi":
            puesto(buf, sum(piano_e(n + 12, max(2.2, d + 0.2), 0.55) for n in acorde) * 0.32, t0, 0.9 * I, -0.12)
            puesto(buf, pad([n + 12 for n in acorde[:3]], d + 0.4, 1200, rng, ataque=0.25, salida=0.4), t0, 0.1 * I)
            if sec != "respiro":
                golpe = pulso / 2 * 1.16
                puesto(buf, piano_e(acorde[2] + 24, 0.9, 0.34), t0 + golpe + pulso, 0.6 * I, 0.25)
                for k in (0, 2):
                    puesto(buf, bombo(0.5), t0 + k * pulso, I)
                for k in (1, 3):
                    puesto(buf, caja(0.17, rng), t0 + k * pulso, I)
                for k in range(compas_n * 2):
                    balanceo = (0.03 * pulso) if k % 2 else 0
                    puesto(buf, charles(0.05, rng), t0 + k * pulso / 2 + balanceo, I, 0.1)
            puesto(buf, bajo_sub(raiz, pulso * 1.6, 0.24), t0, I)
        elif car == "misterio":
            puesto(buf, pad([raiz + 12, raiz + 19, raiz + 26], d + 1.0, 1300, rng, ataque=1.4, salida=1.4), t0, 0.26 * I)
            puesto(buf, P.pluck("kalimba", acorde[1] + 24, 3.0, vel=0.5), t0 + pulso * 1.5, 0.9 * I, -0.25)
            if b % 2 == 1 or sec == "cierre":
                puesto(buf, P.pluck("kalimba", acorde[3] + 24, 3.0, vel=0.42), t0 + pulso * 3, 0.8 * I, 0.3)
            puesto(buf, bajo_sub(raiz, pulso * 1.2, 0.2), t0, I)
        elif car == "latino":
            puesto(buf, pad([n + 12 for n in acorde[:3]], d + 0.3, 1300, rng), t0, 0.07 * I)
            tresillo = [0, 1.5, 3, 4.5, 6]                        # clave sugerida en corcheas: sin percusión ajena
            for k, c8 in enumerate(tresillo):
                t = t0 + c8 * pulso / 2
                if t < dur and (sec != "respiro" or k < 2):
                    puesto(buf, P.pluck("nylon_guitar", acorde[(k * 2) % 3] + 12, 1.8, vel=float(rng.uniform(0.55, 0.72))), t + jit(), 0.72 * I, -0.15)
            puesto(buf, P.pluck("upright_bass_pizz", raiz - 12, 1.5, vel=0.72), t0, 0.85 * I)
            puesto(buf, P.pluck("upright_bass_pizz", raiz - 5, 1.2, vel=0.56), t0 + 1.5 * pulso, 0.65 * I)
            if sec != "entrada":
                for k in range(compas_n):
                    puesto(buf, charles(0.05, rng), t0 + k * pulso + pulso / 2, I, 0.2)

    # Último gesto: acorde final que resuena hasta el corte, sobre el último pulso fuerte.
    cierre = [ton + s for s in c["modo"][c["prog"][0]]]
    tf = max(0.0, compases[-1])
    if car in ("calido", "latino"):
        puesto(buf, P.strum("nylon_guitar", [n + 12 for n in cierre[:3]], 3.0, vel=0.62), tf, 0.5)
    elif car == "cine":
        puesto(buf, bombo(0.9), tf, 1.0)
    mojada = sala(buf, {"cine": 2.6, "misterio": 2.8, "calido": 1.1, "lofi": 0.6, "latino": 1.0}.get(car, 1.2), {"cine": 0.32, "misterio": 0.3, "lofi": 0.12}.get(car, 0.16), rng)
    return ecualizar(mojada), {
        "bpm": bpm, "compas": compas_n, "dur": dur, "caracter": car, "semilla": semilla,
        "pulsos": pulsos, "compases": compases, "secciones": secciones, "aviso": "Los pulsos son exactos porque las notas se calcularon. Corta sobre ellos.",
    }


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--caracter", choices=list(CARACTERES), default="calido")
    p.add_argument("--bpm", type=float, help="Si falta, usa el tempo natural de ese carácter")
    p.add_argument("--dur", type=float, default=30)
    p.add_argument("--salida", default="musica.wav")
    p.add_argument("--rejilla", help="Archivo JSON con pulsos, compases y secciones")
    p.add_argument("--semilla", type=int, default=7)
    p.add_argument("--tonica", type=int, help="Nota MIDI de la tónica")
    p.add_argument("--listar", action="store_true")
    a = p.parse_args()
    if a.listar:
        for k, v in CARACTERES.items():
            print(f"{k}: {v['nombre']}, {v['bpm']} BPM")
        return
    bpm = a.bpm or CARACTERES[a.caracter]["bpm"]
    mezcla, rej = componer(a.caracter, bpm, a.dur, a.semilla, tonica=a.tonica)
    n = int(0.06 * SR)
    mezcla[-n:] *= np.linspace(1, 0, n)[:, None]
    # Nivel común de todos los caracteres: -18 LUFS, con margen de pico.
    pico = float(np.abs(mezcla).max()) + 1e-9
    mezcla = mezcla / pico * 0.7
    with tempfile.TemporaryDirectory() as d:
        prueba = Path(d) / "m.wav"
        for _ in range(4):
            sf.write(prueba, mezcla, SR, subtype="FLOAT")
            i, tp = medir(prueba)
            if abs(i + 18) < 0.3 and tp <= -2.0:
                break
            mezcla = mezcla * 10 ** ((-18 - i) / 20)
            for lado in range(2):
                mezcla[:, lado] = limit(mezcla[:, lado], ceil=0.72)
    Path(a.salida).parent.mkdir(parents=True, exist_ok=True)
    sf.write(a.salida, mezcla, SR, subtype="PCM_16")
    if a.rejilla:
        Path(a.rejilla).parent.mkdir(parents=True, exist_ok=True)
        Path(a.rejilla).write_text(json.dumps(rej, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps({"ok": True, "salida": a.salida, "rejilla": a.rejilla, "bpm": bpm, "secciones": [s["nombre"] for s in rej["secciones"]], "compases": len(rej["compases"])}, ensure_ascii=False))


if __name__ == "__main__":
    main()
