#!/usr/bin/env python3
"""Busca iconos de Lucide (ISC), que vienen en este sistema, y escribe el SVG. Busca en inglés.

Uso:
  python ../.claqueta/tools/medios/icono.py buscar "mail"
  python ../.claqueta/tools/medios/icono.py svg mail --color "#E9A93B" --grosor 2 --salida assets/iconos/mail.svg

Un icono es un apoyo: no reemplaza a un objeto reconocible con material y detalle.
"""
import argparse
import json
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

RAIZ = Path(__file__).resolve().parents[2] / "assets" / "iconos"


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("accion", choices=["buscar", "svg"])
    p.add_argument("consulta")
    p.add_argument("--n", type=int, default=20)
    p.add_argument("--color", default="currentColor")
    p.add_argument("--grosor", type=float, default=2)
    p.add_argument("--salida")
    a = p.parse_args()
    iconos = json.loads((RAIZ / "lucide.json").read_text(encoding="utf-8"))
    if a.accion == "buscar":
        etiquetas = json.loads((RAIZ / "etiquetas.json").read_text(encoding="utf-8"))
        q = a.consulta.lower().strip()
        exactos = [n for n in iconos if n == q]
        en_nombre = [n for n in iconos if q in n and n not in exactos]
        en_tags = [n for n, t in etiquetas.items() if n in iconos and n not in exactos and n not in en_nombre and any(q in x.lower() for x in t)]
        print(json.dumps({"iconos": (exactos + en_nombre + en_tags)[: a.n]}, ensure_ascii=False))
        return
    if a.consulta not in iconos:
        sys.exit(f"Error: no existe el icono {a.consulta}. Busca con: icono.py buscar \"...\"")
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="{a.color}" stroke-width="{a.grosor}" stroke-linecap="round" stroke-linejoin="round">{iconos[a.consulta]}</svg>\n'
    if a.salida:
        Path(a.salida).parent.mkdir(parents=True, exist_ok=True)
        Path(a.salida).write_text(svg, encoding="utf-8")
        print(json.dumps({"ok": True, "salida": a.salida}, ensure_ascii=False))
    else:
        print(svg, end="")


if __name__ == "__main__":
    main()
