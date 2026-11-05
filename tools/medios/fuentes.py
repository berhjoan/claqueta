#!/usr/bin/env python3
"""Copia a tu proyecto las fuentes de una tipografía del panel y escribe su CSS. Sin bajar nada: vienen en este sistema.

Uso:
  python ../.claqueta/tools/medios/fuentes.py --listar
  python ../.claqueta/tools/medios/fuentes.py cartel
  python ../.claqueta/tools/medios/fuentes.py cartel --carpeta assets/fonts

Crea assets/fonts/ con los archivos, sus licencias y fuentes.css. En index.html: <link rel="stylesheet" href="assets/fonts/fuentes.css">.
Imprime las familias de títulos, cuerpo y datos, listas para font-family. Todas son SIL OFL 1.1, con tildes, ñ, ¿ y ¡.
"""
import argparse
import json
import shutil
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

RAIZ = Path(__file__).resolve().parents[2] / "assets" / "fonts"
TIPO = {".woff2": "woff2", ".ttf": "truetype"}


def catalogo():
    return json.loads((RAIZ / "fuentes.json").read_text(encoding="utf-8"))


def css_de(familia, datos):
    salida = []
    for a in datos["archivos"]:
        formato = TIPO[Path(a["archivo"]).suffix]
        salida.append(
            f'@font-face {{ font-family: "{familia}"; src: url("{a["archivo"]}") format("{formato}"); '
            f'font-weight: {a["pesos"]}; font-style: normal; font-display: block; }}'
        )
    return salida


def copiar(familias, carpeta):
    c = catalogo()["familias"]
    carpeta.mkdir(parents=True, exist_ok=True)
    css, licencias = [], set()
    for f in familias:
        if f not in c:
            sys.exit(f"Error: no existe la familia {f}. Hay: {', '.join(c)}")
        for a in c[f]["archivos"]:
            shutil.copy2(RAIZ / a["archivo"], carpeta / a["archivo"])
        licencias.add(c[f]["licencia"])
        css += css_de(f, c[f])
    for l in licencias:
        shutil.copy2(RAIZ / l, carpeta / l)
    (carpeta / "fuentes.css").write_text("\n".join(css) + "\n", encoding="utf-8")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("par", nargs="?", help="Tipografía del panel, como cartel o editorial")
    p.add_argument("--carpeta", default="assets/fonts")
    p.add_argument("--listar", action="store_true")
    a = p.parse_args()
    c = catalogo()
    if a.listar or not a.par:
        print(json.dumps(c["pares"], ensure_ascii=False, indent=1))
        return
    if a.par not in c["pares"]:
        sys.exit(f"Error: no existe la tipografía {a.par}. Hay: {', '.join(c['pares'])}")
    par = c["pares"][a.par]
    copiar(sorted(set(par.values())), Path(a.carpeta))
    print(json.dumps({"ok": True, "carpeta": a.carpeta, "css": f"{a.carpeta}/fuentes.css", **par}, ensure_ascii=False))


if __name__ == "__main__":
    main()
