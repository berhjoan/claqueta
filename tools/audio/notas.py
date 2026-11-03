#!/usr/bin/env python3
"""Música escasa, nota por nota: pocas cuerdas ligadas a lo que aparece en pantalla.

Uso: python tools/audio/notas.py partitura.json --dur 10 --salida assets/audio/musica.wav
     python tools/audio/notas.py --listar

partitura.json es una lista de notas:
  [{"t": 0.5, "nota": "A3", "dur": 3, "vel": 0.6, "pan": -0.2, "instrumento": "nylon_guitar"},
   {"t": 4.1, "nota": "E4", "dur": 4, "vel": 0.5, "instrumento": "harp"}]

Solo "t" y "nota" son obligatorios. Sale en -18 LUFS, sin bucles y con la duración exacta.
Necesita numpy, scipy, soundfile y numba.
"""
import argparse
import json
import sys
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

sys.path.insert(0, str(Path(__file__).resolve().parent))
from masterizar import medir  # noqa: E402
from musica import ecualizar, sala  # noqa: E402
from sfx import SR, add, limit  # noqa: E402
import pluck as P  # noqa: E402

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("partitura", nargs="?")
    p.add_argument("--dur", type=float)
    p.add_argument("--salida", default="notas.wav")
    p.add_argument("--semilla", type=int, default=7)
    p.add_argument("--listar", action="store_true")
    a = p.parse_args()
    if a.listar:
        print("\n".join(P.PRESETS))
        return
    if not a.partitura or not a.dur:
        p.error("indica la partitura y --dur")
    notas = json.loads(Path(a.partitura).read_text(encoding="utf-8"))
    buf = np.zeros((int(round(a.dur * SR)), 2), np.float32)
    for n in notas:
        instrumento = n.get("instrumento", "nylon_guitar")
        if instrumento not in P.PRESETS:
            sys.exit(f"Error: no existe el instrumento {instrumento}. Pide la lista con --listar")
        x = P.pluck(instrumento, n["nota"], float(n.get("dur", 3)), vel=float(n.get("vel", 0.6)))
        add(buf, np.asarray(x, np.float32), float(n["t"]), 1.0, float(n.get("pan", 0)))
    if not np.abs(buf).max():
        sys.exit("Error: la partitura no dejó ningún sonido dentro de la duración")
    mezcla = ecualizar(sala(buf, 1.4, 0.18, np.random.default_rng(a.semilla)))
    corte = int(0.06 * SR)
    mezcla[-corte:] *= np.linspace(1, 0, corte)[:, None]
    mezcla = mezcla / (np.abs(mezcla).max() + 1e-9) * 0.7
    with tempfile.TemporaryDirectory() as d:
        prueba = Path(d) / "m.wav"
        for _ in range(4):
            sf.write(prueba, mezcla, SR, subtype="FLOAT")
            i, tp = medir(prueba)
            if abs(i + 18) < 0.3 and tp <= -2.0:
                break
            mezcla = mezcla * 10 ** ((-18 - i) / 20)
            for lado in range(2):
                mezcla[:, lado] = limit(mezcla[:, lado], ceil=0.72)
    Path(a.salida).parent.mkdir(parents=True, exist_ok=True)
    sf.write(a.salida, mezcla, SR, subtype="PCM_16")
    print(json.dumps({"ok": True, "salida": a.salida, "notas": len(notas), "dur": a.dur}, ensure_ascii=False))


if __name__ == "__main__":
    main()
