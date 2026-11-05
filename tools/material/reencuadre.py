#!/usr/bin/env python3
"""Reencuadra un video a otro formato siguiendo la cara, con una trayectoria suave y editable. De 16:9 a 9:16, por ejemplo.

Uso:
  python tools/material/reencuadre.py entrevista.mp4 --formato 9:16 --salida vertical.mp4
  python tools/material/reencuadre.py entrevista.mp4 --formato 9:16 --salida vertical.mp4 --guardar-trayectoria tray.json --vista vista.jpg
  python tools/material/reencuadre.py entrevista.mp4 --formato 9:16 --salida vertical.mp4 --trayectoria tray.json    (la que editaste)
  python tools/material/reencuadre.py entrevista.mp4 --formato 9:16 --solo-trayectoria --guardar-trayectoria tray.json
  python tools/material/reencuadre.py entrevista.mp4 --formato 1:1 --desde 12 --hasta 40 --zoom 1.3 --salida cuadrado.mp4

Cómo sigue la cara: toma cuadros cada 0,2 s, busca caras con OpenCV (cascadas Haar que trae opencv-python: de frente y de
perfil), se queda con la más grande o la más cercana a la anterior, descarta saltos sueltos, rellena los huecos, suaviza y
mueve la cámara solo cuando la cara sale de una zona muerta, con un límite de velocidad. El resultado son pocas claves
(segundo, x, y) entre las que la ventana se mueve en línea recta: nunca da un salto.
Sin OpenCV (pip install opencv-python) o sin ninguna cara en el video, recorta al centro y lo dice. Las cascadas Haar
solo ven caras de frente o de perfil, y con poca luz o la cabeza gacha se pierden: mira --vista y corrige las claves.

--guardar-trayectoria escribe un JSON con la ventana y las claves, en segundos del video de origen. Edítalo (mueve una x,
borra una clave) y vuelve a correr con --trayectoria. x e y son la esquina de la ventana en píxeles del video de origen.
--vista escribe una hoja con la cara hallada (verde) y la ventana (amarillo) en varios momentos.
La salida se escala a --tam (1080x1920 para 9:16). Si el origen es más chico que la ventana, se amplía y pierde nitidez:
un 1080p da una ventana de 607x1080 para 9:16; un 4K da 1215x2160.
"""
import argparse
import json
import math
import shutil
import sys
import tempfile
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import comun  # noqa: E402
from comun import aviso, escribir_json, leer_json, salir  # noqa: E402

PASO_MUESTRA = 0.2
ANCHO_DETECCION = 640


# ---------- ventana y trayectoria ----------

def tam_de(formato, tam):
    if tam:
        try:
            w, h = (int(x) for x in tam.lower().split("x"))
        except ValueError:
            salir("--tam va como 1080x1920")
        return w, h
    if formato not in comun.FORMATOS:
        salir(f"formato {formato} no conocido: usa " + ", ".join(comun.FORMATOS))
    return comun.FORMATOS[formato]


def ventana_de(ancho, alto, tam, zoom):
    """Tamaño (en píxeles del origen) de la ventana que se recorta: la más grande con la forma del formato, entre zoom."""
    ar = tam[0] / tam[1]
    if ancho / alto > ar:
        ch, cw = float(alto), alto * ar
    else:
        cw, ch = float(ancho), ancho / ar
    return cw / zoom, ch / zoom


def cargar_cascada(nombre):
    import cv2
    ruta = Path(cv2.data.haarcascades) / nombre
    c = cv2.CascadeClassifier(str(ruta))
    if c.empty():  # una ruta con tildes o eñes puede no abrirse en Windows: se copia a una carpeta temporal
        tmp = Path(tempfile.mkdtemp(prefix="haar-"))
        copia = tmp / nombre
        shutil.copy(ruta, copia)
        c = cv2.CascadeClassifier(str(copia))
    return None if c.empty() else c


def muestrear(video, desde, hasta, destino):
    comun.ffmpeg(["-ss", f"{desde:.3f}", "-t", f"{hasta - desde:.3f}", "-i", video, "-vf", f"fps={1 / PASO_MUESTRA},scale={ANCHO_DETECCION}:-2", "-q:v", "3", Path(destino) / "%05d.jpg"], "sacar los cuadros")
    return sorted(Path(destino).glob("*.jpg"))


def detectar(img, cascadas):
    import cv2
    gris = cv2.equalizeHist(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY))
    h, w = gris.shape
    minimo = max(24, int(0.05 * w))
    for nombre, vecinos in (("alt2", 5), ("frontal", 6)):
        c = cascadas.get(nombre)
        if c is not None:
            caras = c.detectMultiScale(gris, scaleFactor=1.1, minNeighbors=vecinos, minSize=(minimo, minimo))
            if len(caras):
                return [tuple(int(v) for v in x) for x in caras]
    c = cascadas.get("perfil")
    if c is not None:
        hallados = [tuple(int(v) for v in x) for x in c.detectMultiScale(gris, 1.1, 5, minSize=(minimo, minimo))]
        for x, y, fw, fh in c.detectMultiScale(cv2.flip(gris, 1), 1.1, 5, minSize=(minimo, minimo)):
            hallados.append((w - int(x) - int(fw), int(y), int(fw), int(fh)))
        return hallados
    return []


def seguir_caras(video, desde, hasta, ancho, alto, avisos):
    """Lee la cara de cada muestra. Devuelve (tiempos, centros) con centros[k] = (cx, cy, tamaño) en píxeles del origen o None."""
    try:
        import cv2
    except ImportError:
        avisos.append("no hay OpenCV (pip install opencv-python): recorte al centro")
        return None, None
    cascadas = {"alt2": cargar_cascada("haarcascade_frontalface_alt2.xml"), "frontal": cargar_cascada("haarcascade_frontalface_default.xml"),
                "perfil": cargar_cascada("haarcascade_profileface.xml")}
    if not any(cascadas.values()):
        avisos.append("OpenCV no encontró sus cascadas de caras: recorte al centro")
        return None, None
    tmp = Path(tempfile.mkdtemp(prefix="reenc-"))
    try:
        archivos = muestrear(video, desde, hasta, tmp)
        esc = ancho / ANCHO_DETECCION
        tiempos, centros, ultimo = [], [], None
        for k, f in enumerate(archivos):
            t = desde + k * PASO_MUESTRA
            img = cv2.imdecode(np.fromfile(str(f), np.uint8), cv2.IMREAD_COLOR)
            tiempos.append(t)
            if img is None:
                centros.append(None)
                continue
            caras = [(x * esc, y * esc, w * esc, h * esc) for x, y, w, h in detectar(img, cascadas)]
            if not caras:
                centros.append(None)
                continue
            if ultimo and t - ultimo[0] < 2.0:
                x, y, w, h = min(caras, key=lambda c: math.hypot(c[0] + c[2] / 2 - ultimo[1], c[1] + c[3] / 2 - ultimo[2]) / max(c[2], 1.0) - 0.002 * c[2])
            else:
                x, y, w, h = max(caras, key=lambda c: c[2] * c[3])
            centros.append((x + w / 2, y + h / 2, w))
            ultimo = (t, x + w / 2, y + h / 2)
        return tiempos, centros
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def gauss(y, sigma_muestras):
    if sigma_muestras < 0.3 or len(y) < 3:
        return np.asarray(y, float)
    r = int(3 * sigma_muestras) + 1
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma_muestras) ** 2)
    k /= k.sum()
    p = np.concatenate([np.full(r, y[0]), y, np.full(r, y[-1])])
    return np.convolve(p, k, "valid")


def rellenar(valores, tiempos):
    """Pone un valor en cada muestra: interpola entre detecciones y sostiene el primero y el último. Devuelve (serie, % con dato)."""
    v = np.array([np.nan if x is None else x for x in valores], float)
    ok = ~np.isnan(v)
    if not ok.any():
        return None, 0.0
    return np.interp(np.asarray(tiempos), np.asarray(tiempos)[ok], v[ok]), float(ok.mean())


def quitar_saltos(cx, ancho):
    """Una cara hallada de golpe lejos de la mediana de sus vecinas es un falso positivo: se descarta."""
    salida = list(cx)
    for k in range(len(cx)):
        if cx[k] is None:
            continue
        vecinas = [x for x in cx[max(0, k - 3):k + 4] if x is not None]
        if len(vecinas) >= 3 and abs(cx[k] - float(np.median(vecinas))) > 0.12 * ancho:
            salida[k] = None
    return salida


def seguidor(objetivo, dt, zona, vmax):
    """La cámara se queda quieta mientras el objetivo esté dentro de la zona muerta, y lo alcanza con velocidad limitada."""
    p = np.empty(len(objetivo))
    p[0] = objetivo[0]
    for k in range(1, len(objetivo)):
        e = objetivo[k] - p[k - 1]
        mueve = 0.0 if abs(e) <= zona else e - math.copysign(zona, e)
        p[k] = p[k - 1] + max(-vmax * dt, min(vmax * dt, mueve))
    return p


def simplificar(t, v, tol):
    """Ramer-Douglas-Peucker sobre (t, v): deja las claves necesarias para no desviarse más de tol píxeles."""
    pts = list(zip(t, v))
    mantener = {0, len(pts) - 1}
    pila = [(0, len(pts) - 1)]
    while pila:
        a, b = pila.pop()
        if b <= a + 1:
            continue
        (ta, va), (tb, vb) = pts[a], pts[b]
        lin = [va + (vb - va) * (pts[i][0] - ta) / (tb - ta) if tb > ta else va for i in range(a + 1, b)]
        d = [abs(pts[i][1] - lin[i - a - 1]) for i in range(a + 1, b)]
        m = int(np.argmax(d))
        if d[m] > tol:
            i = a + 1 + m
            mantener.add(i)
            pila += [(a, i), (i, b)]
    return sorted(mantener)


def construir(video, sonda, formato, tam, zoom, desde, hasta, modo, suavizado, zona, vmax, espera):
    """Devuelve el diccionario de la trayectoria."""
    avisos = []
    ancho, alto = sonda["ancho"], sonda["alto"]
    cw, ch = ventana_de(ancho, alto, tam, zoom)
    mov_x, mov_y = ancho - cw > 1, alto - ch > 1
    centro_x, centro_y = (ancho - cw) / 2, (alto - ch) / 2
    tiempos = [round(desde + k * PASO_MUESTRA, 3) for k in range(int((hasta - desde) / PASO_MUESTRA) + 1)]
    claves = [(desde, centro_x, centro_y), (hasta, centro_x, centro_y)]
    caras = {"muestras": len(tiempos), "con_cara": 0, "cobertura": 0.0}
    vistas = []
    usado = "centro"
    if modo == "cara" and (mov_x or mov_y):
        ts, centros = seguir_caras(video, desde, hasta, ancho, alto, avisos)
        if ts:
            tiempos = ts
            cx = quitar_saltos([c[0] if c else None for c in centros], ancho)
            cy = [c[1] if (c and cx[i] is not None) else None for i, c in enumerate(centros)]
            sx, cobertura = rellenar(cx, tiempos)
            sy, _ = rellenar(cy, tiempos)
            caras = {"muestras": len(tiempos), "con_cara": int(sum(1 for c in cx if c is not None)), "cobertura": round(cobertura, 3)}
            vistas = [{"t": round(t, 2), "cx": round(c[0], 1), "cy": round(c[1], 1), "ancho": round(c[2], 1)} for t, c, ok in zip(tiempos, centros, cx) if c and ok is not None]
            if sx is None or cobertura < 0.1:
                avisos.append("no se halló una cara en el video: recorte al centro")
            else:
                usado = "cara"
                dt = PASO_MUESTRA
                huecos, k = [], 0
                while k < len(cx):
                    if cx[k] is None:
                        j = k
                        while j + 1 < len(cx) and cx[j + 1] is None:
                            j += 1
                        if (j - k + 1) * dt > espera:
                            huecos.append((tiempos[k], tiempos[j]))
                        k = j + 1
                    else:
                        k += 1
                if huecos:
                    avisos.append("sin cara durante " + ", ".join(f"{a:.1f}-{b:.1f} s" for a, b in huecos) + ": la cámara quedó donde estaba o se movió en línea recta. Revisa la vista")
                if cobertura < 0.5:
                    avisos.append(f"solo se vio la cara en el {cobertura:.0%} del tiempo: revisa la vista y corrige las claves")
                s = max(0.0, suavizado / dt)
                x = seguidor(gauss(sx, s), dt, zona * cw, vmax * cw)
                x = gauss(x, 0.3 / dt) - cw / 2
                xs = np.clip(x, 0, ancho - cw)
                if mov_y:
                    y = seguidor(gauss(sy, s), dt, zona * ch, vmax * ch)
                    ys = np.clip(gauss(y, 0.3 / dt) - 0.38 * ch, 0, alto - ch)
                else:
                    ys = np.full(len(tiempos), centro_y)
                if not mov_x:
                    xs = np.full(len(tiempos), centro_x)
                tol = max(1.0, 0.004 * cw)
                idx = sorted(set(simplificar(tiempos, xs, tol)) | set(simplificar(tiempos, ys, tol)))
                if len(idx) > 90:
                    idx = sorted(set(simplificar(tiempos, xs, 4 * tol)) | set(simplificar(tiempos, ys, 4 * tol)))
                claves = [(tiempos[i], float(xs[i]), float(ys[i])) for i in idx]
    elif modo == "cara":
        usado = "sin cambio"
    if modo == "cara" and usado == "centro" and not avisos:
        avisos.append("recorte al centro")
    return {
        "version": 1, "video": Path(video).resolve().as_posix(), "formato": formato, "modo": usado, "zoom": zoom,
        "origen": {"ancho": ancho, "alto": alto, "fps": sonda["fps"]}, "ventana": {"ancho": round(cw, 2), "alto": round(ch, 2)},
        "tam": list(tam), "desde": round(desde, 3), "hasta": round(hasta, 3),
        "claves": [{"t": round(t, 3), "x": round(x, 1), "y": round(y, 1)} for t, x, y in claves], "caras": caras, "caras_vistas": vistas, "avisos": avisos,
    }


# ---------- filtro de ffmpeg ----------

def posicion(claves, t):
    ts = [c["t"] for c in claves]
    return float(np.interp(t, ts, [c["x"] for c in claves])), float(np.interp(t, ts, [c["y"] for c in claves]))


def expresion(claves, campo, escala, t0):
    """Interpolación lineal entre claves como expresión de ffmpeg, en segundos del clip (t0 = segundo de origen del cuadro 0)."""
    n = len(claves)
    if n == 1:
        return f"{claves[0][campo] * escala:.2f}"
    e = f"{claves[-1][campo] * escala:.2f}"
    for i in range(n - 2, -1, -1):
        a, b = claves[i], claves[i + 1]
        dur = max(b["t"] - a["t"], 1e-6)
        va, vb = a[campo] * escala, b[campo] * escala
        tramo = f"{va:.2f}+({vb - va:.3f})*(t-{a['t'] - t0:.3f})/{dur:.3f}"
        e = f"if(lt(t,{b['t'] - t0:.3f}),{tramo},{e})"
    return e


def filtro(tray, desde, tam):
    """El filtro de video: se escala el cuadro entero para que la ventana mida justo el tamaño de salida y se recorta ahí,
    así la cámara avanza de a medio píxel y no a saltos de uno."""
    o, v = tray["origen"], tray["ventana"]
    f = tam[1] / v["alto"]
    if abs(tam[0] / v["ancho"] - f) > 0.01:
        salir("la ventana de la trayectoria no tiene la forma de --tam")
    ws, hs = round(o["ancho"] * f), round(o["alto"] * f)
    claves = [c for c in tray["claves"]]
    claves.sort(key=lambda c: c["t"])
    xe, ye = expresion(claves, "x", f, desde), expresion(claves, "y", f, desde)
    maxx, maxy = ws - tam[0], hs - tam[1]
    return (f"setpts=PTS-STARTPTS,scale={ws}:{hs}:flags=lanczos,"
            f"crop=w={tam[0]}:h={tam[1]}:x='max(0,min({maxx},{xe}))':y='max(0,min({maxy},{ye}))',setsar=1")


# ---------- vista ----------

def hacer_vista(video, tray, destino):
    import cv2
    desde, hasta = tray["desde"], tray["hasta"]
    n = 8
    tiempos = [desde + (hasta - desde) * (k + 0.5) / n for k in range(n)]
    tmp = Path(tempfile.mkdtemp(prefix="vista-"))
    celdas = []
    try:
        o, v = tray["origen"], tray["ventana"]
        esc = 480 / o["ancho"]
        for k, t in enumerate(tiempos):
            f = tmp / f"{k}.jpg"
            comun.ffmpeg(["-ss", f"{t:.3f}", "-i", video, "-frames:v", "1", "-vf", "scale=480:-2", "-q:v", "3", f], "sacar un cuadro")
            img = cv2.imdecode(np.fromfile(str(f), np.uint8), cv2.IMREAD_COLOR)
            if img is None:
                continue
            x, y = posicion(tray["claves"], t)
            cv2.rectangle(img, (int(x * esc), int(y * esc)), (int((x + v["ancho"]) * esc), int((y + v["alto"]) * esc)), (0, 220, 255), 3)
            cv2.putText(img, f"{t:.1f}s", (6, 18), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1, cv2.LINE_AA)
            celdas.append(img)
        if not celdas:
            return False
        alto = max(c.shape[0] for c in celdas)
        celdas = [cv2.copyMakeBorder(c, 0, alto - c.shape[0], 0, 0, cv2.BORDER_CONSTANT) for c in celdas]
        while len(celdas) % 4:
            celdas.append(np.zeros_like(celdas[0]))
        filas = [cv2.hconcat(celdas[i:i + 4]) for i in range(0, len(celdas), 4)]
        ok, buf = cv2.imencode(".jpg", cv2.vconcat(filas), [cv2.IMWRITE_JPEG_QUALITY, 85])
        Path(destino).parent.mkdir(parents=True, exist_ok=True)
        Path(destino).write_bytes(buf.tobytes())
        return bool(ok)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def renderizar(video, tray, salida, desde, hasta, tam, crf=18):
    comun.ffmpeg(["-ss", f"{desde:.3f}", "-t", f"{hasta - desde:.3f}", "-i", video, "-vf", filtro(tray, desde, tam), "-map", "0:v:0", "-map", "0:a?",
                  "-c:v", "libx264", "-preset", "medium", "-crf", str(crf), "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", salida],
                 "reencuadrar")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("video")
    p.add_argument("--formato", default="9:16", choices=list(comun.FORMATOS))
    p.add_argument("--salida", help="MP4 de salida")
    p.add_argument("--tam", help="tamaño de salida, por ejemplo 1080x1920 (por omisión, el del formato)")
    p.add_argument("--modo", choices=["cara", "centro"], default="cara")
    p.add_argument("--zoom", type=float, default=1.0, help="1 = la ventana más grande; 1,3 = más cerca de la cara")
    p.add_argument("--desde", type=float, default=0.0)
    p.add_argument("--hasta", type=float, default=0.0, help="0 = hasta el final")
    p.add_argument("--suavizado", type=float, default=0.8, help="segundos de suavizado de la cara hallada")
    p.add_argument("--zona", type=float, default=0.08, help="zona muerta, como parte del ancho de la ventana: la cámara no se mueve dentro de ella")
    p.add_argument("--velocidad", type=float, default=0.5, help="velocidad máxima de la cámara, en anchos de ventana por segundo")
    p.add_argument("--espera", type=float, default=2.0, help="segundos sin cara a partir de los cuales se avisa")
    p.add_argument("--trayectoria", help="usa esta trayectoria (JSON) en vez de buscar la cara")
    p.add_argument("--guardar-trayectoria", help="escribe la trayectoria en este JSON")
    p.add_argument("--solo-trayectoria", action="store_true", help="no renderiza: solo la trayectoria")
    p.add_argument("--vista", help="hoja JPG con la cara y la ventana en 8 momentos")
    p.add_argument("--crf", type=int, default=18)
    a = p.parse_args()
    comun.requerir_ffmpeg()
    sonda = comun.sondear(a.video)
    if a.trayectoria:
        tray = leer_json(a.trayectoria)
        for k in ("origen", "ventana", "claves", "tam"):
            if k not in tray:
                salir(f"{a.trayectoria} no parece una trayectoria de reencuadre.py (falta «{k}»)")
        if (tray["origen"]["ancho"], tray["origen"]["alto"]) != (sonda["ancho"], sonda["alto"]):
            salir(f"la trayectoria es de un video de {tray['origen']['ancho']}x{tray['origen']['alto']} y este mide {sonda['ancho']}x{sonda['alto']}")
        tam = tuple(a.tam and tam_de(a.formato, a.tam) or tray["tam"])
        desde = a.desde if a.desde else tray["desde"]
        hasta = a.hasta if a.hasta else tray["hasta"]
    else:
        tam = tam_de(a.formato, a.tam)
        desde = max(0.0, a.desde)
        hasta = min(a.hasta or sonda["duracion"], sonda["duracion"])
        if hasta - desde < 0.5:
            salir("el tramo es demasiado corto")
        tray = construir(a.video, sonda, a.formato, tam, a.zoom, desde, hasta, a.modo, a.suavizado, a.zona, a.velocidad, a.espera)
    for av in tray.get("avisos", []):
        aviso(av)
    if a.guardar_trayectoria:
        escribir_json(a.guardar_trayectoria, tray, 1)
    vista = None
    if a.vista:
        try:
            vista = hacer_vista(a.video, tray, a.vista)
        except ImportError:
            aviso("la vista necesita OpenCV: no se hizo")
    paso_max = 0.0
    if len(tray["claves"]) > 1:
        ts = np.arange(tray["desde"], tray["hasta"], 1 / max(sonda["fps"], 1))
        xs = np.array([posicion(tray["claves"], t) for t in ts])
        paso_max = float(np.abs(np.diff(xs, axis=0)).max()) if len(xs) > 1 else 0.0
    informe = {"ok": True, "modo": tray["modo"], "formato": tray["formato"], "ventana": tray["ventana"], "claves": len(tray["claves"]), "caras": tray["caras"],
               "salto_max_px_por_cuadro": round(paso_max, 2), "trayectoria": a.guardar_trayectoria, "vista": a.vista if vista else None, "avisos": tray.get("avisos", [])}
    if not a.solo_trayectoria:
        if not a.salida:
            salir("falta --salida (o usa --solo-trayectoria)")
        Path(a.salida).parent.mkdir(parents=True, exist_ok=True)
        renderizar(a.video, tray, a.salida, desde, hasta, tam, a.crf)
        m = comun.sondear(a.salida)
        informe.update({"salida": a.salida, "dur": round(m["duracion"], 3), "ancho": m["ancho"], "alto": m["alto"]})
    print(json.dumps(informe, ensure_ascii=False))


if __name__ == "__main__":
    main()
