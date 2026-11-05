#!/usr/bin/env python3
"""Tiempos de palabra SIN Whisper: la voz se genera por tramos y cada palabra se ubica por sílabas.

Sirve cuando no hay acceso a Hugging Face y alinear.py no puede bajar su modelo, o cuando hace falta un silencio de verdad entre frases.
El método: cada tramo (una oración o frase) se genera aparte y se une a los demás con un silencio real, así el inicio y el fin de cada
tramo son exactos. Dentro del tramo, las palabras se reparten por sílabas (con las pausas de coma buscadas en el audio) y cada una se
afina contra la energía real con tiempos.py. El texto de cada palabra sale del guion tal cual, con su puntuación; nunca de una transcripción.

Salida igual a la de alinear.py: JSON con una lista de {"palabra", "inicio", "fin"}, en segundos con milésimas.

Dos usos:

1. generar: voz y tiempos a la vez, desde un JSON de tramos.
   tramos.json: [{"guion": "texto literal", "voz": "texto para el motor", "pausa_antes": 0.45}, ...]
   "voz" es opcional (por defecto igual al guion): ahí va «ciento seis» cuando el guion dice «106», o «i, a» cuando dice «IA».
   "pausa_antes" es opcional (por defecto --pausa, 0.3 s); en el primer tramo se suma a --inicio (0.1 s) y no usa la pausa por defecto.
     python ../.claqueta/tools/subtitulos/tiempos_por_tramos.py generar tramos.json --salida assets/voz/voz.wav --palabras assets/voz/palabras.json
     python ../.claqueta/tools/subtitulos/tiempos_por_tramos.py generar tramos.json --salida voz.wav --palabras palabras.json --voz ef_dora --velocidad 1.05
     python ../.claqueta/tools/subtitulos/tiempos_por_tramos.py generar tramos.json --motor edge --voz es-MX-JorgeNeural --salida voz.wav --palabras palabras.json --marcas-motor edge.json
   Escribe además <palabras>_tramos.json con el inicio y el fin de cada tramo (cambia el nombre con --tramos-salida).
   Motores: kokoro (local, sin internet; pip install kokoro-onnx soundfile) y edge (pip install edge-tts, con internet y sin llave).
   Con edge, --marcas-motor guarda las marcas de palabra de Edge ya corridas a la línea de tiempo final: sirven solo para comprobar.

2. medir: solo los tiempos de un audio ya generado, con las oraciones halladas por sus silencios reales.
   Sirve para la voz de hablar.py --por-oraciones (o cualquier voz con un silencio claro entre oraciones).
     python ../.claqueta/tools/subtitulos/tiempos_por_tramos.py medir --audio voz.wav --guion guion.txt --salida palabras.json
     python ../.claqueta/tools/subtitulos/tiempos_por_tramos.py medir --audio voz.wav --guion guion.txt --texto-voz guion_voz.txt --salida palabras.json --pausa-min auto
   Las oraciones se parten donde parte hablar.py (tras . ? ! …). Si los bloques de voz no coinciden con las oraciones, falla y dice
   con qué --pausa-min saldrían; con --pausa-min auto toma como límites los huecos más largos.

Cómo se reparte el tiempo:
  - Cada palabra pesa sus sílabas más un poco por el acento y por cada consonante; la última de cada frase se alarga. Las sílabas se cuentan
    con reglas del español (diptongos, hiatos con tilde, «qu» y «gu», «y» final, siglas deletreadas como IA y APIs, cifras leídas como
    número). Si el tramo trae "voz", sus palabras mandan: «106» pesa lo que «ciento seis».
  - Cada coma, punto y coma, dos puntos o punto dentro de un tramo se empareja con una pausa real del audio (un tramo de nivel bajo, no
    hace falta silencio digital: las voces gratis respiran bajito en las comas), si la hay cerca de donde toca. Sin pausa cerca, la
    puntuación se ignora. Es lo que más pesa: con --sin-huecos el error medio sube de 80 a 110-125 ms en Kokoro y de 50 a 115-160 ms en Edge.

Precisión medida (57 tramos, voces Kokoro em_alex, ef_dora y em_santa y voces Edge Gonzalo y Dalia): el inicio de la primera palabra y el fin
de la última de cada tramo quedan a menos de 25 ms de lo exacto. Dentro del tramo, el error medio es de unos 80 ms contra Whisper base en
Kokoro (mediana 65, p90 170) y de unos 50 ms contra las marcas del propio Edge (mediana 35, p90 120). Whisper y Edge discrepan entre sí
unos 65 ms, así que ese es el piso de lo que se puede medir. Con Kokoro, una palabra de cada cuatro difiere más de 0,15 s de Whisper (con
Edge, una de cada dieciséis de sus marcas): sirve para subtítulos de varias palabras por línea; para animar palabra por palabra, usa
alinear.py si puedes bajar su modelo.

Cuándo desconfiar: alinear.py oye lo dicho; esto reparte lo esperado. Si la voz se salta o cambia palabras, o hace pausas que el guion
no marca, los tiempos de ese tramo salen corridos. Las frases con muchas comas seguidas (listas) son las que peor salen. El hiato sin tilde
(«reunir») se cuenta como diptongo. Para un audio sin silencios entre oraciones, usa alinear.py.

Necesita numpy y ffmpeg. Kokoro y edge-tts solo se importan al usarlos: medir funciona sin ellos.
"""
import argparse
import asyncio
import difflib
import json
import re
import shutil
import subprocess
import sys
import tempfile
import unicodedata
from pathlib import Path

import numpy as np

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
from tiempos import PASO, energia_db, mapa_de_voz, refinar  # noqa: E402

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

SR = 24000  # frecuencia de trabajo: la de Kokoro y la de Edge; la salida final sale a 48 kHz
PAUSA_DB = 16.0  # una pausa de coma baja tantos dB bajo el nivel alto de la voz: las voces entre frases suenan bajito, no en silencio digital
EMPAREJA = {"salto": 0.8, "corto": 1.0, "ideal": 0.2}  # costo de dejar una coma sin pausa, de preferir un silencio corto, y duración que ya no se penaliza
PAUSA_INTERNA = 0.15  # lo que se supone que dura una pausa de coma para ubicar dónde buscarla
VOCALES = "aeiouáéíóúü"
FUERTES = set("aeoáéó")
CONSONANTES = "BCDFGHJKLMNÑPQRSTVWXYZ"
NOMBRE_LETRA = {"a": 1, "b": 1, "c": 1, "d": 1, "e": 1, "f": 2, "g": 1, "h": 2, "i": 1, "j": 2, "k": 1, "l": 2, "m": 2, "n": 2, "ñ": 2,
                "o": 1, "p": 1, "q": 1, "r": 2, "s": 2, "t": 1, "u": 1, "v": 1, "w": 3, "x": 2, "y": 3, "z": 2}
SIGLAS_DELETREADAS = {"API", "SEO", "UX", "UI", "CEO", "IA", "AI", "TV", "PC"}
SIMBOLOS = {"%": 3, "&": 1, "+": 1, "=": 2, "@": 3, "$": 2, "€": 2, "°": 2, "#": 3}  # por ciento, y, más, igual, arroba, dólar, euro, grados, numeral
# Modelo de duración, ajustado con voces de Kokoro y Edge y comprobado en frases que no se usaron para ajustarlo:
# peso de una palabra = sílabas + acento + consonantes; la última palabra de cada frase se alarga ese porcentaje.
# Bajar el peso de las palabras átonas (el, de, que...) empeoró los tiempos, así que no se hace.
AJUSTE = {"acento": 0.6, "consonante": 0.25, "final": 0.3}
RE_CORTE = re.compile(r"[,;:.!?…]+[\"'”’»)\]]*$")
RE_SIGLA = re.compile(r"^([A-ZÁÉÍÓÚÜÑ]{2,})(s|es)?$")
RE_PRONUNCIABLE = re.compile(rf"^(?:[{CONSONANTES}]|PR|PL|BR|BL|TR|CR|CL|FR|FL|GR|GL|DR|CH|LL|RR)?[AEIOU]+(?:[{CONSONANTES}]{{1,2}}[AEIOU]+)*[{CONSONANTES}]?$")


def falla(msg, codigo=2):
    print(f"Error: {msg}", file=sys.stderr)
    sys.exit(codigo)


# ---------------------------------------------------------------------------------------------------------------- sílabas

def silabas_palabra(w):
    """Sílabas de una palabra en minúsculas con reglas del español: diptongos, hiatos, «qu», «gu» y «y» final."""
    w = "".join(c if c in "áéíóúüñ" else unicodedata.normalize("NFD", c)[0] for c in w.lower())
    w = re.sub(r"(?<=q)u", "", w)
    w = re.sub(r"(?<=g)u(?=[eiéí])", "", w)
    if w.endswith("y"):
        w = w[:-1] + "i"
    total = 0
    for grupo in re.findall(f"[{VOCALES}]+", w):
        total += 1
        for a, b in zip(grupo, grupo[1:]):
            # Hiato: dos abiertas, dos iguales, o una débil con tilde (día, país, río, continúa).
            if a == b or (a in FUERTES and b in FUERTES) or a in "íú" or b in "íú":
                total += 1
    return max(1, total)


def silabas_sigla(s):
    return sum(NOMBRE_LETRA.get(unicodedata.normalize("NFD", c.lower())[0], 1) for c in s)


def silabas_letras(parte):
    """Una tanda de letras: letra suelta, sigla deletreada (IA, APIs, USB) o palabra (también si está en mayúsculas: NUNCA, NASA)."""
    if len(parte) == 1:  # «y», «a», «o», «e», «u» son palabras de una sílaba; las demás, el nombre de la letra
        return 1 if parte.lower() in "aeiouy" else NOMBRE_LETRA.get(unicodedata.normalize("NFD", parte.lower())[0], 1)
    m = RE_SIGLA.match(parte)
    if not m or re.search("[ÁÉÍÓÚ]", parte):
        return silabas_palabra(parte)
    base = m.group(1)
    plano = "".join(c for c in unicodedata.normalize("NFD", base) if unicodedata.category(c) != "Mn")
    if not re.search("[AEIOU]", plano) or base in SIGLAS_DELETREADAS:
        return silabas_sigla(base)
    if RE_PRONUNCIABLE.match(plano) or len(plano) >= 5:
        return silabas_palabra(base)
    return silabas_sigla(base)


UNIDADES = ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece", "catorce",
            "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro",
            "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve"]
DECENAS = {3: "treinta", 4: "cuarenta", 5: "cincuenta", 6: "sesenta", 7: "setenta", 8: "ochenta", 9: "noventa"}
CENTENAS = {1: "ciento", 2: "doscientos", 3: "trescientos", 4: "cuatrocientos", 5: "quinientos", 6: "seiscientos", 7: "setecientos",
            8: "ochocientos", 9: "novecientos"}


def entero_a_palabras(n):
    """Número entero en palabras, para contar sus sílabas. Más de 12 cifras se lee cifra por cifra."""
    if n < 30:
        return UNIDADES[n]
    if n < 100:
        d, u = divmod(n, 10)
        return DECENAS[d] + (f" y {UNIDADES[u]}" if u else "")
    if n == 100:
        return "cien"
    if n < 1000:
        c, r = divmod(n, 100)
        return CENTENAS[c] + (f" {entero_a_palabras(r)}" if r else "")

    def multiplicador(m):
        t = entero_a_palabras(m)
        return re.sub(r"uno$", "un", t)

    if n < 10 ** 6:
        m, r = divmod(n, 1000)
        return ("mil" if m == 1 else multiplicador(m) + " mil") + (f" {entero_a_palabras(r)}" if r else "")
    if n < 10 ** 12:
        m, r = divmod(n, 10 ** 6)
        return ("un millón" if m == 1 else multiplicador(m) + " millones") + (f" {entero_a_palabras(r)}" if r else "")
    return " ".join(UNIDADES[int(c)] for c in str(n))


def numero_a_palabras(s):
    """Cifras como se leen: 1.000 mil, 3,5 tres coma cinco, 2026 dos mil veintiséis; con ceros a la izquierda, cifra por cifra."""
    if re.fullmatch(r"\d{1,3}(?:\.\d{3})+", s):
        s = s.replace(".", "")
    if re.fullmatch(r"\d+[.,]\d+", s):
        ent, dec = re.split(r"[.,]", s)
        cola = entero_a_palabras(int(dec)) if len(dec) <= 2 and dec[0] != "0" else " ".join(UNIDADES[int(c)] for c in dec)
        return f"{numero_a_palabras(ent)} coma {cola}"
    s = re.sub(r"[.,]", "", s)
    if len(s) > 1 and s[0] == "0":
        return " ".join(UNIDADES[int(c)] for c in s)
    return entero_a_palabras(int(s))


def silabas_token(tok):
    """Sílabas con que se lee una palabra del guion tal como viene: puntuación pegada, guiones, cifras, siglas y símbolos."""
    total = 0
    for parte in re.findall(r"\d+(?:[.,]\d+)*|[^\W\d_]+(?:['’][^\W\d_]+)*|[%&+=@$€°#]", tok):
        if parte[0].isdigit():
            total += sum(silabas_palabra(w) for w in numero_a_palabras(parte).split())
        elif parte in SIMBOLOS:
            total += SIMBOLOS[parte]
        else:
            total += silabas_letras(parte)
    return float(total) if total else 0.25  # una raya suelta ocupa algo de tiempo, poco


def clave(tok):
    return re.sub(r"[^a-z0-9ñ]", "", "".join(c for c in unicodedata.normalize("NFD", tok.lower()) if unicodedata.category(c) != "Mn"))


def peso_token(tok):
    """Cuánto tiempo ocupa una palabra respecto a las demás, en unidades de «sílaba típica»."""
    s = silabas_token(tok)
    if s == 0.25:  # una raya o un signo suelto: ocupa algo de tiempo, sin acento
        return s
    consonantes = len(re.findall(r"[bcdfghjklmnñpqrstvwxyz]", clave(tok)))
    return s + AJUSTE["acento"] + AJUSTE["consonante"] * consonantes


def pesos_del_tramo(guion, voz):
    """Peso de cada palabra del guion. Si hay texto de voz distinto, el total de cada tramo cambiado se toma de lo que se dice."""
    g = guion.split()
    pesos = [peso_token(t) for t in g]
    if not voz or voz.split() == g:
        return g, pesos
    v = voz.split()
    ops = difflib.SequenceMatcher(None, [clave(t) for t in g], [clave(t) for t in v], autojunk=False).get_opcodes()
    for op, i1, i2, j1, j2 in ops:
        if op == "replace" and i2 > i1:
            dicho = sum(peso_token(t) for t in v[j1:j2])
            propio = sum(pesos[i1:i2])
            for k in range(i1, i2):
                pesos[k] *= dicho / propio
        elif op == "insert" and i1 > 0:  # algo que se dice y no se escribe: su tiempo se le suma a la palabra anterior
            pesos[i1 - 1] += sum(peso_token(t) for t in v[j1:j2])
    return g, pesos


# ------------------------------------------------------------------------------------------------------ reparto en el audio

def corridas(sonoro, a=0.0, b=None):
    """Tramos con voz entre a y b: [[inicio, fin], ...] en segundos."""
    n = len(sonoro)
    i, fin = int(round(a / PASO)), n if b is None else min(n, int(round(b / PASO)))
    salida = []
    while i < fin:
        if not sonoro[i]:
            i += 1
            continue
        j = i
        while j < fin and sonoro[j]:
            j += 1
        salida.append([i * PASO, j * PASO])
        i = j
    return salida


def mapa_de_pausas(db):
    """Marca los cuadros de nivel bajo respecto a la voz (más sensible que mapa_de_voz, que solo ve el silencio casi digital)."""
    alto = float(np.percentile(db[db > -90], 95)) if (db > -90).any() else -20.0
    return db < alto - PAUSA_DB


def huecos_internos(bajo, a, b, minimo):
    """Silencios de al menos «minimo» segundos estrictamente dentro de (a, b): [(inicio, fin), ...]."""
    n = len(bajo)
    i, fin = int(round(a / PASO)), min(n, int(round(b / PASO)))
    salida = []
    while i < fin:
        if not bajo[i]:
            i += 1
            continue
        j = i
        while j < fin and bajo[j]:
            j += 1
        if (j - i) * PASO >= minimo and i > int(round(a / PASO)) and j < fin:
            salida.append((i * PASO, j * PASO))
        i = j
    return salida


def emparejar(esperados, huecos, tol):
    """Empareja cada puntuación con un silencio hallado, en orden y sin cruces. Devuelve {n.º de puntuación: hueco}.

    Cuesta más el silencio lejano de donde toca y el muy corto (una consonante oclusiva no es una pausa). Una puntuación sin pareja
    cuesta SALTO: se queda sin pausa antes que forzar un silencio dudoso.
    """
    SALTO = EMPAREJA["salto"]
    k, m = len(esperados), len(huecos)
    f = [[0.0] * (m + 1) for _ in range(k + 1)]
    como = {}
    for i in range(1, k + 1):
        f[i][0] = i * SALTO
    for i in range(1, k + 1):
        for j in range(1, m + 1):
            mejor, h = f[i][j - 1], "g"
            if f[i - 1][j] + SALTO < mejor:
                mejor, h = f[i - 1][j] + SALTO, "c"
            g0, g1 = huecos[j - 1]
            d = abs((g0 + g1) / 2 - esperados[i - 1])
            if d <= tol:
                costo = f[i - 1][j - 1] + d / tol + EMPAREJA["corto"] * (1 - min((g1 - g0) / EMPAREJA["ideal"], 1))
                if costo < mejor:
                    mejor, h = costo, "m"
            f[i][j], como[(i, j)] = mejor, h
    i, j, pares = k, m, {}
    while i > 0 and j > 0:
        h = como[(i, j)]
        if h == "g":
            j -= 1
        elif h == "c":
            i -= 1
        else:
            pares[i - 1] = huecos[j - 1]
            i, j = i - 1, j - 1
    return pares


def repartir(tokens, pesos, a, b, bajo, huecos=True, hueco_min=0.06):
    """Reparte las palabras de un bloque de voz entre a y b por peso, respetando las pausas de puntuación que el audio confirma."""
    n = len(tokens)
    cortes = [j for j in range(n - 1) if RE_CORTE.search(tokens[j])] if huecos else []
    pares = {}
    if cortes:
        candidatos = huecos_internos(bajo, a, b, hueco_min)
        if candidatos:
            acum, total = np.cumsum(pesos), float(np.sum(pesos))
            habla = max(0.5 * (b - a), (b - a) - len(cortes) * PAUSA_INTERNA)
            esperados = [a + habla * acum[j] / total + (q + 0.5) * PAUSA_INTERNA for q, j in enumerate(cortes)]
            for q, hueco in emparejar(esperados, candidatos, max(0.3, 0.15 * (b - a))).items():
                pares[cortes[q]] = hueco
    despues = sorted(pares)
    salida = []
    for q, (i0, i1) in enumerate(zip([0] + [j + 1 for j in despues], despues + [n - 1])):
        s = a if q == 0 else pares[despues[q - 1]][1]
        e = b if q == len(despues) else pares[despues[q]][0]
        w = np.array(pesos[i0:i1 + 1], float)
        w[-1] *= 1 + AJUSTE["final"]  # la última palabra antes de una pausa o del punto se alarga
        cortes_t = s + (e - s) * np.concatenate([[0], np.cumsum(w)]) / w.sum()
        salida += [{"palabra": tokens[i0 + r], "inicio": float(cortes_t[r]), "fin": float(cortes_t[r + 1])} for r in range(len(w))]
    return salida, len(pares)


# ---------------------------------------------------------------------------------------------------------------- audio

def decodificar(ruta, sr=SR):
    crudo = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(ruta), "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"],
                           capture_output=True, check=True).stdout
    return np.frombuffer(crudo, np.float32)


def remuestrear(x, sr):
    if sr == SR:
        return x
    crudo = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-f", "f32le", "-ar", str(sr), "-ac", "1", "-i", "-", "-ar", str(SR),
                            "-f", "f32le", "-"], input=np.asarray(x, np.float32).tobytes(), capture_output=True, check=True).stdout
    return np.frombuffer(crudo, np.float32)


def escribir_audio(x, salida):
    Path(salida).parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", "-ar", "48000", str(salida)],
                   input=np.asarray(x, np.float32).tobytes(), check=True)


def _hablar():
    ruta = str(AQUI.parent / "tts")
    if ruta not in sys.path:
        sys.path.insert(0, ruta)
    try:
        import hablar
    except ImportError:
        falla(f"no encuentro tools/tts/hablar.py junto a esta herramienta ({ruta}).")
    return hablar


def recortar(x):
    """Quita el silencio de los extremos de un tramo (el mismo criterio que hablar.py). Devuelve el audio y las muestras quitadas al inicio."""
    return _hablar().recortar(x, sr=SR, margen=0.02)


def motor_kokoro(voz, velocidad, idioma):
    """Devuelve hablar(texto) -> (muestras a SR, marcas del motor o None). El modelo se carga una vez."""
    try:
        import espeakng_loader
        from kokoro_onnx import Kokoro
    except ImportError:
        falla("falta kokoro-onnx. Instala con: pip install kokoro-onnx soundfile")
    h = _hablar()
    modelo = h.bajar(f"{h.KOKORO}/kokoro-v1.0.int8.onnx", h.CACHE / "kokoro-v1.0.int8.onnx")
    voces = h.bajar(f"{h.KOKORO}/voices-v1.0.bin", h.CACHE / "voices-v1.0.bin")
    h.espeak_con_ruta_ascii(espeakng_loader.get_data_path())  # espeak-ng cierra sin avisar si la ruta tiene eñes
    motor = Kokoro(str(modelo), str(voces))

    def hablar(texto):
        muestras, sr = motor.create(texto, voice=voz, speed=velocidad, lang=idioma)
        return remuestrear(np.asarray(muestras, np.float32), sr), None

    return hablar


def motor_edge(voz, velocidad):
    try:
        import edge_tts
    except ImportError:
        falla("falta edge-tts. Instala con: pip install edge-tts")
    rate = f"{round((velocidad - 1) * 100):+d}%"

    async def correr(texto, destino):
        com = edge_tts.Communicate(texto, voz, rate=rate, boundary="WordBoundary")
        marcas = []
        with open(destino, "wb") as f:
            async for bloque in com.stream():
                if bloque["type"] == "audio":
                    f.write(bloque["data"])
                elif bloque["type"] == "WordBoundary":
                    marcas.append({"palabra": bloque["text"], "inicio": round(bloque["offset"] / 1e7, 3),
                                   "fin": round((bloque["offset"] + bloque["duration"]) / 1e7, 3)})
        return marcas

    def hablar(texto):
        with tempfile.TemporaryDirectory() as d:
            mp3 = Path(d) / "tramo.mp3"
            try:
                marcas = asyncio.run(asyncio.wait_for(correr(texto, mp3), 60))
            except Exception as e:  # sin internet, voz inexistente o servicio caído
                falla(f"Edge no respondió ({type(e).__name__}: {e}). Necesita internet; si no hay, usa --motor kokoro.")
            x = decodificar(mp3)
            try:
                marcas = refinar(marcas, mp3, desfase_global=True)  # Edge marca parejo antes de lo que suena
            except (OSError, ValueError, subprocess.CalledProcessError):
                pass
        return x, marcas

    return hablar


def leer_tramos(ruta):
    try:
        datos = json.loads(Path(ruta).read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        falla(f"no pude leer {ruta} como JSON: {e}")
    if not isinstance(datos, list) or not datos:
        falla(f"{ruta} debe ser una lista no vacía de tramos: [{{\"guion\": \"...\", \"voz\": \"...\", \"pausa_antes\": 0.4}}, ...]")
    tramos = []
    for i, t in enumerate(datos):
        if isinstance(t, str):
            t = {"guion": t}
        if not isinstance(t, dict) or not str(t.get("guion", "")).strip():
            falla(f"el tramo {i} no tiene \"guion\" con texto.")
        t = {**t, "guion": str(t["guion"]), "voz": str(t["voz"]) if t.get("voz") else None}
        pausa = t.get("pausa_antes")
        if pausa is not None and (isinstance(pausa, bool) or not isinstance(pausa, (int, float)) or pausa < 0):
            falla(f"el tramo {i} trae pausa_antes={pausa!r}: debe ser un número de segundos, 0 o más.")
        tramos.append({"guion": t["guion"].strip(), "voz": (t["voz"] or t["guion"]).strip(), "pausa_antes": pausa})
    return tramos


def palabras_de_tramos(tramos, posiciones, db, huecos=True, hueco_min=0.06):
    """Reparte las palabras de cada tramo entre sus bordes reales de voz. posiciones: [(inicio, fin)] de cada tramo en segundos."""
    sonoro, bajo = mapa_de_voz(db), mapa_de_pausas(db)
    palabras, internas = [], 0
    for t, (ini, fin) in zip(tramos, posiciones):
        tokens, pesos = pesos_del_tramo(t["guion"], t["voz"])
        voces = corridas(sonoro, ini, fin)  # los bordes reales de la voz dentro del tramo
        if voces:
            ini, fin = voces[0][0], voces[-1][1]
        w, usadas = repartir(tokens, pesos, ini, fin, bajo, huecos, hueco_min)
        t["_palabras"] = (len(palabras), len(palabras) + len(w) - 1)
        palabras += w
        internas += usadas
    return palabras, internas


def generar(a):
    if not shutil.which("ffmpeg"):
        falla("hace falta ffmpeg.")
    tramos = leer_tramos(a.tramos)
    voz = a.voz or ("em_alex" if a.motor == "kokoro" else "es-CO-GonzaloNeural")
    hablar = motor_kokoro(voz, a.velocidad, a.idioma) if a.motor == "kokoro" else motor_edge(voz, a.velocidad)

    piezas, posiciones, marcas_motor = [], [], []
    cursor = 0  # muestras acumuladas
    for i, t in enumerate(tramos):
        # Entre tramos manda su pausa_antes o --pausa. Antes del primero, --inicio más su pausa_antes si la trae (la pausa por defecto no cuenta).
        pausa = t["pausa_antes"] if t["pausa_antes"] is not None else (0.0 if i == 0 else a.pausa)
        silencio = int(round((a.inicio + pausa if i == 0 else pausa) * SR))
        piezas.append(np.zeros(silencio, np.float32))
        cursor += silencio
        x, marcas = hablar(t["voz"])
        if not len(x):
            falla(f"el motor no devolvió audio para el tramo {i}: «{t['voz']}»")
        y, quitado = recortar(x)
        piezas.append(y)
        posiciones.append((cursor, cursor + len(y)))
        if marcas:
            corrido = cursor / SR - quitado / SR
            marcas_motor += [{"palabra": m["palabra"], "inicio": round(max(cursor / SR, m["inicio"] + corrido), 3),
                              "fin": round(max(cursor / SR, m["fin"] + corrido), 3)} for m in marcas]
        cursor += len(y)
        print(f"tramo {i + 1}/{len(tramos)}: {len(y) / SR:.2f} s", file=sys.stderr)
    escribir_audio(np.concatenate(piezas), a.salida)

    palabras, internas = palabras_de_tramos(tramos, [(p0 / SR, p1 / SR) for p0, p1 in posiciones], energia_db(a.salida), not a.sin_huecos, a.hueco_min)
    palabras = refinar(palabras, a.salida)
    escribir_json(a.palabras, palabras)
    bloques = [{"tramo": i, "inicio": round(p0 / SR, 3), "fin": round(p1 / SR, 3), "guion": t["guion"], "palabras": list(t["_palabras"])}
               for i, (t, (p0, p1)) in enumerate(zip(tramos, posiciones))]
    ruta_tramos = a.tramos_salida or str(Path(a.palabras).with_name(Path(a.palabras).stem + "_tramos.json"))
    escribir_json(ruta_tramos, bloques)
    if a.marcas_motor and marcas_motor:
        escribir_json(a.marcas_motor, marcas_motor)
    print(json.dumps({"ok": True, "modo": "generar", "motor": a.motor, "voz": voz, "tramos": len(tramos), "palabras": len(palabras),
                      "pausas_internas": internas, "fin_voz": palabras[-1]["fin"], "duracion": round(cursor / SR, 3), "salida": str(a.salida),
                      "palabras_json": str(a.palabras), "tramos_json": ruta_tramos}, ensure_ascii=False))


# ---------------------------------------------------------------------------------------------------------------- medir

def partir_oraciones(texto):
    """Igual que hablar.py --por-oraciones, para que las oraciones coincidan con las tomas."""
    return [f.strip() for f in re.split(r"(?<=[.?!…])\s+", texto.strip()) if f.strip()]


def bloques_de_voz(sonoro, pausa_min):
    """Une los tramos con voz separados por menos de pausa_min: quedan las oraciones. Devuelve bloques y huecos entre tramos."""
    tramos = corridas(sonoro)
    if not tramos:
        return [], []
    bloques = [tramos[0][:]]
    for t in tramos[1:]:
        if t[0] - bloques[-1][1] < pausa_min:
            bloques[-1][1] = t[1]
        else:
            bloques.append(t[:])
    return bloques, [y[0] - x[1] for x, y in zip(tramos, tramos[1:])]


def medir(a):
    if not shutil.which("ffmpeg"):
        falla("hace falta ffmpeg.")
    try:
        guion = Path(a.guion).read_text(encoding="utf-8")
    except OSError as e:
        falla(f"no pude leer {a.guion}: {e}")
    oraciones = partir_oraciones(guion)
    if not oraciones:
        falla("el guion está vacío.")
    voz_orac = [None] * len(oraciones)
    if a.texto_voz:
        voz_orac = partir_oraciones(Path(a.texto_voz).read_text(encoding="utf-8"))
        if len(voz_orac) != len(oraciones):
            falla(f"{a.texto_voz} tiene {len(voz_orac)} oraciones y {a.guion}, {len(oraciones)}. Deben coincidir una a una.")
    try:
        db = energia_db(a.audio)
    except (subprocess.CalledProcessError, ValueError) as e:
        falla(f"no pude leer el audio {a.audio}: {e}")
    sonoro, bajo = mapa_de_voz(db), mapa_de_pausas(db)
    todos = corridas(sonoro)
    if not todos:
        falla(f"no hay voz en {a.audio}.")
    huecos = sorted((y[0] - x[1] for x, y in zip(todos, todos[1:])), reverse=True)
    n = len(oraciones)
    if str(a.pausa_min).lower() == "auto":
        if len(huecos) < n - 1:
            falla(f"con {n} oraciones hacen falta {n - 1} silencios entre ellas y el audio solo tiene {len(huecos)}. ¿Se generó sin --por-oraciones?")
        corte = huecos[n - 2] if n > 1 else 0.0
        siguiente = huecos[n - 1] if len(huecos) >= n else 0.0
        if n > 1 and (corte < 0.15 or corte < 1.25 * siguiente):
            falla(f"los {n - 1} silencios más largos ({corte:.2f} s el más corto) no se distinguen de los de dentro de una oración ({siguiente:.2f} s). "
                  "Genera con una pausa mayor entre oraciones o usa tramos.")
        pausa_min = (corte + siguiente) / 2 if n > 1 else 1e9
        if n == 1:
            pausa_min = 1e9
    else:
        pausa_min = float(a.pausa_min)
    bloques, _ = bloques_de_voz(sonoro, pausa_min)
    if len(bloques) != n:
        msg = f"hallé {len(bloques)} bloque(s) de voz para {n} oración(es) con --pausa-min {pausa_min:g}."
        if len(huecos) >= n - 1 and n > 1:
            lo, hi = (huecos[n - 1] if len(huecos) >= n else 0.0), huecos[n - 2]
            if hi > lo:
                msg += f" Con --pausa-min entre {lo:.2f} y {hi:.2f} saldrían {n} (o usa --pausa-min auto)."
        elif n > 1:
            msg += " El audio tiene menos silencios que oraciones: ¿se generó sin --por-oraciones?"
        falla(msg)
    palabras, internas, tramos = [], 0, []
    for i, ((ini, fin), oracion, voz) in enumerate(zip(bloques, oraciones, voz_orac)):
        tokens, pesos = pesos_del_tramo(oracion, voz)
        w, usadas = repartir(tokens, pesos, ini, fin, bajo, not a.sin_huecos, a.hueco_min)
        tramos.append({"tramo": i, "inicio": round(ini, 3), "fin": round(fin, 3), "guion": oracion, "palabras": [len(palabras), len(palabras) + len(w) - 1]})
        palabras += w
        internas += usadas
    palabras = refinar(palabras, a.audio)
    escribir_json(a.salida, palabras)
    if a.tramos_salida:
        escribir_json(a.tramos_salida, tramos)
    print(json.dumps({"ok": True, "modo": "medir", "oraciones": n, "palabras": len(palabras), "pausas_internas": internas,
                      "fin_voz": palabras[-1]["fin"], "salida": str(a.salida)}, ensure_ascii=False))


def escribir_json(ruta, datos):
    Path(ruta).parent.mkdir(parents=True, exist_ok=True)
    Path(ruta).write_text(json.dumps(datos, ensure_ascii=False, indent=1), encoding="utf-8")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="modo", required=True, metavar="{generar,medir}")

    g = sub.add_parser("generar", help="Genera la voz por tramos y los tiempos de palabra a la vez", description="Genera la voz tramo a tramo, la une con silencios reales y escribe los tiempos de palabra.")
    g.add_argument("tramos", help="JSON con la lista de tramos: guion, voz (opcional) y pausa_antes (opcional)")
    g.add_argument("--salida", required=True, help="Audio de salida (.wav recomendado; la extensión decide el formato)")
    g.add_argument("--palabras", required=True, help="JSON de salida con los tiempos de palabra")
    g.add_argument("--tramos-salida", help="JSON de salida con el inicio y el fin de cada tramo (por defecto <palabras>_tramos.json)")
    g.add_argument("--motor", choices=["kokoro", "edge"], default="kokoro", help="kokoro (local, por defecto) o edge (internet, sin llave)")
    g.add_argument("--voz", help="Voz del motor (kokoro: em_alex por defecto, ef_dora, em_santa; edge: es-CO-GonzaloNeural por defecto)")
    g.add_argument("--velocidad", type=float, default=1.0, help="1.0 es normal; 0.8 a 1.3 suena natural")
    g.add_argument("--idioma", default="es-419", help="Solo kokoro: es-419 para Latinoamérica (por defecto), es para España")
    g.add_argument("--pausa", type=float, default=0.3, help="Segundos de silencio entre tramos cuando el tramo no trae pausa_antes (0.3)")
    g.add_argument("--inicio", type=float, default=0.1, help="Segundos de silencio antes del primer tramo (0.1)")
    g.add_argument("--marcas-motor", help="Solo edge: JSON con las marcas de palabra del propio Edge, en la línea de tiempo final, para comparar")
    g.add_argument("--sin-huecos", action="store_true", help="No buscar en el audio las pausas de coma: reparte todo el tramo por sílabas")
    g.add_argument("--hueco-min", type=float, default=0.06, help="Silencio mínimo, en segundos, para contarlo como pausa de coma (0.06)")
    g.set_defaults(func=generar)

    m = sub.add_parser("medir", help="Solo los tiempos de un audio ya generado, hallando las oraciones por sus silencios", description="Halla las oraciones del guion en un audio por sus silencios reales y reparte las palabras.")
    m.add_argument("--audio", required=True, help="Audio con un silencio claro entre oraciones (p. ej. hablar.py --por-oraciones)")
    m.add_argument("--guion", required=True, help="Guion literal en UTF-8: de ahí sale el texto de cada palabra")
    m.add_argument("--salida", required=True, help="JSON de salida con los tiempos de palabra")
    m.add_argument("--texto-voz", help="Copia del guion que se le dio al motor (con las cifras escritas, p. ej.), con las mismas oraciones")
    m.add_argument("--pausa-min", default="0.3", help="Silencio, en segundos, que separa dos oraciones (0.3), o auto: los huecos más largos")
    m.add_argument("--tramos-salida", help="JSON de salida con el inicio y el fin hallados para cada oración")
    m.add_argument("--sin-huecos", action="store_true", help="No buscar en el audio las pausas de coma: reparte toda la oración por sílabas")
    m.add_argument("--hueco-min", type=float, default=0.06, help="Silencio mínimo, en segundos, para contarlo como pausa de coma (0.06)")
    m.set_defaults(func=medir)

    a = p.parse_args()
    a.func(a)


if __name__ == "__main__":
    main()
