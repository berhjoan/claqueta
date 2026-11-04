#!/usr/bin/env python3
"""Hace el SRT desde los tiempos de palabra, con frases con sentido y el texto exacto del guion.

Uso: python tools/subtitulos/srt.py --palabras assets/voz/palabras.json --guion guion.txt --salida renders/final.srt [--inicio 0.2]

palabras.json es la salida de tools/tts/hablar.py --palabras o de tools/subtitulos/alinear.py: una lista de {palabra, inicio, fin}.
--guion pone la puntuación y las tildes del guion, aunque la voz se haya generado con otra grafía.
--inicio es el segundo de la pieza en que entra la voz.
Corta en la puntuación y a las --max palabras de dos líneas. Cada subtítulo dura al menos --minimo segundos si cabe antes del siguiente.
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


def frases(palabras, max_car=56):
    grupos, actual = [], []
    for p in palabras:
        actual.append(p)
        texto = " ".join(x["palabra"] for x in actual)
        if re.search(r"[.?!…:]$", p["palabra"]) or len(texto) >= max_car:
            grupos.append(actual)
            actual = []
    if actual:
        grupos.append(actual)
    return grupos


def en_dos_lineas(texto, ancho=28):
    if len(texto) <= ancho:
        return texto
    palabras, mejor, corte = texto.split(), None, 1
    for i in range(1, len(palabras)):
        a, b = " ".join(palabras[:i]), " ".join(palabras[i:])
        d = max(len(a), len(b))
        if mejor is None or d < mejor:
            mejor, corte = d, i
    return " ".join(palabras[:corte]) + "\n" + " ".join(palabras[corte:])


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
    grupos = frases(palabras, a.max)
    bloques = []
    for i, g in enumerate(grupos):
        ini, fin = g[0]["inicio"] + a.inicio, g[-1]["fin"] + a.inicio
        tope = grupos[i + 1][0]["inicio"] + a.inicio if i + 1 < len(grupos) else fin + a.minimo
        fin = min(max(fin, ini + a.minimo), tope)
        bloques.append(f"{i + 1}\n{marca(ini)} --> {marca(fin)}\n{en_dos_lineas(' '.join(x['palabra'] for x in g), a.ancho)}\n")
    Path(a.salida).parent.mkdir(parents=True, exist_ok=True)
    Path(a.salida).write_text("\n".join(bloques), encoding="utf-8")
    print(json.dumps({"ok": True, "salida": a.salida, "subtitulos": len(bloques)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
