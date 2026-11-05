#!/usr/bin/env python3
"""Mide las pausas reales de una voz: de ahí salen los tramos de --silencios de mezcla.py.

Uso: python tools/audio/pausas.py assets/voz/voz.mp3 [--minimo 0.2] [--inicio-voz 0]

Mide la energía del audio, no palabras.json: la última palabra de una oración puede sonar unas centésimas más de lo marcado,
y esa cola quedaría dentro del silencio.
Imprime cada pausa, `fin_voz` y `silencios`, listo para pegar en --silencios. Elige las que necesites.
Si usas --inicio-voz en la mezcla, usa el mismo número aquí. Necesita numpy y ffmpeg.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "subtitulos"))
from tiempos import PASO, energia_db, mapa_de_voz  # noqa: E402


def medir(audio, minimo=0.2, inicio=0.0):
    sonoro = mapa_de_voz(energia_db(audio))
    donde = [i for i, s in enumerate(sonoro) if s]
    if not donde:
        return [], None
    pausas, i, ultimo = [], donde[0], donde[-1]
    while i <= ultimo:
        if sonoro[i]:
            i += 1
            continue
        j = i
        while not sonoro[j]:
            j += 1
        if (j - i) * PASO >= minimo:
            pausas.append({"inicio": round(i * PASO + inicio, 3), "fin": round(j * PASO + inicio, 3), "dura": round((j - i) * PASO, 3)})
        i = j
    return pausas, round((ultimo + 1) * PASO + inicio, 3)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("audio")
    p.add_argument("--minimo", type=float, default=0.2, help="Segundos que debe durar una pausa para contar")
    p.add_argument("--inicio-voz", type=float, default=0.0, help="Segundo de la pieza en que entra la voz")
    a = p.parse_args()
    if not Path(a.audio).exists():
        sys.exit(f"Error: no existe {a.audio}")
    try:
        pausas, fin = medir(a.audio, a.minimo, a.inicio_voz)
    except (subprocess.CalledProcessError, ValueError) as e:
        sys.exit(f"Error: no se pudo leer {a.audio}: {e}")
    print(json.dumps({"pausas": pausas, "fin_voz": fin, "silencios": ",".join(f"{x['inicio']}-{x['fin']}" for x in pausas)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
