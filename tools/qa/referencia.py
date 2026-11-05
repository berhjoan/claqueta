#!/usr/bin/env python3
"""De un reel que te gusta, su gramática: ritmo, gancho, sonido y escala. Nunca su contenido.

Uso:
  python ../.claqueta/tools/qa/referencia.py reel.mp4
  python ../.claqueta/tools/qa/referencia.py reel.mp4 --salida referencia --ignorar 1300-1540
  python ../.claqueta/tools/qa/referencia.py reel.mp4 --comparar renders/final.mp4
  python ../.claqueta/tools/qa/referencia.py reel.mp4 --whisper          (palabras por segundo reales; pide faster-whisper)
  node ../.claqueta/tools/prompt.mjs referencia/proyecto-referencia.json --salida encargo.md

Toma un archivo local que ya tienes. No baja nada de ninguna red. Mide planos y su duración, curva de ritmo, los primeros 3 s,
cuándo entra la primera voz, sincronía de los cortes con el pulso de la música, velocidad del habla, silencios, variación de
volumen, proporción de voz y música, color por sección (solo luminosidad y temperatura), densidad de texto estimada y formato.
Deja en --salida (por defecto referencia/):
  REFERENCIA.md              qué se conserva (ritmo, tipo de gancho, estructura, escala) y qué no se copia
  referencia.json            todas las medidas
  proyecto-referencia.json   ajustes del panel con ids reales, listo para tools/prompt.mjs
  hoja-planos.jpg            un cuadro por plano, solo para mirar la estructura: no se usa en tu video
Con --comparar mi_video.mp4 mide el tuyo igual y escribe comparacion.md: una tabla de diferencias de ritmo.

Lo que NO hace: no lee letras, no reconoce personas, no guarda texto, música ni imágenes de la referencia en tus ajustes. El texto
hablado, si usas --whisper, se descarta: solo quedan cuántas palabras y cuándo. Todo lo estimado lleva «estimado».
Necesita numpy, scipy y ffmpeg. faster-whisper es opcional.
"""
import argparse
import colorsys
import importlib.util
import json
import re
import subprocess
import sys
import time
from pathlib import Path

import numpy as np
from scipy import signal as sg

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
sys.path.insert(0, str(AQUI.parent / "subtitulos"))
import revisar as rv  # noqa: E402
import verificar_video as vv  # noqa: E402

TOL = 0.2  # diferencia relativa que aún se lee como «parecido»
# Picos de la envolvente por segundo de voz -> palabras por segundo. Calibrado con dos textos conocidos (3,4 y 3,2 palabras por segundo reales).
PICOS_A_PALABRAS = 0.8


# ------------------------------------------------------------------------------------------------------------------- imagen


def muestrear(ruta, ancho, alto, ignorar, por_s=2):
    """Un cuadro cada 1/por_s s a 1/3 de tamaño: color, escala del contenido y detalle fino (proxy de texto)."""
    if alto >= ancho:
        W, H = 360, int(round(360 * alto / ancho))
    else:
        H, W = 360, int(round(360 * ancho / alto))
    H -= H % 12
    W -= W % 12
    p = subprocess.Popen(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(ruta), "-an", "-vf", f"fps={por_s},scale={W}:{H}:flags=area,format=rgb24", "-f", "rawvideo", "-"], stdout=subprocess.PIPE)
    tam = W * H * 3
    filas = None
    if ignorar:
        filas = (int(max(0, ignorar[0]) / alto * H), int(np.ceil(min(alto, ignorar[1]) / alto * H)))
    sal = {"hist": [], "ocupacion": [], "cobertura": [], "texto": [], "luma": [], "t": []}
    k = 0
    while True:
        buf = p.stdout.read(tam)
        if len(buf) < tam:
            break
        x = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
        q = ((x[..., 0] >> 4).astype(np.int32) << 8) | ((x[..., 1] >> 4).astype(np.int32) << 4) | (x[..., 2] >> 4).astype(np.int32)
        h = np.bincount(q.ravel(), minlength=4096)
        sal["hist"].append(h.astype(np.uint32))
        bg = int(h.argmax())
        fondo = np.array([((bg >> 8) & 15) * 16 + 8, ((bg >> 4) & 15) * 16 + 8, (bg & 15) * 16 + 8])
        dist = np.abs(x.astype(np.int16) - fondo).sum(2)
        mask = dist > 60
        g = (x[..., 0] * 0.299 + x[..., 1] * 0.587 + x[..., 2] * 0.114).astype(np.float32)
        if filas:
            mask[filas[0]:filas[1], :] = False
        fr, fc = mask.mean(1), mask.mean(0)
        r = np.flatnonzero(fr > 0.005)
        c = np.flatnonzero(fc > 0.005)
        sal["ocupacion"].append(float(((r[-1] - r[0] + 1) * (c[-1] - c[0] + 1)) / (H * W)) if len(r) and len(c) else 0.0)
        sal["cobertura"].append(float(mask.mean()))
        gx = np.abs(np.diff(g, axis=1))[:-1, :]
        gy = np.abs(np.diff(g, axis=0))[:, :-1]
        borde = np.pad((gx + gy) > 40, ((0, 1), (0, 1)))
        b = borde.reshape(H // 12, 12, W // 12, 12)
        d = b.mean((1, 3))
        sd = g.reshape(H // 12, 12, W // 12, 12).std((1, 3))
        celdas = (d >= 0.06) & (d <= 0.55) & (sd >= 18)
        if filas:
            celdas[int(filas[0] // 12): int(np.ceil(filas[1] / 12)), :] = False
        sal["texto"].append(float(celdas.mean()))
        sal["luma"].append(float(g.mean()))
        sal["t"].append(k / por_s)
        k += 1
    p.wait()
    if not k:
        raise ValueError("no se pudo muestrear el video")
    return {a: np.array(b) for a, b in sal.items()}


def paleta(hist, n=4, minimo=48):
    """Colores dominantes de un histograma de 4096 bins (4 bits por canal), sin repetir tonos parecidos."""
    idx = np.arange(4096)
    cen = np.stack([((idx >> 8) & 15) * 16 + 8, ((idx >> 4) & 15) * 16 + 8, (idx & 15) * 16 + 8], 1).astype(np.float32)
    hist = hist.astype(np.int64)
    total = float(hist.sum()) or 1.0
    orden = np.argsort(-hist)
    elegidos = []
    for i in orden[:600]:
        if hist[i] == 0:
            break
        if all(np.abs(cen[i] - cen[j]).sum() >= minimo for j in elegidos):
            elegidos.append(int(i))
        if len(elegidos) >= n:
            break
    if not elegidos:
        return []
    cerca = np.argmin(np.abs(cen[:, None, :] - cen[elegidos][None]).sum(2), axis=1)
    res = []
    for k, e in enumerate(elegidos):
        m = (cerca == k) & (hist > 0)
        w = hist[m].astype(np.float64)
        rgb = (cen[m] * w[:, None]).sum(0) / w.sum()
        hsv = colorsys.rgb_to_hsv(*(rgb / 255))
        res.append({"hex": "#%02x%02x%02x" % tuple(int(v) for v in rgb), "parte_pct": round(float(w.sum() / total * 100), 1), "luminosidad": round(float(0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]), 0), "saturacion": round(hsv[1], 2)})
    return sorted(res, key=lambda z: -z["parte_pct"])


def temperatura(p):
    if not p:
        return "sin datos"
    r = sum(c["parte_pct"] * int(c["hex"][1:3], 16) for c in p)
    b = sum(c["parte_pct"] * int(c["hex"][5:7], 16) for c in p)
    d = (r - b) / max(1, sum(c["parte_pct"] for c in p))
    return "cálida" if d > 12 else "fría" if d < -12 else "neutra"


def ficha_color(hist):
    p = paleta(hist)
    if not p:
        return {"paleta": [], "luminosidad": None, "temperatura": "sin datos", "contraste": None}
    luma = sum(c["luminosidad"] * c["parte_pct"] for c in p) / sum(c["parte_pct"] for c in p)
    contr = max(c["luminosidad"] for c in p) - min(c["luminosidad"] for c in p)
    return {"paleta": p, "luminosidad": round(float(luma), 0), "temperatura": temperatura(p), "contraste": round(float(contr), 0)}


# -------------------------------------------------------------------------------------------------------------------- sonido


def pulso(mono, sr=16000):
    """Pulso de la música por flujo espectral: tempo, confianza y los tiempos de cada pulso. Solo numpy y scipy."""
    n_fft, hop = 1024, 160
    f, t, S = sg.stft(mono, sr, nperseg=n_fft, noverlap=n_fft - hop, boundary=None)
    M = np.log1p(np.abs(S[(f >= 40) & (f <= 5000)]) * 20)
    flujo = np.maximum(np.diff(M, axis=1), 0).sum(0)
    env = flujo - sg.medfilt(flujo, 41)
    env = np.maximum(env, 0)
    if env.std() < 1e-9:
        return None
    fr = sr / hop
    z = env - env.mean()
    ac = sg.correlate(z, z, mode="full")[len(z) - 1:]
    ac = ac / (ac[0] + 1e-12)
    lo, hi = int(fr * 60 / 180), int(fr * 60 / 60)
    if hi >= len(ac) or lo < 2:
        return None
    lags = np.arange(lo, hi)
    prior = np.exp(-0.5 * (np.log2((fr * 60 / lags) / 110) / 0.8) ** 2)
    puntaje = ac[lags] * prior
    k = int(lags[np.argmax(puntaje)])
    # Afina el período con una parábola alrededor del máximo
    if 1 < k < len(ac) - 1:
        y0, y1, y2 = ac[k - 1], ac[k], ac[k + 1]
        den = y0 - 2 * y1 + y2
        k = k + (0.5 * (y0 - y2) / den if abs(den) > 1e-12 else 0.0)
    periodo = k / fr
    conf = float(ac[int(round(k))] / max(1e-9, np.percentile(ac[lo:hi], 90)))
    pico = float(ac[int(round(k))])
    # Fase: el desfase con más energía en sus pulsos
    mejor, fase = -1.0, 0.0
    for ph in np.arange(0, periodo, 1 / fr):
        idx = np.round((ph + np.arange(0, len(env) / fr, periodo)) * fr).astype(int)
        idx = idx[idx < len(env)]
        v = env[idx].mean() if len(idx) else 0
        if v > mejor:
            mejor, fase = v, ph
    # El índice k del flujo es la diferencia entre las ventanas k y k+1: su centro está (n_fft/2 + hop) muestras después del inicio.
    tiempos = np.arange(fase, len(env) / fr, periodo) + (n_fft / 2 + hop) / sr
    return {"bpm": round(60 / periodo, 1), "periodo_s": periodo, "autocorrelacion": round(pico, 2), "confianza": round(conf, 2), "pulsos": tiempos}


def sincronia(cortes, p):
    if p is None or len(cortes) == 0:
        return {"cortes": len(cortes), "pulso_claro": False}
    per = p["periodo_s"]
    d = np.array([abs(((c - p["pulsos"][0] + per / 2) % per) - per / 2) for c in cortes])
    golpe = d <= 0.08
    azar = min(1.0, 2 * 0.08 / per)
    claro = p["autocorrelacion"] >= 0.2
    frac = float(golpe.mean())
    veredicto = "sin pulso claro en la música"
    if claro:
        veredicto = "los cortes caen en el pulso" if len(cortes) >= 3 and frac >= azar + 0.3 else "los cortes no siguen el pulso"
    return {"cortes": len(cortes), "pulso_claro": bool(claro), "bpm": p["bpm"], "autocorrelacion": p["autocorrelacion"], "cortes_en_pulso": int(golpe.sum()), "cortes_en_pulso_pct": round(frac * 100, 1), "azar_pct": round(azar * 100, 1), "veredicto": veredicto}


def silabas_por_s(mono, ventanas):
    """Picos por segundo de voz en la envolvente de la banda del habla (una sílaba cada uno, con fusiones: se queda corto)."""
    paso = 0.01
    sos = sg.butter(4, [300, 3400], btype="bandpass", fs=rv.SR, output="sos")
    y = sg.sosfilt(sos, mono)
    h = int(paso * rv.SR)
    n = len(y) // h
    e = np.sqrt((y[: n * h].reshape(n, h) ** 2).mean(1))
    bajo = sg.butter(2, 12, btype="low", fs=1 / paso, output="sos")
    e = sg.sosfiltfilt(bajo, e)
    uni = []
    for i, f in sorted(ventanas):
        if uni and i <= uni[-1][1]:
            uni[-1][1] = max(uni[-1][1], f)
        else:
            uni.append([i, f])
    total_s, picos = 0.0, 0
    for i, f in uni:
        a, b = int(i / paso), min(n, int(f / paso))
        if b - a < 100:
            continue
        v = e[a:b]
        pk, _ = sg.find_peaks(v, distance=int(0.08 / paso), prominence=0.1 * np.percentile(v, 90))
        picos += len(pk)
        total_s += (b - a) * paso
    return (picos / total_s, total_s) if total_s > 0 else (None, 0.0)


def palabras_whisper(video, modelo):
    from alinear import transcribir  # noqa: E402
    return [(w[1], w[2]) for w in transcribir(str(video), modelo, None)]  # solo los tiempos: el texto se descarta


def sonido(video, dur, planos_front, a):
    x = rv.leer_audio(video)
    if x is None:
        return {"hay_audio": False}, None
    mono = x.mean(1)
    env = rv.envolvente_db(x)
    paso = 0.02
    sonoro = env > -50
    donde = np.flatnonzero(sonoro)
    s = {"hay_audio": True}
    if len(donde) == 0:
        s["silencio_total"] = True
        return s, None
    primero, ultimo = donde[0] * paso, (donde[-1] + 1) * paso
    s["primer_sonido_s"] = round(primero, 2)
    sil = [(i * paso, j * paso) for i, j in rv.segmentos(~sonoro) if i * paso > primero and j * paso < ultimo and (j - i) * paso >= 0.25]
    s["silencios"] = [{"desde": round(i, 2), "hasta": round(j, 2), "dura": round(j - i, 2)} for i, j in sil]
    s["silencio_total_pct"] = round(sum(j - i for i, j in sil) / dur * 100, 1) if dur else 0
    # Volumen: variación a 3 s
    h = int(3 * rv.SR)
    n3 = len(mono) // h
    if n3 >= 2:
        nivel = 20 * np.log10(np.sqrt((mono[: n3 * h].reshape(n3, h) ** 2).mean(1)) + 1e-7)
        nivel = nivel[nivel > -55]
        s["variacion_volumen_db"] = round(float(np.percentile(nivel, 90) - np.percentile(nivel, 10)), 1) if len(nivel) >= 2 else 0.0
    try:
        d = vv._medir(video, "loudnorm=print_format=json")
        s["lufs"], s["pico_verdadero_dbtp"], s["rango_lu"] = float(d["input_i"]), float(d["input_tp"]), float(d["input_lra"])
    except Exception:  # noqa: BLE001
        pass
    # Voz
    banda = rv.banda_voz_db(mono)
    ventanas = rv.voz_detectada(banda)
    voz = np.zeros(len(env), bool)
    for i, f in ventanas:
        voz[int(i / paso): int(f / paso)] = True
    voz &= sonoro[: len(voz)]
    s["voz_pct"] = round(float(voz.mean() * 100), 1)
    s["primera_voz_s"] = round(ventanas[0][0], 2) if ventanas else None
    s["voz_detectada"] = "estimada por modulación silábica"
    pausas_voz = []
    if ventanas:
        for (i1, f1), (i2, f2) in zip(ventanas, ventanas[1:]):
            if i2 - f1 >= 0.3:
                pausas_voz.append(round(i2 - f1, 2))
    s["pausas_de_voz"] = {"cantidad": len(pausas_voz), "mediana_s": round(float(np.median(pausas_voz)), 2) if pausas_voz else None}
    # Música: energía fuera de la voz y bajo ella
    fuera = sonoro & ~voz
    s["solo_musica_pct"] = round(float(fuera.mean() * 100), 1)
    s["musica_presente"] = bool((env[~voz & sonoro] > -45).mean() > 0.5) if (~voz & sonoro).any() else bool(len(ventanas) == 0)
    if ventanas:
        v = rv.voz_vs_musica(mono, ventanas)
        if v:
            s["contraste_voz_fondo_db"] = v["contraste_mediano_db"]
    # Habla
    ritmo = None
    if a.whisper and (importlib.util.find_spec("faster_whisper") or importlib.util.find_spec("whisper")):
        try:
            pal = palabras_whisper(video, a.modelo)
            if pal:
                t_voz = sum(max(0.0, f - i) for i, f in pal)
                span = pal[-1][1] - pal[0][0]
                s["habla"] = {"palabras": len(pal), "palabras_por_s_hablando": round(len(pal) / max(t_voz, 1e-6), 2), "palabras_por_s_total": round(len(pal) / max(span, 1e-6), 2), "fuente": "Whisper (solo tiempos; el texto no se guarda)"}
                ritmo = s["habla"]["palabras_por_s_total"]
        except (Exception, SystemExit) as e:  # noqa: BLE001
            s["habla_error"] = str(e)[-200:]
    if ritmo is None:
        sil_s, t_voz = silabas_por_s(mono, ventanas) if ventanas else (None, 0.0)
        if sil_s:
            s["habla"] = {"picos_por_s": round(sil_s, 2), "palabras_por_s_estimado": round(sil_s * PICOS_A_PALABRAS, 2), "fuente": "estimado por picos de la envolvente; ±30 %"}
            ritmo = s["habla"]["palabras_por_s_estimado"]
    s["palabras_por_s"] = ritmo
    # Pulso y sincronía con los cortes
    try:
        sub = sg.decimate(mono, 3, zero_phase=True)
        p = pulso(sub, rv.SR // 3)
    except Exception:  # noqa: BLE001
        p = None
    s["pulso"] = {k: v for k, v in (p or {}).items() if k != "pulsos"} or None
    s["sincronia_cortes_pulso"] = sincronia(planos_front, p)
    return s, mono


# ---------------------------------------------------------------------------------------------------------------- análisis


def analizar(video, a, etiqueta="referencia"):
    t0 = time.time()
    video = Path(video)
    info = vv.probe(video)
    v0 = [s for s in info["streams"] if s["codec_type"] == "video"][0]
    ancho, alto = int(v0["width"]), int(v0["height"])
    n_, d_ = map(int, v0["r_frame_rate"].split("/"))
    fps = n_ / d_
    dur = float(info["format"]["duration"])
    ign = None
    if a.ignorar:
        y0, y1 = (float(z) for z in a.ignorar.split("-"))
        ign = (y0, y1)
    c = rv.leer_cuadros(video, ancho, alto, ign)
    nf = len(c["media"])
    fps_r = nf / dur if dur else fps
    tot = c["bandas"].mean(1) * 100
    negro = (c["media"] <= 3) & (c["std"] <= 2.5)
    vacio = (tot < rv.UMBRALES["vacio_contenido_pct"]) & ~negro
    planos, fronteras, _ = rv.detectar_planos(c["dif"], c["mini"], fps_r, vacio | negro)
    dif = c["dif"]
    mov = np.minimum(dif, 12)
    muestras = muestrear(video, ancho, alto, ign)
    for i, pl in enumerate(planos):
        a0, a1 = int(pl["inicio"] * fps_r), max(int(pl["inicio"] * fps_r) + 1, int(pl["fin"] * fps_r))
        pl["n"] = i + 1
        pl["movimiento"] = round(float(mov[a0:a1].mean()), 2)
        m = (muestras["t"] >= pl["inicio"]) & (muestras["t"] < pl["fin"])
        if not m.any():
            m = np.abs(muestras["t"] - (pl["inicio"] + pl["fin"]) / 2) == np.abs(muestras["t"] - (pl["inicio"] + pl["fin"]) / 2).min()
        pl["densidad_texto_pct"] = round(float(muestras["texto"][m].mean() * 100), 1)
        pl["ocupacion_pct"] = round(float(muestras["ocupacion"][m].mean() * 100), 0)
        pl.update(ficha_color(muestras["hist"][m].sum(0)))
    durs = np.array([p["dur"] for p in planos])
    n = len(planos)
    cortes = [p["inicio"] for p in planos[1:]]
    # Forma del ritmo
    forma = "parejo"
    if n >= 4:
        t3 = max(1, n // 3)
        ini, fin = durs[:t3].mean(), durs[-t3:].mean()
        cv = float(durs.std() / durs.mean())
        if fin <= 0.65 * ini:
            forma = "acelera"
        elif fin >= 1.5 * ini:
            forma = "frena"
        elif cv >= 0.6:
            forma = "golpes y respiros"
    ritmo = {"planos": n, "cortes_por_minuto": round(len(cortes) / dur * 60, 1) if dur else 0, "duracion_media_s": round(float(durs.mean()), 2), "mediana_s": round(float(np.median(durs)), 2),
             "mas_corto_s": round(float(durs.min()), 2), "mas_largo_s": round(float(durs.max()), 2), "variacion": round(float(durs.std() / durs.mean()), 2) if n > 1 else 0.0, "forma": forma,
             "curva_movimiento": [round(float(mov[s * 30: (s + 1) * 30].mean()), 2) for s in range(int(np.ceil(nf / max(1, round(fps_r)))))]}
    ritmo["curva_texto"] = rv.sparkline(ritmo["curva_movimiento"])
    # Gancho: los primeros 3 s
    k3 = min(nf, int(3 * fps_r))
    cambio = np.abs(c["mini"][:k3].astype(np.float32) - c["mini"][0].astype(np.float32)).mean((1, 2))
    primer_cambio = float(np.argmax(cambio >= 1.0) / fps_r) if (cambio >= 1.0).any() else None
    resto = mov[k3:] if nf > k3 else mov
    mov3 = float(mov[:k3].mean())
    cortes3 = [round(x, 2) for x in cortes if x <= 3.0]
    snd, mono = sonido(video, dur, cortes, a)
    gancho = {"cortes_en_3_s": cortes3, "primer_cambio_visible_s": round(primer_cambio, 2) if primer_cambio is not None else None, "movimiento_3_s": round(mov3, 2),
              "movimiento_resto": round(float(resto.mean()), 2), "primer_sonido_s": snd.get("primer_sonido_s"), "primera_voz_s": snd.get("primera_voz_s"),
              "texto_3_s_pct": round(float(muestras["texto"][muestras["t"] <= 3].mean() * 100), 1), "primer_cuadro_desviacion": round(float(c["std"][0]), 1)}
    tags = []
    if gancho["primer_cambio_visible_s"] is not None and gancho["primer_cambio_visible_s"] <= 0.4:
        tags.append("movimiento desde el primer cuadro")
    if cortes3:
        tags.append(f"corte en {cortes3[0]:.1f} s".replace(".", ","))
    if gancho["primera_voz_s"] is not None and gancho["primera_voz_s"] <= 0.5:
        tags.append("voz inmediata")
    elif gancho["primera_voz_s"] is not None and gancho["primera_voz_s"] >= 1.5:
        tags.append(f"la voz entra a {gancho['primera_voz_s']:.1f} s".replace(".", ","))
    if gancho["primer_sonido_s"] is not None and gancho["primer_sonido_s"] >= 0.5:
        tags.append("silencio inicial")
    if gancho["texto_3_s_pct"] >= 6:
        tags.append("mucho texto en los 3 primeros segundos")
    if gancho["movimiento_3_s"] > 1.4 * max(gancho["movimiento_resto"], 0.05):
        tags.append("arranca más movido que el resto")
    elif gancho["movimiento_3_s"] < 0.6 * gancho["movimiento_resto"]:
        tags.append("arranca más quieto que el resto")
    gancho["tipo"] = "; ".join(tags) or "sin rasgo claro"
    # Secciones por color
    seccs = []
    for nombre, a0, a1 in (("inicio", 0, 1 / 3), ("desarrollo", 1 / 3, 2 / 3), ("cierre", 2 / 3, 1.0)):
        m = (muestras["t"] >= a0 * dur) & (muestras["t"] < a1 * dur + 1e-9)
        if m.any():
            f = ficha_color(muestras["hist"][m].sum(0))
            seccs.append({"nombre": nombre, "desde": round(a0 * dur, 1), "hasta": round(a1 * dur, 1), "densidad_texto_pct": round(float(muestras["texto"][m].mean() * 100), 1), **f})
    # Escala
    escala = {"duracion_s": round(dur, 2), "planos": n, "ocupacion_del_contenido_pct": round(float(np.median(muestras["ocupacion"]) * 100), 0), "cobertura_pct": round(float(np.median(muestras["cobertura"]) * 100), 1), "densidad_texto_pct": round(float(muestras["texto"].mean() * 100), 1)}
    escala["tipo"] = "cerrada" if escala["ocupacion_del_contenido_pct"] >= 60 else "media" if escala["ocupacion_del_contenido_pct"] >= 30 else "abierta"
    r = {
        "version": 1, "etiqueta": etiqueta, "archivo": video.name, "bytes": video.stat().st_size,
        "formato": {"ancho": ancho, "alto": alto, "relacion": relacion(ancho, alto), "fps": round(fps, 3), "duracion_s": round(dur, 2), "codec": v0.get("codec_name")},
        "ritmo": ritmo, "planos": planos, "gancho": gancho, "sonido": snd, "secciones": seccs, "escala": escala,
        "estimados": ["voz y música separadas por modulación, no por fuente", "palabras por segundo (±30 % sin --whisper)", "densidad de texto por detalle fino de alto contraste"],
        "tiempo_s": round(time.time() - t0, 1),
    }
    return r


def relacion(w, h):
    r = w / h
    for nombre, v in (("9:16", 9 / 16), ("4:5", 4 / 5), ("1:1", 1.0), ("16:9", 16 / 9), ("21:9", 21 / 9)):
        if abs(r - v) / v < 0.04:
            return nombre
    return f"{w}:{h}"


# --------------------------------------------------------------------------------------------------------- ajustes del panel


def ajustes_panel(r):
    """Ajustes del panel (ids reales de data/*.js) que más se le parecen. Cada decisión lleva su razón."""
    razones = []
    R, G, S = r["ritmo"], r["gancho"], r["sonido"]
    med = R["mediana_s"]
    if R["planos"] <= 1 and r["formato"]["duracion_s"] >= 8:
        ritmo = "secuencia"
    elif med < 1.2:
        ritmo = "frenetico"
    elif med < 3.0:
        ritmo = "vivo"
    elif med < 4.5:
        ritmo = "medio"
    elif med < 7:
        ritmo = "pausado"
    else:
        ritmo = "contemplativo"
    razones.append(("montaje.ritmo", ritmo, f"planos con mediana de {med:.1f} s".replace(".", ",")))
    patron = {"acelera": "acelera", "golpes y respiros": "golpes", "parejo": "constante", "frena": "constante"}[R["forma"]]
    if patron == "constante" and len(S.get("silencios", [])) >= 2:
        patron = "silencio"
    razones.append(("montaje.patron", patron, f"forma del ritmo: {R['forma']}; {len(S.get('silencios', []))} silencio(s)"))
    sc = S.get("sincronia_cortes_pulso", {})
    if sc.get("veredicto") == "los cortes caen en el pulso":
        sinc = "pulso"
    elif (S.get("voz_pct") or 0) >= 30:
        sinc = "voz"
    elif sc.get("pulso_claro"):
        sinc = "frase"
    else:
        sinc = "voz"
    razones.append(("montaje.sincronia", sinc, sc.get("veredicto", "sin pulso medido") + f"; voz {S.get('voz_pct', 0):.0f} % del tiempo"))
    ent = [p["entra_por"] for p in r["planos"][1:]]
    trans = []
    if not ent or "corte" in ent:
        trans.append("corte")
    if "transición" in ent:
        trans.append("curva")
    if "borrado" in ent:
        trans.append("material")
    razones.append(("montaje.transiciones", trans or ["corte"], f"entradas: {', '.join(sorted(set(ent))) or 'ninguna'}"))
    voz = (S.get("voz_pct") or 0) >= 15
    razones.append(("sonido.narracion", bool(voz), f"voz en el {S.get('voz_pct', 0):.0f} % del tiempo"))
    mus = bool(S.get("musica_presente"))
    razones.append(("sonido.musica", "codigo" if mus else "sin", "hay energía de fondo fuera de la voz" if mus else "no se detectó música aparte de la voz"))
    p = S.get("pulso") or {}
    if mus and p.get("autocorrelacion", 0) >= 0.2 and 60 <= p.get("bpm", 0) <= 170:
        razones.append(("sonido.bpm", int(round(p["bpm"])), f"pulso medido a {p['bpm']:.0f} BPM"))
        razones.append(("sonido.animo", "energia" if p["bpm"] >= 118 else "lofi" if p["bpm"] <= 85 else "calido", "por el tempo; el carácter no se oye"))
    if S.get("palabras_por_s") and voz:
        w = S["palabras_por_s"]
        razones.append(("sonido.velocidad", round(max(0.8, min(1.3, w / 3.2)), 2), f"{w:.1f} palabras por segundo contra 3,2 de las voces gratis".replace(".", ",")))
        razones.append(("sonido.intencion", "publicidad" if w >= 3.5 else "noticiero" if w >= 3.0 else "narrador" if w <= 2.3 else "amigo", f"{w:.1f} palabras por segundo".replace(".", ",")))
    razones.append(("sonido.silencios", len(S.get("silencios", [])) >= 1, f"{len(S.get('silencios', []))} silencio(s) real(es)"))
    razones.append(("entrega.formato", r["formato"]["relacion"] if r["formato"]["relacion"] in ("9:16", "4:5", "1:1", "16:9", "21:9") else "9:16", f"el video es {r['formato']['ancho']}x{r['formato']['alto']}"))
    fps = min((24, 25, 30, 50, 60), key=lambda z: abs(z - r["formato"]["fps"]))
    razones.append(("entrega.fps", str(fps), f"el video va a {r['formato']['fps']:g} fps"))
    razones.append(("entrega.duracion", int(max(5, min(600, round(r["formato"]["duracion_s"])))), "la misma duración"))
    ajustes = {}
    for ruta, val, _ in razones:
        d, k = ruta.split(".")
        ajustes.setdefault(d, {})[k] = val
    # Planos con la misma duración que la referencia: solo tiempos y entrada; ningún texto
    tr_unica = [t for t in ajustes["montaje"]["transiciones"] if t != "corte"]
    planos = []
    for p in r["planos"]:
        tr = "corte" if p["entra_por"] in ("inicio", "corte") or not tr_unica else tr_unica[0]
        planos.append({"titulo": f"Plano {p['n']}", "texto": "", "dur": max(0.2, p["dur"]), "tr": tr, "nota": f"Duración y entrada medidas en la referencia ({p['entra_por']}). Sin contenido."})
    # La transición de un plano es la que lo SACA: se corre un lugar
    for i in range(len(planos) - 1):
        planos[i]["tr"] = "corte" if r["planos"][i + 1]["entra_por"] in ("inicio", "corte") or not tr_unica else tr_unica[0]
    planos[-1]["tr"] = "corte"
    ajustes["guion"] = {"notas": "Gramática de una referencia (ritmo, gancho, sonido, escala). No copies imágenes, música, textos, marca ni personas de la referencia. "
                        f"Planos de {f1(R['mediana_s'])} s de mediana, ritmo {R['forma']}; gancho: {G['tipo']}."}
    return ajustes, planos, razones


# ----------------------------------------------------------------------------------------------------------- documentos


def f1(x, u=""):
    if x is None:
        return "n/d"
    return f"{x:.1f}".replace(".", ",") + u


def escribir_md(r, ajustes, razones, hoja, destino):
    R, G, S, E = r["ritmo"], r["gancho"], r["sonido"], r["escala"]
    L = []
    L.append(f"# Referencia: gramática de «{Path(r['archivo']).stem}»\n")
    L.append("> Medido de un archivo local. Esto describe cómo está hecho, no qué dice ni qué muestra. No contiene ni copia imágenes, música, textos, marca ni personas.\n")
    L.append(f"{r['formato']['relacion']} · {r['formato']['ancho']}x{r['formato']['alto']} · {r['formato']['fps']:g} fps · {f1(r['formato']['duracion_s'], ' s')} · {R['planos']} planos · mediana de plano {f1(R['mediana_s'], ' s')} · {f1(R['cortes_por_minuto'])} cortes por minuto.\n")
    L.append("## Qué se conserva y qué no se copia\n")
    L.append("| Se conserva (gramática) | Valor medido | Cómo usarlo |")
    L.append("|---|---|---|")
    L.append(f"| Ritmo | planos de {f1(R['mas_corto_s'])} a {f1(R['mas_largo_s'])} s, mediana {f1(R['mediana_s'])} s; forma: {R['forma']} | `montaje.ritmo` y `montaje.patron`; los planos del encargo llevan estas duraciones |")
    L.append(f"| Tipo de gancho | {G['tipo']} | Misma conducta en los 3 primeros segundos, con tu propio tema |")
    L.append(f"| Estructura | {R['planos']} planos; {len(S.get('silencios', []))} silencio(s); voz {S.get('voz_pct', 0):.0f} % del tiempo | Mismo reparto de planos y de pausas |")
    L.append(f"| Escala | duración {f1(E['duracion_s'], ' s')}; el contenido ocupa {E['ocupacion_del_contenido_pct']:.0f} % del cuadro ({E['tipo']}); texto {f1(E['densidad_texto_pct'], ' %')} (estimado) | Tamaño del sujeto y cantidad de texto parecidos |")
    L.append(f"| Sonido | {f1(S.get('palabras_por_s'))} palabras por segundo (estimado); variación de volumen {f1(S.get('variacion_volumen_db'), ' dB')}; {S.get('sincronia_cortes_pulso', {}).get('veredicto', 'sin pulso')} | `sonido.velocidad`, `montaje.sincronia` |")
    L.append("| Color | solo luminosidad y temperatura por sección (tabla de abajo) | Contraste y temperatura parecidos; **la paleta de tu marca manda** |")
    L.append("| **NO se copia** | imágenes, música, voz, textos y guion, marca y logos, personas, ilustraciones, tipografía | Todo eso lo pones tú, con material propio o con licencia |")
    L.append("")
    L.append("## Planos\n")
    L.append("| N | Desde | Dura | Entra por | Movimiento | Texto % (estimado) | Contenido % | Luminosidad | Temperatura |")
    L.append("|---|---|---|---|---|---|---|---|---|")
    for p in r["planos"]:
        L.append(f"| {p['n']} | {f1(p['inicio'])} s | {f1(p['dur'])} s | {p['entra_por']} | {f1(p['movimiento'])} | {f1(p['densidad_texto_pct'])} | {p['ocupacion_pct']:.0f} | {f1(p.get('luminosidad'))} | {p.get('temperatura')} |")
    L.append("")
    L.append(f"Curva de movimiento por segundo: `{R['curva_texto']}`\n")
    L.append(f"`{hoja}` trae un cuadro por plano, solo para mirar la estructura. No se usa en tu video.\n" if hoja else "")
    L.append("## Primeros 3 segundos\n")
    L.append(f"- Tipo: {G['tipo']}.")
    L.append(f"- Primer cambio visible: {f1(G['primer_cambio_visible_s'], ' s')}. Cortes en 3 s: {len(G['cortes_en_3_s'])}" + (f" ({', '.join(f1(x) for x in G['cortes_en_3_s'])} s)." if G["cortes_en_3_s"] else "."))
    L.append(f"- Movimiento en los 3 s: {f1(G['movimiento_3_s'])}; en el resto: {f1(G['movimiento_resto'])}.")
    L.append(f"- Primer sonido: {f1(G['primer_sonido_s'], ' s')}. Primera voz: {f1(G['primera_voz_s'], ' s')}.\n")
    L.append("## Sonido\n")
    sc = S.get("sincronia_cortes_pulso", {})
    L.append(f"- Voz {S.get('voz_pct', 0):.0f} % del tiempo, solo música {S.get('solo_musica_pct', 0):.0f} %, silencio real {S.get('silencio_total_pct', 0):.0f} %.")
    L.append(f"- Habla: {f1(S.get('palabras_por_s'))} palabras por segundo ({(S.get('habla') or {}).get('fuente', 'sin voz')}).")
    L.append(f"- Pausas de voz: {S.get('pausas_de_voz', {}).get('cantidad', 0)}, mediana {f1(S.get('pausas_de_voz', {}).get('mediana_s'), ' s')}. Silencios reales: {len(S.get('silencios', []))}.")
    L.append(f"- Volumen: {f1(S.get('lufs'), ' LUFS')}, rango {f1(S.get('rango_lu'), ' LU')}, variación a 3 s {f1(S.get('variacion_volumen_db'), ' dB')}.")
    if sc.get("pulso_claro"):
        L.append(f"- Pulso: {sc['bpm']:.0f} BPM; {sc['cortes_en_pulso']} de {sc['cortes']} cortes caen a ±0,08 s de un pulso ({sc['cortes_en_pulso_pct']:.0f} %; por azar sería {sc['azar_pct']:.0f} %): {sc['veredicto']}.")
    else:
        L.append(f"- Pulso: {sc.get('veredicto', 'sin pulso claro en la música')}.")
    L.append("")
    L.append("## Color por sección (solo luminosidad y temperatura)\n")
    L.append("| Sección | Luminosidad | Contraste | Temperatura | Colores dominantes (guía, no copiar) | Texto % |")
    L.append("|---|---|---|---|---|---|")
    for s in r["secciones"]:
        cols = " ".join(f"`{c['hex']}` {c['parte_pct']:.0f} %" for c in s["paleta"][:3])
        L.append(f"| {s['nombre']} ({f1(s['desde'])}–{f1(s['hasta'])} s) | {f1(s['luminosidad'])} | {f1(s['contraste'])} | {s['temperatura']} | {cols} | {f1(s['densidad_texto_pct'])} |")
    L.append("")
    L.append("## Ajustes del panel que más se le parecen\n")
    L.append("`proyecto-referencia.json` los trae. Cada uno con su razón:\n")
    L.append("| Ajuste | Valor | Por qué |")
    L.append("|---|---|---|")
    for ruta, val, razon in razones:
        L.append(f"| `{ruta}` | `{json.dumps(val, ensure_ascii=False)}` | {razon} |")
    L.append("")
    L.append("```bash\nnode ../.claqueta/tools/prompt.mjs proyecto-referencia.json --salida encargo.md\n```\n")
    L.append("Después escribe tu guion, tu tema y tu marca en el encargo: aquí no hay nada de la referencia.\n")
    L.append("## Límites\n")
    for e in r["estimados"]:
        L.append(f"- Estimado: {e}.")
    L.append("- No se oyó el video: el sonido está medido, no escuchado.")
    L.append("- El carácter de la música, el tono de la voz y lo que dice el texto no se miden. Mira `hoja-planos.jpg` para juzgarlos tú.")
    destino.write_text("\n".join(L) + "\n", encoding="utf-8")


def tabla_comparacion(ref, mio):
    """Filas (métrica, referencia, mío, lectura) de ritmo y sonido."""
    def num(d, *ks):
        for k in ks:
            d = d.get(k) if isinstance(d, dict) else None
        return d

    def fila(nombre, a, b, unidad="", menor_es="más lento", mayor_es="más rápido", fmt="{:.1f}"):
        if a is None or b is None:
            return (nombre, "n/d" if a is None else fmt.format(a) + unidad, "n/d" if b is None else fmt.format(b) + unidad, "no se pudo medir (sin pulso claro o sin voz)")
        rel_ = (b - a) / abs(a) if a else (0 if b == 0 else 1)
        lectura = "parecido" if abs(rel_) <= TOL or abs(b - a) < 0.05 else (mayor_es if b > a else menor_es) + f" ({rel_ * 100:+.0f} %)"
        return (nombre, fmt.format(a).replace(".", ",") + unidad, fmt.format(b).replace(".", ",") + unidad, lectura)

    A, B = ref, mio
    filas = [
        fila("Duración", A["formato"]["duracion_s"], B["formato"]["duracion_s"], " s", "más corto", "más largo"),
        fila("Planos", A["ritmo"]["planos"], B["ritmo"]["planos"], "", "menos planos", "más planos", "{:.0f}"),
        fila("Cortes por minuto", A["ritmo"]["cortes_por_minuto"], B["ritmo"]["cortes_por_minuto"], "", "menos cortes", "más cortes"),
        fila("Mediana del plano", A["ritmo"]["mediana_s"], B["ritmo"]["mediana_s"], " s", "planos más cortos (más rápido)", "planos más largos (más lento)"),
        fila("Plano más largo", A["ritmo"]["mas_largo_s"], B["ritmo"]["mas_largo_s"], " s", "más corto", "más largo"),
        fila("Variación de duraciones", A["ritmo"]["variacion"], B["ritmo"]["variacion"], "", "más parejo", "más desigual", "{:.2f}"),
        ("Forma del ritmo", A["ritmo"]["forma"], B["ritmo"]["forma"], "igual" if A["ritmo"]["forma"] == B["ritmo"]["forma"] else "distinta"),
        fila("Primer corte", (A["ritmo"] and (A["planos"][1]["inicio"] if len(A["planos"]) > 1 else None)), (B["planos"][1]["inicio"] if len(B["planos"]) > 1 else None), " s", "corta antes", "corta después"),
        fila("Cortes en los 3 primeros segundos", len(A["gancho"]["cortes_en_3_s"]), len(B["gancho"]["cortes_en_3_s"]), "", "menos cortes al inicio", "más cortes al inicio", "{:.0f}"),
        fila("Movimiento medio", np.mean(A["ritmo"]["curva_movimiento"]), np.mean(B["ritmo"]["curva_movimiento"]), "", "más quieto", "más movido", "{:.2f}"),
        fila("Movimiento en los 3 primeros segundos", A["gancho"]["movimiento_3_s"], B["gancho"]["movimiento_3_s"], "", "arranca más quieto", "arranca más movido", "{:.2f}"),
        fila("Primer cambio visible", A["gancho"]["primer_cambio_visible_s"], B["gancho"]["primer_cambio_visible_s"], " s", "cambia antes", "cambia después", "{:.2f}"),
        fila("Primera voz", A["gancho"]["primera_voz_s"], B["gancho"]["primera_voz_s"], " s", "la voz entra antes", "la voz entra después", "{:.2f}"),
        fila("Voz del tiempo", num(A, "sonido", "voz_pct"), num(B, "sonido", "voz_pct"), " %", "menos voz", "más voz", "{:.0f}"),
        fila("Palabras por segundo", num(A, "sonido", "palabras_por_s"), num(B, "sonido", "palabras_por_s"), "", "habla más lento", "habla más rápido"),
        fila("Silencios reales", len(A["sonido"].get("silencios", [])), len(B["sonido"].get("silencios", [])), "", "menos silencios", "más silencios", "{:.0f}"),
        fila("Variación de volumen", num(A, "sonido", "variacion_volumen_db"), num(B, "sonido", "variacion_volumen_db"), " dB", "volumen más parejo", "más dinámico"),
        fila("Pulso de la música", *(num(X, "sonido", "pulso", "bpm") if num(X, "sonido", "sincronia_cortes_pulso", "pulso_claro") else None for X in (A, B)), " BPM", "más lento", "más rápido", "{:.0f}"),
        fila("Cortes en el pulso", *(num(X, "sonido", "sincronia_cortes_pulso", "cortes_en_pulso_pct") if num(X, "sonido", "sincronia_cortes_pulso", "pulso_claro") else None for X in (A, B)), " %", "menos sincronizado", "más sincronizado", "{:.0f}"),
        fila("Texto en pantalla (estimado)", A["escala"]["densidad_texto_pct"], B["escala"]["densidad_texto_pct"], " %", "menos texto", "más texto"),
        fila("Ocupación del contenido", A["escala"]["ocupacion_del_contenido_pct"], B["escala"]["ocupacion_del_contenido_pct"], " %", "sujeto más pequeño", "sujeto más grande", "{:.0f}"),
    ]
    return filas


def md_comparacion(filas, ref, mio):
    L = [f"# Comparación de ritmo: «{Path(mio['archivo']).stem}» contra la referencia\n", "Una fila por medida. «Parecido» es una diferencia de menos del 20 %.\n",
         "| Medida | Referencia | Mío | Lectura |", "|---|---|---|---|"]
    for n, a, b, l in filas:
        L.append(f"| {n} | {a} | {b} | {l} |")
    L.append("")
    dist = [f for f in filas if not f[3].startswith(("parecido", "igual", "no se pudo medir"))]
    parecidas = sum(1 for f in filas if f[3].startswith(("parecido", "igual")))
    L.append(f"{parecidas} de {len(filas)} medidas son parecidas. Lo que más se aleja: " + (", ".join(f"{f[0].lower()} ({f[3]})" for f in dist[:5]) or "nada") + ".\n")
    L.append("Lo que no se compara: imágenes, música, voz, textos y marca. Esta tabla solo dice qué tan parecido es el ritmo.")
    return "\n".join(L) + "\n"


# ------------------------------------------------------------------------------------------------------------------- main


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("video", help="Archivo local de la referencia. No se baja nada")
    p.add_argument("--salida", default="referencia")
    p.add_argument("--comparar", help="Tu video, para comparar su ritmo con la referencia")
    p.add_argument("--ignorar", help="Banda de alturas en píxeles que no cuenta (subtítulos de la referencia), como 1300-1540")
    p.add_argument("--whisper", action="store_true", help="Cuenta palabras con faster-whisper en vez de estimarlas. Descarta el texto")
    p.add_argument("--modelo", default="base")
    a = p.parse_args()
    video = Path(a.video)
    if not video.is_file() or video.stat().st_size == 0:
        sys.exit(f"Error: no existe o está vacío: {video}. Pasa un archivo local; esta herramienta no baja nada")
    if re.match(r"^[a-z]+://", a.video):
        sys.exit("Error: esta herramienta solo lee archivos locales")
    salida = Path(a.salida)
    salida.mkdir(parents=True, exist_ok=True)
    try:
        r = analizar(video, a)
    except (ValueError, subprocess.CalledProcessError, KeyError) as e:
        sys.exit(f"Error: no se pudo analizar {video}: {e}")
    ajustes, planos_panel, razones = ajustes_panel(r)
    r["ajustes_panel"] = {"ajustes": {d: v for d, v in ajustes.items()}, "razones": [{"ajuste": a_, "valor": v, "razon": z} for a_, v, z in razones]}
    centros = [round((q["inicio"] + q["fin"]) / 2, 2) for q in r["planos"]][:30]
    hoja = rv.hoja_de_tiempos(video, centros, salida / "hoja-planos.jpg")
    proyecto = dict(ajustes)
    proyecto["planos"] = planos_panel
    (salida / "proyecto-referencia.json").write_text(json.dumps(proyecto, ensure_ascii=False, indent=1), encoding="utf-8")
    (salida / "referencia.json").write_text(json.dumps(r, ensure_ascii=False, indent=1, default=float), encoding="utf-8")
    escribir_md(r, ajustes, razones, hoja.name if hoja else None, salida / "REFERENCIA.md")
    resultado = {"ok": True, "archivos": {"referencia": rv.rel(salida / "REFERENCIA.md"), "json": rv.rel(salida / "referencia.json"), "proyecto": rv.rel(salida / "proyecto-referencia.json"), "hoja": rv.rel(hoja) if hoja else None},
                 "resumen": {"formato": r["formato"]["relacion"], "duracion_s": r["formato"]["duracion_s"], "planos": r["ritmo"]["planos"], "mediana_s": r["ritmo"]["mediana_s"], "forma": r["ritmo"]["forma"], "gancho": r["gancho"]["tipo"], "palabras_por_s": r["sonido"].get("palabras_por_s"), "ritmo_sugerido": ajustes["montaje"]["ritmo"]},
                 "siguiente": "node ../.claqueta/tools/prompt.mjs " + rv.rel(salida / "proyecto-referencia.json") + " --salida encargo.md"}
    if a.comparar:
        mio = Path(a.comparar)
        if not mio.is_file():
            sys.exit(f"Error: no existe {mio}")
        m = analizar(mio, a, "mío")
        filas = tabla_comparacion(r, m)
        (salida / "comparacion.md").write_text(md_comparacion(filas, r, m), encoding="utf-8")
        (salida / "comparacion.json").write_text(json.dumps([{"medida": n, "referencia": x, "mio": y, "lectura": z} for n, x, y, z in filas], ensure_ascii=False, indent=1), encoding="utf-8")
        resultado["comparacion"] = {"archivo": rv.rel(salida / "comparacion.md"), "filas": [{"medida": n, "referencia": x, "mio": y, "lectura": z} for n, x, y, z in filas]}
    resultado["tiempo_s"] = round(r["tiempo_s"], 1)
    print(json.dumps(resultado, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
