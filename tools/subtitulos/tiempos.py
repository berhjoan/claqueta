"""Afina tiempos de palabra contra la energía real del audio.

Whisper suele marcar el inicio de una palabra antes de tiempo cuando viene después de una pausa, y los motores de voz
entregan marcas con un desfase fijo respecto al archivo decodificado. Aquí cada palabra se apoya en lo que suena de verdad.
Necesita numpy y ffmpeg.
"""
import subprocess

import numpy as np

SR = 16000
PASO = 0.005  # segundos entre medidas


def energia_db(audio):
    crudo = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(audio), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(crudo, np.float32)
    if len(x) == 0:
        raise ValueError(f"sin audio en {audio}")
    salto, ventana = int(PASO * SR), int(0.012 * SR)
    p = np.cumsum(np.concatenate([[0.0], x.astype(np.float64) ** 2]))
    inicios = np.arange(0, max(1, len(x) - ventana), salto)
    rms = np.sqrt(np.maximum(p[inicios + ventana] - p[inicios], 0) / ventana)
    return 20 * np.log10(rms + 1e-7)


def mapa_de_voz(db):
    """Marca dónde suena algo. Une cierres cortos de consonantes para no partir una palabra."""
    alto = float(np.percentile(db[db > -90], 95)) if (db > -90).any() else -20.0
    piso = float(np.percentile(db, 5))
    umbral = max(piso + 8, alto - 34)
    sonoro = db > umbral
    hueco = int(0.045 / PASO)
    i, n = 0, len(sonoro)
    while i < n:
        if sonoro[i]:
            i += 1
            continue
        j = i
        while j < n and not sonoro[j]:
            j += 1
        if i > 0 and j < n and j - i <= hueco:
            sonoro[i:j] = True
        i = j
    return sonoro


def refinar(palabras, audio, desfase_global=False):
    """Devuelve una copia con cada inicio y fin apoyados en la energía.

    Con desfase_global, las palabras en medio de una frase reciben el desfase típico medido en las que siguen a una pausa.
    Sirve para motores cuyas marcas se corren parejo, como Edge. No conviene con Whisper, cuyo error no es parejo.
    """
    db = energia_db(audio)
    sonoro = mapa_de_voz(db)
    n = len(sonoro)
    a_idx = lambda t: int(min(n - 1, max(0, round(t / PASO))))
    salida = [dict(p) for p in palabras]
    movidas = []
    previo = -1.0
    for p in salida:
        s = a_idx(p["inicio"])
        if not sonoro[s]:
            limite = min(n, s + int(0.6 / PASO))
            j = next((k for k in range(s, limite) if sonoro[k]), None)
            if j is not None:
                movidas.append(j * PASO - p["inicio"])
                p["inicio"] = j * PASO
                p["_fijo"] = True
        else:
            k = s
            while k > 0 and sonoro[k - 1] and (s - k) * PASO < 0.09:
                k -= 1
            # Ese arranque solo es suyo si la palabra anterior no lo reclamó ya.
            if k > 0 and not sonoro[k - 1] and k * PASO > previo + 0.06:
                movidas.append(k * PASO - p["inicio"])
                p["inicio"] = k * PASO
                p["_fijo"] = True
        previo = p["inicio"]
    if desfase_global and movidas:
        d = float(np.median(movidas))
        if 0.02 <= abs(d) <= 0.4:
            for p in salida:
                if not p.get("_fijo"):
                    p["inicio"] += d
                p["fin"] += d
    for i in range(1, len(salida)):
        salida[i]["inicio"] = max(salida[i]["inicio"], salida[i - 1]["inicio"] + 0.03)
    for i, p in enumerate(salida):
        e = a_idx(p["fin"])
        if not sonoro[e]:
            k = e
            while k > 0 and not sonoro[k] and (e - k) * PASO < 0.5:
                k -= 1
            if sonoro[k]:
                p["fin"] = (k + 1) * PASO
        else:  # Sigue sonando: una oración suele terminar unas centésimas después de su marca.
            tope = a_idx(salida[i + 1]["inicio"]) if i + 1 < len(salida) else n - 1
            k = e
            while k < tope and sonoro[k] and (k - e) * PASO < 0.4:
                k += 1
            p["fin"] = k * PASO
        p["fin"] = max(p["fin"], p["inicio"] + 0.04)
        if i + 1 < len(salida):
            p["fin"] = min(p["fin"], max(salida[i + 1]["inicio"], p["inicio"] + 0.04))
    for p in salida:
        p.pop("_fijo", None)
        p["inicio"], p["fin"] = round(p["inicio"], 3), round(p["fin"], 3)
    return salida
