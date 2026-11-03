#!/usr/bin/env python3
"""Tiempos de palabra para subtítulos: transcribe la voz y pega esos tiempos al guion exacto.

La transcripción automática escribe mal nombres y tildes; por eso el texto siempre sale del guion y solo los tiempos salen del audio.
Después, cada palabra se afina contra la energía real del audio: Whisper marca antes de tiempo lo que sigue a una pausa.

Uso:
  python tools/subtitulos/alinear.py --audio voz.wav --guion guion.txt --salida palabras.json
  python tools/subtitulos/alinear.py --audio voz.wav --guion guion.txt --salida palabras.json --modelo small

El modelo se baja una vez: base pesa unos 145 MB y small unos 460 MB. Como el texto sale del guion, base suele bastar.

Usa faster-whisper o openai-whisper, el que esté instalado. Gratis y local.
  pip install faster-whisper
"""
import argparse
import difflib
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from tiempos import refinar  # noqa: E402

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def normal(p):
    s = unicodedata.normalize("NFD", p.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9ñ]", "", s)


def transcribir(audio, modelo):
    pistas = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", str(audio)], capture_output=True, text=True)
    if pistas.returncode or not pistas.stdout.strip():
        print(f"Error: {audio} no tiene pista de audio. Revisa que el audio esté en la composición antes de renderizar.", file=sys.stderr)
        sys.exit(2)
    try:
        from faster_whisper import WhisperModel
        m = WhisperModel(modelo, device="cpu", compute_type="int8")
        segs, _ = m.transcribe(str(audio), language="es", word_timestamps=True, vad_filter=True)
        return [(w.word.strip(), float(w.start), float(w.end)) for s in segs for w in (s.words or [])]
    except ImportError:
        pass
    try:
        import whisper
    except ImportError:
        print("Error: instala un transcriptor gratis: pip install faster-whisper", file=sys.stderr)
        sys.exit(2)
    m = whisper.load_model(modelo)
    r = m.transcribe(str(audio), language="es", word_timestamps=True)
    return [(w["word"].strip(), float(w["start"]), float(w["end"])) for s in r["segments"] for w in s.get("words", [])]


def alinear(guion, asr):
    """Asigna a cada palabra del guion el tiempo de la palabra transcrita que le corresponde e interpola los huecos."""
    esc = guion.split()
    a = [normal(p) for p in esc]
    b = [normal(w[0]) for w in asr]
    salida = [{"palabra": p, "inicio": None, "fin": None} for p in esc]
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if op == "equal":
            for k in range(i2 - i1):
                salida[i1 + k]["inicio"], salida[i1 + k]["fin"] = asr[j1 + k][1], asr[j1 + k][2]
        elif op == "replace" and j2 > j1:
            # Palabras distintas en el mismo lugar: reparte el tramo transcrito entre las palabras del guion.
            ini, fin = asr[j1][1], asr[j2 - 1][2]
            paso = (fin - ini) / (i2 - i1)
            for k in range(i2 - i1):
                salida[i1 + k]["inicio"], salida[i1 + k]["fin"] = ini + k * paso, ini + (k + 1) * paso
    conocidos = [i for i, s in enumerate(salida) if s["inicio"] is not None]
    if not conocidos:
        raise SystemExit("Error: la transcripción no coincide con el guion. Revisa que el audio sea el correcto.")
    for i, s in enumerate(salida):
        if s["inicio"] is None:
            prev = max((k for k in conocidos if k < i), default=None)
            sig = min((k for k in conocidos if k > i), default=None)
            t0 = salida[prev]["fin"] if prev is not None else max(0.0, salida[sig]["inicio"] - 0.3)
            t1 = salida[sig]["inicio"] if sig is not None else t0 + 0.3
            n = (sig if sig is not None else i + 1) - (prev if prev is not None else i - 1) - 1
            k = i - (prev if prev is not None else i - 1) - 1
            s["inicio"], s["fin"] = t0 + (t1 - t0) * k / n, t0 + (t1 - t0) * (k + 1) / n
    for s in salida:
        s["inicio"], s["fin"] = round(s["inicio"], 3), round(s["fin"], 3)
    return salida, sum(1 for i in conocidos) / len(esc)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--audio", required=True)
    p.add_argument("--guion", required=True)
    p.add_argument("--salida", required=True)
    p.add_argument("--modelo", default="base")
    a = p.parse_args()
    guion = Path(a.guion).read_text(encoding="utf-8")
    palabras, cobertura = alinear(guion, transcribir(a.audio, a.modelo))
    palabras = refinar(palabras, a.audio)
    Path(a.salida).parent.mkdir(parents=True, exist_ok=True)
    Path(a.salida).write_text(json.dumps(palabras, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps({"ok": True, "palabras": len(palabras), "coincidencia": round(cobertura, 3), "salida": a.salida}))
    if cobertura < 0.85:
        print("Aviso: menos del 85 % coincide. Quizá la voz no dijo lo escrito: escúchala o transcríbela.", file=sys.stderr)


if __name__ == "__main__":
    main()
