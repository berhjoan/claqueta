#!/usr/bin/env python3
"""Hace el SRT desde los tiempos de palabra, con frases con sentido y el texto exacto del guion.

Uso: python tools/subtitulos/srt.py --palabras assets/voz/palabras.json --guion guion.txt --salida renders/final.srt [--inicio 0.2]

palabras.json es la salida de tools/tts/hablar.py --palabras o de tools/subtitulos/alinear.py: una lista de {palabra, inicio, fin}.
--guion pone la puntuación y las tildes del guion, aunque la voz se haya generado con otra grafía.
--inicio es el segundo de la pieza en que entra la voz.
Corta en la puntuación y al llegar a --max caracteres. Cada subtítulo dura al menos --minimo segundos si cabe antes del siguiente.
Si uno no alcanza a leerse, toma palabras del siguiente, hasta una coma o entero, siempre que quepan en dos líneas.
Los que aun así quedan rápidos salen en `muy_rapidos`: ahí manda la voz. Míralos, y si importa, reparte las frases a mano.
"""
import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from alinear import alinear  # noqa: E402

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def marca(t):
    ms = int(round(max(0, t) * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def texto_de(grupo):
    return " ".join(x["palabra"] for x in grupo)


def frases(palabras, max_car=56):
    grupos, actual = [], []
    for p in palabras:
        if actual and len(texto_de(actual + [p])) > max_car:
            grupos.append(actual)
            actual = []
        actual.append(p)
        if re.search(r"[.?!…:]$", p["palabra"]):
            grupos.append(actual)
            actual = []
    if actual:
        grupos.append(actual)
    return grupos


def en_dos_lineas(texto, ancho=28):
    """Primero que quepa, luego que corte en un signo, luego que quede parejo."""
    if len(texto) <= ancho:
        return texto
    palabras = texto.split()
    opciones = []
    for i in range(1, len(palabras)):
        a, b = " ".join(palabras[:i]), " ".join(palabras[i:])
        d = max(len(a), len(b))
        opciones.append((d > ancho, not re.search(r"[.,:;?!…]$", a), d, i))
    corte = min(opciones)[3]
    return " ".join(palabras[:corte]) + "\n" + " ".join(palabras[corte:])


def caben(grupo, ancho, max_car):
    texto = texto_de(grupo)
    return len(texto) <= max_car and all(len(l) <= ancho for l in en_dos_lineas(texto, ancho).split("\n"))


def muy_rapido(grupo, siguiente, minimo, letras_por_s):
    disponible = siguiente[0]["inicio"] - grupo[0]["inicio"]
    return disponible < minimo and len(texto_de(grupo)) / max(disponible, 0.01) > letras_por_s


def equilibrar(grupos, minimo, ancho, max_car, letras_por_s=15):
    """Un subtítulo que no alcanza a leerse toma palabras del siguiente, hasta una coma o entero, si caben."""
    i = 0
    while i < len(grupos) - 1:
        g, sig = grupos[i], grupos[i + 1]
        if not muy_rapido(g, sig, minimo, letras_por_s):
            i += 1
            continue
        cortes = [j for j, p in enumerate(sig[:-1]) if p["palabra"].endswith(",")] + [len(sig) - 1]
        for j in cortes:
            if caben(g + sig[: j + 1], ancho, max_car):
                grupos[i] = g + sig[: j + 1]
                if j + 1 < len(sig):
                    grupos[i + 1] = sig[j + 1 :]
                else:
                    del grupos[i + 1]
                break
        else:
            i += 1
    return grupos


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--palabras", required=True)
    p.add_argument("--guion")
    p.add_argument("--salida", required=True)
    p.add_argument("--inicio", type=float, default=0.0)
    p.add_argument("--max", type=int, default=56, help="Caracteres por subtítulo, sumando sus dos líneas")
    p.add_argument("--ancho", type=int, default=28, help="Caracteres por línea: 28 en vertical, 42 en horizontal")
    p.add_argument("--minimo", type=float, default=1.8)
    a = p.parse_args()
    palabras = json.loads(Path(a.palabras).read_text(encoding="utf-8"))
    if a.guion:
        escritas = [(x["palabra"], x["inicio"], x["fin"]) for x in palabras]
        palabras, _ = alinear(Path(a.guion).read_text(encoding="utf-8"), escritas)
    grupos = equilibrar(frases(palabras, a.max), a.minimo, a.ancho, a.max)
    rapidos = [{"texto": texto_de(g), "dura": round(s[0]["inicio"] - g[0]["inicio"], 2)} for g, s in zip(grupos, grupos[1:]) if muy_rapido(g, s, a.minimo, 15)]
    bloques = []
    for i, g in enumerate(grupos):
        ini, fin = g[0]["inicio"] + a.inicio, g[-1]["fin"] + a.inicio
        tope = grupos[i + 1][0]["inicio"] + a.inicio if i + 1 < len(grupos) else fin + a.minimo
        fin = min(max(fin, ini + a.minimo), tope)
        bloques.append(f"{i + 1}\n{marca(ini)} --> {marca(fin)}\n{en_dos_lineas(' '.join(x['palabra'] for x in g), a.ancho)}\n")
    Path(a.salida).parent.mkdir(parents=True, exist_ok=True)
    Path(a.salida).write_text("\n".join(bloques), encoding="utf-8")
    print(json.dumps({"ok": True, "salida": a.salida, "subtitulos": len(bloques), "muy_rapidos": rapidos}, ensure_ascii=False))


if __name__ == "__main__":
    main()
