#!/usr/bin/env python3
"""Transcribe un audio o un video y dice si se oye lo que dice el guion. Si coincide, la música tampoco está tapando la voz.

Uso: python tools/qa/comparar_voz.py --audio renders/final.mp4 --guion guion.txt [--modelo base] [--minimo 0.9]
Termina con error si coincide menos de lo pedido. Gratis y local: pip install faster-whisper
"""
import argparse
import difflib
import json
import re
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "subtitulos"))
from alinear import normal, transcribir  # noqa: E402


def fonetica(texto):
    """Pliega lo que suena igual en español, para no alarmar por «un agente» y «una gente» o «haya» y «halla»."""
    t = texto.replace("ñ", "ni").replace("h", "").replace("v", "b").replace("z", "s").replace("ll", "y")
    return re.sub(r"c(?=[ei])", "s", t).replace("qu", "k").replace("c", "k")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--audio", required=True)
    p.add_argument("--guion", required=True)
    p.add_argument("--modelo", default="base")
    p.add_argument("--minimo", type=float, default=0.85)
    a = p.parse_args()
    guion = [w for w in Path(a.guion).read_text(encoding="utf-8").split() if normal(w)]
    oido = [w[0] for w in transcribir(a.audio, a.modelo)]
    x, y = [normal(w) for w in guion], [normal(w) for w in oido]
    faltan, sobran = [], []
    aciertos = 0
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, x, y, autojunk=False).get_opcodes():
        if op == "equal":
            aciertos += i2 - i1
        else:
            faltan += guion[i1:i2]
            sobran += oido[j1:j2]
    # Se compara el sonido de corrido, no palabra por palabra: el reconocimiento parte y confunde homófonos.
    cobertura = difflib.SequenceMatcher(None, fonetica("".join(x)), fonetica("".join(y)), autojunk=False).ratio()
    print(json.dumps({"ok": cobertura >= a.minimo, "coincidencia": round(cobertura, 3), "palabras": len(x), "palabras_iguales": aciertos, "distintas_en_guion": faltan, "distintas_en_lo_oido": sobran, "aviso": "El reconocimiento también se equivoca: oye las palabras listadas antes de regenerar la voz."}, ensure_ascii=False, indent=1))
    sys.exit(0 if cobertura >= a.minimo else 1)


if __name__ == "__main__":
    main()
