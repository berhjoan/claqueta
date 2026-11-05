#!/usr/bin/env python3
"""Transcribe un audio o un video y dice si se oye lo que dice el guion. Si coincide, la música tampoco está tapando la voz.

Uso: python tools/qa/comparar_voz.py --audio renders/final.mp4 --guion guion.txt [--modelo base] [--minimo 0.85]
Compara cómo suena de corrido, no palabra por palabra. Whisper confunde homófonos: base y small oyen «una gente» donde se dijo «un agente».
Si dudas de una palabra, repite con --modelo medium (unos 1,5 GB) antes de cambiar la voz.
Con una palabra rara, como un anglicismo, añade --contexto "un buen prompt": sin contexto, base y medium oyen «pronto» donde se dijo «prompt».
El contexto inclina el oído hacia lo esperado: sirve para confirmar una palabra, no para aprobar la voz. Lo seguro es que la oiga una persona.
Termina con error si coincide menos de lo pedido. Gratis y local: pip install faster-whisper
"""
import argparse
import difflib
import json
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "subtitulos"))
from alinear import normal, parecido, transcribir  # noqa: E402


# Whisper escribe «106» donde se dijo «ciento seis», y eso no es un error de la voz.
UNIDADES = "cero uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince dieciseis diecisiete dieciocho diecinueve veinte veintiuno veintidos veintitres veinticuatro veinticinco veintiseis veintisiete veintiocho veintinueve".split()
DECENAS = {3: "treinta", 4: "cuarenta", 5: "cincuenta", 6: "sesenta", 7: "setenta", 8: "ochenta", 9: "noventa"}
CENTENAS = {1: "ciento", 2: "doscientos", 3: "trescientos", 4: "cuatrocientos", 5: "quinientos", 6: "seiscientos", 7: "setecientos", 8: "ochocientos", 9: "novecientos"}


def en_palabras(n):
    if n < 30:
        return UNIDADES[n].split()
    if n < 100:
        return [DECENAS[n // 10]] + (["y", UNIDADES[n % 10]] if n % 10 else [])
    if n == 100:
        return ["cien"]
    if n < 1000:
        return [CENTENAS[n // 100]] + (en_palabras(n % 100) if n % 100 else [])
    if n < 1000000:
        return (["mil"] if n // 1000 == 1 else en_palabras(n // 1000) + ["mil"]) + (en_palabras(n % 1000) if n % 1000 else [])
    return [str(n)]


def sin_cifras(palabras):
    salida = []
    for w in palabras:
        solo = w.strip(".,;:!?¿¡()«»\"'")
        if solo.isdigit() and len(solo) <= 6:
            salida += en_palabras(int(solo))
        else:
            salida.append(w)
    return salida


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--audio", required=True)
    p.add_argument("--guion", required=True)
    p.add_argument("--modelo", default="base")
    p.add_argument("--minimo", type=float, default=0.85)
    p.add_argument("--contexto", help="Texto que orienta al transcriptor para confirmar una palabra rara")
    a = p.parse_args()
    guion = sin_cifras([w for w in Path(a.guion).read_text(encoding="utf-8").split() if normal(w)])
    oido = sin_cifras([w[0] for w in transcribir(a.audio, a.modelo, a.contexto)])
    x, y = [normal(w) for w in guion], [normal(w) for w in oido]
    faltan, sobran = [], []
    aciertos = 0
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, x, y, autojunk=False).get_opcodes():
        if op == "equal":
            aciertos += i2 - i1
        else:
            faltan += guion[i1:i2]
            sobran += oido[j1:j2]
    cobertura = parecido(guion, oido)
    print(json.dumps({"ok": cobertura >= a.minimo, "coincidencia": round(cobertura, 3), "palabras": len(x), "palabras_iguales": aciertos, "distintas_en_guion": faltan, "distintas_en_lo_oido": sobran, "aviso": "El reconocimiento también se equivoca: oye las palabras listadas antes de regenerar la voz."}, ensure_ascii=False, indent=1))
    sys.exit(0 if cobertura >= a.minimo else 1)


if __name__ == "__main__":
    main()
