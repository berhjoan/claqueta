#!/usr/bin/env python3
"""La pista completa con pocos comandos: voz, tiempos, música y mezcla. Corre dentro de tu proyecto.

Uso:
  python ../.claqueta/tools/pista.py voz --motor edge --voz es-CO-GonzaloNeural --guion guion.txt
  python ../.claqueta/tools/pista.py voz --motor kokoro --voz em_alex --guion guion.txt --por-oraciones --pausa 0.4 --formato 16:9
  python ../.claqueta/tools/pista.py voz --audio assets/voz/mia.wav --guion guion.txt           (voz ya grabada)
  python ../.claqueta/tools/pista.py musica --caracter calido --bpm 96
  python ../.claqueta/tools/pista.py mezcla --nivel-musica -22 --silencios 2
  python ../.claqueta/tools/pista.py subtitulos --formato 16:9                                  (otro formato, la misma voz)

`voz` deja assets/tiempos.json: cada palabra con su tiempo, las pausas medidas, los grupos de subtítulos y `dur`, la duración de la pieza.
Todo lo demás lo lee de ahí: `musica`, `mezcla` y el kit de escenas. Si cambia la voz, se repiten estos comandos y la imagen la sigue.

Si una palabra suena mal, no toques guion.txt: escribe guion_voz.txt solo para el motor y añade --guion-voz guion_voz.txt.
--silencios 2 calla música y efectos en las dos pausas más largas de la voz. Para elegirlas: --silencios @Tú,@Así, la pausa antes de esas palabras, o tramos como 12.4-12.8.
Sin voz, indica la duración: pista.py musica --dur 20 --bpm 128.
"""
import argparse
import json
import re
import shutil
import subprocess
import sys
import unicodedata
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI / "subtitulos"))
TIEMPOS = Path("assets/tiempos.json")
ANCHOS = {"9:16": 28, "16:9": 42, "1:1": 32, "4:5": 32}


def correr(script, *args):
    r = subprocess.run([sys.executable, str(AQUI / script), *map(str, args)], capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        sys.exit(f"Error en {script}:\n{(r.stderr or r.stdout).strip()}")
    for linea in reversed(r.stdout.strip().splitlines()):
        try:
            return json.loads(linea)
        except json.JSONDecodeError:
            continue
    return {}


def leer_tiempos():
    if not TIEMPOS.exists():
        return {}
    return json.loads(TIEMPOS.read_text(encoding="utf-8"))


def grupos_de(palabras, guion, ancho, minimo=1.8):
    from srt import alinear, en_dos_lineas, equilibrar, frases, marca, muy_rapido, texto_de

    if guion:
        escritas = [(x["palabra"], x["inicio"], x["fin"]) for x in palabras]
        palabras, _ = alinear(guion, escritas)
    tope = ancho * 2
    grupos = equilibrar(frases(palabras, tope), minimo, ancho, tope)
    rapidos = [{"texto": texto_de(g), "dura": round(s[0]["inicio"] - g[0]["inicio"], 2)} for g, s in zip(grupos, grupos[1:]) if muy_rapido(g, s, minimo, 15)]
    salida, srt = [], []
    for i, g in enumerate(grupos):
        ini, fin = g[0]["inicio"], g[-1]["fin"]
        limite = grupos[i + 1][0]["inicio"] if i + 1 < len(grupos) else fin + minimo
        fin = min(max(fin, ini + minimo), limite)
        lineas = en_dos_lineas(texto_de(g), ancho).split("\n")
        salida.append({"inicio": round(ini, 3), "fin": round(fin, 3), "lineas": lineas, "palabras": [{"palabra": x["palabra"], "inicio": round(x["inicio"], 3), "fin": round(x["fin"], 3)} for x in g]})
        srt.append(f"{i + 1}\n{marca(ini)} --> {marca(fin)}\n" + "\n".join(lineas) + "\n")
    return salida, "\n".join(srt), rapidos, palabras


def cmd_voz(a):
    guion = Path(a.guion)
    if not guion.exists():
        sys.exit(f"Error: no existe {guion}")
    texto_voz = a.guion_voz or a.guion
    voz_dir = Path("assets/voz")
    voz_dir.mkdir(parents=True, exist_ok=True)
    palabras_json = voz_dir / "palabras.json"
    if a.audio:
        audio = Path(a.audio)
        if not audio.exists():
            sys.exit(f"Error: no existe {audio}")
        motor, voz = "grabada", audio.name
    else:
        if not (a.motor and a.voz):
            sys.exit("Error: indica --motor y --voz, o --audio si la voz ya está grabada")
        audio = voz_dir / ("voz.mp3" if a.motor == "edge" else "voz.wav")
        motor, voz = a.motor, a.voz
        args = ["--motor", a.motor, "--voz", a.voz, "--archivo", texto_voz, "--salida", audio, "--velocidad", f"{a.velocidad:.2f}"]
        if a.motor == "edge":
            args += ["--palabras", palabras_json]
        if a.por_oraciones:
            args += ["--por-oraciones", "--pausa", a.pausa]
        correr("tts/hablar.py", *args)
    if a.audio or a.motor != "edge":
        info = correr("subtitulos/alinear.py", "--audio", audio, "--guion", texto_voz, "--salida", palabras_json, "--modelo", a.modelo)
        if info.get("coincidencia", 1) < 0.85:
            print(f"Aviso: la voz coincide solo {info['coincidencia']:.0%} con el guion. Comprueba con tools/qa/comparar_voz.py --modelo medium.", file=sys.stderr)
    crudas = json.loads(palabras_json.read_text(encoding="utf-8"))
    ancho = a.ancho or ANCHOS[a.formato]
    grupos, srt, rapidos, palabras = grupos_de(crudas, guion.read_text(encoding="utf-8"), ancho)
    Path("renders").mkdir(exist_ok=True)
    Path("renders/final.srt").write_text(srt, encoding="utf-8")
    pausas = correr("audio/pausas.py", audio)
    fin_voz = round(palabras[-1]["fin"], 3) if palabras else 0
    dur = round(fin_voz + a.cierre, 2)
    TIEMPOS.parent.mkdir(parents=True, exist_ok=True)
    TIEMPOS.write_text(json.dumps({
        "voz": audio.as_posix(), "motor": motor, "nombre_voz": voz, "fin_voz": fin_voz, "dur": dur, "formato": a.formato,
        "palabras": [{"palabra": x["palabra"], "inicio": round(x["inicio"], 3), "fin": round(x["fin"], 3)} for x in palabras],
        "pausas": pausas.get("pausas", []), "grupos": grupos,
    }, ensure_ascii=False, indent=0), encoding="utf-8")
    informe = {"ok": True, "tiempos": TIEMPOS.as_posix(), "voz": audio.as_posix(), "palabras": len(palabras), "fin_voz": fin_voz, "dur": dur, "pausas": [[p["inicio"], p["fin"]] for p in pausas.get("pausas", [])], "subtitulos": len(grupos), "srt": "renders/final.srt", "muy_rapidos": rapidos}
    if a.comprobar:
        informe["comparacion"] = correr("qa/comparar_voz.py", "--audio", audio, "--guion", guion, "--modelo", a.modelo)
    print(json.dumps(informe, ensure_ascii=False))


def cmd_subtitulos(a):
    t = leer_tiempos()
    if not t.get("palabras"):
        sys.exit("Error: falta assets/tiempos.json. Corre primero pista.py voz")
    ancho = a.ancho or ANCHOS[a.formato]
    grupos, srt, rapidos, _ = grupos_de(t["palabras"], Path(a.guion).read_text(encoding="utf-8"), ancho)
    t.update(grupos=grupos, formato=a.formato)
    TIEMPOS.write_text(json.dumps(t, ensure_ascii=False, indent=0), encoding="utf-8")
    Path("renders").mkdir(exist_ok=True)
    Path("renders/final.srt").write_text(srt, encoding="utf-8")
    print(json.dumps({"ok": True, "formato": a.formato, "subtitulos": len(grupos), "muy_rapidos": rapidos}, ensure_ascii=False))


def cmd_musica(a):
    t = leer_tiempos()
    dur = a.dur or t.get("dur")
    if not dur:
        sys.exit("Error: falta la duración. Corre primero pista.py voz, o indica --dur")
    if a.archivo:
        # Música real: se mide su pulso con HyperFrames, sin componer nada.
        npx = shutil.which("npx") or shutil.which("npx.cmd")
        if not npx:
            sys.exit("Error: no se encontró npx. Viene con Node")
        r = subprocess.run([npx, "hyperframes@0.9.9", "beats", "--json", a.archivo], capture_output=True, text=True, encoding="utf-8", errors="replace")
        print(json.dumps({"ok": r.returncode == 0, "musica": a.archivo, "dur": dur, "aviso": "Copia el archivo a assets/audio/musica.wav y revisa beats/ para cortar sobre su pulso."}, ensure_ascii=False))
        return
    args = ["--caracter", a.caracter, "--dur", dur, "--salida", "assets/audio/musica.wav", "--rejilla", "assets/audio/rejilla.json", "--semilla", a.semilla]
    if a.bpm:
        args += ["--bpm", a.bpm]
    print(json.dumps({**correr("audio/musica.py", *args), "dur": dur}, ensure_ascii=False))


def tramos_de_silencio(pedido, t):
    if not pedido or pedido == "0":
        return None
    if re.fullmatch(r"\d+", pedido):
        pausas = [p for p in t.get("pausas", []) if p["fin"] - p["inicio"] >= 0.2]
        elegidas = sorted(sorted(pausas, key=lambda p: p["inicio"] - p["fin"])[: int(pedido)], key=lambda p: p["inicio"])
        return ",".join(f"{p['inicio']}-{p['fin']}" for p in elegidas) or None
    return ",".join(pausa_antes_de(parte.strip(), t) if parte.strip().startswith("@") else parte.strip() for parte in pedido.split(","))


def pausa_antes_de(ancla, t):
    """@palabra es la pausa justo antes de esa palabra; @palabra#2, la segunda vez que se dice. Un silencio pesa según lo que sigue, no según lo que dura."""
    def llano(x):
        return re.sub(r"[^a-z0-9]", "", "".join(c for c in unicodedata.normalize("NFD", x.lower()) if unicodedata.category(c) != "Mn"))
    m = re.fullmatch(r"@(.+?)(?:#(\d+))?", ancla)
    buscada, vez = llano(m.group(1)), int(m.group(2) or 1)
    iguales = [w for w in t.get("palabras", []) if llano(str(w.get("palabra", w.get("texto", "")))) == buscada]
    if len(iguales) < vez:
        sys.exit(f"Error: la voz no dice «{m.group(1)}»{f' {vez} veces' if vez > 1 else ''}. Corre pista.py voz, o revisa la palabra")
    inicio = iguales[vez - 1]["inicio"]
    pausa = next((p for p in t.get("pausas", []) if abs(p["fin"] - inicio) < 0.2), None)
    if not pausa or pausa["fin"] - pausa["inicio"] < 0.15:
        sys.exit(f"Error: no hay una pausa antes de «{m.group(1)}» ({inicio} s). Pon un punto en el guion, o usa --por-oraciones al generar la voz")
    return f"{pausa['inicio']}-{pausa['fin']}"


def cmd_mezcla(a):
    t = leer_tiempos()
    dur = a.dur or t.get("dur")
    if not dur:
        sys.exit("Error: falta la duración. Corre primero pista.py voz, o indica --dur")
    args = ["--dur", dur, "--salida", a.salida, "--nivel-musica", a.nivel_musica]
    voz = a.voz or t.get("voz")
    if voz:
        args += ["--voz", voz]
    musica = Path(a.musica)
    if not a.sin_musica and musica.exists():
        args += ["--musica", musica]
    if Path(a.efectos).exists():
        args += ["--efectos", a.efectos]
    silencios = tramos_de_silencio(a.silencios, t)
    if silencios:
        args += ["--silencios", silencios]
    print(json.dumps({**correr("audio/mezcla.py", *args), "silencios": silencios}, ensure_ascii=False))


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="comando", required=True)
    v = sub.add_parser("voz", help="Genera la voz y escribe assets/tiempos.json")
    v.add_argument("--guion", default="guion.txt")
    v.add_argument("--guion-voz", help="Copia del guion solo para el motor, con las palabras escritas como suenan")
    v.add_argument("--motor", choices=["edge", "kokoro", "piper", "pocket"])
    v.add_argument("--voz")
    v.add_argument("--audio", help="Voz ya grabada: no genera nada, solo saca los tiempos")
    v.add_argument("--velocidad", type=float, default=1.0)
    v.add_argument("--por-oraciones", action="store_true")
    v.add_argument("--pausa", type=float, default=0.4)
    v.add_argument("--formato", choices=list(ANCHOS), default="9:16")
    v.add_argument("--ancho", type=int, help="Caracteres por línea de subtítulo. Si falta, sale del formato")
    v.add_argument("--cierre", type=float, default=1.2, help="Segundos de la pieza después de la última palabra")
    v.add_argument("--modelo", default="base")
    v.add_argument("--comprobar", action="store_true", help="Transcribe la voz y la compara con el guion")
    v.set_defaults(fn=cmd_voz)
    s = sub.add_parser("subtitulos", help="Rehace los grupos de subtítulos para otro formato, sin generar otra voz")
    s.add_argument("--guion", default="guion.txt")
    s.add_argument("--formato", choices=list(ANCHOS), default="9:16")
    s.add_argument("--ancho", type=int)
    s.set_defaults(fn=cmd_subtitulos)
    m = sub.add_parser("musica", help="Compone la música y su rejilla de pulsos")
    m.add_argument("--caracter", default="calido")
    m.add_argument("--bpm", type=float)
    m.add_argument("--dur", type=float)
    m.add_argument("--semilla", type=int, default=7)
    m.add_argument("--archivo", help="Música real que ya tienes, para medir su pulso")
    m.set_defaults(fn=cmd_musica)
    x = sub.add_parser("mezcla", help="Mezcla voz, música y efectos, y deja el máster del audio")
    x.add_argument("--voz")
    x.add_argument("--musica", default="assets/audio/musica.wav")
    x.add_argument("--sin-musica", action="store_true")
    x.add_argument("--efectos", default="efectos.json")
    x.add_argument("--nivel-musica", type=float, default=-22)
    x.add_argument("--silencios", default="2", help="Cuántas pausas de la voz se vuelven silencio real; @palabra, la pausa antes de esa palabra; o tramos como 12.4-12.8")
    x.add_argument("--dur", type=float)
    x.add_argument("--salida", default="assets/audio/mezcla.wav")
    x.set_defaults(fn=cmd_mezcla)
    a = p.parse_args()
    a.fn(a)


if __name__ == "__main__":
    main()
