#!/usr/bin/env python3
"""De la toma en bruto a la toma limpia: varios intentos de cada frase, hablando a cámara, y un guion.

Para quien graba la misma frase hasta que sale bien. Encuentra todos los intentos de cada frase del guion, elige el mejor
(el último intento completo que más se parece al guion, salvo razón mejor), quita los fallidos, las pausas largas y las
muletillas, y deja la toma limpia sin saltos de audio. Corre en dos pasos, para que una persona o una IA revise entre ambos.

Uso:
  python tools/material/toma.py analizar toma.mp4 --guion guion.txt --salida .
  python tools/material/toma.py analizar toma.mp4 --guion guion.txt --salida . --transcripcion transcripcion.json   (sin llamar a Whisper)
  (revisa cortes.json y hoja-aprobacion.jpg: cambia inicio/fin, pon "activo": false o reordena los tramos)
  python tools/material/toma.py renderizar cortes.json

`analizar` escribe en --salida:
  cortes.json            los tramos que se conservan, con la razón de cada decisión, y todos los intentos de cada frase
  transcripcion.json     palabras con tiempos (se reutiliza: no vuelve a transcribir)
  hoja-aprobacion.jpg    un par de cuadros en cada corte: el que sale y el que entra
`renderizar` escribe:
  toma-limpia.mp4        los tramos activos, en el orden de la lista, con un cruce de audio de 40 ms en cada corte
  assets/tiempos.json    retemporizado con el mismo formato que deja tools/pista.py voz: palabras, pausas, grupos, fin_voz, dur
  assets/voz/voz.wav     la voz de la toma limpia, para pista.py mezcla; y assets/voz/palabras.json, renders/final.srt
Con --salida . dentro de tu proyecto, el resto de Claqueta encuentra esos archivos donde los espera.

Cómo decide:
  1. Cada oración del guion se busca en la transcripción con un alineamiento local (Smith-Waterman) que tolera palabras
     de más y de menos y errores de oído de Whisper; se repite hasta no hallar más intentos de esa oración.
  2. Un intento es completo si cubre al menos --cobertura del texto y acierta el principio y el final.
  3. Entre los completos gana el último, salvo que otro sea más fiel al guion por más de 0,06 (puntaje 0 a 1).
  4. En el intento elegido se quitan las muletillas, el tartamudeo, los reinicios a mitad de frase (un tramo que se repite
     enseguida: se queda la repetición) y las pausas de más de --pausa-max (se dejan --pausa-deja). Una palabra de más
     que no es nada de eso se deja y se avisa.
  5. Cada corte cae en un silencio medido en el audio, no en el tiempo de Whisper, y en un cuadro entero.
Lo que Whisper no escribe no se puede quitar por su texto: muchas muletillas sueltas no aparecen en la transcripción.
Quedan las pausas, que sí se miden en el audio. A Whisper no se le pasa el guion como pista (se salta las frases que ya
"leyó"): solo los nombres propios y siglas del guion, más los de --glosario, y el permiso de escribir «eh».

Método inspirado en kurbaitaev/ghost-editor (MIT), scripts/takes.py y scripts/plan_cut.py: alineamiento local con máscara
para hallar todos los intentos, y bordes de corte apoyados en la envolvente de energía.
"""
import argparse
import difflib
import functools
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import comun  # noqa: E402
from comun import Voz, a_rejilla, aviso, escribir_json, leer_json, salir, t_txt  # noqa: E402

G_IZQ = 1.0      # costo de una palabra de más dentro de un intento
G_ARR = 0.8      # costo de una palabra del guion que falta
SUSTITUIR = 1.0  # costo de cambiar una palabra por otra
MULETILLAS_BASE = {"este", "esto"}
PATRON_MULETILLA = re.compile(r"^(e{2,}h*|e+h+|e+m+|a+h+|u+h+m*|u+m+|m{2,}h*|h+m+)$")


# ---------- guion ----------

def normal(p):
    from alinear import normal as n
    return n(p)


def partir_guion(texto, unidad):
    """Una unidad por oración (o por línea). Las de menos de 4 palabras se pegan a la vecina: sueltas no se hallan bien."""
    unidades = []
    for linea in (l.strip() for l in texto.splitlines()):
        if not linea:
            continue
        partes = [linea] if unidad == "linea" else re.split(r"(?<=[.!?…])\s+(?=[¿¡«\"“(A-ZÁÉÍÓÚÜÑ0-9])", linea)
        fus = []
        for p in partes:
            if fus and len(fus[-1].split()) < 4:
                fus[-1] += " " + p
            else:
                fus.append(p)
        if len(fus) > 1 and len(fus[-1].split()) < 4:
            fus[-2] += " " + fus.pop()
        unidades += fus
    salida = []
    for texto_u in unidades:
        orig = [w for w in texto_u.split() if normal(w)]
        if len(orig) < 2:
            aviso(f"se ignora «{texto_u}»: una sola palabra no se puede buscar con seguridad")
            continue
        salida.append({"id": len(salida) + 1, "texto": texto_u, "orig": orig, "toks": [normal(w) for w in orig]})
    if not salida:
        salir("el guion no tiene frases")
    return salida


def glosario(texto):
    """Nombres propios y siglas del guion: se le dan a Whisper para que los escriba bien. Nunca el guion mismo:
    con el texto en el prompt, Whisper da por dicho lo que oye igual y se salta esas frases."""
    nombres = []
    for linea in texto.splitlines():
        previa = ""
        for w in linea.split():
            limpia = w.strip(".,;:!?¿¡«»\"“”()…")
            principio = not previa or bool(re.search(r"[.!?…:]$", previa))
            if limpia and limpia.isalpha() and len(limpia) > 1 and ((limpia[0].isupper() and not principio) or limpia.isupper()) and limpia not in nombres:
                nombres.append(limpia)
            previa = w
    return nombres[:20]


# ---------- alineamiento ----------

# El alineamiento local sobre palabras normalizadas, con igualdad difusa y repetido con una máscara para hallar todos los
# intentos, sigue el método de scripts/takes.py de kurbaitaev/ghost-editor (MIT, © 2026 kurbaitaev). Aquí está reescrito:
# vectorizado por filas, con otros costos y sin la parte de caras. Los bordes de corte en silencio, con 0,10 s de entrada y 0,18 s
# de cola, vienen de scripts/plan_cut.py del mismo proyecto.

@functools.lru_cache(maxsize=None)
def similitud(a, b):
    """De 0 a 1 cuánto se parecen dos palabras ya normalizadas. 0 si no son la misma palabra."""
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    from alinear import fonetica
    if fonetica(a) == fonetica(b):
        return 0.95
    if min(len(a), len(b)) >= 4:
        if a[:4] == b[:4]:
            return 0.8
        r = difflib.SequenceMatcher(None, a, b).ratio()
        if r >= 0.72:
            return min(0.9, r)
    return 0.0


def matriz_similitud(toks, ptoks):
    unicos = sorted(set(ptoks))
    pos = {t: i for i, t in enumerate(unicos)}
    inv = np.array([pos[t] for t in ptoks])
    filas = [np.array([similitud(t, u) for u in unicos]) for t in toks]
    return np.stack(filas)[:, inv]


def alinear_local(S, libres):
    """El mejor alineamiento local entre las palabras del guion (filas) y las oídas (columnas) dentro de las columnas libres.
    Devuelve (puntaje, camino) con camino = [(i guion o None, j oída o None, acierto)] o (0, None)."""
    mejor = (0.0, None)
    for lo, hi in libres:
        sub = S[:, lo:hi]
        n, m = sub.shape
        if m < 2:
            continue
        H = np.zeros((n + 1, m + 1))
        idx = np.arange(m + 1) * G_IZQ
        for i in range(1, n + 1):
            s = sub[i - 1]
            diag = H[i - 1, :-1] + np.where(s > 0, 2.0 * s, -SUSTITUIR)
            arriba = H[i - 1, 1:] - G_ARR
            cand = np.zeros(m + 1)
            cand[1:] = np.maximum(0.0, np.maximum(diag, arriba))
            H[i] = np.maximum.accumulate(cand + idx) - idx
        i, j = (int(x) for x in np.unravel_index(np.argmax(H), H.shape))
        if H[i, j] <= mejor[0]:
            continue
        camino = []
        while i > 0 and j > 0 and H[i, j] > 1e-9:
            v, s = H[i, j], sub[i - 1, j - 1]
            if np.isclose(v, H[i - 1, j - 1] + (2.0 * s if s > 0 else -SUSTITUIR)):
                camino.append((i - 1, lo + j - 1, bool(s > 0)))
                i, j = i - 1, j - 1
            elif np.isclose(v, H[i - 1, j] - G_ARR):
                camino.append((i - 1, None, False))
                i -= 1
            elif np.isclose(v, H[i, j - 1] - G_IZQ):
                camino.append((None, lo + j - 1, False))
                j -= 1
            else:
                break
        mejor = (float(H.max()), camino[::-1])
    return mejor


def restar_rango(libres, j0, j1):
    salida = []
    for lo, hi in libres:
        if j1 <= lo or j0 >= hi:
            salida.append((lo, hi))
            continue
        if j0 - lo >= 2:
            salida.append((lo, j0))
        if hi - j1 >= 2:
            salida.append((j1, hi))
    return salida


def es_muletilla(palabra, extra):
    n = normal(palabra)
    return bool(n) and (bool(PATRON_MULETILLA.match(n)) or n in MULETILLAS_BASE or n in extra)


def buscar_intentos(u, W, S):
    """Todos los intentos de la oración u en la grabación, por orden de tiempo."""
    toks, n = u["toks"], len(u["toks"])
    libres, intentos = [(0, len(W))], []
    while len(intentos) < 8:
        puntaje, camino = alinear_local(S, libres)
        if not camino:
            break
        pares = [(i, j, float(S[i, j])) for i, j, ok in camino if ok]
        cambios = [(i, j) for i, j, ok in camino if i is not None and j is not None and not ok]
        if puntaje < max(3.0, 0.9 * n) or len(pares) < max(2, 0.3 * n):
            break
        js = [j for _, j, _ in camino if j is not None]
        j0, j1 = min(js), max(js)
        libres = restar_rango(libres, j0, j1 + 1)
        pj = {j: i for i, j, _ in pares}
        cubiertas = set(pj) | {j for _, j in cambios}
        holgura = 1 if n >= 5 else 0
        ui = [i for i, _, _ in pares]
        intentos.append({
            "j0": j0, "j1": j1, "pares": pares, "pj": pj,
            "cobertura": len(pares) / n, "fidelidad": sum(s for _, _, s in pares) / n,
            "ini_ok": min(ui) <= holgura, "fin_ok": max(ui) >= n - 1 - holgura,
            "faltan": [toks[i] for i in range(n) if i not in set(ui) and i not in {i for i, _ in cambios}],
            "cambios": cambios, "cubiertas": cubiertas,
        })
    intentos.sort(key=lambda a: a["j0"])
    return intentos


def veces_en_guion(u, frag):
    """Cuántas veces aparece el fragmento (lista de palabras normalizadas) en el guion de la oración."""
    t, n = u["toks"], len(frag)
    return sum(1 for i in range(len(t) - n + 1) if all(similitud(t[i + k], frag[k]) >= 0.8 for k in range(n)))


def extender(a, W, ocupado, tope=0.2):
    """Suma al intento las palabras pegadas a sus bordes (menos de `tope` s de hueco) que no son de ningún otro intento:
    una muletilla antes de empezar, o una palabra que Whisper oyó distinta justo al principio o al final."""
    while a["j0"] > 0 and not ocupado[a["j0"] - 1] and W[a["j0"]]["inicio"] - W[a["j0"] - 1]["fin"] < tope:
        a["j0"] -= 1
        ocupado[a["j0"]] = True
    while a["j1"] + 1 < len(W) and not ocupado[a["j1"] + 1] and W[a["j1"] + 1]["inicio"] - W[a["j1"]]["fin"] < tope:
        a["j1"] += 1
        ocupado[a["j1"]] = True
    j0, j1 = a["j0"], a["j1"]
    probs = [W[j]["prob"] for j in range(j0, j1 + 1)]
    huecos = [W[j + 1]["inicio"] - W[j]["fin"] for j in range(j0, j1)]
    a["prob_media"] = float(np.mean(probs))
    a["hueco_max"] = max(huecos) if huecos else 0.0


def clasificar_extras(a, u, W, extra_mulet, quitar_mulet):
    """Decide qué palabras de un intento se pueden quitar con seguridad.
    Reinicios y repeticiones: un tramo de 2 o más palabras que se repite casi enseguida (hasta 3 palabras de por medio y 3 s)
    es un reinicio: se quita el primero, se queda el que sigue. Una palabra repetida pegada a sí misma es un tartamudeo.
    Muletillas: «eh», «mmm», «este»... solo si no son palabras del guion. Todo lo demás que sobra se queda y se avisa.
    Devuelve (quitables, fijas): quitables = [(j_ini, j_fin, tipo, texto)] en rachas seguidas; fijas = [j]."""
    j0, j1, cubiertas = a["j0"], a["j1"], a["cubiertas"]
    toks = [normal(W[j]["palabra"]) for j in range(j0, j1 + 1)]
    n = len(toks)
    tipo = {}
    k = 0
    while k < n - 1:
        hallado = None
        for q in range(k + 1, min(n, k + 16)):
            largo = 0
            while q + largo < n and k + largo < q and toks[k + largo] and similitud(toks[k + largo], toks[q + largo]) >= 0.8:
                largo += 1
            if largo >= 1 and q - (k + largo) <= 3 and W[j0 + q]["inicio"] - W[j0 + k + largo - 1]["fin"] <= 3.0:
                if largo >= 2 or q == k + 1:
                    if veces_en_guion(u, toks[k:k + largo]) < 2:
                        hallado = (q, largo)
                        break
        if hallado:
            q, largo = hallado
            for x in range(k, q):
                tipo[j0 + x] = "tartamudeo" if q == k + 1 else "reinicio"
            k = q
        else:
            k += 1
    for j in range(j0, j1 + 1):
        if j not in tipo and j not in cubiertas and quitar_mulet and es_muletilla(W[j]["palabra"], extra_mulet):
            tipo[j] = "muletilla"
    quitables, fijas, grupo = [], [], []

    def cerrar():
        nonlocal grupo
        if grupo:
            quitables.append((grupo[0], grupo[-1], tipo[grupo[0]], " ".join(W[x]["palabra"] for x in grupo)))
            grupo = []

    for j in range(j0, j1 + 1):
        if j in tipo and (not grupo or tipo[grupo[-1]] == tipo[j]):
            grupo.append(j)
            continue
        cerrar()
        if j in tipo:
            grupo.append(j)
        elif j not in cubiertas:
            fijas.append(j)
    cerrar()
    return quitables, fijas


def texto_guion(u, i, ptok, acertadas):
    """El texto del guion para la palabra oída. Si Whisper juntó dos palabras en una («elígelas» por «elige las»),
    se escriben las dos."""
    base = u["orig"][i]
    if i + 1 < len(u["toks"]) and (i + 1) not in acertadas and similitud(ptok, u["toks"][i] + u["toks"][i + 1]) > similitud(ptok, u["toks"][i]):
        return base + " " + u["orig"][i + 1]
    return base


def refinar_elegido(a, u, W, ptoks):
    """Alinea otra vez, ya sin lo que se va a quitar: lo que queda es lo que se oirá, y de ahí salen el texto del guion
    de cada palabra, las palabras cambiadas y las que sobran."""
    quitadas = {j for q in a["quitables"] for j in range(q[0], q[1] + 1)}
    kept = [j for j in range(a["j0"], a["j1"] + 1) if j not in quitadas]
    if len(kept) < 2:
        return
    S2 = matriz_similitud(u["toks"], [ptoks[j] for j in kept])
    _, camino = alinear_local(S2, [(0, len(kept))])
    if not camino:
        return
    acertadas = {i for i, _, ok in camino if ok}
    cubiertas, cambios = set(), []
    for i, jj, ok in camino:
        if i is None or jj is None:
            continue
        j = kept[jj]
        cubiertas.add(j)
        W[j]["guion"], W[j]["frase"] = (texto_guion(u, i, ptoks[j], acertadas) if ok else u["orig"][i]), u["id"]
        if not ok:
            cambios.append((i, j))
    # En los bordes el alineamiento local no puede cambiar una palabra por otra: si sobran tantas palabras oídas como faltan
    # del guion, se toman como cambiadas («una» por «un» al empezar).
    alineadas = sorted((i, kept[jj]) for i, jj, ok in camino if i is not None and jj is not None)
    if alineadas:
        (i0, jprimera), (i1, jultima) = alineadas[0], alineadas[-1]
        antes = [j for j in kept if j < jprimera and j not in cubiertas]
        despues = [j for j in kept if j > jultima and j not in cubiertas]
        for ids, js in ((list(range(0, i0)), antes), (list(range(i1 + 1, len(u["toks"]))), despues)):
            if js and len(ids) == len(js) and len(js) <= 2:
                for i, j in zip(ids, js):
                    cubiertas.add(j)
                    cambios.append((i, j))
                    W[j]["guion"], W[j]["frase"] = u["orig"][i], u["id"]
    a["cambios"] = cambios
    a["fijas"] = [j for j in kept if j not in cubiertas]


def puntuar(a):
    p = a["fidelidad"] - 0.01 * sum(q[1] - q[0] + 1 for q in a["quitables"]) - 0.04 * len(a["fijas"])
    if a["prob_media"] < 0.6:
        p -= 0.05
    return round(p, 3)


def elegir(intentos, cobertura_min):
    """Devuelve (elegido o None, razón) y marca estado y motivo en cada intento."""
    for a in intentos:
        a["completo"] = a["cobertura"] >= cobertura_min and a["ini_ok"] and a["fin_ok"]
    completos = [a for a in intentos if a["completo"]]
    if not intentos:
        return None, "no aparece en la grabación"
    if completos:
        mejor = max(a["puntaje"] for a in completos)
        elegibles = [a for a in completos if a["puntaje"] >= mejor - 0.06]
        e = elegibles[-1]
        ultimo = completos[-1]
        n_e = intentos.index(e) + 1
        if e is ultimo:
            razon = f"intento {n_e} de {len(intentos)}, el último completo" if len(completos) > 1 else f"intento {n_e} de {len(intentos)}, el único completo"
        else:
            razon = (f"intento {n_e} de {len(intentos)}: es más fiel al guion ({int(round(e['puntaje'] * 100))} %) "
                     f"que el último completo ({int(round(ultimo['puntaje'] * 100))} %)")
    else:
        e = max(intentos, key=lambda a: (a["cobertura"], a["j0"]))
        razon = f"ningún intento completo; se usa el de mayor cobertura ({int(round(e['cobertura'] * 100))} %)"
    for a in intentos:
        if a is e:
            a["estado"], a["motivo"] = "elegido", razon
        elif a["completo"]:
            a["estado"], a["motivo"] = "descartado", "completo, pero hay otro mejor o más tardío"
        else:
            falta = " ".join(a["faltan"][:6]) + ("…" if len(a["faltan"]) > 6 else "")
            a["estado"] = "descartado"
            a["motivo"] = f"incompleto: cobertura {int(round(a['cobertura'] * 100))} %" + (f", faltan «{falta}»" if falta else "")
    return e, razon


# ---------- tramos ----------

def restar(piezas, x, y, causa):
    """Quita x..y de las piezas; las dos mitades llevan la causa en el borde nuevo."""
    salida = []
    for p in piezas:
        if y <= p["a"] or x >= p["b"]:
            salida.append(p)
            continue
        if x - p["a"] > 0.05:
            salida.append({**p, "b": x, "ext_b": False, "causa_b": causa})
        if p["b"] - y > 0.05:
            salida.append({**p, "a": y, "ext_a": False, "causa_a": causa})
    return salida


def piezas_del_intento(a, u, W, voz, aj, quitables):
    """Convierte un intento en tramos: bordes en silencio, sin muletillas, reinicios ni pausas largas.
    Devuelve (piezas, quitados, avisos)."""
    avisos, quitados = [], []
    j0, j1 = a["j0"], a["j1"]
    ini, fin = W[j0]["inicio"], W[j1]["fin"]
    on, off = voz.inicio_real(ini), voz.fin_real(fin)
    if on is None:
        a_ = ini - 0.04
        avisos.append(f"Frase {u['id']}: la primera palabra empieza sin silencio antes ({t_txt(ini)}): el corte de entrada puede notarse")
    else:
        prev = voz.voz_previa(on)
        lead = aj["entrada"] if prev is None else max(0.0, min(aj["entrada"], on - prev - 0.03))
        a_ = on - lead
    if off is None:
        b_ = fin + 0.04
        avisos.append(f"Frase {u['id']}: la última palabra termina sin silencio después ({t_txt(fin)}): el corte de salida puede notarse")
    else:
        sig = voz.voz_siguiente(off)
        cola = aj["cola"] if sig is None else max(0.0, min(aj["cola"], sig - off - 0.03))
        b_ = off + cola
    piezas = [{"a": max(0.0, a_), "b": min(voz.dur, b_), "ext_a": True, "ext_b": True, "causa_a": None, "causa_b": None}]
    for j_a, j_b, tipo, texto in quitables:
        x = voz.valle(W[j_a]["inicio"], 0.07)
        y = voz.valle(W[j_b]["fin"], 0.07)
        x = max(x, W[j_a - 1]["fin"]) if j_a - 1 >= j0 else x
        y = min(y, W[j_b + 1]["inicio"]) if j_b + 1 <= j1 else y
        if y - x < 0.05:
            avisos.append(f"Frase {u['id']}: no se pudo quitar «{texto}» ({t_txt(W[j_a]['inicio'])}): está pegada a las palabras vecinas")
            continue
        etiqueta = f"{tipo} «{texto}»"
        piezas = restar(piezas, x, y, etiqueta)
        quitados.append({"inicio": round(x, 3), "fin": round(y, 3), "dura": round(y - x, 3), "tipo": tipo, "detalle": f"«{texto}»", "frase": u["id"]})
    cambio = True
    while cambio:
        cambio = False
        for p in piezas:
            for s0, s1 in voz.silencios(p["a"], p["b"], aj["pausa_max"]):
                x, y = s0 + aj["pausa_deja"] * 0.55, s1 - aj["pausa_deja"] * 0.45
                if y - x > 0.02:
                    piezas = restar(piezas, x, y, f"pausa de {s1 - s0:.1f} s")
                    quitados.append({"inicio": round(x, 3), "fin": round(y, 3), "dura": round(y - x, 3), "tipo": "pausa", "detalle": f"silencio de {s1 - s0:.2f} s", "frase": u["id"]})
                    cambio = True
                    break
            if cambio:
                break
    piezas.sort(key=lambda p: p["a"])
    pulidas = []
    for p in piezas:
        f = voz.voz_siguiente(p["a"], tope=p["b"] - p["a"])
        l = voz.voz_previa(p["b"], tope=p["b"] - p["a"])
        if f is None or l is None or l - f < 0.08:
            quitados.append({"inicio": round(p["a"], 3), "fin": round(p["b"], 3), "dura": round(p["b"] - p["a"], 3), "tipo": "sin voz", "detalle": "trozo sin palabras", "frase": u["id"]})
            continue
        if not p["ext_a"]:
            p["a"] = max(p["a"], f - aj["pausa_deja"] * 0.45)
        if not p["ext_b"]:
            p["b"] = min(p["b"], l + aj["pausa_deja"] * 0.55)
        pulidas.append(p)
    return pulidas, quitados, avisos


def asignar_palabras(W, tramos, holgura=0.4):
    """A qué tramo va cada palabra: al que la contiene. Una palabra que ya se sabe de una frase del guion y cae a menos de
    `holgura` s del borde de un tramo de esa frase va a ese tramo: Whisper adelanta el inicio de lo que sigue a una pausa y
    la dejaría fuera. Devuelve una lista de palabras por tramo, en el orden del tiempo."""
    por = [[] for _ in tramos]
    for w in W:
        c = (w["inicio"] + w["fin"]) / 2
        k = next((i for i, t in enumerate(tramos) if t["inicio"] <= c < t["fin"]), None)
        if k is None and w.get("frase") is not None:
            cerca = [(min(abs(c - t["inicio"]), abs(c - t["fin"])), i) for i, t in enumerate(tramos)
                     if w["frase"] in (t.get("frases") or [t.get("frase")]) and t["inicio"] - holgura <= c < t["fin"] + holgura]
            if cerca:
                k = min(cerca)[1]
        if k is not None:
            por[k].append(w)
    return por


def texto_de(palabras):
    return " ".join(w.get("guion") or w["palabra"] for w in palabras)


# ---------- analizar ----------

def cmd_analizar(args):
    comun.requerir_ffmpeg()
    video = Path(args.video).resolve()
    sonda = comun.sondear(video)
    if not sonda["audio"]:
        salir(f"{args.video} no tiene audio: la toma se corta por lo que se dice")
    guion_ruta = Path(args.guion)
    if not guion_ruta.exists():
        salir(f"no existe {args.guion}")
    guion = guion_ruta.read_text(encoding="utf-8")
    carpeta = Path(args.salida)
    trabajo = carpeta / "trabajo"
    trabajo.mkdir(parents=True, exist_ok=True)
    wav = comun.audio_16k(video, trabajo / "audio-16k.wav")
    motor = "transcripción dada"
    if args.transcripcion:
        W = comun.cargar_transcripcion(args.transcripcion)
    else:
        aviso(f"transcribiendo con Whisper ({args.modelo}); en una CPU tarda más que la duración del video")
        nombres = glosario(guion) + [x.strip() for x in (args.glosario or "").split(",") if x.strip()]
        prompt = None if args.sin_prompt else "Eh... mmm, o sea, este." + (" " + ", ".join(dict.fromkeys(nombres)) + "." if nombres else "")
        W, motor = comun.transcribir(wav, args.modelo, args.idioma, prompt, vad=not args.sin_vad)
        W = comun.normalizar_palabras(W, "Whisper")
    for w in W:
        w.pop("guion", None)
        w.pop("frase", None)
    voz = Voz(wav)
    extra = {normal(x) for x in (args.muletillas or "").split(",") if normal(x)}
    aj = {"pausa_max": args.pausa_max, "pausa_deja": args.pausa_deja, "entrada": args.entrada, "cola": args.cola,
          "cobertura": args.cobertura, "unidad": args.unidad, "muletillas": not args.sin_muletillas, "cruce": 0.04}
    unidades = partir_guion(guion, args.unidad)
    ptoks = [normal(w["palabra"]) for w in W]
    avisos, frases, tramos, quitados = [], [], [], []
    en_intento = np.zeros(len(W), bool)
    todos = [buscar_intentos(u, W, matriz_similitud(u["toks"], ptoks)) for u in unidades]
    for intentos in todos:
        for a in intentos:
            en_intento[a["j0"]:a["j1"] + 1] = True
    for u, intentos in zip(unidades, todos):
        for a in intentos:
            extender(a, W, en_intento)
            a["quitables"], a["fijas"] = clasificar_extras(a, u, W, extra, not args.sin_muletillas)
            a["puntaje"] = puntuar(a)
        elegido, razon = elegir(intentos, args.cobertura)
        if elegido:
            refinar_elegido(elegido, u, W, ptoks)
        registro = {"id": u["id"], "texto": u["texto"], "elegido": None, "razon": razon, "intentos": []}
        for n, a in enumerate(intentos, 1):
            registro["intentos"].append({
                "n": n, "inicio": round(W[a["j0"]]["inicio"], 3), "fin": round(W[a["j1"]]["fin"], 3),
                "estado": a["estado"], "motivo": a["motivo"], "completo": a["completo"], "cobertura": round(a["cobertura"], 3), "puntaje": a["puntaje"],
                "oido": " ".join(W[j]["palabra"] for j in range(a["j0"], a["j1"] + 1))[:160],
                "de_mas": [W[j]["palabra"] for j in a["fijas"]],
                "cambiadas": [{"oido": W[j]["palabra"], "guion": u["orig"][i]} for i, j in a["cambios"]],
                "se_quita": [{"tipo": q[2], "texto": q[3]} for q in a["quitables"]],
            })
            if a is elegido:
                registro["elegido"] = n
        frases.append(registro)
        if not elegido:
            avisos.append(f"Frase {u['id']} («{u['texto'][:50]}»): no aparece en la grabación. No entra en la toma limpia")
            continue
        if not elegido["completo"]:
            avisos.append(f"Frase {u['id']}: {razon}. Falta «{' '.join(elegido['faltan'][:6])}»")
        if elegido["cambios"]:
            avisos.append(f"Frase {u['id']}: se oyó " + ", ".join(f"«{W[j]['palabra']}» donde el guion dice «{u['orig'][i]}»" for i, j in elegido["cambios"]) + ". Los subtítulos usan el guion")
        if elegido["fijas"]:
            avisos.append(f"Frase {u['id']}: quedan {len(elegido['fijas'])} palabra(s) de más que no se quitaron: " + ", ".join(f"«{W[j]['palabra']}» ({t_txt(W[j]['inicio'])})" for j in elegido["fijas"]))
        piezas, qs, av = piezas_del_intento(elegido, u, W, voz, aj, elegido["quitables"])
        quitados += qs
        avisos += av
        for k, p in enumerate(piezas):
            a_ = a_rejilla(p["a"], sonda["fps"], "arriba")
            b_ = a_rejilla(p["b"], sonda["fps"], "abajo")
            if b_ - a_ < 0.12:
                continue
            motivo = f"Frase {u['id']}: {razon}" if k == 0 else f"Frase {u['id']}, tras quitar {p['causa_a'] or 'un corte'}"
            tramos.append({"frase": u["id"], "inicio": a_, "fin": b_, "ext_a": p["ext_a"], "ext_b": p["ext_b"], "razon": motivo})
    # Frases seguidas en la toma, sin voz entre ellas y con una pausa natural: se dejan juntas, sin corte.
    unidos = []
    for t in tramos:
        p = unidos[-1] if unidos else None
        if p and p["frase"] != t["frase"] and p["ext_b"] and t["ext_a"] and 0 <= t["inicio"] - p["fin"] <= args.pausa_max and not voz.hay_voz(p["fin"], t["inicio"]):
            p["fin"] = t["fin"]
            p["ext_b"] = t["ext_b"]
            p["razon"] += f"; la frase {t['frase']} sigue sin corte, con su pausa natural"
            p["frases"] = p.get("frases", [p["frase"]]) + [t["frase"]]
        else:
            unidos.append(t)
    salida_tramos = []
    palabras_de = asignar_palabras(W, unidos)
    for k, (t, pal) in enumerate(zip(unidos, palabras_de), 1):
        salida_tramos.append({"id": f"t{k:02d}", "frase": t["frase"], **({"frases": t["frases"]} if "frases" in t else {}), "inicio": t["inicio"], "fin": t["fin"],
                              "dura": round(t["fin"] - t["inicio"], 3), "activo": True, "razon": t["razon"], "texto": texto_de(pal)})
    # Voz que no corresponde a ninguna frase del guion: se avisa, no se mete.
    fuera, k = [], 0
    while k < len(W):
        if not en_intento[k]:
            j = k
            while j + 1 < len(W) and not en_intento[j + 1]:
                j += 1
            if j - k + 1 >= 3:
                fuera.append({"inicio": round(W[k]["inicio"], 3), "fin": round(W[j]["fin"], 3), "texto": " ".join(w["palabra"] for w in W[k:j + 1])})
            k = j + 1
        else:
            k += 1
    for f in fuera:
        avisos.append(f"Hay voz que no es del guion entre {t_txt(f['inicio'])} y {t_txt(f['fin'])}: «{f['texto'][:60]}». No entra")
    dur_final = round(sum(t["dura"] for t in salida_tramos), 3)
    cortes = {
        "version": 1,
        "como_editar": "Cambia inicio y fin de un tramo (segundos de la toma original), pon \"activo\": false para quitarlo o reordena la lista: el orden de la lista es el orden del video. Después: python tools/material/toma.py renderizar cortes.json",
        "video": video.as_posix(), "guion": guion_ruta.resolve().as_posix(), "transcripcion": "transcripcion.json",
        "fps": sonda["fps"], "dur_origen": round(sonda["duracion"], 3), "ancho": sonda["ancho"], "alto": sonda["alto"],
        "ajustes": aj,
        "resumen": {"frases": len(unidades), "con_tramo": len({t["frase"] for t in salida_tramos}), "completas": sum(1 for f in frases if f["elegido"] and f["intentos"][f["elegido"] - 1]["completo"]),
                    "tramos": len(salida_tramos), "dur_final": dur_final, "quitado_s": round(sonda["duracion"] - dur_final, 3)},
        "frases": frases, "tramos": salida_tramos, "quitados": quitados, "fuera_de_guion": fuera, "avisos": avisos,
    }
    escribir_json(carpeta / "cortes.json", cortes, 1)
    escribir_json(carpeta / "transcripcion.json", {"motor": motor, "modelo": args.modelo if not args.transcripcion else None, "idioma": args.idioma, "palabras": W}, 1)
    modo = None
    if not args.sin_hoja and salida_tramos:
        modo = hoja_aprobacion(video, salida_tramos, carpeta / "hoja-aprobacion.jpg", sonda["fps"], origen=True)
    print(json.dumps({"ok": True, "cortes": (carpeta / "cortes.json").as_posix(), "hoja": (carpeta / "hoja-aprobacion.jpg").as_posix() if modo else None,
                      **cortes["resumen"], "dur_origen": cortes["dur_origen"], "avisos": avisos}, ensure_ascii=False))


def hoja_aprobacion(video, tramos, destino, fps, origen):
    """Un par de cuadros por corte. Con origen=True, en tiempos de la toma original; si no, en los de la toma limpia."""
    cortes, e = [], 0.0
    cuadro = 1.0 / fps
    pos = []
    for t in tramos:
        pos.append((e, t))
        e += t["fin"] - t["inicio"]
    for k, (e0, t) in enumerate(pos):
        entra = (t["inicio"] if origen else e0) - 0.5 * cuadro
        sale = None
        if k:
            ant = pos[k - 1][1]
            sale = (ant["fin"] if origen else e0) - 1.5 * cuadro
        etiqueta = f"{t['id']} · frase {t['frase']}" if k else f"{t['id']} · inicio"
        nota = t["razon"].split(":")[-1].strip()[:58] if k == 0 else (f"corte a {t_txt(e0)} · " + t["razon"].split(":", 1)[-1].strip())[:60]
        cortes.append({"sale": sale, "entra": entra, "etiqueta": etiqueta, "nota": nota})
    return comun.hoja_de_cortes(str(video), cortes, str(destino))


# ---------- renderizar ----------

def construir_grafo(tramos, fps, fps_txt, cruce, n_audio=True):
    """El grafo de filtros: video por cuadros enteros y audio con un cruce corto centrado en cada corte."""
    c2 = cruce / 2
    lineas, h = [], cruce / 2 + 0.02
    n = len(tramos)
    plan = []
    for i, t in enumerate(tramos):
        ss = a_rejilla(max(0.0, t["inicio"] - h), fps, "abajo")
        lo = round(t["inicio"] - ss, 6)
        largo = round(t["fin"] - t["inicio"], 6)
        plan.append({"ss": ss, "t": round(t["fin"] + h - ss, 6), "lo": lo, "largo": largo})
        medio = 0.25 / fps  # un cuarto de cuadro: a medio cuadro, el redondeo de trim pierde uno
        lineas.append(f"[{i}:v]fps={fps_txt},trim=start={lo - medio:.6f}:end={lo + largo - medio:.6f},setpts=PTS-STARTPTS[v{i}]")
        if n_audio:
            a0 = max(0.0, lo - (c2 if i > 0 else 0.0))
            a1 = lo + largo + (c2 if i < n - 1 else 0.0)
            lineas.append(f"[{i}:a]atrim=start={a0:.6f}:end={a1:.6f},asetpts=PTS-STARTPTS[a{i}]")
    lineas.append("".join(f"[v{i}]" for i in range(n)) + f"concat=n={n}:v=1:a=0,format=yuv420p[vo]")
    if n_audio:
        if n == 1:
            lineas.append("[a0]anull[ao]")
        else:
            previo = "a0"
            for i in range(1, n):
                destino = "ao" if i == n - 1 else f"x{i}"
                lineas.append(f"[{previo}][a{i}]acrossfade=d={cruce}:c1=qsin:c2=qsin[{destino}]")
                previo = destino
    return ";\n".join(lineas), plan


def cmd_renderizar(args):
    comun.requerir_ffmpeg()
    ruta = Path(args.cortes)
    d = leer_json(ruta)
    if "tramos" not in d:
        salir(f"{ruta} no parece un cortes.json de toma.py")
    base = ruta.resolve().parent
    carpeta = Path(args.salida) if args.salida else base
    video = Path(args.video or d["video"])
    if not video.is_absolute() and not video.exists():
        video = base / video
    sonda = comun.sondear(video)
    if not sonda["audio"]:
        salir(f"{video} no tiene audio")
    fps = float(d.get("fps") or sonda["fps"])
    cruce = args.cruce
    tramos, avisos = [], []
    for t in d["tramos"]:
        if not t.get("activo", True):
            continue
        try:
            a, b = float(t["inicio"]), float(t["fin"])
        except (KeyError, TypeError, ValueError):
            salir(f"el tramo {t.get('id', '?')} no tiene inicio y fin numéricos")
        if a < 0 or b > sonda["duracion"] + 0.05:
            salir(f"el tramo {t.get('id', '?')} ({a}–{b}) se sale de la toma, que dura {sonda['duracion']:.2f} s")
        a, b = a_rejilla(a, fps), a_rejilla(min(b, sonda["duracion"]), fps)
        if b - a < max(0.1, 2 * cruce):
            avisos.append(f"el tramo {t.get('id', '?')} dura {b - a:.2f} s: se omite, es más corto que el cruce")
            continue
        tramos.append({**t, "inicio": a, "fin": b})
    if not tramos:
        salir("no hay tramos activos")
    grafo, plan = construir_grafo(tramos, fps, sonda["fps_txt"], cruce)
    carpeta.mkdir(parents=True, exist_ok=True)
    salida_video = Path(args.salida_video) if args.salida_video else carpeta / "toma-limpia.mp4"
    with tempfile.TemporaryDirectory(prefix="toma-") as tmp:
        guion_grafo = Path(tmp) / "grafo.txt"
        guion_grafo.write_text(grafo, encoding="utf-8")
        orden = ["-/filter_complex" if comun.version_ffmpeg() >= 7 else "-filter_complex_script", guion_grafo]
        entradas = []
        for p in plan:
            entradas += ["-ss", f"{p['ss']:.6f}", "-t", f"{p['t']:.6f}", "-i", video]
        comun.ffmpeg([*entradas, *orden, "-map", "[vo]", "-map", "[ao]", "-c:v", "libx264", "-preset", "medium", "-crf", str(args.crf),
                      "-pix_fmt", "yuv420p", "-r", sonda["fps_txt"], "-c:a", "aac", "-b:a", "192k", "-ar", str(sonda["sample_rate"]),
                      "-movflags", "+faststart", salida_video], "renderizar la toma limpia")
    esperado = sum(t["fin"] - t["inicio"] for t in tramos)
    m = comun.sondear(salida_video)
    flujos = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,duration", "-of", "json", str(salida_video)], capture_output=True, text=True, encoding="utf-8")
    dur_flujo = {s["codec_type"]: float(s.get("duration") or 0) for s in json.loads(flujos.stdout)["streams"]}
    desfase = round(abs(dur_flujo.get("video", 0) - dur_flujo.get("audio", 0)), 3)
    if abs(m["duracion"] - esperado) > 2 / fps + 0.02:
        avisos.append(f"la toma limpia dura {m['duracion']:.3f} s y se esperaban {esperado:.3f} s")
    if desfase > 0.1:
        avisos.append(f"el audio y el video difieren {desfase:.3f} s")
    # Tiempos retemporizados: cada palabra pasa del tiempo de la toma al de la toma limpia.
    transc = base / d.get("transcripcion", "transcripcion.json")
    if not transc.exists():
        salir(f"falta {transc}: sin las palabras no se puede retemporizar assets/tiempos.json")
    W = comun.cargar_transcripcion(transc)
    palabras, e = [], 0.0
    for t, pal in zip(tramos, asignar_palabras(W, tramos)):
        largo = t["fin"] - t["inicio"]
        for w in pal:
            ini = e + min(max(w["inicio"] - t["inicio"], 0.0), largo - 0.02)
            fin = e + min(max(w["fin"] - t["inicio"], 0.0), largo)
            palabras.append({"palabra": w.get("guion") or w["palabra"], "inicio": ini, "fin": max(fin, ini + 0.02)})
        e += largo
    (carpeta / "assets" / "voz").mkdir(parents=True, exist_ok=True)
    comun.ffmpeg(["-i", salida_video, "-vn", "-ac", "1", "-ar", "48000", "-c:a", "pcm_s16le", carpeta / "assets" / "voz" / "voz.wav"], "extraer la voz")
    try:
        from tiempos import refinar
        palabras = refinar(palabras, carpeta / "assets" / "voz" / "voz.wav")
    except Exception as e:  # sin esto los tiempos quedan como los dio Whisper, que a veces adelanta unos 0,2 s tras una pausa
        avisos.append(f"no se pudieron afinar los tiempos contra el audio: {e}")
    formato = comun.formato_de(m["ancho"], m["alto"])
    tiempos = comun.escribir_tiempos(carpeta, palabras, "assets/voz/voz.wav", m["duracion"], formato, video.name, "toma", salida_video.name,
                                     extra={"origen": video.as_posix(), "tramos": [{"id": t.get("id"), "inicio": t["inicio"], "fin": t["fin"]} for t in tramos]})
    nuevos = [{"id": t.get("id", "?"), "frase": t.get("frase"), "inicio": t["inicio"], "fin": t["fin"], "razon": t.get("razon", "")} for t in tramos]
    modo = hoja_aprobacion(salida_video, nuevos, carpeta / "hoja-aprobacion.jpg", fps, origen=False) if len(nuevos) > 1 and not args.sin_hoja else None
    print(json.dumps({"ok": True, "video": salida_video.as_posix(), "dur": round(m["duracion"], 3), "esperado": round(esperado, 3), "desfase_audio_video": desfase,
                      "ancho": m["ancho"], "alto": m["alto"], "fps": m["fps"], "tramos": len(tramos), "cruce": cruce, "tiempos": tiempos["tiempos"],
                      "palabras": tiempos["palabras"], "fin_voz": tiempos["fin_voz"], "hoja": (carpeta / "hoja-aprobacion.jpg").as_posix() if modo else None, "avisos": avisos}, ensure_ascii=False))


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="comando", required=True)
    a = sub.add_parser("analizar", help="Busca los intentos, elige el mejor y escribe cortes.json y la hoja de aprobación")
    a.add_argument("video")
    a.add_argument("--guion", required=True, help="guion.txt: una oración por línea o varias por línea; se parten en oraciones")
    a.add_argument("--salida", default=".", help="carpeta donde escribir cortes.json, transcripcion.json y la hoja")
    a.add_argument("--transcripcion", help="palabras con tiempos ya hechas ([{palabra, inicio, fin}] o salida de Whisper): no llama a Whisper")
    a.add_argument("--modelo", default="base", help="modelo de Whisper. base basta casi siempre; small oye mejor los nombres")
    a.add_argument("--idioma", default="es")
    a.add_argument("--sin-vad", action="store_true", help="Whisper sin filtro de voz: oye más muletillas, inventa más en los silencios")
    a.add_argument("--sin-prompt", action="store_true", help="no darle a Whisper pista alguna (ni «eh», ni los nombres del guion)")
    a.add_argument("--glosario", help="nombres propios y siglas que Whisper debe escribir bien, además de los que se sacan del guion: «Berhjoan,Claqueta»")
    a.add_argument("--unidad", choices=["oracion", "linea"], default="oracion", help="qué se busca como una frase: cada oración o cada línea del guion")
    a.add_argument("--cobertura", type=float, default=0.85, help="parte del texto que debe oírse para llamar completo a un intento")
    a.add_argument("--pausa-max", type=float, default=0.5, help="silencio dentro de una frase a partir del cual se recorta, en segundos")
    a.add_argument("--pausa-deja", type=float, default=0.2, help="silencio que queda donde se recortó")
    a.add_argument("--entrada", type=float, default=0.10, help="aire antes de la primera palabra de un tramo")
    a.add_argument("--cola", type=float, default=0.18, help="aire después de la última palabra de un tramo")
    a.add_argument("--muletillas", help="palabras de más a quitar además de eh, mmm, este: «pues,bueno»")
    a.add_argument("--sin-muletillas", action="store_true", help="no quitar muletillas ni repeticiones")
    a.add_argument("--sin-hoja", action="store_true", help="no hacer la hoja de aprobación")
    a.set_defaults(fn=cmd_analizar)
    r = sub.add_parser("renderizar", help="Corta el video con los tramos activos de cortes.json y retemporiza assets/tiempos.json")
    r.add_argument("cortes", help="cortes.json, el que escribió analizar y revisaste")
    r.add_argument("--video", help="la toma original, si cambió de lugar")
    r.add_argument("--salida", help="carpeta de salida; por omisión, la de cortes.json")
    r.add_argument("--salida-video", help="archivo MP4 de salida; por omisión, toma-limpia.mp4")
    r.add_argument("--cruce", type=float, default=0.04, help="segundos de cruce de audio en cada corte")
    r.add_argument("--crf", type=int, default=18)
    r.add_argument("--sin-hoja", action="store_true")
    r.set_defaults(fn=cmd_renderizar)
    args = p.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
