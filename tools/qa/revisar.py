#!/usr/bin/env python3
"""Toda la revisión de un video en un comando: lo que una IA que no oye y solo ve cuadros sueltos necesita para decidir si entrega.

Uso:
  python ../.claqueta/tools/qa/revisar.py renders/final.mp4 --duracion 30
  python ../.claqueta/tools/qa/revisar.py renders/final.mp4 --duracion 64.5 --ignorar 1300-1540 --fondo-oscuro
  python ../.claqueta/tools/qa/revisar.py renders/final.mp4 --silencios-min 2 --quieto 3.5 --salida renders/revision
  python ../.claqueta/tools/qa/revisar.py renders/final.mp4 --hyperframes      (cruza los cortes con `hyperframes measure cuts`)

Imprime un JSON con `ok`, `fallos` (impiden entregar), `avisos` (hay que mirarlos), `mirar` (segundo, razón e imagen de cada momento
sospechoso), `preguntas` (lo que solo un ojo puede juzgar) y `no_comprobado`. Termina con error si hay fallos.
En --salida (por defecto renders/revision/) deja: hoja.jpg (hoja de cuadros), hoja-planos.jpg (un cuadro por plano), una tira por
momento sospechoso (siete cuadros, uno cada 0,2 s) y revision.json, que lee tools/entrega.py.

Mide, sin oído y sin pagar nada:
  Técnica   resolución, fps, duración, -14 LUFS, pico verdadero bajo -1 dBTP, H.264 yuv420p (tools/qa/verificar_video.py).
  Imagen    primer cuadro con imagen, cuadros negros o vacíos, tramos congelados, curva de movimiento por segundo, planos y su
            duración, planos todos iguales, tramos sin nada nuevo (ningún borde aparece ni desaparece en más de 4 s), primer segundo
            sin cambio, franjas casi vacías sostenidas y saltos bruscos que no son un corte (tools/qa/saltos.py).
  Sonido    energía bajo 120 Hz (en un teléfono no suena), voz bajo la música mientras se habla, densidad de efectos, efectos sobre
            una palabra, silencios reales, clipping, cola de silencio, y la voz contra el guion con tools/qa/comparar_voz.py.
Lee del proyecto, si existen: assets/tiempos.json (voz y palabras: ver tools/pista.py), efectos.json y guion.txt.

Límites que conviene saber:
  - Un fondo casi negro legítimo no es un cuadro negro: negro es luminancia ~0 y sin textura. Con --fondo-oscuro, un cuadro sin nada
    puede durar 1 s antes de avisar (por defecto 0,25 s). Con la voz y la música mezcladas, «voz bajo la música» es una estimación.
  - Los planos se cuentan por cortes secos, por transiciones que cambian casi todo el contenido y por borrados; una cámara que se
    mueve en un solo plano no los parte. Una animación que mete elementos en pantalla no es un plano nuevo. El hueco vacío entre dos
    escenas se pega al plano que termina.
  - Tiempo: unos 15 s de proceso por cada minuto de video, sin Whisper. --hyperframes añade 10 a 20 s y pide npx.
  - --ignorar deja fuera la banda de subtítulos (en píxeles del video): sus cambios no cuentan como movimiento ni como contenido.
  - Una máquina no puede juzgar tamaño del sujeto, recortes, tildes, contraste ni subtítulos sobre el sujeto: van en `preguntas`.
Necesita numpy, scipy y ffmpeg. Whisper (faster-whisper) y Pillow son opcionales: sin ellos lo dice en `no_comprobado`.
"""
import argparse
import importlib.util
import json
import re
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import numpy as np
from scipy import signal as sg
from scipy.ndimage import maximum_filter1d, uniform_filter1d

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
import verificar_video as vv  # noqa: E402

_loud = vv.loudness
_cache_loud = {}


def _loudness_una_vez(ruta):
    """verificar() y medidas() miden el volumen cada una; con un video largo eso cuesta 13 s. Se mide una vez."""
    k = str(ruta)
    if k not in _cache_loud:
        _cache_loud[k] = _loud(ruta)
    return _cache_loud[k]


vv.loudness = _loudness_una_vez

NB = 32  # bandas horizontales para medir contenido
NOV_K = 6  # cuadros atrás con los que se compara lo nuevo
LARGO = 256  # lado largo del cuadro de análisis
SR = 48000
FORMATOS = {(1080, 1920), (1920, 1080), (1080, 1080), (1080, 1350)}
UMBRALES = {
    "negro_luma": 3.0, "negro_std": 2.5, "vacio_contenido_pct": 2.5, "liso_std": 4.0, "casi_liso_std": 8.0,
    "quieto_dif": 0.06, "novedad_evento_pct": 0.4, "gancho_cambio": 1.0, "plano_min_s": 0.8, "planos_iguales_cv": 0.15,
    "franja_vacia_pct_alto": 12.0, "franja_vacia_pct_tiempo": 65.0, "graves_aviso_pct": 45.0, "graves_fallo_pct": 70.0,
    "silencio_dbfs": -50.0, "cola_aviso_s": 1.2, "voz_contraste_db": 10.0, "voz_sobre_pausas_db": 4.0, "efectos_por_segundo": 1,
}


# ----------------------------------------------------------------------------------------------------------------- utilidades


def correr(args, **kw):
    return subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="replace", **kw)


def rutas(video, a):
    """Carpetas donde buscar los archivos del proyecto: la actual, la del proyecto indicado y la que contiene renders/."""
    base = [Path(a.proyecto)] if a.proyecto else [Path.cwd()]
    return base + [video.resolve().parent.parent, video.resolve().parent]


def buscar(carpetas, rel):
    for c in carpetas:
        if (c / rel).is_file():
            return c / rel
    return None


def leer_json(ruta, defecto):
    try:
        return json.loads(Path(ruta).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return defecto


def segmentos(mascara):
    """Tramos consecutivos de True como (inicio, fin) con fin exclusivo."""
    m = np.concatenate([[False], np.asarray(mascara, bool), [False]])
    d = np.diff(m.astype(np.int8))
    return list(zip(np.flatnonzero(d == 1), np.flatnonzero(d == -1)))


def rel(p):
    """Ruta como texto con barras, relativa a donde corres si se puede."""
    p = Path(p)
    try:
        return p.resolve().relative_to(Path.cwd().resolve()).as_posix()
    except ValueError:
        return p.as_posix()


def seg(t):
    return f"{t:.1f}".replace(".", ",") + " s"


def sparkline(v, n=60):
    if len(v) == 0:
        return ""
    v = np.asarray(v, float)
    if len(v) > n:
        v = np.array([c.mean() for c in np.array_split(v, n)])
    x = np.log1p(v)
    top = max(float(x.max()), 1e-9)
    return "".join("▁▂▃▄▅▆▇█"[min(7, int(round(c / top * 7)))] for c in x)


# --------------------------------------------------------------------------------------------------------------------- imagen


def leer_cuadros(ruta, ancho, alto, ignorar=None):
    """Un solo paso por el video, a poca resolución. Devuelve lo que necesitan todas las medidas de imagen."""
    if alto >= ancho:
        H, W = LARGO, max(8, int(round(LARGO * ancho / alto)))
    else:
        W, H = LARGO, max(8, int(round(LARGO * alto / ancho)))
    filas_ign = None
    if ignorar:
        y0, y1 = ignorar
        filas_ign = (int(max(0, y0) / alto * H), int(np.ceil(min(alto, y1) / alto * H)))
    idx = np.linspace(0, H, NB + 1).astype(int)
    cuenta = np.diff(idx)
    p = subprocess.Popen(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(ruta), "-an", "-fps_mode", "passthrough",
                          "-vf", f"scale={W}:{H}:flags=area,format=rgb24", "-f", "rawvideo", "-"], stdout=subprocess.PIPE)
    tam = W * H * 3
    sal = {k: [] for k in ("media", "std", "dif", "bandas", "bstd", "mini", "nov")}
    previo = None
    cola = None  # bordes de los últimos cuadros del bloque anterior, para medir lo nuevo contra 6 cuadros atrás
    while True:
        buf = p.stdout.read(tam * 60)
        if not buf:
            break
        n = len(buf) // tam
        if n == 0:
            break
        x = np.frombuffer(buf[: n * tam], np.uint8).reshape(n, H, W, 3)
        g = x[..., 0] * 0.299 + x[..., 1] * 0.587 + x[..., 2] * 0.114
        g = g.astype(np.float32)
        sal["media"].append(g.mean((1, 2)))
        sal["std"].append(g.std((1, 2)))
        if filas_ign:
            g[:, filas_ign[0]:filas_ign[1], :] = 0
        ref = np.concatenate([previo[None] if previo is not None else g[:1], g[:-1]])
        sal["dif"].append(np.abs(g - ref).mean((1, 2)))
        previo = g[-1].copy()
        gx = np.abs(np.diff(g, axis=2))[:, :-1, :]
        gy = np.abs(np.diff(g, axis=1))[:, :, :-1]
        E = (gx > 8) | (gy > 8)
        todos = E if cola is None else np.concatenate([cola, E])
        cola = todos[-NOV_K:]
        nov = np.zeros(n, np.float32)
        if len(todos) > NOV_K:
            x_ = np.logical_xor(todos[NOV_K:], todos[:-NOV_K]).mean((1, 2)).astype(np.float32)
            nov[n - len(x_):] = x_
        sal["nov"].append(nov)
        borde = E.mean(2)
        borde = np.concatenate([borde, borde[:, -1:]], axis=1)
        sal["bandas"].append(np.add.reduceat(borde, idx[:-1], axis=1) / cuenta)
        s1 = np.add.reduceat(g.sum(2), idx[:-1], axis=1)
        s2 = np.add.reduceat((g ** 2).sum(2), idx[:-1], axis=1)
        m = s1 / (cuenta * W)
        sal["bstd"].append(np.sqrt(np.maximum(s2 / (cuenta * W) - m ** 2, 0)))
        h4, w4 = H // 4, W // 4
        sal["mini"].append(g[:, : h4 * 4, : w4 * 4].reshape(n, h4, 4, w4, 4).mean((2, 4)).astype(np.uint8))
    p.wait()
    if not sal["media"]:
        raise ValueError("no se pudo decodificar ningún cuadro")
    c = {k: np.concatenate(v) for k, v in sal.items()}
    c["H"], c["W"] = H, W
    return c


def bordes_mini(mini):
    g = mini.astype(np.float32)
    gx = np.abs(np.diff(g, axis=2))[:, :-1, :]
    gy = np.abs(np.diff(g, axis=1))[:, :, :-1]
    return ((gx > 10) | (gy > 10)).reshape(len(mini), -1)


def disimilitud(mini, fps, w=8):
    """1 - IoU entre los bordes de t-w y t+w: cerca de 1 cuando casi todo el contenido es otro (corte, borrado, cambio de escena)."""
    E = bordes_mini(mini)
    n = len(E)
    a = E[np.maximum(0, np.arange(n) - w)]
    b = E[np.minimum(n - 1, np.arange(n) + w)]
    union = (a | b).sum(1)
    inter = (a & b).sum(1)
    return np.where(union > 20, 1 - inter / np.maximum(union, 1), 0.0)


def detectar_planos(dif, mini, fps, vacio=None, minimo_s=None):
    """Planos: tramos entre cortes secos, transiciones que cambian casi todo el contenido y borrados.

    Un tramo vacío entre dos escenas (el hueco de una transición) se pega al plano que termina: no cuenta como plano.
    Devuelve (planos, fronteras, cortes_secos_sin_filtrar).
    """
    minimo_s = minimo_s or UMBRALES["plano_min_s"]
    n = len(dif)
    dis = uniform_filter1d(disimilitud(mini, fps), 3)
    cand = []
    for i in range(n):
        vec = np.concatenate([dif[max(0, i - 8): i], dif[i + 1: i + 9]])
        base = max(float(np.median(vec)) if len(vec) else 0.3, 0.3)
        if dif[i] > 6 * base and dif[i] >= 8:
            cand.append((i, 2.0 + float(dif[i]), "corte"))
    pk, _ = sg.find_peaks(dis, height=0.8, distance=max(1, int(fps * 0.6)))
    cand += [(int(i), float(dis[i]), "transición") for i in pk]
    # Borrado: casi todo el contenido desaparece (pizarra que se borra, escena que sale).
    bordes = uniform_filter1d(bordes_mini(mini).sum(1).astype(np.float32), 3)
    previo = np.concatenate([np.full(int(fps), bordes[0]), maximum_filter1d(bordes, size=int(fps))[:-int(fps)]]) if n > int(fps) else bordes
    razon = bordes / np.maximum(previo, 1)
    for i, j in segmentos((razon < 0.45) & (previo - bordes > 100)):
        cand.append((int(i), 1.0 - float(razon[i:j].min()), "borrado"))
    cand.sort()
    crudos = [c[0] / fps for c in cand if c[2] == "corte"]
    unidas = []
    for c in cand:
        if unidas and c[0] - unidas[-1][0] < fps * 0.6:
            if c[2] == "corte" and unidas[-1][2] != "corte" or (c[2] == unidas[-1][2] and c[1] > unidas[-1][1]):
                unidas[-1] = c
            continue
        unidas.append(c)
    if vacio is not None:
        # Las fronteras que caen dentro de un hueco vacío, o justo antes, se mueven a donde termina el hueco.
        movidas = []
        for f in unidas:
            nueva = f
            for i, j in segmentos(vacio):
                if i - fps * 0.4 <= f[0] <= j:
                    nueva = (j, f[1], f[2])
                    break
            if movidas and nueva[0] - movidas[-1][0] < fps * 0.6:
                continue
            movidas.append(nueva)
        unidas = movidas
    front = [f for f in unidas if f[0] / fps > minimo_s * 0.5 and (n - f[0]) / fps > minimo_s * 0.5]
    cambio = True
    while cambio and len(front) > 0:
        cambio = False
        marcas = [0] + [f[0] for f in front] + [n]
        for k in range(len(marcas) - 1):
            if (marcas[k + 1] - marcas[k]) / fps < minimo_s:
                if k == 0:
                    quitar = 0
                elif k == len(marcas) - 2:
                    quitar = len(front) - 1
                else:
                    quitar = k - 1 if front[k - 1][1] <= front[k][1] else k
                front.pop(quitar)
                cambio = True
                break
    marcas = [0] + [f[0] for f in front] + [n]
    tipos = ["inicio"] + [f[2] for f in front]
    planos = [{"inicio": round(marcas[k] / fps, 2), "fin": round(marcas[k + 1] / fps, 2), "dur": round((marcas[k + 1] - marcas[k]) / fps, 2), "entra_por": tipos[k]} for k in range(len(marcas) - 1)]
    return planos, [f[0] / fps for f in front], crudos


def franjas_vacias(c, fps, alto_px, ignorar=None):
    """Bandas contiguas del cuadro casi vacías la mayor parte del tiempo. La banda de arriba, hasta 15 % del alto, es zona segura."""
    vacio = (c["bandas"] < 0.003) & (c["bstd"] < 4)
    pct = vacio.mean(0) * 100
    sostenida = pct >= UMBRALES["franja_vacia_pct_tiempo"]
    if ignorar:
        # Esa banda se borró antes de medir: vacía sale siempre, y no dice nada del cuadro.
        sostenida[int(max(0, ignorar[0]) / alto_px * NB) : int(np.ceil(min(alto_px, ignorar[1]) / alto_px * NB))] = False
    res = []
    for a, b in segmentos(sostenida):
        alto_pct = (b - a) / NB * 100
        arriba = a == 0
        if (arriba and alto_pct >= 22) or (not arriba and alto_pct >= UMBRALES["franja_vacia_pct_alto"]):
            todas = vacio[:, a:b].all(1)
            runs = segmentos(todas)
            mejor = max(runs, key=lambda r: r[1] - r[0]) if runs else (0, 1)
            res.append({"y_desde": int(round(a / NB * alto_px)), "y_hasta": int(round(b / NB * alto_px)), "alto_pct": round(alto_pct, 1),
                        "tiempo_vacia_pct": round(float(pct[a:b].mean()), 1), "segundo_ejemplo": round(((mejor[0] + mejor[1]) / 2) / fps, 2)})
    return res


def analizar_imagen(c, fps, a, ancho, alto):
    n = len(c["media"])
    dur = n / fps
    media, std, dif = c["media"], c["std"], c["dif"]
    tot = c["bandas"].mean(1) * 100
    fallos, avisos, momentos = [], [], []
    m = {"cuadros": n, "fps_medido": round(fps, 3), "luma_mediana": round(float(np.median(media)), 1)}
    # Primer cuadro
    if media[0] <= UMBRALES["negro_luma"] and std[0] <= UMBRALES["negro_std"]:
        fallos.append("imagen: el primer cuadro está negro; las redes lo usan de portada y no dice nada")
        momentos.append((10, 0.0, "primer cuadro negro"))
    elif std[0] < UMBRALES["liso_std"]:
        fallos.append(f"imagen: el primer cuadro está liso (desviación {std[0]:.1f}); sin imagen en la portada ni en el gancho")
        momentos.append((10, 0.0, f"primer cuadro liso (desviación {std[0]:.1f})"))
    elif std[0] < UMBRALES["casi_liso_std"]:
        avisos.append(f"imagen: el primer cuadro casi no tiene imagen (desviación {std[0]:.1f}): mira si dice de qué trata")
        momentos.append((8, 0.0, f"primer cuadro casi liso (desviación {std[0]:.1f})"))
    con_imagen = np.flatnonzero(std >= UMBRALES["casi_liso_std"])
    m["primer_cuadro"] = {"luma": round(float(media[0]), 1), "desviacion": round(float(std[0]), 1), "con_imagen_desde_s": round(float(con_imagen[0] / fps), 2) if len(con_imagen) else None}
    # Gancho: ¿cambia algo en el primer segundo?
    k1 = min(n, int(fps) + 1)
    cambio1 = float(np.abs(c["mini"][:k1].astype(np.float32) - c["mini"][0].astype(np.float32)).mean((1, 2)).max()) if n > 1 else 0.0
    m["cambio_primer_segundo"] = round(cambio1, 2)
    if dur > 2 and cambio1 < UMBRALES["gancho_cambio"]:
        avisos.append("imagen: el primer segundo no cambia nada visible; el gancho no empieza")
        momentos.append((6, 0.5, "primer segundo sin cambio visible"))
    # Cuadros negros y vacíos
    negro = (media <= UMBRALES["negro_luma"]) & (std <= UMBRALES["negro_std"])
    negros = [(i, j) for i, j in segmentos(negro) if i > 0]
    m["cuadros_negros"] = int(negro.sum())
    for i, j in negros:
        d = (j - i) / fps
        txt = f"imagen: {j - i} cuadro(s) negros en {seg(i / fps)} ({d:.2f} s)"
        if d >= 0.5 and j < n:
            fallos.append(txt + ": un negro largo no es un fundido")
        elif j < n:
            avisos.append(txt + ": si no es un fundido a negro pensado, es un fallo de render")
        else:
            avisos.append(txt.replace("negros", "negros al final") + ": ¿fundido de salida?")
        momentos.append((9 if d >= 0.5 else 7, i / fps, f"cuadros negros ({d:.2f} s)"))
    vacio = (tot < UMBRALES["vacio_contenido_pct"]) & ~negro
    tol = 1.0 if a.fondo_oscuro else 0.25
    vacios = [(i, j) for i, j in segmentos(vacio) if (j - i) / fps >= tol and i > 0]
    if vacios:
        largo = max(vacios, key=lambda r: r[1] - r[0])
        lista = ", ".join(f"{seg(i / fps)} ({(j - i) / fps:.1f} s)" for i, j in vacios[:6]) + (" …" if len(vacios) > 6 else "")
        avisos.append(f"imagen: {len(vacios)} tramo(s) con el cuadro casi vacío (solo fondo y subtítulos): {lista}. El más largo dura {(largo[1] - largo[0]) / fps:.1f} s; las transiciones no deben pasar por cuadros vacíos")
    for i, j in vacios:
        momentos.append((5 + min(2.0, (j - i) / fps), (i + j) / 2 / fps, f"cuadro casi vacío {(j - i) / fps:.1f} s"))
    m["tramos_vacios"] = [{"desde": round(i / fps, 2), "hasta": round(j / fps, 2)} for i, j in vacios]
    # Congelado y sin novedad
    nov = c["nov"] * 100  # % de bordes que aparecen o desaparecen respecto de 6 cuadros atrás
    quieto_s = a.quieto
    cong = [(i, j) for i, j in segmentos((dif < UMBRALES["quieto_dif"]) & (nov < 0.1)) if (j - i) / fps >= quieto_s]
    if cong:
        lista = ", ".join(f"{seg(i / fps)} a {seg(j / fps)}" for i, j in cong[:5])
        avisos.append(f"imagen: la imagen no cambia en nada (ni un borde) durante más de {quieto_s:g} s: {lista}. ¿Render congelado o pausa pensada?")
    for i, j in cong:
        momentos.append((7, (i + j) / 2 / fps, f"imagen sin cambios {(j - i) / fps:.1f} s"))
    m["tramos_congelados"] = [{"desde": round(i / fps, 2), "hasta": round(j / fps, 2)} for i, j in cong]
    ev = np.flatnonzero(nov >= UMBRALES["novedad_evento_pct"])
    pts = np.concatenate([[0], ev, [n - 1]])
    sn = [(int(x), int(y)) for x, y in zip(pts[:-1], pts[1:]) if (y - x) / fps >= a.sin_novedad]
    sn = [(i, j) for i, j in sn if not any(max(i, x) < min(j, y) and (min(j, y) - max(i, x)) > 0.5 * (j - i) for x, y in cong)]
    if sn:
        lista = ", ".join(f"{seg(i / fps)} a {seg(j / fps)}" for i, j in sn[:5]) + (" …" if len(sn) > 5 else "")
        avisos.append(f"imagen: {len(sn)} tramo(s) de más de {a.sin_novedad:g} s donde no pasa nada nuevo (ni aparece ni cambia contenido): {lista}")
    for i, j in sn:
        momentos.append((4, (i + j) / 2 / fps, f"{(j - i) / fps:.1f} s sin nada nuevo"))
    m["tramos_sin_novedad"] = [{"desde": round(i / fps, 2), "hasta": round(j / fps, 2)} for i, j in sn]
    # Cuadros repetidos en pleno movimiento (la animación va a tirones)
    rep = [i for i in range(2, n - 2) if dif[i] < 0.01 and min(dif[i - 2], dif[i - 1], dif[i + 1], dif[i + 2]) > 0.5]
    m["cuadros_repetidos_en_movimiento"] = len(rep)
    if len(rep) >= 3:
        avisos.append(f"imagen: {len(rep)} cuadros idénticos al anterior en pleno movimiento (primero en {seg(rep[0] / fps)}): la animación puede ir a tirones")
        momentos.append((5, rep[0] / fps, "cuadro repetido en movimiento"))
    # Curva de movimiento por segundo
    cur = [float(np.minimum(dif[s * int(round(fps)): (s + 1) * int(round(fps))], 12).mean()) for s in range(int(np.ceil(n / round(fps))))]
    m["curva_movimiento"] = [round(v, 2) for v in cur]
    m["curva_texto"] = sparkline(cur)
    # Planos
    planos, fronteras, crudos = detectar_planos(dif, c["mini"], fps, vacio | negro)
    durs = np.array([p["dur"] for p in planos])
    est = {"cantidad": len(planos), "duracion_media_s": round(float(durs.mean()), 2), "mas_corto_s": round(float(durs.min()), 2), "mas_largo_s": round(float(durs.max()), 2)}
    if len(planos) >= 3:
        cv = float(durs.std() / durs.mean())
        est["variacion"] = round(cv, 2)
        if len(planos) >= 4 and cv < UMBRALES["planos_iguales_cv"]:
            avisos.append(f"imagen: {len(planos)} planos y todos duran casi lo mismo ({durs.min():.1f}–{durs.max():.1f} s): un montaje con todos los planos iguales se siente generado")
            momentos.append((3, planos[1]["inicio"], "planos de duración casi igual"))
    est["planos"] = planos
    est["cortes_secos"] = [round(x, 2) for x in crudos]
    m["planos"] = est
    # Franjas casi vacías sostenidas
    ign = tuple(float(z) for z in a.ignorar.split("-")) if getattr(a, "ignorar", None) else None
    fr = franjas_vacias(c, fps, alto, ign)
    m["franjas_casi_vacias"] = fr
    for f in fr:
        avisos.append(f"imagen: la franja de y {f['y_desde']} a {f['y_hasta']} ({f['alto_pct']:.0f} % del alto) está casi vacía el {f['tiempo_vacia_pct']:.0f} % del tiempo: el mundo debe llenar el cuadro completo")
        # Su imagen es un cuadro entero (se crea en main), no una tira.
    m["fondo_oscuro"] = {"declarado": bool(a.fondo_oscuro), "detectado": bool(np.median(media) < 30)}
    return m, fallos, avisos, momentos, fronteras


# ----------------------------------------------------------------------------------------------------------------------- sonido


def leer_audio(ruta):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(ruta), "-vn", "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True)
    x = np.frombuffer(r.stdout, np.float32)
    if len(x) < SR // 10:
        return None
    return x[: len(x) // 2 * 2].reshape(-1, 2)


def envolvente_db(x, paso=0.02):
    """RMS en dBFS cada `paso` segundos, del canal más fuerte."""
    h = int(paso * SR)
    n = len(x) // h
    if n == 0:
        return np.array([-120.0])
    y = x[: n * h].reshape(n, h, x.shape[1])
    rms = np.sqrt((y.astype(np.float64) ** 2).mean(1)).max(1)
    return 20 * np.log10(rms + 1e-7)


def ventanas_de_voz(t):
    """Ventanas de habla a partir de assets/tiempos.json: palabras separadas menos de 0,3 s forman una."""
    pal = [(float(p["inicio"]), float(p["fin"])) for p in t.get("palabras", []) if "inicio" in p and "fin" in p]
    out = []
    for i, f in sorted(pal):
        if out and i - out[-1][1] < 0.3:
            out[-1][1] = max(out[-1][1], f)
        else:
            out.append([i, f])
    return [(i, f) for i, f in out if f - i >= 0.4]


def banda_voz_db(mono, paso=0.02):
    sos = sg.butter(4, [300, 3400], btype="bandpass", fs=SR, output="sos")
    y = sg.sosfilt(sos, mono)
    h = int(paso * SR)
    n = len(y) // h
    return 10 * np.log10((y[: n * h].reshape(n, h) ** 2).mean(1) + 1e-12)


def voz_detectada(banda_db, paso=0.02):
    """Ventanas de habla a partir de la mezcla: modulación silábica (2,5–8 Hz) fuerte en la banda de la voz."""
    env = 10 ** (banda_db / 20)
    fs = 1 / paso
    w = int(2.0 * fs)
    if len(env) < w + 5:
        return []
    hop = int(0.5 * fs)
    sos = sg.butter(2, 18, btype="low", fs=fs, output="sos")
    env = sg.sosfiltfilt(sos, env)
    ok = []
    umbral_nivel = float(np.percentile(banda_db, 20)) + 6
    for i in range(0, len(env) - w, hop):
        v = env[i: i + w]
        mu = float(v.mean())
        if mu <= 0 or banda_db[i: i + w].mean() < umbral_nivel:
            ok.append(False)
            continue
        r = (v - mu) / mu
        prof = float(r.std())
        esp = np.abs(np.fft.rfft(r * np.hanning(len(r)))) ** 2
        f = np.fft.rfftfreq(len(r), 1 / fs)
        total = esp[(f >= 0.5) & (f <= 20)].sum() + 1e-12
        silabas = esp[(f >= 2.5) & (f <= 8)].sum() / total
        ok.append(prof >= 0.3 and silabas >= 0.35)
    ventanas = []
    for i, j in segmentos(ok):
        ventanas.append((i * hop * paso, (j - 1) * hop * paso + 2.0))
    return [(i, f) for i, f in ventanas if f - i >= 1.0]


def voz_vs_musica(mono, ventanas, paso=0.02):
    """Contraste de la voz sobre lo que queda entre sílabas (la música) y nivel de la voz contra las pausas. En dB."""
    banda = banda_voz_db(mono, paso)
    n = len(banda)
    contrastes, picos, peor = [], [], None
    for i, f in ventanas:
        a, b = int(i / paso), min(n, int(f / paso))
        if b - a < 40:
            continue
        v = banda[a:b]
        con = float(np.percentile(v, 90) - np.percentile(v, 10))
        contrastes.append(con)
        picos.append(float(np.percentile(v, 90)))
        if peor is None or con < peor[1]:
            peor = ((i + f) / 2, con)
    if not contrastes:
        return None
    voz = np.zeros(n, bool)
    for i, f in ventanas:
        voz[max(0, int((i - 0.15) / paso)): min(n, int((f + 0.15) / paso))] = True
    pausas = [(a, b) for a, b in segmentos(~voz) if (b - a) * paso >= 0.4]
    nivel_pausas = None
    if pausas:
        nivel_pausas = float(np.median(np.concatenate([banda[a + 10: b - 10] for a, b in pausas if b - a > 25] or [banda[:1]])))
    res = {"ventanas": len(contrastes), "contraste_mediano_db": round(float(np.median(contrastes)), 1), "peor_contraste_db": round(peor[1], 1), "peor_en_s": round(peor[0], 2)}
    if nivel_pausas is not None:
        res["voz_sobre_pausas_db"] = round(float(np.median(picos)) - nivel_pausas, 1)
    return res


def graves(mono):
    f, p = sg.welch(mono, SR, nperseg=16384)
    total = float(p.sum())
    pct = float(p[f < 120].sum() / total * 100) if total > 0 else 0.0
    f2, t2, S = sg.spectrogram(mono, SR, nperseg=8192, noverlap=0)
    por = []
    paso = max(1, int(round(4.0 / (t2[1] - t2[0])))) if len(t2) > 1 else 1
    for i in range(0, S.shape[1], paso):
        blk = S[:, i: i + paso].sum(1)
        tot = float(blk.sum())
        if tot > 1e-8:
            por.append((float(t2[i]), float(blk[f2 < 120].sum() / tot * 100), 10 * np.log10(tot / 8192 + 1e-12)))
    return round(pct, 1), por


def cruzar_hyperframes(video, cortes_secos):
    """Segunda opinión: `hyperframes measure cuts` ve solo cortes secos; se comparan con los cortes y fronteras de plano propios (±0,7 s).
    Tarda 10 a 20 s y pide npx; sin él, lo dice."""
    npx = shutil.which("npx") or shutil.which("npx.cmd")
    if not npx:
        return None, "cruce con HyperFrames: no se encontró npx (viene con Node)"
    try:
        r = subprocess.run([npx, "hyperframes@0.9.9", "measure", "cuts", str(video)], capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=120)
        d = json.loads(r.stdout[r.stdout.index("{"): r.stdout.rindex("}") + 1])
    except (subprocess.TimeoutExpired, ValueError, OSError) as e:
        return None, f"cruce con HyperFrames: no respondió ({type(e).__name__})"
    hf = [float(c["t"]) for c in d.get("cuts", [])]
    solo_hf = [t for t in hf if not any(abs(t - x) <= 0.7 for x in cortes_secos)]
    return {"hyperframes_cortes": hf, "coinciden": len(hf) - len(solo_hf), "solo_hyperframes": solo_hf}, None


def analizar_sonido(x, dur, a, t, efectos):
    fallos, avisos, momentos, no = [], [], [], []
    mono = x.mean(1)
    env = envolvente_db(x)
    paso = 0.02
    m = {}
    # Energía bajo 120 Hz
    pct, ventanas_g = graves(mono)
    m["energia_bajo_120hz_pct"] = pct
    if pct >= UMBRALES["graves_fallo_pct"]:
        fallos.append(f"sonido: el {pct:.0f} % de la energía está bajo 120 Hz; en un teléfono casi no suena")
    elif pct >= UMBRALES["graves_aviso_pct"]:
        avisos.append(f"sonido: el {pct:.0f} % de la energía está bajo 120 Hz; en un teléfono suena a poco: añade armónicos o recorta graves")
    if ventanas_g:
        tt, g, _ = max(ventanas_g, key=lambda z: z[1])
        m["tramo_de_4s_con_mas_graves"] = {"desde_s": round(tt, 1), "pct": round(g)}
    # Silencios, inicio y cola
    sonoro = env > UMBRALES["silencio_dbfs"]
    donde = np.flatnonzero(sonoro)
    if len(donde) == 0:
        fallos.append("sonido: el audio está en silencio de punta a punta")
        return m, fallos, avisos, momentos, no
    primero, ultimo = donde[0] * paso, (donde[-1] + 1) * paso
    cola = max(0.0, dur - ultimo)
    m["inicio_sonido_s"] = round(primero, 2)
    m["cola_de_silencio_s"] = round(cola, 2)
    if cola > UMBRALES["cola_aviso_s"]:
        avisos.append(f"sonido: el video termina con {cola:.1f} s de silencio total; recorta la cola o que suene algo")
        momentos.append((3, max(0.0, dur - cola / 2), "cola de silencio"))
    if primero > 0.5 and dur > 5:
        avisos.append(f"sonido: no suena nada hasta {seg(primero)}; el gancho llega sin audio")
    dur_min = a.silencio_dur
    silencios = [(i * paso, j * paso) for i, j in segmentos(~sonoro) if i * paso > primero - 1e-6 and j * paso < ultimo + 1e-6 and (j - i) * paso >= dur_min]
    m["silencios_reales"] = [{"desde": round(i, 2), "hasta": round(j, 2), "dura": round(j - i, 2)} for i, j in silencios]
    minimo = a.silencios_min if a.silencios_min is not None else (2 if dur > 15 else 0)
    m["silencios_minimos"] = minimo
    if len(silencios) < minimo:
        avisos.append(f"sonido: {len(silencios)} silencio(s) real(es) de {dur_min:g} s o más (bajo {UMBRALES['silencio_dbfs']:.0f} dBFS) y se piden {minimo}: sin silencios todo suena igual de importante")
    # Clipping
    cerca = np.abs(x).max(1) >= 0.99
    runs = [(i, j) for i, j in segmentos(cerca) if j - i >= 3]
    m["clipping"] = {"tramos": len(runs), "pico_muestra": round(float(np.abs(x).max()), 3)}
    if len(runs) > 20:
        fallos.append(f"sonido: {len(runs)} tramos recortados (clipping), primero en {seg(runs[0][0] / SR)}")
    elif runs:
        avisos.append(f"sonido: {len(runs)} tramo(s) recortados en 0 dBFS, primero en {seg(runs[0][0] / SR)}")
        momentos.append((6, runs[0][0] / SR, "audio recortado"))
    # Voz contra música
    habla, fuente = ventanas_de_voz(t) if t else [], "assets/tiempos.json"
    if not habla:
        habla, fuente = voz_detectada(banda_voz_db(mono)), "estimada por la modulación de la mezcla"
    v = voz_vs_musica(mono, habla) if habla else None
    if v:
        v["fuente_de_la_voz"] = fuente
        v["estimado"] = True
        m["voz_contra_musica"] = v
        peor = f"peor en {seg(v['peor_en_s'])}"
        sobre = v.get("voz_sobre_pausas_db")
        if v["contraste_mediano_db"] < UMBRALES["voz_contraste_db"] or (sobre is not None and sobre < UMBRALES["voz_sobre_pausas_db"]):
            avisos.append(f"sonido: la voz sobresale poco del fondo mientras se habla (contraste {v['contraste_mediano_db']:.0f} dB, {peor}; con menos de 10 dB la voz va a unos 5 dB sobre la música o menos). Estimado, no oído: confirma con comparar_voz.py")
            momentos.append((7, v["peor_en_s"], "voz poco sobre el fondo"))
    else:
        no.append("voz bajo la música: no se detectó habla en la mezcla (¿video sin voz?) y no hay assets/tiempos.json")
    # Efectos
    if efectos is not None:
        golpes = []
        for e in efectos:
            if not isinstance(e, dict):
                continue
            tt = e.get("pico", e.get("t"))
            if tt is None or "bajo_voz" in e:
                continue
            golpes.append({"t": float(tt), "nombre": e.get("sonido") or Path(str(e.get("archivo", "?"))).stem, "ganancia": e.get("ganancia")})
        golpes.sort(key=lambda g: g["t"])
        ts = np.array([g["t"] for g in golpes])
        maxim, en = 0, 0.0
        for i in range(len(ts)):
            k = int(((ts >= ts[i]) & (ts < ts[i] + 1.0)).sum())
            if k > maxim:
                maxim, en = k, float(ts[i])
        m["efectos"] = {"golpes": len(golpes), "por_segundo_medio": round(len(golpes) / max(dur, 1e-9), 2), "maximo_en_1_s": maxim, "en_s": round(en, 2)}
        if maxim > UMBRALES["efectos_por_segundo"]:
            avisos.append(f"sonido: {maxim} efectos dentro de 1 s desde {seg(en)}; el máximo es 1 por segundo")
            momentos.append((4, en, f"{maxim} efectos en 1 s"))
        if t and t.get("palabras"):
            palabras = t["palabras"]
            sobre = []
            for g in golpes:
                for p in palabras:
                    if p["inicio"] - 0.02 <= g["t"] <= p["fin"] + 0.02:
                        sobre.append({"t": round(g["t"], 2), "efecto": g["nombre"], "palabra": p["palabra"], "ganancia": g["ganancia"]})
                        break
            m["efectos"]["sobre_una_palabra"] = sobre
            if sobre:
                lista = "; ".join(f"«{s['palabra']}» ({seg(s['t'])}, {s['efecto']})" for s in sobre[:4])
                avisos.append(f"sonido: {len(sobre)} efecto(s) caen sobre una palabra: {lista}. Si es una palabra clave, muévelo o bájalo")
                momentos.append((5, sobre[0]["t"], f"efecto sobre «{sobre[0]['palabra']}»"))
        else:
            no.append("efectos sobre una palabra: falta assets/tiempos.json con las palabras")
    else:
        no.append("densidad de efectos y efectos sobre palabras: no hay efectos.json")
    return m, fallos, avisos, momentos, no


# ------------------------------------------------------------------------------------------------------------ imágenes de salida


def hoja_de_tiempos(ruta, tiempos, salida, ancho=240, columnas=6):
    """Un cuadro por cada segundo dado, en una hoja. Solo ffmpeg."""
    if not tiempos:
        return None
    with tempfile.TemporaryDirectory() as d:
        for k, t in enumerate(tiempos):
            correr(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", f"{max(0.0, t):.3f}", "-i", str(ruta), "-frames:v", "1", "-vf", f"scale={ancho}:-2", f"{d}/f{k:03d}.png"])
        hechos = len(list(Path(d).glob("f*.png")))
        if not hechos:
            return None
        filas = (hechos + columnas - 1) // columnas
        r = correr(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-framerate", "1", "-i", f"{d}/f%03d.png", "-vf", f"tile={min(columnas, hechos)}x{filas}:padding=4:color=0x222222", "-frames:v", "1", "-q:v", "3", str(salida)])
    return Path(salida) if r.returncode == 0 and Path(salida).exists() else None


def tira(ruta, t, salida, n=7, paso=0.2, ancho=240):
    t0 = max(0.0, t - (n // 2) * paso)
    r = correr(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", f"{t0:.3f}", "-t", f"{n * paso:.2f}", "-i", str(ruta), "-vf", f"fps={1 / paso:g},scale={ancho}:-2,tile={n}x1:padding=3:color=0x222222", "-frames:v", "1", "-q:v", "3", str(salida)])
    return Path(salida).exists() and r.returncode == 0


def cuadro(ruta, t, salida, ancho=540):
    r = correr(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", f"{max(0.0, t):.3f}", "-i", str(ruta), "-frames:v", "1", "-vf", f"scale={ancho}:-2", "-q:v", "3", str(salida)])
    return Path(salida).exists() and r.returncode == 0


def preguntas(hoja, hoja_planos, mirar):
    h = rel(hoja) if hoja else "la hoja de cuadros"
    p = [
        f"En {h}: ¿el sujeto de cada plano (o su texto, si es un plano de texto) ocupa al menos el 40 % del cuadro, o hay planos con algo pequeño o pegado a un borde?",
        "¿Hay algo cortado en los bordes: texto, sujeto, logo o subtítulo? Mira el borde de cada cuadro, no el centro.",
        "¿Las tildes, la ñ y los signos ¿ ¡ están completos en cada texto en pantalla? Abre 3 cuadros con texto a tamaño completo: ffmpeg -ss SEGUNDO -i video -frames:v 1 cuadro.png.",
        "¿Hay contraste suficiente entre cada texto y su fondo? Busca texto claro sobre fondo claro y color sobre el mismo color.",
        "¿Los subtítulos tapan al sujeto o a otro texto en algún cuadro?",
        "¿El primer cuadro se entiende solo, como portada, y dice de qué trata?",
    ]
    if mirar:
        p.append(f"En cada tira de `mirar` (siete cuadros, uno cada 0,2 s): ¿se ve el problema que dice la razón? Si no se ve, anota que fue falsa alarma.")
    if hoja_planos:
        p.append(f"En {rel(hoja_planos)}: ¿cada plano se distingue del anterior por sujeto, cámara o color, o parecen el mismo plano repetido?")
    return p


# ------------------------------------------------------------------------------------------------------------------------ main


def main():
    t_ini = time.time()
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("video")
    p.add_argument("--duracion", type=float, help="Duración esperada en segundos (±0,5)")
    p.add_argument("--ancho", type=int, help="Ancho esperado. Sin él se acepta 1080x1920, 1920x1080, 1080x1080 y 1080x1350")
    p.add_argument("--alto", type=int)
    p.add_argument("--fps", type=float, default=30)
    p.add_argument("--fondo-oscuro", action="store_true", help="El fondo casi negro es parte del diseño: un cuadro sin nada puede durar 1 s antes de avisar")
    p.add_argument("--quieto", type=float, default=3.5, help="Segundos sin ningún cambio para avisar de imagen congelada")
    p.add_argument("--sin-novedad", type=float, default=4.0, help="Segundos sin contenido nuevo para avisar")
    p.add_argument("--silencios-min", type=int, help="Silencios reales mínimos. Por defecto 2 si la pieza dura más de 15 s")
    p.add_argument("--silencio-dur", type=float, default=0.25, help="Segundos que debe durar un silencio para contar")
    p.add_argument("--ignorar", help="Banda de alturas en píxeles que no cuenta, como los subtítulos: 1300-1540")
    p.add_argument("--salida", default="renders/revision")
    p.add_argument("--proyecto", help="Carpeta del proyecto, si no es la actual")
    p.add_argument("--guion", default="guion.txt")
    p.add_argument("--modelo", default="base", help="Modelo de Whisper para comparar la voz con el guion")
    p.add_argument("--sin-voz", action="store_true", help="No transcribir la voz aunque exista guion.txt")
    p.add_argument("--tiras", type=int, default=10, help="Máximo de momentos sospechosos con tira de cuadros")
    p.add_argument("--hoja-cuadros", type=int, help="Cuadros de la hoja general. Por defecto según la duración")
    p.add_argument("--hyperframes", action="store_true", help="Cruzar los cortes secos con `npx hyperframes@0.9.9 measure cuts` (10 a 20 s más)")
    a = p.parse_args()

    video = Path(a.video)
    if not video.is_file() or video.stat().st_size == 0:
        sys.exit(f"Error: no existe o está vacío: {video}")
    try:
        info = vv.probe(video)
    except Exception as e:  # noqa: BLE001
        sys.exit(f"Error: ffprobe no pudo leer {video}: {e}")
    vs = [s for s in info["streams"] if s["codec_type"] == "video"]
    if not vs:
        sys.exit("Error: el archivo no tiene pista de video")
    v0 = vs[0]
    ancho, alto = int(v0["width"]), int(v0["height"])
    n_, d_ = map(int, v0["r_frame_rate"].split("/"))
    fps = n_ / d_
    dur = float(info["format"]["duration"])
    audio = [s for s in info["streams"] if s["codec_type"] == "audio"]
    ign = None
    if a.ignorar:
        try:
            y0, y1 = (float(z) for z in a.ignorar.split("-"))
            ign = (y0, y1)
        except ValueError:
            sys.exit("Error: --ignorar va como 1300-1540")

    fallos, avisos, momentos, no = [], [], [], []
    # saltos.py corre en paralelo mientras se lee el video: es la misma medida de salto entre cuadros, hecha por la herramienta que ya existe
    cmd_saltos = [sys.executable, str(AQUI / "saltos.py"), str(video)] + (["--ignorar", a.ignorar] if a.ignorar else [])
    p_saltos = subprocess.Popen(cmd_saltos, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding="utf-8", errors="replace")
    # Técnica: reutiliza verificar_video.py
    esperado = (a.ancho or ancho, a.alto or alto)
    fallos += [f"técnica: {f}" for f in vv.verificar(video, ancho=esperado[0], alto=esperado[1], fps=a.fps, duracion=a.duracion)]
    medido = {"tecnica": vv.medidas(video)}
    medido["tecnica"].update(perfil=v0.get("profile"), pix_fmt=v0.get("pix_fmt"), codec_video=v0.get("codec_name"))
    if v0.get("codec_name") != "h264" or v0.get("pix_fmt") != "yuv420p":
        fallos.append(f"técnica: el video es {v0.get('codec_name')} {v0.get('pix_fmt')}, se pide H.264 yuv420p (las redes y los teléfonos lo reproducen sin problemas)")
    if not (a.ancho or a.alto) and (ancho, alto) not in FORMATOS:
        avisos.append(f"técnica: resolución {ancho}x{alto}; las redes piden 1080x1920, 1920x1080, 1080x1080 o 1080x1350")
    if a.duracion is None:
        no.append("duración: no se indicó --duracion, así que no se comparó con lo pedido")

    # Imagen
    carpetas = rutas(video, a)
    try:
        c = leer_cuadros(video, ancho, alto, ign)
    except ValueError as e:
        sys.exit(f"Error: {e}")
    nf = len(c["media"])
    fps_real = nf / dur if dur else fps
    mi, fi, ai, mom, fronteras = analizar_imagen(c, fps_real, a, ancho, alto)
    medido["imagen"] = mi
    if a.hyperframes:
        cruce, falta = cruzar_hyperframes(video, list(mi["planos"]["cortes_secos"]) + list(fronteras))
        if cruce:
            mi["cruce_hyperframes"] = cruce
            if cruce["solo_hyperframes"]:
                ai.append(f"imagen: HyperFrames ve {len(cruce['solo_hyperframes'])} corte(s) seco(s) que este análisis no vio, en {', '.join(seg(x) for x in cruce['solo_hyperframes'][:5])}")
        else:
            no.append(falta)
    # Saltos bruscos que no son un corte de plano: posible costura entre procesos de render o cuadro perdido
    sal_out, _ = p_saltos.communicate()
    try:
        sj = json.loads(sal_out)
        conocidos = list(fronteras) + list(mi["planos"]["cortes_secos"])
        sin_corte = [x for x in sj["saltos_o_cortes"] if not any(abs(x["segundo"] - f) <= 0.3 for f in conocidos)]
        fuertes = [x for x in sin_corte if x["diferencia"] >= 12]
        mi["saltos"] = {"saltos_o_cortes": len(sj["saltos_o_cortes"]), "sin_corte_de_plano": len(sin_corte), "fuertes_sin_corte": fuertes, "fuente": "tools/qa/saltos.py"}
        if fuertes:
            ai.append(f"imagen: {len(fuertes)} salto(s) brusco(s) sin corte de plano, en {', '.join(seg(x['segundo']) for x in fuertes[:5])}: ¿costura entre procesos de render o cuadro perdido? Mira su tira")
            mom += [(6, x["segundo"], f"salto brusco de {x['diferencia']:.0f} sin corte") for x in fuertes[:3]]
    except (ValueError, KeyError):
        no.append("saltos bruscos: saltos.py no dio resultado")
    fallos += fi
    avisos += ai
    momentos += mom
    if not ign:
        no.append("imagen: sin --ignorar, los cambios de subtítulos cuentan como movimiento y el aviso de «sin nada nuevo» se queda corto")

    # Archivos del proyecto
    f_t = buscar(carpetas, "assets/tiempos.json")
    f_e = buscar(carpetas, "efectos.json")
    f_g = buscar(carpetas, a.guion)
    tiempos = leer_json(f_t, {}) if f_t else {}
    efectos = leer_json(f_e, None) if f_e else None
    if efectos is not None and not isinstance(efectos, list):
        efectos = None
    medido["proyecto"] = {"tiempos": rel(f_t) if f_t else None, "efectos": rel(f_e) if f_e else None, "guion": rel(f_g) if f_g else None, "voz_generada": (tiempos.get("motor") not in (None, "grabada")) if tiempos else None}

    # Sonido
    if not audio:
        no.append("sonido: el video no tiene pista de audio")
    else:
        x = leer_audio(video)
        if x is None:
            fallos.append("sonido: no se pudo decodificar el audio")
        else:
            ms, fs_, as_, mm, no_s = analizar_sonido(x, dur, a, tiempos, efectos)
            medido["sonido"] = ms
            fallos += fs_
            avisos += as_
            momentos += mm
            no += no_s
        if f_g and not a.sin_voz:
            if importlib.util.find_spec("faster_whisper"):
                r = correr([sys.executable, str(AQUI / "comparar_voz.py"), "--audio", str(video), "--guion", str(f_g), "--modelo", a.modelo])
                try:
                    cv = json.loads(r.stdout)
                except json.JSONDecodeError:
                    cv = None
                    no.append(f"voz contra guion: comparar_voz.py falló: {(r.stderr or r.stdout).strip()[-200:]}")
                if cv:
                    medido["voz_contra_guion"] = {"coincidencia": cv["coincidencia"], "modelo": a.modelo, "distintas_en_guion": cv["distintas_en_guion"], "distintas_en_lo_oido": cv["distintas_en_lo_oido"]}
                    dif_txt = ", ".join(f"«{x1}»→«{y1}»" for x1, y1 in zip(cv["distintas_en_guion"], cv["distintas_en_lo_oido"]))
                    if cv["coincidencia"] < 0.6:
                        fallos.append(f"voz: lo que se oye coincide solo el {cv['coincidencia']:.0%} con el guion")
                    elif cv["coincidencia"] < 0.85:
                        avisos.append(f"voz: coincide el {cv['coincidencia']:.0%} con el guion ({dif_txt or 'palabras distintas'}); repite con --modelo medium antes de regenerar la voz")
                    elif dif_txt:
                        avisos.append(f"voz: coincide el {cv['coincidencia']:.0%} con el guion, pero Whisper oyó distinto {dif_txt}. Suele ser el reconocedor y no la voz: que una persona oiga esas palabras")
            else:
                no.append("voz contra guion: falta faster-whisper (pip install faster-whisper)")
        elif not f_g:
            no.append(f"voz contra guion: no hay {a.guion}")

    # Imágenes de salida
    sal = Path(a.salida)
    sal.mkdir(parents=True, exist_ok=True)
    nh = a.hoja_cuadros or int(min(30, max(12, round(dur / 3))))
    hoja = sal / "hoja.jpg"
    r = correr([sys.executable, str(AQUI / "hoja_cuadros.py"), str(video), "--salida", str(hoja), "--cuadros", str(nh), "--columnas", "6", "--ancho", "240"])
    if r.returncode != 0 or not hoja.exists():
        hoja = None
        no.append("hoja de cuadros: hoja_cuadros.py falló")
    planos = medido["imagen"]["planos"]["planos"]
    centros = [round((q["inicio"] + q["fin"]) / 2, 2) for q in planos][:30]
    hoja_planos = hoja_de_tiempos(video, centros, sal / "hoja-planos.jpg")
    mom_sorted = sorted(momentos, key=lambda z: -z[0])
    fusion = []
    for prio, t, razon in mom_sorted:
        for f in fusion:
            if abs(f["t"] - t) < 0.7:
                f["razones"].append(razon)
                break
        else:
            fusion.append({"prio": prio, "t": t, "razones": [razon]})
    fusion = fusion[: a.tiras]
    mirar = []
    for f in sorted(fusion, key=lambda z: z["t"]):
        t = max(0.0, min(f["t"], dur - 0.05))
        dest = sal / f"tira-{t:06.2f}s.jpg"
        img = rel(dest) if tira(video, t, dest) else None
        mirar.append({"segundo": round(t, 2), "razon": "; ".join(dict.fromkeys(f["razones"])), "imagen": img})
    for fr in medido["imagen"]["franjas_casi_vacias"]:
        dest = sal / f"cuadro-franja-{fr['segundo_ejemplo']:06.2f}s.jpg"
        if cuadro(video, fr["segundo_ejemplo"], dest):
            mirar.append({"segundo": fr["segundo_ejemplo"], "razon": f"franja vacía y {fr['y_desde']}–{fr['y_hasta']}: un cuadro entero para verla", "imagen": rel(dest)})
    # Resultado
    pq = preguntas(hoja, hoja_planos, mirar)
    salida = {
        "ok": not fallos, "video": rel(video), "fallos": fallos, "avisos": avisos, "mirar": mirar, "preguntas": pq,
        "aviso_preguntas": "Una máquina no puede juzgar tamaño del sujeto, recortes, tildes, contraste ni subtítulos sobre el sujeto: mira las imágenes y responde cada pregunta.",
        "no_comprobado": no + ["nadie oyó la mezcla: todo el sonido está medido, no escuchado", "no se vio en un teléfono"],
        "archivos": {"hoja": rel(hoja) if hoja else None, "hoja_planos": rel(hoja_planos) if hoja_planos else None, "revision": rel(sal / "revision.json")},
        "medido": medido, "umbrales": UMBRALES, "tiempo_s": round(time.time() - t_ini, 1),
    }
    (sal / "revision.json").write_text(json.dumps(salida, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps(salida, ensure_ascii=False, indent=1))
    sys.exit(0 if not fallos else 1)


if __name__ == "__main__":
    main()
